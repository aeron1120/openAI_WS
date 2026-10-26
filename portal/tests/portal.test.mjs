import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { buildSite, defaultContent, validateContent } from '../scripts/build.mjs';

const clone = value => structuredClone(value);

async function build(t, content = defaultContent) {
  const outDir = await mkdtemp(path.join(os.tmpdir(), 'portal-build-'));
  t.after(() => rm(outDir, { recursive: true, force: true }));
  const result = await buildSite({ outDir, content });
  const read = route => readFile(path.join(outDir, route, route.endsWith('.html') || route.endsWith('.xml') ? '' : 'index.html'), 'utf8');
  return { ...result, outDir, read };
}

async function exists(file) {
  try { return (await stat(file)).isFile(); } catch { return false; }
}

test('every route, 404, sitemap and the Workshop 2 examples are built', async t => {
  const { pages, outDir, read } = await build(t);
  assert.deepEqual(pages, ['/', '/roadmap/', '/workshops/', '/workshops/01/', '/workshops/02/', '/workshops/03/', '/workshops/04/', '/studio/', '/showcase/', '/about/']);
  assert.ok(await exists(path.join(outDir, '404.html')));
  for (const version of ['starter', 'complete']) assert.ok(await exists(path.join(outDir, 'examples/workshop2', version, 'index.html')));
  const sitemap = await read('sitemap.xml');
  for (const page of pages) assert.match(sitemap, new RegExp(`<loc>${defaultContent.site.url}${page}</loc>`));
});

test('internal links resolve, no placeholder links, and share metadata uses the public URL', async t => {
  const { pages, outDir, read } = await build(t);
  for (const page of pages) {
    const html = await read(page);
    assert.doesNotMatch(html, /href="(#|)"/, `${page} has an empty link`);
    assert.doesNotMatch(html, /href="http:/, `${page} has an insecure link`);
    assert.match(html, new RegExp(`<link rel="canonical" href="${defaultContent.site.url}${page}">`));
    assert.match(html, new RegExp(`<meta property="og:image" content="${defaultContent.site.url}/og.png">`));
    for (const [, href] of html.matchAll(/(?:href|src)="(\/[^"]*)"/g)) {
      const clean = href.split(/[?#]/)[0];
      const file = path.join(outDir, clean, clean.endsWith('/') ? 'index.html' : '');
      assert.ok(await exists(file), `${page} → ${href} does not exist`);
    }
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
});

test('planning workshops show only topic and status, no missions or downloads', async t => {
  const { read } = await build(t);
  const html = await read('/workshops/03/');
  assert.match(html, /이 회차는 준비하고 있어요/);
  assert.match(html, /일정 안내 예정/);
  assert.doesNotMatch(html, /class="mission"|copy-block|학생용 자료|<video/);
});

test('presenter slides are labelled separately from student materials', async t => {
  const { read } = await build(t);
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
  const { read } = await build(t);
  const html = await read('/showcase/');
  assert.match(html, /학생 프로젝트는 준비되는 대로 소개합니다/);
  assert.equal((html.match(/class="tag-operator">운영진 예제/g) ?? []).length, defaultContent.projects.filter(p => p.kind === 'operator').length);
});

test('content validation rejects placeholder or insecure links and missing recruitment links', () => {
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
});

test('a ready video loads only on play, never autoplays, and replaces the screenshot', async t => {
  const without = await build(t);
  assert.doesNotMatch(await without.read('/workshops/02/'), /<video/);
  const content = clone(defaultContent);
  content.workshops[1].video = { ready: true, src: '/videos/ws2.mp4', poster: '/images/examples/ws2-complete.png', description: '즐겨찾기를 눌러보는 장면' };
  const html = await (await build(t, content)).read('/workshops/02/');
  assert.match(html, /<video controls playsinline preload="none"/);
  assert.doesNotMatch(html, /autoplay/);
  assert.match(html, /즐겨찾기를 눌러보는 장면/);
});

test('copy buttons start hidden so they only appear when the script can run', async t => {
  const { read } = await build(t);
  const html = await read('/workshops/02/');
  const buttons = html.match(/<button[^>]*copy-button[^>]*>/g) ?? [];
  assert.ok(buttons.length >= 4);
  for (const button of buttons) assert.match(button, /\shidden>/);
});
