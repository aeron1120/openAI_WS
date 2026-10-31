// 포털 정적 빌드: node portal/scripts/build.mjs → portal/dist/
import { cp, copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { site } from '../content/site.mjs';
import { workshops } from '../content/workshops.mjs';
import { studio, showcase, projects, collaboration } from '../content/program.mjs';
import { ws1Practice } from '../content/practice-pages.mjs';
import { ws2Practice } from '../content/practice-pages-ws2.mjs';
import { recaps } from '../content/recap.mjs';
import { learnMap } from '../content/learn-map.mjs';
import { layout, learnLayout } from '../src/layout.mjs';
import { isUsableUrl, inlineLinkUrls } from '../src/render.mjs';
import { icsFile } from '../src/calendar.mjs';
import * as pages from '../src/pages.mjs';
import * as learnPages from '../src/learn-pages.mjs';
import { resolveContent, boundaries } from '../src/schedule.mjs';
import { createTranslator, localizeHtml } from '../src/i18n.mjs';
import { english } from '../content/en.mjs';

const portal = fileURLToPath(new URL('../', import.meta.url));
const repoRoot = path.resolve(portal, '..');

// 수업 화면용 슬라이드 이미지 목록(scripts/slides-snapshot.mjs가 만듭니다): { <슬라이드 ID>: { pages: [{ id, file }] } }
const slidesDir = path.join(portal, 'slides');
const manifestFile = path.join(slidesDir, 'manifest.json');
const decks = existsSync(manifestFile) ? JSON.parse(readFileSync(manifestFile, 'utf8')) : {};
// 과제 페이지의 '글로 읽기': { <페이지 ID>: { title, text } }
const transcripts = Object.fromEntries([...Object.values(ws1Practice), ...Object.values(ws2Practice)].map(p => [p.id, { title: p.title, text: p.text }]));

// showDrafts: Recap 초안까지 보는 미리보기(PORTAL_DRAFTS=1). 배포 빌드에서는 꺼져 있습니다.
export const defaultContent = { site, workshops, studio, showcase, projects, collaboration, decks, transcripts, recaps, learnMap, showDrafts: process.env.PORTAL_DRAFTS === '1' };

// 잘못된 링크가 버튼으로 공개되지 않도록 빌드 전에 콘텐츠를 검사합니다.
export function validateContent(content) {
  const problems = [];
  const checkUrl = (url, where) => {
    if (url != null && !isUsableUrl(url)) problems.push(`${where}: 사용할 수 없는 주소 "${url}" (https:// 또는 /로 시작해야 하며, 없으면 null)`);
  };
  checkUrl(content.site.links.openChat, 'site.links.openChat');
  checkUrl(content.site.links.contact, 'site.links.contact');
  checkUrl(content.site.links.repository, 'site.links.repository');
  if (!/^https:\/\/[^/]+$/.test(content.site.url)) problems.push('site.url은 https://로 시작하고 끝에 /가 없어야 합니다.');
  const slugs = new Set();
  for (const w of content.workshops) {
    const where = `Workshop ${w.number}`;
    if (slugs.has(w.slug)) problems.push(`${where}: slug 중복 ${w.slug}`);
    slugs.add(w.slug);
    if (!['done', 'scheduled', 'tbd', 'planning'].includes(w.event.status)) problems.push(`${where}: event.status 값 확인`);
    if (w.event.status === 'scheduled' && !w.event.start) problems.push(`${where}: 일정 확정(scheduled)이면 event.start가 필요합니다.`);
    for (const key of ['start', 'end']) {
      if (w.event[key] && Number.isNaN(Date.parse(w.event[key]))) problems.push(`${where}: event.${key} 날짜 형식 확인 (예: 2026-11-30T18:00:00+09:00)`);
      if (w.event[key] && !/[+-]\d\d:\d\d$|Z$/.test(w.event[key])) problems.push(`${where}: event.${key}에 시간대(+09:00)를 붙여 주세요.`);
    }
    if (w.materialsOpenAt && (Number.isNaN(Date.parse(w.materialsOpenAt)) || !/[+-]\d\d:\d\d$|Z$/.test(w.materialsOpenAt))) problems.push(`${where}: materialsOpenAt 형식 확인 (예: 2026-11-02T18:00:00+09:00)`);
    for (const dir of w.exampleDirs ?? []) if (!/^workshop\d+\/[a-z0-9-]+$/.test(dir)) problems.push(`${where}: exampleDirs 값 확인 "${dir}"`);
    if (w.recruitment.open && !isUsableUrl(w.recruitment.url)) problems.push(`${where}: 모집 중이면 recruitment.url이 필요합니다.`);
    w.resources.forEach((r, i) => checkUrl(r.url, `${where} resources[${i}]`));
    // 슬라이드는 학생용(실습 부분만 남긴 복사본)만 공개합니다. 발표본은 QR·소개 슬라이드가 있어 넣지 않습니다.
    w.resources.forEach((r, i) => {
      const isSlides = r.kind === 'slides' || /docs\.google\.com\/presentation/.test(r.url ?? '');
      if (isSlides && (r.kind !== 'slides' || r.audience !== 'student')) problems.push(`${where} resources[${i}]: 슬라이드는 학생용만 넣어 주세요 (kind: 'slides', audience: 'student').`);
    });
    // 수업 화면(/learn/)용: 학생용 슬라이드가 있는 회차는 받아 둔 슬라이드 이미지(slides-snapshot.mjs)가 있어야 하고,
    // 단계마다 시작 슬라이드(slideId)가, 과제 페이지(taskSlides)를 적었다면 그 페이지들이 이미지 목록에 있어야 합니다.
    if (w.resources.some(r => r.kind === 'slides')) {
      const deck = w.resources.find(r => r.kind === 'slides');
      if (!/^https:\/\/docs\.google\.com\/presentation\/d\/[A-Za-z0-9_-]{20,}\//.test(deck.url ?? '')) problems.push(`${where}: 학생용 슬라이드는 docs.google.com/presentation/d/<ID>/… 주소여야 화면에 넣을 수 있어요.`);
      const snapshot = learnPages.deckOf(content, w);
      if (!snapshot) problems.push(`${where}: 슬라이드 이미지가 없어요. node portal/scripts/slides-snapshot.mjs 를 실행해 주세요.`);
      const known = new Set(snapshot?.pages.map(p => p.id));
      const missing = id => snapshot && !known.has(id);
      for (const m of w.missions) {
        if (!/^[A-Za-z0-9_-]+$/.test(m.slideId ?? '') || missing(m.slideId)) problems.push(`${where} ${m.id}: slideId(시작 슬라이드 ID)를 확인해 주세요. 슬라이드를 고쳤다면 slides-snapshot.mjs를 다시 실행하세요.`);
        for (const item of [m, ...(m.options ?? [])]) {
          const at = item === m ? `${where} ${m.id}` : `${where} ${m.id}.options[${m.options.indexOf(item)}]`;
          if (item !== m && item.slideId != null && missing(item.slideId)) problems.push(`${at}: slideId가 슬라이드에 없어요.`);
          if (item.taskSlides != null && (!Array.isArray(item.taskSlides) || !item.taskSlides.length)) problems.push(`${at}: taskSlides는 과제 페이지 ID 목록으로 적어 주세요.`);
          for (const id of item.taskSlides ?? []) if (missing(id)) problems.push(`${at}: taskSlides의 "${id}"가 슬라이드에 없어요. slides-snapshot.mjs를 다시 실행했는지 확인하세요.`);
          // 힌트의 '관련 실습 페이지 보기'는 같은 과제의 페이지로만 보냅니다.
          if (item.hintSlides != null) {
            const own = item.taskSlides ?? [item.slideId];
            const ok = Array.isArray(item.hintSlides) && item.hintSlides.length <= (item.hints?.length ?? 0) && item.hintSlides.every(id => own.includes(id));
            if (!ok) problems.push(`${at}: hintSlides는 힌트 개수 이하로, 이 과제의 taskSlides 안의 ID만 적어 주세요.`);
          }
        }
      }
    }
    if (w.video) checkUrl(w.video.src, `${where} video.src`);
    if (w.checkHelp && w.checkHelp.length !== w.checks.length) problems.push(`${where}: checkHelp는 checks와 같은 개수·순서로 적어 주세요.`);
    w.checkHelp?.forEach((c, i) => c.links?.forEach((l, j) => checkUrl(l.url, `${where} checkHelp[${i}].links[${j}]`)));
    // 설명 글 속 [글](주소) 링크와 힌트(1~3개, 각 800자 이하)를 검사합니다.
    const checkText = (item, key, at) => {
      const values = [item[key]].flat().filter(value => typeof value === 'string');
      for (const value of values) for (const url of inlineLinkUrls(value)) if (!isUsableUrl(url)) problems.push(`${at}.${key}: 글 속 링크 주소 "${url}"를 쓸 수 없어요 ([보이는 글](https://… 또는 /…) 모양으로 적어 주세요)`);
    };
    const checkHints = (item, at) => {
      checkWalk(item, at);
      if (item.hints == null) return;
      const ok = Array.isArray(item.hints) && item.hints.length >= 1 && item.hints.length <= 3
        && item.hints.every(text => typeof text === 'string' && text.trim() && text.length <= 800);
      if (!ok) problems.push(`${at}.hints: 힌트는 1~3개의 글(각 800자 이하, 빈 글 없이)로 적어 주세요.`);
    };
    // 화면 따라 하기: 단계마다 글이 있어야 하고, 그림은 public/에 실제로 있어야 하며, 강조 상자는 그림 안([왼쪽, 위, 너비, 높이] %)이어야 합니다.
    const checkWalk = (item, at) => {
      const walk = item.walkthrough;
      if (walk == null) return;
      if (!walk.title || !Array.isArray(walk.steps) || !walk.steps.length) return problems.push(`${at}.walkthrough: title과 steps(단계 목록)를 적어 주세요.`);
      walk.steps.forEach((step, i) => {
        const where = `${at}.walkthrough.steps[${i}]`;
        if (typeof step.text !== 'string' || !step.text.trim()) problems.push(`${where}: text(설명)를 적어 주세요.`);
        for (const url of inlineLinkUrls(step.text)) if (!isUsableUrl(url)) problems.push(`${where}: 글 속 링크 주소 "${url}"를 쓸 수 없어요.`);
        if (step.image != null && (!/^\/images\/[^\s]+$/.test(step.image) || !existsSync(path.join(portal, 'public', step.image)))) problems.push(`${where}: image "${step.image}"가 public/에 없어요.`);
        if (step.box != null) {
          const [x, y, w, h] = Array.isArray(step.box) ? step.box : [];
          const ok = step.image && step.box.length === 4 && step.box.every(Number.isFinite) && x >= 0 && y >= 0 && w > 0 && h > 0 && x + w <= 100.5 && y + h <= 100.5;
          if (!ok) problems.push(`${where}: box는 그림이 있을 때 [왼쪽, 위, 너비, 높이] (0~100%)로 적어 주세요.`);
        }
      });
    };
    const missionIds = new Set();
    for (const m of w.missions) {
      if (missionIds.has(m.id)) problems.push(`${where}: mission id 중복 ${m.id}`);
      missionIds.add(m.id);
      const at = `${where} ${m.id}`;
      for (const key of ['todo', 'expected', 'verify', 'stuck', 'hints']) checkText(m, key, at);
      checkHints(m, at);
      m.options?.forEach((o, i) => {
        checkUrl(o.guide, `${at}.options[${i}].guide`);
        for (const key of ['needs', 'hints']) checkText(o, key, `${at}.options[${i}]`);
        checkHints(o, `${at}.options[${i}]`);
      });
    }
  }
  (content.studio.sessions ?? []).forEach((s, i) => {
    for (const key of ['start', 'end']) {
      if (!s[key] || Number.isNaN(Date.parse(s[key])) || !/[+-]\d\d:\d\d$|Z$/.test(s[key])) problems.push(`studio.sessions[${i}].${key} 형식 확인 (예: 2026-11-02T19:00:00+09:00, 시간대 포함)`);
    }
    // 세션 슬라이드는 학생용 Google 슬라이드 주소만 받습니다.
    if (s.slides != null && !/^https:\/\/docs\.google\.com\/presentation\/d\/[A-Za-z0-9_-]{20,}\//.test(s.slides)) problems.push(`studio.sessions[${i}].slides: docs.google.com/presentation/d/<ID>/… 주소를 적어 주세요.`);
  });
  content.projects.forEach((p, i) => p.links?.forEach((l, j) => checkUrl(l.url, `projects[${i}].links[${j}]`)));
  // Recap: 공개(published) 기록은 실제 날짜·글·사진(public/에 있는 파일, alt 필수)이 모두 있어야 합니다. 초안은 주소만 확인합니다.
  const recapSlugs = new Set();
  (content.recaps ?? []).forEach((r, i) => {
    const where = `recaps[${i}]${r.slug ? ` ${r.slug}` : ''}`;
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(r.slug ?? '')) problems.push(`${where}: slug는 영문 소문자·숫자·-로 적어 주세요 (예: ws1-1026).`);
    if (recapSlugs.has(r.slug)) problems.push(`${where}: slug 중복`);
    recapSlugs.add(r.slug);
    if (!['published', 'draft'].includes(r.status)) problems.push(`${where}: status는 'published' 또는 'draft'예요.`);
    if (r.status !== 'published') return;
    const [y, m, d] = (r.eventDate ?? '').split('-').map(Number);
    const day = new Date(Date.UTC(y, m - 1, d));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.eventDate ?? '') || day.getUTCMonth() !== m - 1 || day.getUTCDate() !== d) problems.push(`${where}: eventDate는 실제 행사 날짜(YYYY-MM-DD)로 적어 주세요.`);
    for (const key of ['title', 'summary', 'intro']) if (typeof r[key] !== 'string' || !r[key].trim()) problems.push(`${where}: ${key}를 적어 주세요.`);
    if (!Array.isArray(r.photos) || !r.photos.length) problems.push(`${where}: 공개하려면 사진(photos)이 한 장 이상 있어야 해요.`);
    (r.photos ?? []).forEach((p, j) => {
      if (!/^\/images\/[^\s]+\.(jpe?g|png|webp)$/i.test(p.src ?? '') || !existsSync(path.join(portal, 'public', p.src))) problems.push(`${where}.photos[${j}]: src "${p.src}"가 public/에 없어요.`);
      if (typeof p.alt !== 'string' || !p.alt.trim()) problems.push(`${where}.photos[${j}]: 무엇이 보이는지 alt를 적어 주세요.`);
    });
    const cover = r.cover ?? 0;
    if (!Number.isInteger(cover) || cover < 0 || cover >= (r.photos?.length ?? 0)) problems.push(`${where}: cover는 photos의 순번(0부터)이에요.`);
  });
  if (problems.length) throw new Error(`콘텐츠를 확인해 주세요:\n- ${problems.join('\n- ')}`);
}

