import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { buildSite, defaultContent, validateContent } from '../scripts/build.mjs';
import { onRequest } from '../functions/_middleware.js';
import { richText } from '../src/render.mjs';

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
  assert.deepEqual(pages, ['/', '/roadmap/', '/workshops/', '/workshops/01/', '/workshops/02/', '/workshops/03/', '/workshops/04/', '/studio/', '/showcase/', '/about/', '/learn/', '/learn/questions/', '/admin/', '/learn/01/']);
  assert.ok(await exists(path.join(outDir, '404.html')));
  const sitemap = await read('sitemap.xml');
  const privatePages = ['/learn/questions/', '/admin/'];
  for (const page of pages.filter(p => !privatePages.includes(p))) assert.match(sitemap, new RegExp(`<loc>${defaultContent.site.url}${page}</loc>`));
  for (const page of privatePages) {
    assert.doesNotMatch(sitemap, new RegExp(`${page}</loc>`));
    assert.match(await readFile(path.join(outDir, 'robots.txt'), 'utf8'), new RegExp(`Disallow: ${page}`));
  }
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
        const shared = /^\/(styles\.css|main\.js|home\.js|learn\.js|questions\.js|admin\.js|favicon\.svg|og\.png|images\/)/.test(clean);
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
  const list = await read('/workshops/');
  const ws2Card = list.match(/<article class="track c-blue[\s\S]*?<\/article>/)[0];
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
  assert.match((await ended.read('/workshops/')).match(/<article class="track c-blue[\s\S]*?<\/article>/)[0], /진행 완료/);
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
  const home = await read('/workshops/');
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
    const rows = html.match(/<li><a class="res-card[\s\S]*?<\/li>/g) ?? [];
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
  const noSlide = clone(defaultContent);
  delete noSlide.workshops[1].missions[0].slideId;
  assert.throws(() => validateContent(noSlide), /slideId/);
  const badOption = clone(defaultContent);
  badOption.workshops[0].missions.find(m => m.options).options[0].slide = 0;
  assert.throws(() => validateContent(badOption), /slideId/);
  const published = clone(defaultContent);
  published.workshops[1].resources.find(r => r.kind === 'slides').url = 'https://docs.google.com/presentation/d/e/2PACX-abc/pub';
  assert.throws(() => validateContent(published), /presentation\/d\/<ID>/);
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

test('mission text turns [글](주소) into links, but copy blocks stay plain', async t => {
  const content = clone(defaultContent);
  const m = content.workshops[0].missions[0];
  m.todo = '먼저 [저장소](https://github.com/example/repo)를 열고 [수업 목록](/learn/)도 봐요. <b>굵게</b>';
  m.expected = '[결과 예시](https://github.com/example/result)처럼 보여요.';
  m.verify = ['[확인 화면](/workshops/01/) 열기'];
  m.stuck = ['[문제 해결](https://github.com/example/help) 보기'];
  m.prompt = '[요청](https://github.com/example/prompt) 그대로';
  const html = await (await build(t, content)).read('/workshops/01/');
  const body = html.match(/<details class="mission" id="mission-open-starter"[\s\S]*?<\/details>\s*<details class="mission"/)[0];
  assert.match(body, /<a href="https:\/\/github\.com\/example\/repo" target="_blank" rel="noopener">저장소<span class="ext" aria-hidden="true">↗<\/span><span class="sr-only"> \(새 창\)<\/span><\/a>를 열고/);
  assert.match(body, /<a href="\/learn\/">수업 목록<\/a>/);
  assert.match(body, /&lt;b&gt;굵게&lt;\/b&gt;/);
  for (const url of ['example/result', 'example/help']) assert.match(body, new RegExp(`<a href="https://github\\.com/${url}" target="_blank"`));
  assert.match(body, /<li><a href="\/workshops\/01\/">확인 화면<\/a> 열기<\/li>/);
  assert.match(body, /<code>\[요청\]\(https:\/\/github\.com\/example\/prompt\) 그대로<\/code>/);
  // 쓸 수 없는 주소나 다른 모양은 글자 그대로 둡니다.
  assert.equal(String(richText('[a](http://x.test) [b](javascript:alert(1)) <i>')), '[a](http://x.test) [b](javascript:alert(1)) &lt;i&gt;');
  assert.equal(String(richText('[a](/x) "q"')), '<a href="/x">a</a> &quot;q&quot;');
});

test('hints render one details per hint before the result box, with the last of three as a walkthrough', async t => {
  const content = clone(defaultContent);
  const m = content.workshops[0].missions[1];
  m.hints = ['첫 힌트: [안내](https://github.com/example/hint) 보기', '둘째 힌트\n둘째 줄', '처음부터 차례로 따라 해요.'];
  const option = content.workshops[0].missions.find(x => x.options).options[0];
  option.hints = ['선택지 힌트'];
  const { read } = await build(t, content);
  for (const page of ['/workshops/01/', '/learn/01/']) {
    const html = await read(page);
    const step = html.split(`id="${page === '/learn/01/' ? 'step' : 'mission'}-${m.id}"`)[1].split('class="result"')[0];
    assert.match(step, /<div class="hints" data-hints>/);
    assert.match(step, /<details class="hint" data-hint="1"><summary>힌트 1 <span class="hint-verb">보기<\/span><\/summary><div class="hint-text">첫 힌트: <a href="https:\/\/github\.com\/example\/hint" target="_blank" rel="noopener">안내/);
    assert.match(step, /<details class="hint" data-hint="2"><summary>힌트 2 <span class="hint-verb">보기<\/span><\/summary><div class="hint-text">둘째 힌트\n둘째 줄<\/div>/);
    assert.match(step, /<details class="hint" data-hint="3"><summary>힌트 3 · 자세한 따라하기<\/summary>/);
    assert.doesNotMatch(step, /data-hint="\d"[^>]*hidden/);
    assert.match(html, /<details class="option"[\s\S]*?<details class="hint" data-hint="1"><summary>힌트 1 <span class="hint-verb">보기<\/span><\/summary><div class="hint-text">선택지 힌트<\/div>/);
  }
  // 힌트가 없는 미션에는 힌트 상자가 없습니다.
  const plain = clone(defaultContent);
  for (const w of plain.workshops) for (const x of w.missions) { delete x.hints; x.options?.forEach(o => delete o.hints); }
  assert.doesNotMatch(await (await build(t, plain)).read('/workshops/01/'), /data-hints/);
});

test('content validation rejects unusable inline links and malformed hints', () => {
  const at = (edit, pattern) => {
    const content = clone(defaultContent);
    edit(content.workshops[0].missions[0], content.workshops[0].missions.find(m => m.options).options[0]);
    assert.throws(() => validateContent(content), pattern);
  };
  at(m => { m.todo = '[저장소](http://github.com/x)'; }, /Workshop 1 open-starter\.todo: 글 속 링크 주소 "http:\/\/github\.com\/x"/);
  at(m => { m.expected = '[빈 주소]()'; }, /open-starter\.expected: 글 속 링크/);
  at(m => { m.verify = ['[빈칸](https://a b)']; }, /open-starter\.verify: 글 속 링크/);
  at(m => { m.stuck = ['[상대](docs/x)']; }, /open-starter\.stuck: 글 속 링크/);
  at((m, o) => { o.needs = '[키](#)'; }, /options\[0\]\.needs: 글 속 링크/);
  at(m => { m.hints = ['[x](ftp://x)']; }, /open-starter\.hints: 글 속 링크/);
  at(m => { m.hints = ['1', '2', '3', '4']; }, /open-starter\.hints: 힌트는 1~3개/);
  at(m => { m.hints = []; }, /hints: 힌트는 1~3개/);
  at(m => { m.hints = ['  ']; }, /hints: 힌트는 1~3개/);
  at(m => { m.hints = ['가'.repeat(801)]; }, /hints: 힌트는 1~3개/);
  at(m => { m.hints = '힌트'; }, /hints: 힌트는 1~3개/);
  at((m, o) => { o.hints = ['a', 'b', 'c', 'd']; }, /options\[0\]\.hints: 힌트는 1~3개/);
  const ok = clone(defaultContent);
  ok.workshops[0].missions[0].hints = ['[안내](https://github.com/x)', '두 번째', '가'.repeat(800)];
  ok.workshops[0].missions[0].todo = '[목록](/learn/) [메일](mailto:a@b.co)';
  assert.doesNotThrow(() => validateContent(ok));
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

test('each open workshop gets a lesson page with the student slides and every step', async t => {
  const { read } = await build(t, defaultContent, WS2_OPENS);
  const html = await read('/learn/02/');
  const ws2 = defaultContent.workshops[1];
  assert.match(html, /<iframe data-slides data-embed-base="https:\/\/docs\.google\.com\/presentation\/d\/1N_guFeYU5IbLcgVMR8LI8MYdEZup9dK0gm32qI8W4kE\/embed\?start=false&amp;loop=false&amp;delayms=60000&amp;slide=id\." src="[^"]+slide=id\.ws2_activity_20261019_01"/);
  for (const m of ws2.missions) assert.match(html, new RegExp(`data-step="${m.id}" data-slide-id="${m.slideId}"`));
  assert.equal((html.match(/class="lesson-step"/g) ?? []).length, ws2.missions.length);
  assert.match(html, /data-learn-content data-lesson="2" hidden/);
  assert.match(html, /<script src="\/learn\.js\?v=/);
  assert.match(await read('/learn/'), /href="\/learn\/02\/"/);
  const ws1 = await read('/learn/01/');
  assert.match(ws1, /<details class="option" data-slide-id="h2ea000745df279bf_2_267">/);
});

test('a lesson page does not exist before its workshop opens', async t => {
  const { outDir, read } = await build(t, defaultContent, WS2_OPENS - 60_000);
  assert.equal(await exists(path.join(outDir, 'learn/02/index.html')), false);
  assert.ok(await exists(path.join(outDir, 'learn/01/index.html')));
  assert.match(await read('/learn/'), /11\/2 \(월\) 18:00에 열려요/);
});

test('question and operator pages load their scripts in order and the lesson has ask buttons', async t => {
  const { read, outDir } = await build(t);
  const scripts = html => [...html.matchAll(/<script src="\/([a-z.]+)\?v=[0-9a-f]{10}" defer>/g)].map(m => m[1]);
  assert.deepEqual(scripts(await read('/learn/')), ['main.js', 'learn.js', 'questions.js']);
  assert.deepEqual(scripts(await read('/learn/01/')), ['main.js', 'learn.js', 'questions.js']);
  assert.deepEqual(scripts(await read('/learn/questions/')), ['main.js', 'learn.js', 'questions.js']);
  const admin = await read('/admin/');
  assert.deepEqual(scripts(admin), ['main.js', 'learn.js', 'questions.js', 'admin.js']);
  assert.match(admin, /data-admin/);
  assert.match(await read('/learn/questions/'), /data-questions/);
  const raw = /data-steps=(["'])(.*?)\1/.exec(admin)[2];
  const json = raw.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  const steps = JSON.parse(json);
  assert.deepEqual(steps[0].steps.map(s => s.id), ['open-starter', 'run-local', 'first-change', 'connect-feature']);
  assert.equal(steps[0].number, 1);
  const lesson = await read('/learn/01/');
  assert.equal((lesson.match(/data-ask-open/g) ?? []).length, defaultContent.workshops[0].missions.length);
  // 내 질문 링크와 답변 수 칸은 학습실 상단 바에 있습니다.
  for (const page of ['/learn/', '/learn/01/', '/learn/questions/', '/admin/']) assert.match(await read(page), /<a href="\/learn\/questions\/"[^>]*>내 질문 <span data-answer-count><\/span><\/a>/);
  assert.doesNotMatch(await read('/'), /href="\/admin\//);
  for (const name of ['questions.js', 'admin.js']) assert.ok(await exists(path.join(outDir, name)));
  const routes = JSON.parse(await readFile(path.join(outDir, '_routes.json'), 'utf8'));
  assert.ok(routes.exclude.includes('/questions.js') && routes.exclude.includes('/admin.js'));
});

test('the question list page carries the step names', async t => {
  const { read } = await build(t);
  const raw = /data-steps=(["'])(.*?)\1/.exec(await read('/learn/questions/'))[2];
  const steps = JSON.parse(raw.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'));
  assert.deepEqual(steps[0].steps.map(s => s.id), ['open-starter', 'run-local', 'first-change', 'connect-feature']);
});

test('lesson ask buttons point at their ask boxes', async t => {
  const { read } = await build(t);
  const lesson = await read('/learn/01/');
  const buttons = [...lesson.matchAll(/<button[^>]*data-ask-open[^>]*>/g)].map(m => m[0]);
  assert.equal(buttons.length, defaultContent.workshops[0].missions.length);
  for (const tag of buttons) {
    assert.match(tag, /aria-expanded="false"/);
    const target = /aria-controls="([^"]+)"/.exec(tag)[1];
    assert.match(lesson, new RegExp(`<div class="ask" data-ask id="${target}" hidden>`));
  }
});

test('learn pages use the study layout without the portal menu, other pages keep it', async t => {
  const { read } = await build(t);
  for (const page of ['/learn/', '/learn/01/', '/learn/questions/', '/admin/']) {
    const html = await read(page);
    assert.match(html, /<body class="study">/, `${page} uses the study layout`);
    assert.doesNotMatch(html, /class="sidebar"|class="topbar"|class="mobile-menu"|class="site-footer"/, `${page} has no portal menu`);
    const bar = html.match(/<header class="study-bar">[\s\S]*?<\/header>/)[0];
    for (const href of ['/', '/learn/', '/learn/questions/']) assert.match(bar, new RegExp(`href="${href}"`), `${page} top bar links ${href}`);
    assert.match(bar, /data-learn-user/);
    // 로그인 카드 안의 확인 칸은 그대로, 화면 내용은 로그인 전까지 숨김
    assert.match(html, /<section class="study-login" data-learn-login>[\s\S]*?data-learn-gate/);
    assert.match(html, /data-learn-content[^>]*hidden/);
  }
  assert.match(await read('/learn/'), /<nav class="study-nav"[^>]*><a href="\/learn\/" aria-current="page">수업<\/a>/);
  assert.match(await read('/learn/questions/'), /<a href="\/learn\/questions\/" aria-current="page">/);
  for (const page of ['/', '/workshops/01/', '/about/']) {
    const html = await read(page);
    assert.match(html, /<aside class="sidebar">/);
    assert.doesNotMatch(html, /class="study/);
  }
});

test('the course list links every step of an open workshop and shows locked ones without steps', async t => {
  const { read } = await build(t);
  const html = await read('/learn/');
  const ws1 = defaultContent.workshops[0];
  const panel = html.match(/<section class="course c-green" data-course="1"[\s\S]*?<\/section>/)[0];
  for (const m of ws1.missions) assert.match(panel, new RegExp(`<a class="course-step" href="/learn/01/#step-${m.id}" data-step-link="${m.id}">`));
  assert.match(panel, new RegExp(`data-continue href="/learn/01/#step-${ws1.missions[0].id}"`));
  assert.match(panel, new RegExp(`0/${ws1.missions.length} 완료`));
  assert.match(html, /data-progress-text>0 \/ 4 단계</);
  const locked = html.match(/<section class="course is-locked c-blue"[\s\S]*?<\/section>/)[0];
  assert.match(locked, /🔒<\/span> 11\/2 \(월\) 18:00에 열려요 · 4단계/);
  assert.doesNotMatch(locked, /href=|data-step-link/);
  assert.doesNotMatch(html, /class="learn-links"/);
});

test('the lesson page has a step tab bar, then the slides beside the current step, and a progress header', async t => {
  const { read } = await build(t);
  const html = await read('/learn/01/');
  const ws1 = defaultContent.workshops[0];
  const nav = html.match(/<nav class="lesson-tabs" aria-label="단계">[\s\S]*?<\/nav>/)[0];
  const gotos = [...nav.matchAll(/<button type="button" class="step-tab" data-goto="([^"]+)" title="(\d\d) [^"]+">/g)].map(m => m[1]);
  assert.deepEqual(gotos, ws1.missions.map(m => m.id));
  assert.equal((html.match(/data-goto=/g) ?? []).length, ws1.missions.length);
  assert.match(nav, /<span class="step-mark" aria-hidden="true">○<\/span><span class="step-no">01<\/span><span class="step-title">/);
  assert.doesNotMatch(html, /data-lesson-toc|data-toc-count|class="lesson-nav"|class="toc/);
  // 탭 줄 다음에 슬라이드(왼쪽)와 단계 설명(오른쪽)이 같은 줄에 놓입니다.
  assert.match(html, /<\/nav>\s*<div class="lesson-body">\s*<div class="lesson-slides">[\s\S]*?<\/div>\s*<div class="lesson-steps">/);
  assert.match(html, /<a class="lesson-back" href="\/learn\/">← 수업 목록<\/a>/);
  assert.match(html, /<header class="lesson-head">[\s\S]*?data-progress-text>0\/4 완료</);
  assert.doesNotMatch(html, /lesson-dots/);
  const script = await readFile(new URL('../src/learn.js', import.meta.url), 'utf8');
  assert.doesNotMatch(script, /lesson-toc|toc-count/);
});

test('the lesson page has a finish screen that opens once every step is done', async t => {
  const { read } = await build(t);
  const html = await read('/learn/01/');
  const ws1 = defaultContent.workshops[0];
  // 완료 탭은 모든 단계를 끝내기 전에는 숨겨 둡니다.
  assert.match(html, /<li data-finish-tab hidden><button type="button" class="step-tab step-tab-finish" data-finish-open>/);
  const finish = html.match(/<section class="lesson-finish" data-finish tabindex="-1" hidden>[\s\S]*?<\/section>/)[0];
  assert.match(html, /<\/div>\s*<\/div>\s*<section class="lesson-finish"/);
  assert.match(finish, /Workshop 01을 모두 마쳤어요!/);
  assert.equal((finish.match(/class="finish-step"/g) ?? []).length, ws1.missions.length);
  assert.match(finish, /<a class="btn btn-fill" href="\/learn\/">수업 목록으로<\/a>/);
  assert.match(finish, /<button type="button" class="btn btn-ghost" data-restart>단계 다시 보기<\/button>/);
  // 다음 회차가 아직 잠겨 있으면 여는 시각을, 열려 있으면 바로가기를 보여줍니다.
  assert.match(finish, /Workshop 02는 11\/2 \(월\) 18:00에 열려요/);
  assert.doesNotMatch(finish, /href="\/learn\/02\/"/);
  const script = await readFile(new URL('../src/learn.js', import.meta.url), 'utf8');
  assert.match(script, /function showFinish\(/);
});

test('only the last step has a finish button; earlier steps save progress with 다음', async t => {
  const { read } = await build(t);
  const html = await read('/learn/01/');
  const ws1 = defaultContent.workshops[0];
  const sections = [...html.matchAll(/<section class="lesson-step"[\s\S]*?<\/section>/g)].map(m => m[0]);
  assert.equal(sections.length, ws1.missions.length);
  sections.forEach((section, i) => {
    const last = i === sections.length - 1;
    assert.equal(/data-done/.test(section.replace(/data-done-status/g, '')), last);
    assert.equal(/data-next/.test(section), !last);
  });
  assert.match(sections.at(-1), /<button type="button" class="btn btn-fill" data-done aria-pressed="false">실습 완료<\/button>/);
  assert.match(sections[0], /<button type="button" class="btn btn-fill" data-next>다음 →<\/button>/);
});

test('the signed-in preview only turns on at localhost', async () => {
  const source = await readFile(new URL('../src/learn.js', import.meta.url), 'utf8');
  assert.match(source, /const preview = location\.hostname === 'localhost' && params\.has\('preview'\);/);
  // 가짜 응답은 preview일 때만 씁니다.
  assert.equal((source.match(/previewApi\(/g) ?? []).length, 2);
  assert.match(source, /if \(preview\) return previewApi\(path\);/);
});

test('home shows the next workshop with a calendar, a map and calendar links instead of every workshop', async t => {
  const { outDir, read } = await build(t);
  const home = await read('/');
  assert.doesNotMatch(home, /<article class="track/, 'all workshop cards live on /workshops/');
  const next = home.match(/<section class="next-ws[\s\S]*?<\/section>/)[0];
  assert.match(next, /Workshop 02 · 고치고, 기록하고, 공개하기/);
  assert.match(next, /<caption>2026년 11월/);
  assert.match(next, /<td data-date="2026-11-02" class="is-event"><span>2<\/span><\/td>/);
  assert.match(next, /data-dday="2026-11-02T18:00:00\+09:00"/);
  assert.match(next, /<iframe src="https:\/\/www\.google\.com\/maps\?q=%EC%84%9C%EC%9A%B8%EB%8C%80%ED%95%99%EA%B5%90%2056%EB%8F%99&amp;hl=ko/);
  assert.match(next, /href="https:\/\/map\.naver\.com\/p\/search\/[^"]+"[^>]*>네이버 지도/);
  assert.match(next, /href="https:\/\/map\.kakao\.com\/link\/search\/[^"]+"[^>]*>카카오맵/);
  assert.match(next, /href="https:\/\/calendar\.google\.com\/calendar\/render\?action=TEMPLATE[^"]*dates=20261102T090000Z%2F20261102T100000Z/);
  assert.match(next, /href="\/workshops\/02\/event\.ics" download/);
  assert.match(next, /href="https:\/\/luma\.com\/54mgt7n8"[^>]*>신청하기/);
  assert.match(home, /data-globe/);
  assert.match(home, /<script src="\/home\.js\?v=/);

  const ics = await readFile(path.join(outDir, 'workshops/02/event.ics'), 'utf8');
  assert.match(ics, /^BEGIN:VCALENDAR\r\n/);
  assert.match(ics, /\r\nDTSTART:20261102T090000Z\r\nDTEND:20261102T100000Z\r\n/);
  assert.ok(ics.includes('\r\nSUMMARY:Workshop 2 · 고치고\\, 기록하고\\, 공개하기\r\n'), 'commas in the title are escaped');
  for (const line of ics.split('\r\n')) assert.ok(new TextEncoder().encode(line).length <= 75, `ics line too long: ${line}`);
});

test('after the last dated workshop ends, home says the next one is being prepared', async t => {
  const { read } = await build(t, defaultContent, WS2_ENDS);
  const home = await read('/');
  assert.match(home, /다음 워크숍 일정을 준비하고 있어요/);
  assert.doesNotMatch(home, /<iframe|class="cal"/);
});
