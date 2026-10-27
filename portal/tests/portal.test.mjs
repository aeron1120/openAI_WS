import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { buildSite, defaultContent, validateContent } from '../scripts/build.mjs';
import { onRequest } from '../functions/_middleware.js';

const clone = value => structuredClone(value);
// 실제 날짜와 무관하게 검사하도록 기준 시각을 고정합니다.
const BEFORE_WS2 = Date.parse('2026-10-27T12:00:00+09:00');
const WS2_OPENS = Date.parse('2026-11-02T18:00:00+09:00');
const WS2_ENDS = Date.parse('2026-11-02T19:00:00+09:00');

async function build(t, content = defaultContent, now = BEFORE_WS2) {
  const outDir = await mkdtemp(path.join(os.tmpdir(), 'portal-build-'));
  t.after(() => rm(outDir, { recursive: true, force: true }));
  const result = await buildSite({ outDir, content, now });
  const read = route => readFile(path.join(outDir, route, route.endsWith('.html') || route.endsWith('.xml') ? '' : 'index.html'), 'utf8');
  return { ...result, outDir, read };
}

async function exists(file) {
  try { return (await stat(file)).isFile(); } catch { return false; }
}

test('every route, 404, sitemap and one page set per schedule window are built', async t => {
  const { pages, outDir, read, variants } = await build(t);
  assert.deepEqual(pages, ['/', '/roadmap/', '/workshops/', '/workshops/01/', '/workshops/02/', '/workshops/03/', '/workshops/04/', '/studio/', '/showcase/', '/about/', '/learn/']);
  assert.ok(await exists(path.join(outDir, '404.html')));
  const sitemap = await read('sitemap.xml');
  for (const page of pages) assert.match(sitemap, new RegExp(`<loc>${defaultContent.site.url}${page}</loc>`));
  const dirs = (await readdir(path.join(outDir, '_v'))).filter(name => /^\d+$/.test(name));
  assert.equal(dirs.length, variants);
});