export function routes(content) {
  return [
    { path: '/', render: pages.homePage, description: content.site.description, script: 'home.js' },
    { path: '/roadmap/', title: '학기 로드맵', render: pages.roadmapPage, description: '워크숍 4회와 Studio Session, Showcase로 이어지는 한 학기 과정과 단계별 결과물.' },
    { path: '/workshops/', title: '워크숍과 실습 자료', render: pages.workshopsPage, description: '회차별 주제, 진행 상태, 실습 자료를 한곳에서 확인하세요.' },
    ...content.workshops.map(w => ({ path: `/workshops/${w.slug}/`, title: `Workshop ${w.slug} · ${w.title}`, render: c => pages.workshopPage(c, w), description: [w.message, w.summary].filter(Boolean).join(' — ') })),
    { path: '/studio/', title: 'Studio Session', render: pages.studioPage, description: content.studio.description },
    { path: '/showcase/', title: 'Showcase', render: pages.showcasePage, description: content.showcase.description },
    { path: '/recap/', title: 'Recap', render: pages.recapPage, description: '행사 사진과 그날 한 일을 모아 둔 활동 기록.' },
    ...pages.visibleRecaps(content).map(r => ({ path: pages.recapPath(r), title: `${r.title} · Recap`, render: c => pages.recapDetailPage(c, r), description: r.summary || 'Recap' })),
    { path: '/about/', title: '운영 소개와 협력 안내', render: pages.aboutPage, description: `${content.site.name} 운영진, 진행 기록, 협력 방식 안내.` },
    { path: '/learn/', title: '수업 듣기', render: learnPages.learnPage, description: '서울대 계정으로 로그인하고 슬라이드를 보며 단계별로 실습해요.', script: ['learn.js', 'questions.js'], layout: 'learn' },
    { path: '/learn/questions/', title: '내 질문', render: learnPages.questionsPage, description: '수업 중 남긴 질문과 운영진의 답을 확인해요.', script: ['learn.js', 'questions.js'], layout: 'learn' },
    { path: '/admin/', title: '운영진', render: learnPages.adminPage, description: '운영진용 질문 답변과 수업 진행 화면.', script: ['learn.js', 'questions.js', 'admin.js'], layout: 'learn' },
    ...learnPages.lessonWorkshops(content).map(w => ({ path: learnPages.lessonPath(w), title: `수업 · Workshop ${w.slug}`, render: c => learnPages.lessonPage(c, w), description: `${w.title} — 슬라이드를 보며 단계별로 실습해요.`, script: ['learn.js', 'questions.js'], layout: 'learn' }))
  ];
}

