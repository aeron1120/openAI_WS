import test from 'node:test';
import assert from 'node:assert/strict';
import { authUrl, exchangeCode, verifyIdToken, GoogleError } from '../google.mjs';
import { ENV, NOW, claims, fakeFetch, idToken, otherKey } from './helpers.mjs';

const verifyWith = (token, nonce = 'n1') => verifyIdToken(token, { clientId: ENV.GOOGLE_CLIENT_ID, nonce, fetchImpl: fakeFetch(), nowMs: NOW });
const reason = async promise => { try { await promise; return 'ok'; } catch (error) { assert.ok(error instanceof GoogleError); return error.reason; } };

test('the login URL asks for an SNU account with state and nonce', () => {
  const url = new URL(authUrl({ clientId: ENV.GOOGLE_CLIENT_ID, redirectUri: 'https://portal.test/api/auth/google/callback', state: 's1', nonce: 'n1' }));
  assert.equal(url.origin + url.pathname, 'https://accounts.google.com/o/oauth2/v2/auth');
  for (const [key, value] of Object.entries({ client_id: ENV.GOOGLE_CLIENT_ID, response_type: 'code', scope: 'openid email profile', state: 's1', nonce: 'n1', hd: 'snu.ac.kr', prompt: 'select_account', redirect_uri: 'https://portal.test/api/auth/google/callback' })) {
    assert.equal(url.searchParams.get(key), value);
  }
});

test('the code is exchanged with the client secret', async () => {
  const state = { idToken: 'token-1' };
  const token = await exchangeCode({ code: 'c1', clientId: ENV.GOOGLE_CLIENT_ID, clientSecret: 'secret', redirectUri: 'https://portal.test/cb', fetchImpl: fakeFetch(state) });
  assert.equal(token, 'token-1');
  assert.equal(state.tokenRequests[0].get('client_secret'), 'secret');
  assert.equal(state.tokenRequests[0].get('grant_type'), 'authorization_code');
  assert.equal(await reason(exchangeCode({ code: 'c1', clientId: 'x', clientSecret: 'y', redirectUri: 'z', fetchImpl: fakeFetch({ tokenStatus: 400 }) })), 'failed');
});

test('a valid SNU token returns the student identity', async () => {
  assert.deepEqual(await verifyWith(idToken(claims('n1', { email: 'Student@SNU.ac.kr' }))), { sub: 'google-123', email: 'student@snu.ac.kr', name: '김학생' });
});

test('accounts outside SNU are not_snu', async () => {
  for (const overrides of [{ email: 'someone@gmail.com', hd: undefined }, { hd: undefined }, { hd: 'other.ac.kr' }, { email: 'a@other.ac.kr' }, { email_verified: false }, { email: 'a@mail.snu.ac.kr' }]) {
    assert.equal(await reason(verifyWith(idToken(claims('n1', overrides)))), 'not_snu', JSON.stringify(overrides));
  }
});

test('forged, expired or mismatched tokens fail', async () => {
  const seconds = Math.floor(NOW / 1000);
  for (const token of [
    idToken(claims('n1'), { key: otherKey }),
    idToken(claims('n1'), { kid: 'unknown' }),
    idToken(claims('n1', { exp: seconds - 1 })),
    idToken(claims('n1', { aud: 'another-client' })),
    idToken(claims('n1', { iss: 'https://evil.test' })),
    idToken(claims('other-nonce')),
    'not.a.token',
    ''
  ]) assert.equal(await reason(verifyWith(token)), 'failed');
});
