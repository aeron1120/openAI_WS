// 콘텐츠에 들어 있는 외부 링크를 로그인하지 않은 상태로 열어봅니다: npm run check:portal-links
// 로그인 화면으로 이동하거나 4xx/5xx가 나오면 '확인 필요'로 표시합니다. 링크를 고치지는 않습니다.
import { defaultContent } from './build.mjs';

const urls = new Map();
const add = (url, where) => { if (typeof url === 'string' && url.startsWith('https://')) urls.set(url, [...(urls.get(url) ?? []), where]); };
const { site, workshops, projects } = defaultContent;
Object.entries(site.links).forEach(([key, url]) => add(url, `site.links.${key}`));
for (const w of workshops) {
  w.resources.forEach(r => add(r.url, `WS${w.number} ${r.label}`));
  w.missions.forEach(m => m.options?.forEach(o => add(o.guide, `WS${w.number} ${o.label}`)));
  add(w.help?.guide, `WS${w.number} 문제 해결`);
  add(w.recruitment.url, `WS${w.number} 신청`);
}
projects.forEach(p => p.links?.forEach(l => add(l.url, `프로젝트 ${p.title}`)));

const loginPattern = /accounts\.google\.com|github\.com\/login|\/signin|ServiceLogin/i;
let failures = 0;
for (const [url, where] of urls) {
  let line;
  try {
    const response = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0 portal-link-check' }, signal: AbortSignal.timeout(20000) });
    const body = await response.text();
    const title = body.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() ?? '';
    const login = loginPattern.test(response.url);
    const ok = response.ok && !login;
    if (!ok) failures++;
    line = `${ok ? '정상    ' : '확인 필요'} ${response.status} ${url}${response.url !== url ? ` → ${response.url}` : ''}${title ? ` [${title}]` : ''}`;
  } catch (error) {
    failures++;
    line = `확인 필요 ERR ${url} (${error.message})`;
  }
  console.log(`${line}\n          사용 위치: ${where.join(', ')}`);
}
console.log(`\n외부 링크 ${urls.size}개 중 확인 필요 ${failures}개 · ${new Date().toISOString()}`);
process.exitCode = failures ? 1 : 0;