const PRIVATE_PATHS = ['/learn/questions/', '/admin/'];
const hash = text => createHash('sha256').update(text).digest('hex').slice(0, 10);

// 한 시점의 페이지 묶음(HTML·404·예제)을 dir에 씁니다.
// 포털 화면(학습실 제외)은 /en/<주소>에 영어 페이지도 씁니다(src/i18n.mjs, content/en.mjs).
async function writePages(dir, content, assets, translator = createTranslator(english)) {
  const written = [];
  const all = routes(content);
  const enPaths = new Set(all.filter(r => r.layout !== 'learn').map(r => r.path));
  for (const route of all) {
    const body = String(route.render(content));
    const file = path.join(dir, route.path, 'index.html');
    await mkdir(path.dirname(file), { recursive: true });
    // layout: 'learn' → 학습실 화면(포털 사이드바 없이 상단 바만)
    if (route.layout === 'learn') {
      await writeFile(file, learnLayout({ site: content.site, content, path: route.path, title: route.title, description: route.description, body, assets, script: route.script }));
      written.push(route.path);
      continue;
    }
    const alt = { ko: route.path, en: `/en${route.path}` };
    const page = { site: content.site, content, title: route.title, description: route.description, body, assets, script: route.script, alt };
    await writeFile(file, layout({ ...page, path: route.path }));
    const enFile = path.join(dir, 'en', route.path, 'index.html');
    await mkdir(path.dirname(enFile), { recursive: true });
    await writeFile(enFile, localizeHtml(layout({ ...page, path: alt.en, lang: 'en' }), translator, enPaths));
    written.push(route.path, alt.en);
  }
  // 날짜가 정해진 회차는 '캘린더에 추가'용 파일(/workshops/<slug>/event.ics)을 함께 만듭니다.
  for (const w of content.workshops.filter(w => w.event?.start)) {
    const file = path.join(dir, pages.icsPath(w));
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, icsFile({ uid: `workshop-${w.slug}@${new URL(content.site.url).host}`, title: pages.eventTitle(w), event: w.event, details: pages.eventDetails(content.site, w), url: `${content.site.url}/workshops/${w.slug}/`, now: content.now }));
  }
  await writeFile(path.join(dir, '404.html'), layout({ site: content.site, content, path: '/404', title: '페이지를 찾을 수 없어요', description: content.site.description, body: String(pages.notFoundPage()), assets }));
  // 자료가 열린 회차의 예제 화면과 수업 화면용 슬라이드 이미지만 복사합니다.
  for (const w of content.workshops.filter(w => w.materials === 'open')) {
    const deck = learnPages.deckId(pages.slidesOf(w)?.url);
    if (deck && content.decks?.[deck]) await cp(path.join(slidesDir, deck), path.join(dir, 'slides', deck), { recursive: true });
    for (const source of w.exampleDirs ?? []) {
      for (const name of ['index.html', 'app.js', 'styles.css']) {
        const target = path.join(dir, 'examples', source, name);
        await mkdir(path.dirname(target), { recursive: true });
        await copyFile(path.join(repoRoot, source, name), target);
      }
    }
  }
  return written;
}

