// 테스트 공용 값과 가짜 외부 서비스. 실제 네트워크는 쓰지 않습니다.
export const ENV = {
  PUBLIC_ORIGIN: 'https://portal.test',
  PROXY_SECRET: 'p'.repeat(40),
  SESSION_SECRET: 's'.repeat(40),
  GOOGLE_CLIENT_ID: 'client-123.apps.googleusercontent.com',
  GOOGLE_CLIENT_SECRET: 'google-secret',
  SUPABASE_URL: 'https://db.test',
  SUPABASE_SERVICE_KEY: 'sb_secret_test',
  OPERATOR_EMAILS: 'op@snu.ac.kr'
};
export const NOW = Date.parse('2026-10-27T12:00:00Z');

import { generateKeyPairSync, sign as rsaSign } from 'node:crypto';

const google = generateKeyPairSync('rsa', { modulusLength: 2048 });
export const otherKey = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey;
export const jwk = { ...google.publicKey.export({ format: 'jwk' }), kid: 'test-key', alg: 'RS256', use: 'sig' };

export function idToken(claims, { key = google.privateKey, kid = 'test-key' } = {}) {
  const part = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const head = `${part({ alg: 'RS256', kid, typ: 'JWT' })}.${part(claims)}`;
  return `${head}.${rsaSign('RSA-SHA256', Buffer.from(head), key).toString('base64url')}`;
}

export function claims(nonce, overrides = {}) {
  const seconds = Math.floor(NOW / 1000);
  return {
    iss: 'https://accounts.google.com', aud: ENV.GOOGLE_CLIENT_ID, azp: ENV.GOOGLE_CLIENT_ID,
    sub: 'google-123', email: 'student@snu.ac.kr', email_verified: true, hd: 'snu.ac.kr', name: '김학생',
    nonce, iat: seconds - 10, exp: seconds + 3600, ...overrides
  };
}

// state.idToken: 토큰 교환 때 돌려줄 값, state.upserts: Supabase에 들어온 요청
export function fakeFetch(state = {}) {
  state.upserts ??= [];
  state.tokenRequests ??= [];
  return async (input, init = {}) => {
    const url = String(input);
    if (url === 'https://oauth2.googleapis.com/token') {
      state.tokenRequests.push(new URLSearchParams(String(init.body)));
      return Response.json(state.tokenStatus ? { error: 'invalid_grant' } : { id_token: state.idToken }, { status: state.tokenStatus ?? 200 });
    }
    if (url === 'https://www.googleapis.com/oauth2/v3/certs') return Response.json({ keys: [jwk] }, { headers: { 'cache-control': 'public, max-age=300' } });
    if (url.startsWith(`${ENV.SUPABASE_URL}/rest/v1/students`)) {
      if (state.dbStatus) return new Response('{}', { status: state.dbStatus });
      const body = JSON.parse(init.body);
      state.upserts.push({ url, body, headers: init.headers });
      return Response.json([{ id: 'student-1', email: body.email, name: body.name }], { status: 201 });
    }
    throw new Error(`unexpected fetch ${url}`);
  };
}
