import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { handleAuth } from '../server/auth.mjs';

const origin = 'https://demo.example';
const env = { GOOGLE_CLIENT_ID: 'workshop.apps.googleusercontent.com', SESSION_SECRET: 'a'.repeat(64) };
const timestamp = Date.parse('2026-10-26T10:00:00Z');
const now = () => timestamp;
let keys, jwk;
before(async () => {
  keys = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
  jwk = { ...await crypto.subtle.exportKey('jwk', keys.publicKey), kid: 'test-key', alg: 'RS256', use: 'sig' };
});
const encode = value => Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)).toString('base64url');
async function token(nonce, changes = {}, headerChanges = {}) {
  const header = encode({ alg: 'RS256', kid: 'test-key', typ: 'JWT', ...headerChanges });
  const body = encode({ iss: 'https://accounts.google.com', aud: env.GOOGLE_CLIENT_ID, sub: 'google-user-123', iat: timestamp / 1000, exp: timestamp / 1000 + 3600, nonce, name: '홍길동', picture: 'https://lh3.googleusercontent.com/avatar', ...changes });
  const payload = `${header}.${body}`;
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', keys.privateKey, new TextEncoder().encode(payload));
  return `${payload}.${Buffer.from(signature).toString('base64url')}`;
}
const fetchImpl = async url => {
  assert.equal(url, 'https://www.googleapis.com/oauth2/v3/certs');
  return Response.json({ keys: [jwk] }, { headers: { 'cache-control': 'max-age=3600' } });
};
function request(path, body, cookie, source = origin) {
  const headers = { origin: source };
  if (cookie) headers.cookie = cookie;
  if (body !== undefined) headers['content-type'] = 'application/json';
  return new Request(`${origin}/api/auth/${path}`, { method: body === undefined ? 'GET' : 'POST', headers, body: body === undefined ? undefined : JSON.stringify(body) });
}
const run = (req, override = {}) => handleAuth(req, env, { now, fetchImpl, ...override });
async function challenge() {
  const response = await run(request('nonce'));
  assert.equal(response.status, 200);
  return { nonce: (await response.json()).nonce, cookie: response.headers.get('set-cookie').split(';')[0] };
}

test('unconfigured server exposes no secret and does not offer login', async () => {
  const response = await handleAuth(request('config'), {});
  assert.deepEqual(await response.json(), { configured: false, clientId: null });
  assert.equal((await handleAuth(request('nonce'), {})).status, 503);
});