// now: 미리보기 기준 시각(기본 지금). 배포 사이트는 functions/_middleware.js가 요청 시각에 맞는 묶음을 고릅니다.
export async function buildSite({ outDir = path.join(portal, 'dist'), content = defaultContent, now = Date.now() } = {}) {
  validateContent(content);
  const out = path.resolve(outDir);
  if (out === path.resolve(portal) || out === repoRoot || !path.basename(out)) throw new Error('빌드 폴더 경로를 확인하세요.');
  await rm(out, { recursive: true, force: true });
  await mkdir(out, { recursive: true });

  const css = await readFile(path.join(portal, 'src/styles.css'), 'utf8');
  const js = await readFile(path.join(portal, 'src/main.js'), 'utf8');
  const extra = {};
  for (const name of ['home.js', 'learn.js', 'questions.js', 'admin.js']) extra[name] = await readFile(path.join(portal, 'src', name), 'utf8');
  const assets = { css: hash(css), js: hash(js), ...Object.fromEntries(Object.entries(extra).map(([name, text]) => [name, hash(text)])) };
  await writeFile(path.join(out, 'styles.css'), css);
  await writeFile(path.join(out, 'main.js'), js);
  for (const [name, text] of Object.entries(extra)) await writeFile(path.join(out, name), text);
  await cp(path.join(portal, 'public'), out, { recursive: true });

  // 루트: 빌드 시각 기준 화면(미리보기, 그리고 함수가 실패했을 때의 안전한 기본값)
  const translator = createTranslator(english);
  const written = await writePages(out, resolveContent(content, now), assets, translator);

  // _v/<n>/: 화면이 바뀌는 시각마다 한 묶음. 공개 경로로는 열리지 않고 함수만 꺼내 씁니다.
  const times = boundaries(content);
  for (let i = 0; i <= times.length; i++) {
    const time = i === 0 ? (times[0] ?? now) - 1 : times[i - 1];
    await writePages(path.join(out, '_v', String(i)), resolveContent(content, time), assets, translator);
  }
  await writeFile(path.join(out, '_v', 'schedule.json'), JSON.stringify({ boundaries: times.map(t => new Date(t).toISOString()) }));
  await writeFile(path.join(out, '_routes.json'), JSON.stringify({
    version: 1,
    include: ['/*'],
    exclude: ['/styles.css', '/main.js', '/home.js', '/learn.js', '/questions.js', '/admin.js', '/favicon.svg', '/og.png', '/images/*', '/downloads/*', '/sitemap.xml', '/robots.txt']
  }));

  // 로그인해야 쓰는 개인 화면(내 질문·운영진)은 검색에 내보내지 않습니다.
  const listed = written.filter(p => !PRIVATE_PATHS.includes(p));
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${listed.map(p => `  <url><loc>${content.site.url}${p}</loc></url>`).join('\n')}\n</urlset>\n`;
  await writeFile(path.join(out, 'sitemap.xml'), sitemap);
  await writeFile(path.join(out, 'robots.txt'), `User-agent: *\nAllow: /\n${PRIVATE_PATHS.map(p => `Disallow: ${p}\n`).join('')}Sitemap: ${content.site.url}/sitemap.xml\n`);
  return { outDir: out, pages: written, variants: times.length + 1, untranslated: [...translator.left] };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const now = process.env.PORTAL_NOW ? Date.parse(process.env.PORTAL_NOW) : Date.now();
  if (Number.isNaN(now)) throw new Error('PORTAL_NOW 형식 예: 2026-11-02T18:00:00+09:00');
  const result = await buildSite({ now });
  console.log(`포털 ${result.pages.length}개 페이지 (시간대별 ${result.variants}묶음)를 ${path.relative(process.cwd(), result.outDir)}에 만들었습니다.${process.env.PORTAL_NOW ? ` 미리보기 기준 시각: ${process.env.PORTAL_NOW}` : ''}`);
  // 영어 페이지에 한국어로 남은 글: content/en.mjs에 번역을 더하면 사라집니다. PORTAL_I18N=list로 목록을 봅니다.
  if (result.untranslated.length) {
    console.log(`영어 페이지에 번역 안 된 글 ${result.untranslated.length}개${process.env.PORTAL_I18N === 'list' ? ':\n' + result.untranslated.map(t => `  ${t}`).join('\n') : ' (PORTAL_I18N=list로 목록 보기)'}`);
  }
}
