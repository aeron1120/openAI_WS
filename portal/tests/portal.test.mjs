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
  assert.deepEqual(pages, ['/', '/roadmap/', '/workshops/', '/workshops/01/', '/workshops/02/', '/workshops/03/', '/workshops/04/', '/studio/', '/showcase/', '/about/']);
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
        const shared = /^\/(styles\.css|main\.js|favicon\.svg|og\.png|images\/)/.test(clean);
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
  assert.doesNotMatch(page, /class="mission"|copy-block|docs\.google\.com\/presentation|\/examples\//);
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

test('a past sign-up form is never offered and nothing claims recruiting without a link', async t => {
  const { pages, read } = await build(t);
  for (const page of pages) {
    const html = await read(page);
    assert.doesNotMatch(html, /forms\.gle\/dRtqQzjj7tvUmaQs9/);
    assert.doesNotMatch(html, /모집 중|신청하기/);
  }
  assert.match(await read('/'), /Workshop 1 다시 해보기/);
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

test('presenter slides are labelled separately from student materials', async t => {
  const { read } = await build(t, defaultContent, WS2_OPENS);
  for (const page of ['/workshops/01/', '/workshops/02/']) {
    const html = await read(page);
    const rows = html.match(/<li>\s*<a class="res-link"[\s\S]*?<\/li>/g) ?? [];
    const slides = rows.filter(row => row.includes('docs.google.com/presentation'));
    assert.equal(slides.length, 1, `${page} lists the slides once`);
    assert.match(slides[0], /badge-presenter">발표 자료/);
    for (const row of rows.filter(row => !row.includes('docs.google.com/presentation'))) assert.doesNotMatch(row, /발표 자료/);
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
