import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.mjs';
import { ENV, NOW, api, loginAs, makeApp, memoryDb, send } from './helpers.mjs';

const env = { ...ENV, WORKSHOP_OPEN_AT: JSON.stringify({ 1: '2026-10-26T18:00:00+09:00', 2: '2026-11-02T18:00:00+09:00' }) };

async function setup() {
  const db = memoryDb();
  const clock = { now: NOW };
  const flow = makeApp({}, env, { db, now: () => clock.now });
  return { ...flow, db, clock, operator: await loginAs(flow, 9, 'op@snu.ac.kr'), student: await loginAs(flow, 1) };
}
const update = (flow, body, options = {}) => send(flow.app, '/api/admin/materials/2', flow.operator, { method: 'PUT', body, ...options });

test('operators control release; anonymous, student, direct and cross-origin writes are rejected', async () => {
  const flow = await setup();
  assert.equal((await flow.app(api('/api/admin/materials'))).status, 401);
  assert.equal((await flow.app(api('/api/admin/materials', { cookie: flow.student }))).status, 403);
  assert.equal((await send(flow.app, '/api/admin/materials/2', flow.student, { method: 'PUT', body: { mode: 'open' } })).status, 403);
  assert.equal((await update(flow, { mode: 'open' }, { origin: 'https://other.test' })).status, 403);
  assert.equal((await flow.app(api('/api/materials', { proxy: false }))).status, 403);
  const before = await flow.app(api('/api/admin/materials', { cookie: flow.operator }));
  assert.equal(before.status, 200);
  const { materials } = await before.json();
  assert.equal(materials.find(w => w.workshop === 2).mode, 'scheduled');
  assert.equal(materials.find(w => w.workshop === 2).open, false);
  assert.equal((await update(flow, { mode: 'open' })).status, 200);
  const state = await (await flow.app(api('/api/materials'))).json();
  assert.equal(state.materials.find(w => w.workshop === 2).open, true);
  assert.doesNotMatch(JSON.stringify(state), /op@snu|updatedBy|updated_by/);
});

test('saved release persists across app restarts and gates progress and new questions', async () => {
  const flow = await setup();
  assert.equal((await update(flow, { mode: 'open' })).status, 200);
  flow.app = createApp({ env, db: flow.db, now: () => flow.clock.now });
  const progress = () => send(flow.app, '/api/progress/2/publish-site', flow.student, { method: 'PUT' });
  const question = () => send(flow.app, '/api/questions', flow.student, { body: { workshop: 2, step: 'publish-site', body: '배포가 막혔어요' } });
  assert.equal((await progress()).status, 200);
  assert.equal((await question()).status, 201);
  assert.equal((await update(flow, { mode: 'closed' })).status, 200);
  assert.equal((await progress()).status, 403);
  assert.equal((await question()).status, 403);
  assert.deepEqual((await (await flow.app(api('/api/health'))).json()).openWorkshops, [1]);
  assert.equal((await flow.app(api('/api/progress', { cookie: flow.student }))).status, 200, 'existing progress remains readable');
});

test('rescheduling uses Korea time and opens at the exact saved boundary', async () => {
  const flow = await setup();
  const release = '2026-11-02T19:30:00+09:00';
  assert.equal((await update(flow, { mode: 'scheduled', opensAt: release })).status, 200);
  flow.clock.now = Date.parse(release) - 1;
  assert.equal((await (await flow.app(api('/api/materials'))).json()).materials.find(w => w.workshop === 2).open, false);
  flow.clock.now++;
  assert.equal((await (await flow.app(api('/api/materials'))).json()).materials.find(w => w.workshop === 2).open, true);
});

test('invalid settings, impossible dates and unknown workshops cannot overwrite release settings', async () => {
  const flow = await setup();
  for (const body of [null, [], {}, { mode: 'unknown' }, { mode: 'scheduled' },
    { mode: 'scheduled', opensAt: '2026-11-02T19:00' },
    { mode: 'scheduled', opensAt: '2026-02-30T19:00:00+09:00' },
    { mode: 'scheduled', opensAt: '2026-11-02T24:00:00+09:00' }]) {
    assert.equal((await update(flow, body)).status, 400, JSON.stringify(body));
  }
  assert.equal((await send(flow.app, '/api/admin/materials/99', flow.operator, { method: 'PUT', body: { mode: 'open' } })).status, 404);
  assert.equal((await update(flow, { mode: 'open' }, { method: 'POST' })).status, 405);
  assert.equal((await (await flow.app(api('/api/materials'))).json()).materials.find(w => w.workshop === 2).open, false);
});

test('storage failures do not silently fall back to an earlier public release', async () => {
  const flow = await setup();
  flow.db.listMaterialSettings = async () => { throw new Error('database unavailable'); };
  assert.equal((await flow.app(api('/api/materials'))).status, 503);
  assert.equal((await send(flow.app, '/api/progress/1/run-local', flow.student, { method: 'PUT' })).status, 503);
});
