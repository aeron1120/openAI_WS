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
    if (w.recruitment.open && !isUsableUrl(w.recruitment.url)) problems.push(`${where}: 모집 중이면 recruitment.url이 필요합니다.`);
    w.resources.forEach((r, i) => checkUrl(r.url, `${where} resources[${i}]`));
    if (w.video) checkUrl(w.video.src, `${where} video.src`);
    const missionIds = new Set();
    for (const m of w.missions) {
      if (missionIds.has(m.id)) problems.push(`${where}: mission id 중복 ${m.id}`);
      missionIds.add(m.id);
      m.options?.forEach((o, i) => checkUrl(o.guide, `${where} ${m.id}.options[${i}].guide`));
    }
  }
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
    { path: '/about/', title: '운영 소개와 협력 안내', render: pages.aboutPage, description: `${content.site.name} 운영진, 진행 기록, 협력 방식 안내.` }
  ];
}

const hash = text => createHash('sha256').update(text).digest('hex').slice(0, 10);

export async function buildSite({ outDir = path.join(portal, 'dist'), content = defaultContent } = {}) {
  validateContent(content);
  const out = path.resolve(outDir);
  if (out === path.resolve(portal) || out === repoRoot || !path.basename(out)) throw new Error('빌드 폴더 경로를 확인하세요.');
  await rm(out, { recursive: true, force: true });
  await mkdir(out, { recursive: true });

  const css = await readFile(path.join(portal, 'src/styles.css'), 'utf8');
  const js = await readFile(path.join(portal, 'src/main.js'), 'utf8');
  const assets = { css: hash(css), js: hash(js) };
  await writeFile(path.join(out, 'styles.css'), css);
  await writeFile(path.join(out, 'main.js'), js);
  await cp(path.join(portal, 'public'), out, { recursive: true });

  const written = [];
  for (const route of routes(content)) {
    const body = String(route.render(content));
    const file = path.join(out, route.path, 'index.html');
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, layout({ site: content.site, path: route.path, title: route.title, description: route.description, body, assets }));
    written.push(route.path);
  }
  await writeFile(path.join(out, '404.html'), layout({ site: content.site, path: '/404', title: '페이지를 찾을 수 없어요', description: content.site.description, body: String(pages.notFoundPage()), assets }));

  // Workshop 2 공개 예제: 저장소의 정적 화면 파일만 복사합니다.
  for (const version of ['starter', 'complete']) {
    for (const name of ['index.html', 'app.js', 'styles.css']) {
      const target = path.join(out, 'examples/workshop2', version, name);
      await mkdir(path.dirname(target), { recursive: true });
      await copyFile(path.join(repoRoot, 'workshop2', version, name), target);
    }
  }

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${written.map(p => `  <url><loc>${content.site.url}${p}</loc></url>`).join('\n')}\n</urlset>\n`;
  await writeFile(path.join(out, 'sitemap.xml'), sitemap);
  await writeFile(path.join(out, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${content.site.url}/sitemap.xml\n`);
  return { outDir: out, pages: written };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await buildSite();
  console.log(`포털 ${result.pages.length}개 페이지를 ${path.relative(process.cwd(), result.outDir)}에 만들었습니다.`);
}
