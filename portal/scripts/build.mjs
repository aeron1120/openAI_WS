// 포털 정적 빌드: node portal/scripts/build.mjs → portal/dist/
import { cp, copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { site } from '../content/site.mjs';
import { workshops } from '../content/workshops.mjs';
import { studio, showcase, projects, collaboration } from '../content/program.mjs';
import { layout } from '../src/layout.mjs';
import { isUsableUrl } from '../src/render.mjs';
import * as pages from '../src/pages.mjs';
import { resolveContent, boundaries } from '../src/schedule.mjs';

const portal = fileURLToPath(new URL('../', import.meta.url));
const repoRoot = path.resolve(portal, '..');

export const defaultContent = { site, workshops, studio, showcase, projects, collaboration };

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
    // 수업 화면(/learn/)용: 학생용 슬라이드가 있는 회차는 단계마다 시작 슬라이드(번호·ID)가 필요합니다.
    if (w.resources.some(r => r.kind === 'slides')) {
      const slideOk = item => Number.isInteger(item.slide) && item.slide >= 1 && /^[A-Za-z0-9_-]+$/.test(item.slideId ?? '');
      for (const m of w.missions) {
        if (!slideOk(m)) problems.push(`${where} ${m.id}: slide(슬라이드 번호)와 slideId(슬라이드 ID)를 적어 주세요.`);
        m.options?.forEach((o, i) => {
          if ((o.slide != null || o.slideId != null) && !slideOk(o)) problems.push(`${where} ${m.id}.options[${i}]: slide와 slideId를 함께 적어 주세요.`);
        });
      }
    }
    if (w.video) checkUrl(w.video.src, `${where} video.src`);
    if (w.checkHelp && w.checkHelp.length !== w.checks.length) problems.push(`${where}: checkHelp는 checks와 같은 개수·순서로 적어 주세요.`);
    w.checkHelp?.forEach((c, i) => c.links?.forEach((l, j) => checkUrl(l.url, `${where} checkHelp[${i}].links[${j}]`)));
    const missionIds = new Set();
    for (const m of w.missions) {
      if (missionIds.has(m.id)) problems.push(`${where}: mission id 중복 ${m.id}`);
      missionIds.add(m.id);
      m.options?.forEach((o, i) => checkUrl(o.guide, `${where} ${m.id}.options[${i}].guide`));
    }
  }
  (content.studio.sessions ?? []).forEach((s, i) => {
    for (const key of ['start', 'end']) {
      if (!s[key] || Number.isNaN(Date.parse(s[key])) || !/[+-]\d\d:\d\d$|Z$/.test(s[key])) problems.push(`studio.sessions[${i}].${key} 형식 확인 (예: 2026-11-02T19:00:00+09:00, 시간대 포함)`);
    }
  });
  content.projects.forEach((p, i) => p.links?.forEach((l, j) => checkUrl(l.url, `projects[${i}].links[${j}]`)));
  if (problems.length) throw new Error(`콘텐츠를 확인해 주세요:\n- ${problems.join('\n- ')}`);
}

export function routes(content) {
  return [
    { path: '/', render: pages.homePage, description: content.site.description },
    { path: '/roadmap/', title: '학기 로드맵', render: pages.roadmapPage, description: '워크숍 4회와 Studio Session, Showcase로 이어지는 한 학기 과정과 단계별 결과물.' },
    { path: '/workshops/', title: '워크숍과 실습 자료', render: pages.workshopsPage, description: '회차별 주제, 진행 상태, 실습 자료를 한곳에서 확인하세요.' },
    ...content.workshops.map(w => ({ path: `/workshops/${w.slug}/`, title: `Workshop ${w.slug} · ${w.title}`, render: c => pages.workshopPage(c, w), description: `${w.message} — ${w.summary}` })),
    { path: '/studio/', title: 'Studio Session', render: pages.studioPage, description: content.studio.description },
    { path: '/showcase/', title: 'Showcase', render: pages.showcasePage, description: content.showcase.description },
    { path: '/about/', title: '운영 소개와 협력 안내', render: pages.aboutPage, description: `${content.site.name} 운영진, 진행 기록, 협력 방식 안내.` },
    { path: '/learn/', title: '수업 듣기', render: pages.learnPage, description: '서울대 계정으로 로그인하고 슬라이드를 보며 단계별로 실습해요.', script: 'learn.js' }
  ];
}

