import test from 'node:test';
import assert from 'node:assert/strict';
import { ENV, api, cookiesFrom, login, makeApp } from './helpers.mjs';
import { sign } from '../session.mjs';

const errorOf = response => new URL(response.headers.get('location')).searchParams.get('error');

test('health answers without the proxy secret and reports configuration', async () => {
  const { app } = makeApp();
  assert.deepEqual(await (await app(api('/api/health', { proxy: false }))).json(), { ok: true, configured: true });
  const bare = makeApp({}, { ...ENV, GOOGLE_CLIENT_SECRET: '' }).app;
  assert.deepEqual(await (await bare(api('/api/health'))).json(), { ok: true, configured: false });
  assert.equal((await bare(api('/api/me'))).status, 503);
});

test('requests that skip the portal proxy are rejected', async () => {
  const { app } = makeApp();
  assert.equal((await app(api('/api/me', { proxy: false }))).status, 403);
  assert.equal((await app(api('/api/me', { headers: { 'x-proxy-secret': 'wrong' }, proxy: false }))).status, 403);
});

test('login starts at Google with an SNU hint and a short-lived state cookie', async () => {
  const { app } = makeApp();
  const start = await app(api('/api/auth/google?next=%2Flearn%2F02%2F'));
  assert.equal(start.status, 302);
  const google = new URL(start.headers.get('location'));
  assert.equal(google.searchParams.get('hd'), 'snu.ac.kr');
  assert.equal(google.searchParams.get('redirect_uri'), 'https://portal.test/api/auth/google/callback');
  assert.match(start.headers.getSetCookie()[0], /^__Host-learn_oauth=.+; Path=\/; HttpOnly; Secure; SameSite=Lax; Max-Age=600$/);
});

test('an SNU student is saved, gets a session and returns to the requested page', async () => {
  const flow = makeApp();
  const { callback, session } = await login(flow, { next: '/learn/02/' });
  assert.equal(callback.status, 302);
  assert.equal(callback.headers.get('location'), 'https://portal.test/learn/02/');
  assert.match(callback.headers.getSetCookie().join('\n'), /__Host-learn_session=.+Max-Age=1209600/);
  assert.match(callback.headers.getSetCookie().join('\n'), /__Host-learn_oauth=; .*Max-Age=0/);
  assert.deepEqual(flow.state.upserts[0].body, { google_sub: 'google-123', email: 'student@snu.ac.kr', name: '김학생', last_seen_at: '2026-10-27T12:00:00.000Z' });
  const me = await flow.app(api('/api/me', { cookie: session }));
  assert.deepEqual(await me.json(), { user: { email: 'student@snu.ac.kr', name: '김학생', operator: false } });
});

test('operators are recognised from OPERATOR_EMAILS', async () => {
  const flow = makeApp();
  const { session } = await login(flow, { override: { email: 'op@snu.ac.kr' } });
  assert.equal((await (await flow.app(api('/api/me', { cookie: session }))).json()).user.operator, true);
});

test('next must stay inside /learn/ or /admin/', async () => {
  for (const next of ['https://evil.test/', '//evil.test/', '/workshops/', '/learn/../x', 'javascript:alert(1)']) {
    const { callback } = await login(makeApp(), { next });
    assert.equal(callback.headers.get('location'), 'https://portal.test/learn/', next);
  }
  assert.equal((await login(makeApp(), { next: '/admin/' })).callback.headers.get('location'), 'https://portal.test/admin/');
});

test('non-SNU accounts never get a session', async () => {
  for (const override of [{ email: 'a@gmail.com', hd: undefined }, { hd: 'other.ac.kr' }, { email_verified: false }]) {
    const flow = makeApp();
    const { callback, session } = await login(flow, { override });
    assert.equal(errorOf(callback), 'not_snu');
    assert.equal(session, '');
    assert.equal(flow.state.upserts.length, 0);
  }
});

test('state mismatch, cancel, missing state cookie and Google or database failures are reported', async () => {
  assert.equal(errorOf((await login(makeApp(), { callbackQuery: 'code=c&state=wrong' })).callback), 'failed');
  assert.equal(errorOf((await login(makeApp(), { callbackQuery: 'error=access_denied' })).callback), 'cancelled');
  assert.equal(errorOf(await makeApp().app(api('/api/auth/google/callback?code=c&state=s'))), 'expired');
  assert.equal(errorOf((await login(makeApp({ tokenStatus: 400 }))).callback), 'failed');
  assert.equal(errorOf((await login(makeApp({ dbStatus: 500 }))).callback), 'failed');
});

test('forged or expired sessions are refused', async () => {
  const { app } = makeApp();
  assert.equal((await app(api('/api/me'))).status, 401);
  const forged = sign({ kind: 'session', sid: 'x', email: 'a@snu.ac.kr', name: 'a', exp: 9e9 }, 'z'.repeat(40));
  assert.equal((await app(api('/api/me', { cookie: `__Host-learn_session=${forged}` }))).status, 401);
  const expired = sign({ kind: 'session', sid: 'x', email: 'a@snu.ac.kr', name: 'a', exp: 1 }, ENV.SESSION_SECRET);
  assert.equal((await app(api('/api/me', { cookie: `__Host-learn_session=${expired}` }))).status, 401);
});

test('logout needs the portal origin and clears the session', async () => {
  const flow = makeApp();
  const { session } = await login(flow);
  assert.equal((await flow.app(api('/api/session', { method: 'DELETE', cookie: session }))).status, 403);
  const out = await flow.app(api('/api/session', { method: 'DELETE', cookie: session, headers: { origin: 'https://portal.test' } }));
  assert.equal(out.status, 200);
  assert.match(out.headers.getSetCookie()[0], /^__Host-learn_session=; .*Max-Age=0$/);
});

test('unknown routes are 404 JSON', async () => {
  const response = await makeApp().app(api('/api/nothing'));
  assert.equal(response.status, 404);
  assert.equal((await response.json()).error, 'NOT_FOUND');
});
