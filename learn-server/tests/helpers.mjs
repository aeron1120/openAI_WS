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
    if (url.startsWith(`${ENV.SUPABASE_URL}/rest/v1/progress`)) {
      if (state.dbStatus) return new Response('{}', { status: state.dbStatus });
      state.progress ??= [];
      const query = new URL(url).searchParams;
      const eq = name => query.get(name)?.replace(/^eq\./, '');
      const method = init.method ?? 'GET';
      if (method === 'GET') {
        return Response.json(state.progress.filter(row => row.student_id === eq('student_id')).map(({ workshop, step_id, completed_at }) => ({ workshop, step_id, completed_at })));
      }
      if (method === 'POST') {
        const row = JSON.parse(init.body);
        if (!state.progress.some(r => r.student_id === row.student_id && r.workshop === row.workshop && r.step_id === row.step_id)) state.progress.push(row);
        return new Response(null, { status: 201 });
      }
      if (method === 'DELETE') {
        state.progress = state.progress.filter(r => !(r.student_id === eq('student_id') && String(r.workshop) === eq('workshop') && r.step_id === eq('step_id')));
        return new Response(null, { status: 204 });
      }
    }
    throw new Error(`unexpected fetch ${url}`);
  };
}

import { createApp } from '../app.mjs';

export function api(path, { method = 'GET', headers = {}, proxy = true, cookie } = {}) {
  return new Request(`https://learn.onrender.test${path}`, {
    method,
    headers: { ...(proxy ? { 'x-proxy-secret': ENV.PROXY_SECRET } : {}), ...(cookie ? { cookie } : {}), ...headers }
  });
}

// set-cookie 중 지우는 쿠키(Max-Age=0)를 뺀 "이름=값" 목록
export const cookiesFrom = response => response.headers.getSetCookie().filter(c => !/Max-Age=0/.test(c)).map(c => c.split(';')[0]).join('; ');

export function makeApp(state = {}, env = ENV) {
  return { state, app: createApp({ env, fetchImpl: fakeFetch(state), now: () => NOW }) };
}

// 로그인 시작 → 가짜 Google 토큰 준비 → 콜백까지. override로 토큰 내용을 바꿉니다.
export async function login({ app, state }, { next = '/learn/', override = {}, callbackQuery } = {}) {
  const start = await app(api(`/api/auth/google?next=${encodeURIComponent(next)}`));
  const google = new URL(start.headers.get('location'));
  state.idToken = idToken(claims(google.searchParams.get('nonce'), override));
  const realState = google.searchParams.get('state');
  const query = typeof callbackQuery === 'function' ? callbackQuery(realState) : callbackQuery ?? `code=code-1&state=${realState}`;
  const callback = await app(api(`/api/auth/google/callback?${query}`, { cookie: cookiesFrom(start) }));
  return { start, google, callback, session: cookiesFrom(callback) };
}