const hash = text => createHash('sha256').update(text).digest('hex').slice(0, 10);

// 한 시점의 페이지 묶음(HTML·404·예제)을 dir에 씁니다.
async function writePages(dir, content, assets) {
  const written = [];
  for (const route of routes(content)) {
    const body = String(route.render(content));
    const file = path.join(dir, route.path, 'index.html');
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, layout({ site: content.site, content, path: route.path, title: route.title, description: route.description, body, assets, script: route.script }));
    written.push(route.path);
  }
  await writeFile(path.join(dir, '404.html'), layout({ site: content.site, content, path: '/404', title: '페이지를 찾을 수 없어요', description: content.site.description, body: String(pages.notFoundPage()), assets }));
  // 자료가 열린 회차의 예제 화면만 복사합니다(저장소의 정적 화면 파일만).
  for (const w of content.workshops.filter(w => w.materials === 'open')) {
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
  const learnJs = await readFile(path.join(portal, 'src/learn.js'), 'utf8');
  const assets = { css: hash(css), js: hash(js), 'learn.js': hash(learnJs) };
  await writeFile(path.join(out, 'styles.css'), css);
  await writeFile(path.join(out, 'main.js'), js);
  await writeFile(path.join(out, 'learn.js'), learnJs);
  await cp(path.join(portal, 'public'), out, { recursive: true });

  // 루트: 빌드 시각 기준 화면(미리보기, 그리고 함수가 실패했을 때의 안전한 기본값)
  const written = await writePages(out, resolveContent(content, now), assets);

  // _v/<n>/: 화면이 바뀌는 시각마다 한 묶음. 공개 경로로는 열리지 않고 함수만 꺼내 씁니다.
  const times = boundaries(content);
  for (let i = 0; i <= times.length; i++) {
    const time = i === 0 ? (times[0] ?? now) - 1 : times[i - 1];
    await writePages(path.join(out, '_v', String(i)), resolveContent(content, time), assets);
  }
  await writeFile(path.join(out, '_v', 'schedule.json'), JSON.stringify({ boundaries: times.map(t => new Date(t).toISOString()) }));
  await writeFile(path.join(out, '_routes.json'), JSON.stringify({
    version: 1,
    include: ['/*'],
    exclude: ['/styles.css', '/main.js', '/learn.js', '/favicon.svg', '/og.png', '/images/*', '/sitemap.xml', '/robots.txt']
  }));

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${written.map(p => `  <url><loc>${content.site.url}${p}</loc></url>`).join('\n')}\n</urlset>\n`;
  await writeFile(path.join(out, 'sitemap.xml'), sitemap);
  await writeFile(path.join(out, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${content.site.url}/sitemap.xml\n`);
  return { outDir: out, pages: written, variants: times.length + 1 };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const now = process.env.PORTAL_NOW ? Date.parse(process.env.PORTAL_NOW) : Date.now();
  if (Number.isNaN(now)) throw new Error('PORTAL_NOW 형식 예: 2026-11-02T18:00:00+09:00');
  const result = await buildSite({ now });
  console.log(`포털 ${result.pages.length}개 페이지 (시간대별 ${result.variants}묶음)를 ${path.relative(process.cwd(), result.outDir)}에 만들었습니다.${process.env.PORTAL_NOW ? ` 미리보기 기준 시각: ${process.env.PORTAL_NOW}` : ''}`);
}