test('valid Google login creates secure cookie; refresh retains profile; logout expires cookie', async () => {
  const { nonce, cookie } = await challenge();
  const response = await run(request('google', { credential: await token(nonce) }, cookie));
  assert.equal(response.status, 200);
  const { user } = await response.json();
  assert.equal(user.name, '홍길동');
  assert.equal(user.id, 'google-user-123');
  const cookies = response.headers.getSetCookie();
  const session = cookies.find(value => value.startsWith('__Host-workshop_session='));
  assert.match(session, /HttpOnly/);
  assert.match(session, /Secure/);
  assert.match(session, /SameSite=Lax/);
  assert.match(session, /Path=\//);
  assert.ok(!session.includes('Domain='));
  const refreshed = await run(request('session', undefined, session.split(';')[0]));
  assert.deepEqual((await refreshed.json()).user, user);
  const loggedOut = await run(request('logout', {}, session.split(';')[0]));
  assert.equal(loggedOut.status, 200);
  assert.match(loggedOut.headers.get('set-cookie'), /Max-Age=0/);
  const expired = await run(request('session', undefined, session.split(';')[0]), { now: () => timestamp + 9 * 3600 * 1000 });
  assert.equal((await expired.json()).user, null);
});

test('rejects cross-origin login and logout before contacting Google', async () => {
  const noFetch = async () => assert.fail('must not fetch');
  assert.equal((await run(request('google', { credential: 'anything' }, null, 'https://attacker.example'), { fetchImpl: noFetch })).status, 403);
  assert.equal((await run(request('logout', {}, null, 'https://attacker.example'), { fetchImpl: noFetch })).status, 403);
});

test('rejects missing, tampered and expired nonce cookie', async () => {
  const { nonce, cookie } = await challenge();
  const credential = await token(nonce);
  assert.equal((await run(request('google', { credential }))).status, 401);
  assert.equal((await run(request('google', { credential }, `${cookie}x`))).status, 401);
  assert.equal((await run(request('google', { credential }, cookie), { now: () => timestamp + 11 * 60 * 1000 })).status, 401);
});

test('rejects invalid claims, wrong nonce, algorithm and signature', async () => {
  for (const changes of [
    { aud: 'attacker.apps.googleusercontent.com' },
    { iss: 'https://attacker.example' },
    { exp: timestamp / 1000 - 1 },
    { iat: timestamp / 1000 + 600 },
    { nonce: 'wrong-nonce' },
    { sub: '' },
    { azp: 'attacker.apps.googleusercontent.com' },
  ]) {
    const { nonce, cookie } = await challenge();
    assert.equal((await run(request('google', { credential: await token(nonce, changes) }, cookie))).status, 401, JSON.stringify(changes));
  }
  const { nonce, cookie } = await challenge();
  assert.equal((await run(request('google', { credential: await token(nonce, {}, { alg: 'none' }) }, cookie))).status, 401);
  const signed = await token(nonce);
  const parts = signed.split('.');
  parts[1] = encode({ ...JSON.parse(Buffer.from(parts[1], 'base64url')), name: 'forged' });
  assert.equal((await run(request('google', { credential: parts.join('.') }, cookie))).status, 401);
});

test('rejects forged session and strips untrusted image origins from valid profile', async () => {
  assert.equal((await (await run(request('session', undefined, '__Host-workshop_session=forged.value'))).json()).user, null);
  const { nonce, cookie } = await challenge();
  const response = await run(request('google', { credential: await token(nonce, { picture: 'https://attacker.example/tracker' }) }, cookie));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).user.picture, null);
});

test('rejects malformed input, wrong HTTP method and unknown paths', async () => {
  assert.equal((await run(request('google'))).status, 405);
  assert.equal((await run(request('logout'))).status, 405);
  assert.equal((await run(request('no-such-route'))).status, 404);
  const malformed = new Request(`${origin}/api/auth/google`, { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: '{broken' });
  assert.equal((await run(malformed)).status, 400);
});

test('Google key-service failure is explicit and does not expose credential or configuration', async () => {
  const { nonce, cookie } = await challenge();
  const credential = await token(nonce);
  const response = await run(request('google', { credential }, cookie), { fetchImpl: async () => { throw new Error('private diagnostic'); } });
  assert.equal(response.status, 503);
  const body = await response.text();
  assert.ok(!body.includes(credential));
  assert.ok(!body.includes(env.SESSION_SECRET));
  assert.ok(!body.includes('private diagnostic'));
  assert.equal(JSON.parse(body).error, 'GOOGLE_UNAVAILABLE');
});

test('nonce and session cookies cannot be reused at another deployment origin', async () => {
  const { nonce, cookie } = await challenge();
  const credential = await token(nonce);
  const other = new Request('https://other.example/api/auth/google', { method: 'POST', headers: { origin: 'https://other.example', cookie, 'content-type': 'application/json' }, body: JSON.stringify({ credential }) });
  assert.equal((await run(other)).status, 401);
  const signedIn = await run(request('google', { credential }, cookie));
  const session = signedIn.headers.getSetCookie().find(value => value.startsWith('__Host-workshop_session=')).split(';')[0];
  const otherSession = new Request('https://other.example/api/auth/session', { headers: { cookie: session } });
  assert.equal((await (await run(otherSession)).json()).user, null);
});
