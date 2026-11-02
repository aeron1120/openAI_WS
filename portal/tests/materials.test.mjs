import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { buildSite, defaultContent } from '../scripts/build.mjs';
import { onRequest } from '../functions/_middleware.js';

test('saved release controls pages, lesson, slides and examples together without a rebuild', async t => {
  const outDir = await mkdtemp(path.join(os.tmpdir(), 'portal-materials-'));
  t.after(() => rm(outDir, { recursive: true, force: true }));
  const now = Date.parse('2026-11-02T09:00:00Z');
  await buildSite({ outDir, now });
  t.mock.timers.enable({ apis: ['Date'], now });
  let mode = 'closed';
  let failing = false;
  let redirecting = false;
  t.mock.method(globalThis, 'fetch', async (input, init) => {
    // Workers는 Node의 Fetch와 달리 redirect: 'error'를 지원하지 않습니다.
    if (init.redirect === 'error') throw new TypeError('Unsupported redirect mode');
    assert.equal(init.redirect, 'manual', 'shared secret must not follow redirects');
    assert.equal(new URL(input).pathname, '/api/materials');
    assert.equal(new Headers(init.headers).get('x-proxy-secret'), 'test-secret');
    if (failing) throw new Error('offline');
    if (redirecting) return new Response(null, { status: 302, headers: { location: 'https://unexpected.test/' } });
    return Response.json({ materials: [
      { workshop: 1, mode: 'open', opensAt: null, open: true },
      { workshop: 2, mode, opensAt: mode === 'scheduled' ? '2026-11-02T10:30:00Z' : null, open: mode === 'open' }
    ] });
  });
  const env = { LEARN_API_ORIGIN: 'https://learn.test', PROXY_SECRET: 'test-secret', ASSETS: {
    async fetch(input) {
      const { pathname } = new URL(input.url ?? input);
      try { return new Response(await readFile(path.join(outDir, decodeURIComponent(pathname), pathname.endsWith('/') ? 'index.html' : ''))); }
      catch { return new Response('missing', { status: 404 }); }
    }
  } };
  const get = (route, method = 'GET') => onRequest({ request: new Request(`https://portal.test${route}`, { method }), env, next: () => new Response('unsafe fallback', { status: 299 }) });
  const ws2 = defaultContent.workshops.find(w => w.number === 2);
  const deck = /\/d\/([^/]+)/.exec(ws2.resources.find(r => r.kind === 'slides').url)[1];
  const slide = `/slides/${deck}/${defaultContent.decks[deck].pages[0].file}`;
  const privateRoutes = ['/learn/02/', slide, '/examples/workshop2/complete/', '/examples/workshop2/complete/app.js'];
  for (const route of privateRoutes) assert.equal((await get(route)).status, 404, route);
  for (const route of ['/workshops/02/', '/en/workshops/02/', '/learn/']) {
    assert.doesNotMatch(await (await get(route)).text(), /href="\/learn\/02\/"/);
  }
  mode = 'open';
  for (const route of privateRoutes) assert.equal((await get(route)).status, 200, route);
  assert.match(await (await get('/workshops/02/')).text(), /href="\/learn\/02\/"/);
  assert.equal((await get('/_v/runtime.json')).status, 404);
  assert.equal((await get(`/_v/materials${slide}`)).status, 404);
  mode = 'scheduled';
  const scheduled = await (await get('/workshops/02/')).text();
  assert.match(scheduled, /19:30/);
  assert.match(scheduled, /18:00/, 'event time stays independent of material release');
  assert.equal((await get('/learn/02/')).status, 404);
  mode = 'closed';
  for (const route of privateRoutes) assert.equal((await get(route, 'HEAD')).status, 404, route);
  redirecting = true;
  assert.equal((await get('/workshops/02/')).status, 503, 'an upstream redirect is refused');
  redirecting = false;
  failing = true;
  assert.equal((await get('/learn/02/')).status, 503);
  assert.equal((await get(slide)).status, 503);
  assert.equal((await get('/workshops/02/')).headers.get('cache-control'), 'no-store');
  assert.equal((await get('/admin/')).status, 200, 'operators can still reach settings errors');
});
