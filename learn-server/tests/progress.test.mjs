import test from 'node:test';
import assert from 'node:assert/strict';
import { ENV, api, login, makeApp } from './helpers.mjs';

// NOW(2026-10-27 21:00 KST) 기준: 1회차 열림, 2회차 닫힘
const OPEN = { ...ENV, WORKSHOP_OPEN_AT: JSON.stringify({ 1: '2026-10-26T18:00:00+09:00', 2: '2026-11-02T18:00:00+09:00' }) };
const portal = { origin: 'https://portal.test' };

async function signedIn(state = {}, env = OPEN) {
  const flow = makeApp(state, env);
  const { session } = await login(flow);
  return { ...flow, session };
}

test('a student marks, lists and unmarks steps of an open workshop', async () => {
  const { app, session, state } = await signedIn();
  const put = await app(api('/api/progress/1/run-local', { method: 'PUT', cookie: session, headers: portal }));
  assert.equal(put.status, 200);
  assert.deepEqual(await put.json(), { workshop: 1, step: 'run-local', done: true });
  await app(api('/api/progress/1/run-local', { method: 'PUT', cookie: session, headers: portal }));
  assert.equal(state.progress.length, 1);
  assert.equal(state.progress[0].student_id, 'student-1');
  const list = await (await app(api('/api/progress', { cookie: session }))).json();
  assert.deepEqual(list, { progress: [{ workshop: 1, step: 'run-local', completedAt: '2026-10-27T12:00:00.000Z' }] });
  const del = await app(api('/api/progress/1/run-local', { method: 'DELETE', cookie: session, headers: portal }));
  assert.deepEqual(await del.json(), { workshop: 1, step: 'run-local', done: false });
  assert.deepEqual((await (await app(api('/api/progress', { cookie: session }))).json()).progress, []);
});

test('progress needs a login, the portal origin and an open workshop', async () => {
  const { app, session } = await signedIn();
  assert.equal((await app(api('/api/progress'))).status, 401);
  assert.equal((await app(api('/api/progress/1/run-local', { method: 'PUT', cookie: session }))).status, 403);
  const closed = await app(api('/api/progress/2/compare', { method: 'PUT', cookie: session, headers: portal }));
  assert.equal(closed.status, 403);
  assert.equal((await closed.json()).error, 'WORKSHOP_CLOSED');
  assert.equal((await app(api('/api/progress/3/x', { method: 'PUT', cookie: session, headers: portal }))).status, 403);
});

test('bad step paths and methods are rejected', async () => {
  const { app, session } = await signedIn();
  for (const path of ['/api/progress/1/Bad_Step', '/api/progress/1/', '/api/progress/x/run-local', `/api/progress/1/${'a'.repeat(41)}`]) {
    assert.equal((await app(api(path, { method: 'PUT', cookie: session, headers: portal }))).status, 404, path);
  }
  assert.equal((await app(api('/api/progress', { method: 'POST', cookie: session, headers: portal }))).status, 405);
  assert.equal((await app(api('/api/progress/1/run-local', { cookie: session }))).status, 405);
});

test('without WORKSHOP_OPEN_AT every workshop is closed', async () => {
  const { app, session } = await signedIn({}, ENV);
  assert.equal((await app(api('/api/progress/1/run-local', { method: 'PUT', cookie: session, headers: portal }))).status, 403);
});

test('database errors become a generic 500', async () => {
  const { app, session, state } = await signedIn();
  state.dbStatus = 500;
  const response = await app(api('/api/progress', { cookie: session }));
  assert.equal(response.status, 500);
  assert.equal((await response.json()).error, 'SERVER_ERROR');
});