test('internal links resolve, no placeholder links, and share metadata uses the public URL', async t => {
  const { pages, outDir, variants } = await build(t);
  const roots = [outDir, ...Array.from({ length: variants }, (_, i) => path.join(outDir, '_v', String(i)))];
  for (const root of roots) {
    for (const page of pages) {
      const html = await readFile(path.join(root, page, 'index.html'), 'utf8');
      assert.doesNotMatch(html, /href="(#|)"/, `${page} has an empty link`);
      assert.doesNotMatch(html, /href="http:/, `${page} has an insecure link`);
      assert.match(html, new RegExp(`<link rel="canonical" href="${defaultContent.site.url}${page}">`));
      assert.match(html, new RegExp(`<meta property="og:image" content="${defaultContent.site.url}/og.png">`));
      for (const [, href] of html.matchAll(/(?:href|src)="(\/[^"]*)"/g)) {
        const clean = href.split(/[?#]/)[0];
        // 공용 파일(css·js·이미지)은 루트에, 페이지와 예제는 같은 묶음 안에 있어야 합니다.
        const shared = /^\/(styles\.css|main\.js|learn\.js|favicon\.svg|og\.png|images\/)/.test(clean);
        const file = path.join(shared ? outDir : root, clean, clean.endsWith('/') ? 'index.html' : '');
        assert.ok(await exists(file), `${path.relative(outDir, root) || '/'}${page} → ${href} does not exist`);
      }
    }
  }
});

test('before Workshop 2 starts, its missions, slides and examples are not published', async t => {
  const { outDir, read } = await build(t, defaultContent, WS2_OPENS - 60_000);
  const page = await read('/workshops/02/');
  assert.match(page, /11\/2 \(월\) 18:00에 열려요/);
  assert.match(page, /준비물/);
  // 시작 전 확인 도움말(template)은 행사 전에도 보여야 하므로 빼고 검사합니다.
  const outsideHelp = page.replace(/<template>[\s\S]*?<\/template>/g, '');
  assert.doesNotMatch(outsideHelp, /class="mission"|copy-block|docs\.google\.com\/presentation|\/examples\//);
  const home = await read('/');
  const ws2Card = home.match(/<article class="track c-blue[\s\S]*?<\/article>/)[0];
  assert.match(ws2Card, /11\/2 \(월\) 18:00/);
  assert.doesNotMatch(ws2Card, /실습 시작하기|슬라이드<|docs\.google/);
  assert.equal(await exists(path.join(outDir, 'examples/workshop2/complete/index.html')), false);
  assert.doesNotMatch(await read('/showcase/'), /즐겨찾기 추가/);
});

test('at the start time Workshop 2 opens, and after it ends it is marked done', async t => {
  const opened = await build(t, defaultContent, WS2_OPENS);
  const page = await opened.read('/workshops/02/');
  assert.match(page, /class="mission"/);
  assert.match(page, /docs\.google\.com\/presentation/);
  assert.match(page, /진행 중/);
  assert.ok(await exists(path.join(opened.outDir, 'examples/workshop2/complete/index.html')));
  assert.match(await opened.read('/showcase/'), /즐겨찾기 추가/);
  const ended = await build(t, defaultContent, WS2_ENDS);
  assert.match((await ended.read('/')).match(/<article class="track c-blue[\s\S]*?<\/article>/)[0], /진행 완료/);
});

test('the deployed function serves the page set for the request time and hides future pages', async t => {
  const { outDir } = await build(t);
  const env = {
    ASSETS: {
      async fetch(input) {
        const { pathname } = new URL(input.url ?? input);
        const file = path.join(outDir, decodeURIComponent(pathname), pathname.endsWith('/') ? 'index.html' : '');
        return await exists(file) ? new Response(await readFile(file)) : new Response('missing', { status: 404 });
      }
    }
  };
  const get = async (pathname, now) => {
    t.mock.timers.enable({ apis: ['Date'], now });
    try {
      const response = await onRequest({ request: new Request(`https://example.test${pathname}`), env, next: () => new Response('root', { status: 299 }) });
      return { status: response.status, body: await response.text(), location: response.headers.get('Location') };
    } finally {
      t.mock.timers.reset();
    }
  };
  const before = await get('/workshops/02/', WS2_OPENS - 1);
  assert.equal(before.status, 200);
  assert.doesNotMatch(before.body, /class="mission"/);
  const after = await get('/workshops/02/', WS2_OPENS);
  assert.match(after.body, /class="mission"/);
  assert.equal((await get('/examples/workshop2/complete/', WS2_OPENS - 1)).status, 404);
  assert.equal((await get('/examples/workshop2/complete/', WS2_OPENS)).status, 200);
  assert.equal((await get('/_v/1/workshops/02/', WS2_OPENS - 1)).status, 404);
  const redirect = await get('/workshops/02', WS2_OPENS - 1);
  assert.equal(redirect.status, 308);
  assert.equal(redirect.location, 'https://example.test/workshops/02/');
});

test('undated items say 준비 중, never 미정', async t => {
  const { pages, read } = await build(t);
  for (const page of pages) assert.doesNotMatch(await read(page), /미정/, `${page} still says 미정`);
  const home = await read('/');
  for (const kicker of ['Workshop 03</p>', 'Workshop 04</p>', 'Showcase · 학기 마무리</p>']) {
    const card = home.split(kicker)[1].split('</article>')[0];
    assert.match(card, /badge-planning">준비 중/, `${kicker} should be 준비 중`);
  }
});

test('a past sign-up form is never offered and recruiting ends with the event', async t => {
  const { pages, read } = await build(t, defaultContent, WS2_ENDS);
  for (const page of pages) {
    const html = await read(page);
    assert.doesNotMatch(html, /forms\.gle\/dRtqQzjj7tvUmaQs9/);
    assert.doesNotMatch(html, /모집 중|신청하기/);
  }
  assert.match(await read('/'), /Workshop 2 다시 해보기/);
});

test('an open recruitment with a real link becomes the primary action', async t => {
  const content = clone(defaultContent);
  content.workshops[1].recruitment = { open: true, url: 'https://forms.gle/example-next' };
  const { read } = await build(t, content);
  assert.match(await read('/'), /href="https:\/\/forms\.gle\/example-next"[^>]*>Workshop 2 신청하기/);
  assert.match(await read('/workshops/02/'), /모집 중/);
  assert.doesNotMatch(await read('/workshops/02/'), /docs\.google\.com\/presentation/);
});

test('planning workshops show only topic and status, no missions or downloads', async t => {
  const { read } = await build(t);
  const html = await read('/workshops/03/');
  assert.match(html, /이 회차는 준비하고 있어요/);
  assert.match(html, /일정 준비 중/);
  assert.doesNotMatch(html, /class="mission"|copy-block|<video/);
});

test('workshops link the student slides, never the presenter deck', async t => {
  const { read } = await build(t, defaultContent, WS2_OPENS);
  const presenterDecks = ['1OYbhNdlJFerD-LumLyBXP3SUZKata9K1m_avNXCvUvM', '17PScZeZtImAaSqLmmq5VUY9kSDZb60RTFyzo1U8ReQg', '1rUCvsJvfaKOH13tPIRh-ZlsAGvh3S_zWljE84p_BakQ'];
  for (const page of ['/workshops/01/', '/workshops/02/']) {
    const html = await read(page);
    const rows = html.match(/<li>\s*<a class="res-link"[\s\S]*?<\/li>/g) ?? [];
    const slides = rows.filter(row => row.includes('docs.google.com/presentation'));
    assert.equal(slides.length, 1, `${page} lists the slides once`);
    assert.match(slides[0], /실습 슬라이드/);
    assert.doesNotMatch(html, /발표 자료/);
    for (const id of presenterDecks) assert.ok(!html.includes(id), `${page} links a presenter deck`);
  }
});

test('open chat and contact buttons appear only when their links are set', async t => {
  const without = await build(t);
  assert.doesNotMatch(await without.read('/about/'), /협력 문의하기|오픈채팅/);
  const content = clone(defaultContent);
  content.site.links.openChat = 'https://open.kakao.com/o/example';
  content.site.links.contact = 'mailto:team@example.com';
  const withLinks = await build(t, content);
  const about = await withLinks.read('/about/');
  assert.match(about, /href="mailto:team@example\.com">협력 문의하기/);
  assert.match(about, /open\.kakao\.com\/o\/example/);
});

test('operator examples are labelled and student projects show a pending state', async t => {
  const { read } = await build(t, defaultContent, WS2_OPENS);
  const html = await read('/showcase/');
  assert.match(html, /학생 프로젝트는 준비되는 대로 소개합니다/);
  assert.equal((html.match(/class="tag-operator">운영진 예제/g) ?? []).length, defaultContent.projects.filter(p => p.kind === 'operator').length);
});

test('content validation rejects placeholder or insecure links, missing recruitment links and zoneless times', () => {
  for (const url of ['#', '', 'http://example.com', 'example.com']) {
    const content = clone(defaultContent);
    content.workshops[0].resources[0].url = url;
    assert.throws(() => validateContent(content), /사용할 수 없는 주소/);
  }
  const content = clone(defaultContent);
  content.workshops[1].recruitment = { open: true, url: null };
  assert.throws(() => validateContent(content), /recruitment\.url/);
  const noZone = clone(defaultContent);
  noZone.workshops[1].event = { status: 'scheduled', start: '2026-11-30T18:00:00', end: null, place: null };
  assert.throws(() => validateContent(noZone), /시간대/);
  const presenter = clone(defaultContent);
  presenter.workshops[0].resources.push({ label: '발표 슬라이드', kind: 'slides', audience: 'presenter', url: 'https://docs.google.com/presentation/d/example/edit', checked: '2026-10-27' });
  assert.throws(() => validateContent(presenter), /학생용만/);
  const unlabelled = clone(defaultContent);
  unlabelled.workshops[0].resources.push({ label: '슬라이드', kind: 'guide', audience: 'student', url: 'https://docs.google.com/presentation/d/example/edit', checked: '2026-10-27' });
  assert.throws(() => validateContent(unlabelled), /학생용만/);
  const badOpen = clone(defaultContent);
  badOpen.workshops[1].materialsOpenAt = '2026-11-02 18:00';
  assert.throws(() => validateContent(badOpen), /materialsOpenAt/);
});

test('a ready video loads only on play, never autoplays, and replaces the screenshot', async t => {
  const without = await build(t, defaultContent, WS2_OPENS);
  assert.doesNotMatch(await without.read('/workshops/02/'), /<video/);
  const content = clone(defaultContent);
  content.workshops[1].video = { ready: true, src: '/videos/ws2.mp4', poster: '/images/examples/ws2-complete.png', description: '즐겨찾기를 눌러보는 장면' };
  const html = await (await build(t, content, WS2_OPENS)).read('/workshops/02/');
  assert.match(html, /<video controls playsinline preload="none"/);
  assert.doesNotMatch(html, /autoplay/);
  assert.match(html, /즐겨찾기를 눌러보는 장면/);
});

test('copy buttons start hidden so they only appear when the script can run', async t => {
  const { read } = await build(t);
  const html = await read('/workshops/01/');
  const buttons = html.match(/<button[^>]*copy-button[^>]*>/g) ?? [];
  assert.ok(buttons.length >= 4);
  for (const button of buttons) assert.match(button, /\shidden>/);
});

test('studio shows weekly sessions and promotes the next one until it ends', async t => {
  const before = await build(t);
  const page = await before.read('/studio/');
  assert.match(page, /매주 월요일/);
  assert.match(page, /다음 세션 · 11\/2 \(월\) 19:00/);
  assert.match(page, /VS Code 세팅 · GitHub·Cloudflare 실습 Q&amp;A/);
  assert.match(page, /처음이라면 추천/);
  assert.match(page, /못 와도 다음 워크숍을 따라가는 데 문제없어요/);
  assert.doesNotMatch(page, /필수 참여|꼭 참여/);
  assert.match(page, /2026년 10월 26일 \(월\) 19:00–20:00[\s\S]*?진행 완료/);
  assert.match(await before.read('/'), /다음 11\/2 \(월\) 19:00 · VS Code 세팅/);
  const after = await build(t, defaultContent, Date.parse('2026-11-02T20:00:00+09:00'));
  const done = await after.read('/studio/');
  assert.doesNotMatch(done, /다음 세션/);
  assert.match(done, /badge-scheduled">매주 월요일/);
});

test('Workshop 2 sign-up links to Luma until the event starts', async t => {
  const before = await build(t);
  const home = await before.read('/');
  assert.match(home, /href="https:\/\/luma\.com\/54mgt7n8"[^>]*>Workshop 2 신청하기/);
  assert.match(await before.read('/workshops/02/'), /href="https:\/\/luma\.com\/54mgt7n8"[^>]*>신청하기/);
  const during = await build(t, defaultContent, WS2_OPENS);
  assert.doesNotMatch(await during.read('/workshops/02/'), /luma\.com/);
  assert.match(await during.read('/'), /Workshop 2 실습 시작하기/);
  const ended = await build(t, defaultContent, WS2_ENDS);
  for (const page of ['/', '/workshops/02/']) assert.doesNotMatch(await ended.read(page), /luma\.com/);
});

test('start checks come with a step-by-step help that needs the script to open', async t => {
  const { read } = await build(t);
  const page = await read('/workshops/02/');
  assert.match(page, /data-check-guide/);
  assert.match(page, /<button type="button" class="help-start" hidden>/);
  const template = page.match(/<template>([\s\S]*?)<\/template>/)[1];
  assert.equal((template.match(/class="help-step"/g) ?? []).length, defaultContent.workshops[1].checks.length);
  assert.match(template, /node --version/);
  assert.match(template, /nodejs\.org/);
  const bad = structuredClone(defaultContent);
  bad.workshops[1].checkHelp.pop();
  assert.throws(() => validateContent(bad), /checkHelp/);
});

async function withFetch(fake, run) {
  const original = globalThis.fetch;
  globalThis.fetch = fake;
  try { return await run(); } finally { globalThis.fetch = original; }
}
const learnEnv = { LEARN_API_ORIGIN: 'https://learn.example', PROXY_SECRET: 'q'.repeat(40), ASSETS: { fetch: () => { throw new Error('assets must not be used for /api'); } } };
const noNext = () => { throw new Error('/api must not fall through to pages'); };

test('/api requests go to the learn server with the proxy secret, cookies and redirects intact', async () => {
  const seen = [];
  const response = await withFetch(async (input, init) => {
    seen.push({ url: String(input), init });
    const headers = new Headers({ Location: 'https://accounts.google.com/o/oauth2/v2/auth?x=1' });
    headers.append('Set-Cookie', '__Host-learn_oauth=abc; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600');
    return new Response(null, { status: 302, headers });
  }, () => onRequest({
    request: new Request('https://portal.test/api/auth/google?next=%2Flearn%2F', { headers: { 'x-proxy-secret': 'forged', cookie: 'a=b' } }),
    env: learnEnv, next: noNext
  }));
  assert.equal(seen[0].url, 'https://learn.example/api/auth/google?next=%2Flearn%2F');
  assert.equal(seen[0].init.headers.get('x-proxy-secret'), learnEnv.PROXY_SECRET);
  assert.equal(seen[0].init.headers.get('cookie'), 'a=b');
  assert.equal(seen[0].init.redirect, 'manual');
  assert.equal(response.status, 302);
  assert.match(response.headers.get('location'), /^https:\/\/accounts\.google\.com\//);
  assert.match(response.headers.get('set-cookie'), /__Host-learn_oauth=abc/);
  assert.equal(response.headers.get('cache-control'), 'no-store');
});

test('/api write requests keep their method, origin and body', async () => {
  const seen = [];
  await withFetch(async (input, init) => { seen.push(init); return new Response('{}', { status: 200 }); }, () => onRequest({
    request: new Request('https://portal.test/api/session', { method: 'DELETE', headers: { origin: 'https://portal.test' } }),
    env: learnEnv, next: noNext
  }));
  await withFetch(async (input, init) => { seen.push(init); return new Response('{}', { status: 200 }); }, () => onRequest({
    request: new Request('https://portal.test/api/x', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"a":1}' }),
    env: learnEnv, next: noNext
  }));
  assert.equal(seen[0].method, 'DELETE');
  assert.equal(seen[0].headers.get('origin'), 'https://portal.test');
  assert.equal(seen[1].method, 'POST');
  assert.equal(new TextDecoder().decode(seen[1].body), '{"a":1}');
});

test('/api answers 503 when the learn server is not configured and 502 when it cannot be reached', async () => {
  const unconfigured = await onRequest({ request: new Request('https://portal.test/api/me'), env: { ASSETS: learnEnv.ASSETS }, next: noNext });
  assert.equal(unconfigured.status, 503);
  assert.equal((await unconfigured.json()).error, 'LEARN_NOT_CONFIGURED');
  const down = await withFetch(async () => { throw new Error('connect failed'); }, () => onRequest({ request: new Request('https://portal.test/api/me'), env: learnEnv, next: noNext }));
  assert.equal(down.status, 502);
  assert.equal((await down.json()).error, 'LEARN_UNAVAILABLE');
});

test('the learn page loads its script, explains the SNU login and is in the menu', async t => {
  const { read, outDir } = await build(t);
  const html = await read('/learn/');
  assert.match(html, /<script src="\/learn\.js\?v=[0-9a-f]{10}" defer><\/script>/);
  assert.match(html, /data-learn/);
  assert.match(html, /@snu\.ac\.kr/);
  assert.ok(await exists(path.join(outDir, 'learn.js')));
  assert.doesNotMatch(await read('/'), /learn\.js/);
  assert.match(await read('/'), /href="\/learn\/"[^>]*>[\s\S]*?수업 듣기/);
  const routes = JSON.parse(await readFile(path.join(outDir, '_routes.json'), 'utf8'));
  assert.ok(routes.exclude.includes('/learn.js'));
});
