# 수업 시스템 1단계: SNU 로그인 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 포털에 `/learn/` 페이지를 추가하고, `@snu.ac.kr` Google 계정으로만 로그인되게 한다. 로그인·세션은 Render 서버가 처리하고 학생 정보는 Supabase에 저장한다.

**Architecture:** Cloudflare Pages 함수(`portal/functions/_middleware.js`)가 `/api/*`를 Render 서버로 그대로 전달하고 공유 비밀값 헤더를 붙인다. Render 서버(`learn-server/`, Node 20 기본 기능만)는 Google Authorization Code 흐름으로 로그인하고, ID 토큰을 검증해 `hd=snu.ac.kr`과 이메일 도메인을 확인한 뒤 HMAC 서명 쿠키로 세션을 만든다. 학생은 Supabase REST로 upsert한다.

**Tech Stack:** Node 20+ (`node:http`, `node:crypto`, 전역 `fetch`/`Request`/`Response`), `node:test`, Cloudflare Pages Functions, Supabase PostgREST, Google OAuth 2.0 / OpenID Connect.

**Spec:** `docs/superpowers/specs/2026-10-27-snu-learn-system-design.md`. 이 계획은 3개 중 1번(로그인 기반)이다. 2번은 수업 화면·진도, 3번은 질문·첨부·운영진 페이지·메일이다.

---

## File Structure

새로 만들기
- `learn-server/package.json`: 서버 패키지 정의(외부 의존성 없음), 시작·테스트 명령
- `learn-server/config.mjs`: 환경값 읽기·검사
- `learn-server/http.mjs`: JSON·리디렉션 응답, 쿠키, Origin 확인, 상수 시간 비교, `HttpError`
- `learn-server/session.mjs`: HMAC 서명 쿠키 만들기·검증
- `learn-server/google.mjs`: Google 로그인 주소, 코드 교환, ID 토큰 검증(JWKS), SNU 확인
- `learn-server/supabase.mjs`: Supabase REST 클라이언트(학생 upsert)
- `learn-server/app.mjs`: `Request → Response` 라우터(`/api/health`, `/api/auth/google`, `/api/auth/google/callback`, `/api/me`, `DELETE /api/session`)
- `learn-server/server.mjs`: `node:http` 어댑터, 시작 시 설정 검사 로그
- `learn-server/schema.sql`: Supabase 테이블·RLS·Storage 버킷(1–3단계 전체)
- `learn-server/README.md`: 역할, 환경값, Render·Supabase·Google 준비 순서
- `learn-server/tests/helpers.mjs`: 가짜 Google·Supabase, 테스트용 요청·로그인 도우미
- `learn-server/tests/config.test.mjs`, `session.test.mjs`, `google.test.mjs`, `app.test.mjs`
- `render.yaml`: Render Blueprint(웹 서비스 1개, rootDir `learn-server`)
- `portal/src/learn.js`: `/learn/` 화면 스크립트(로그인 확인·서버 깨우기·로그인/로그아웃)

수정
- `portal/functions/_middleware.js`: `/api/*` 프록시 추가
- `portal/src/pages.mjs`: `learnPage()` 추가
- `portal/src/layout.mjs`: 페이지별 추가 스크립트, 메뉴에 "수업 듣기"
- `portal/scripts/build.mjs`: `/learn/` 경로, `learn.js` 복사·해시, `_routes.json` 제외 목록
- `portal/src/styles.css`: `/learn/` 상태 문구 스타일
- `portal/tests/portal.test.mjs`: 경로 목록 갱신, 프록시·`/learn/` 테스트
- `portal/README.md`: 수업 듣기·프록시·비밀값 안내
- `package.json`(루트): `test:learn`, `dev:learn`

---

### Task 1: 서버 패키지와 설정 읽기

**Files:**
- Create: `learn-server/package.json`
- Create: `learn-server/config.mjs`
- Test: `learn-server/tests/config.test.mjs`

- [ ] **Step 1: 패키지 파일 만들기**

`learn-server/package.json`:

```json
{
  "name": "snu-learn-server",
  "private": true,
  "version": "1.0.0",
  "description": "SNU 수업·질문 시스템 API 서버 (Render)",
  "type": "module",
  "scripts": {
    "start": "node server.mjs",
    "test": "node --test tests/*.test.mjs"
  },
  "engines": {
    "node": ">=20"
  }
}
```

- [ ] **Step 2: 실패하는 테스트 작성**

`learn-server/tests/config.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig } from '../config.mjs';
import { ENV } from './helpers.mjs';

test('a complete environment is ready and operators are lower-cased', () => {
  const config = loadConfig({ ...ENV, OPERATOR_EMAILS: ' Op@snu.ac.kr, second@snu.ac.kr ,' });
  assert.equal(config.ok, true);
  assert.deepEqual(config.problems, []);
  assert.deepEqual([...config.operators], ['op@snu.ac.kr', 'second@snu.ac.kr']);
  assert.equal(config.publicOrigin, ENV.PUBLIC_ORIGIN);
});

test('missing or weak values are listed by name only', () => {
  const config = loadConfig({ ...ENV, GOOGLE_CLIENT_SECRET: '', SESSION_SECRET: 'short', PUBLIC_ORIGIN: 'https://portal.test/' });
  assert.equal(config.ok, false);
  assert.ok(config.problems.includes('GOOGLE_CLIENT_SECRET 없음'));
  assert.ok(config.problems.includes('SESSION_SECRET은 32자 이상'));
  assert.ok(config.problems.some(p => p.startsWith('PUBLIC_ORIGIN')));
  assert.ok(config.problems.every(p => !p.includes('short')));
});

test('no operators means nobody is an operator', () => {
  assert.equal(loadConfig({ ...ENV, OPERATOR_EMAILS: undefined }).operators.size, 0);
});
```

`learn-server/tests/helpers.mjs` (이 파일은 Task 4·5에서 더 채운다. 지금은 `ENV`만):

```js
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
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `node --test learn-server/tests/config.test.mjs`
Expected: FAIL — `Cannot find module '.../learn-server/config.mjs'`

- [ ] **Step 4: 구현**

`learn-server/config.mjs`:

```js
// Render 환경값을 읽고 빠진 값을 알려줍니다. 비밀값 자체는 메시지에 넣지 않습니다.
const REQUIRED = ['PUBLIC_ORIGIN', 'PROXY_SECRET', 'SESSION_SECRET', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'SUPABASE_URL', 'SUPABASE_SERVICE_KEY'];

export function loadConfig(env) {
  const problems = REQUIRED.filter(key => !env[key]).map(key => `${key} 없음`);
  if (env.SESSION_SECRET && env.SESSION_SECRET.length < 32) problems.push('SESSION_SECRET은 32자 이상');
  if (env.PROXY_SECRET && env.PROXY_SECRET.length < 32) problems.push('PROXY_SECRET은 32자 이상');
  if (env.PUBLIC_ORIGIN && !/^(https:\/\/[^/]+|http:\/\/localhost(:\d+)?)$/.test(env.PUBLIC_ORIGIN)) problems.push('PUBLIC_ORIGIN 형식 (https://주소, 끝에 / 없음)');
  if (env.SUPABASE_URL && !/^https:\/\/[^/]+$/.test(env.SUPABASE_URL)) problems.push('SUPABASE_URL 형식 (https://주소, 끝에 / 없음)');
  return {
    ok: problems.length === 0,
    problems,
    publicOrigin: env.PUBLIC_ORIGIN,
    proxySecret: env.PROXY_SECRET,
    sessionSecret: env.SESSION_SECRET,
    google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET },
    supabase: { url: env.SUPABASE_URL, key: env.SUPABASE_SERVICE_KEY },
    operators: new Set((env.OPERATOR_EMAILS ?? '').split(',').map(email => email.trim().toLowerCase()).filter(Boolean))
  };
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `node --test learn-server/tests/config.test.mjs`
Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add learn-server/package.json learn-server/config.mjs learn-server/tests/config.test.mjs learn-server/tests/helpers.mjs
git commit -m "Add learn server package and environment checks"
```

---

### Task 2: HTTP 도우미와 서명 쿠키

**Files:**
- Create: `learn-server/http.mjs`
- Create: `learn-server/session.mjs`
- Test: `learn-server/tests/session.test.mjs`

- [ ] **Step 1: 실패하는 테스트 작성**

`learn-server/tests/session.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { sign, verify } from '../session.mjs';
import { readCookie, safeEqual, setCookie } from '../http.mjs';

const SECRET = 'x'.repeat(40);

test('a signed payload verifies until it expires', () => {
  const value = sign({ kind: 'session', sid: 'a', exp: 200 }, SECRET);
  assert.deepEqual(verify(value, SECRET, 'session', 100), { kind: 'session', sid: 'a', exp: 200 });
  assert.equal(verify(value, SECRET, 'session', 200), null);
});

test('tampering, another secret or another kind is rejected', () => {
  const value = sign({ kind: 'session', sid: 'a', exp: 200 }, SECRET);
  const [body, mac] = value.split('.');
  const forged = Buffer.from(JSON.stringify({ kind: 'session', sid: 'b', exp: 200 })).toString('base64url');
  assert.equal(verify(`${forged}.${mac}`, SECRET, 'session', 100), null);
  assert.equal(verify(value, 'y'.repeat(40), 'session', 100), null);
  assert.equal(verify(value, SECRET, 'oauth', 100), null);
  assert.equal(verify(`${body}.${mac}.extra`, SECRET, 'session', 100), null);
  assert.equal(verify('', SECRET, 'session', 100), null);
  assert.equal(verify('a'.repeat(5000), SECRET, 'session', 100), null);
});

test('cookies are host-only, http-only and secure', () => {
  assert.equal(setCookie('__Host-x', 'v', 60), '__Host-x=v; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=60');
  const request = new Request('https://a.test/', { headers: { cookie: 'a=1; __Host-x=v2; b=3' } });
  assert.equal(readCookie(request, '__Host-x'), 'v2');
  assert.equal(readCookie(new Request('https://a.test/', { headers: { cookie: '__Host-x=1; __Host-x=2' } }), '__Host-x'), null);
  assert.equal(safeEqual('abc', 'abc'), true);
  assert.equal(safeEqual('abc', 'abd'), false);
  assert.equal(safeEqual('abc', 'abcd'), false);
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `node --test learn-server/tests/session.test.mjs`
Expected: FAIL — `Cannot find module '.../learn-server/session.mjs'`

- [ ] **Step 3: 구현**

`learn-server/http.mjs`:

```js
// 응답·쿠키·요청 확인 도우미. 모든 응답은 캐시하지 않습니다.
import { timingSafeEqual } from 'node:crypto';

export class HttpError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}

const baseHeaders = () => new Headers({ 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });

export function json(data, status = 200, cookies = []) {
  const headers = baseHeaders();
  headers.set('content-type', 'application/json; charset=utf-8');
  for (const cookie of cookies) headers.append('set-cookie', cookie);
  return new Response(JSON.stringify(data), { status, headers });
}

export function redirect(location, cookies = []) {
  const headers = baseHeaders();
  headers.set('location', location);
  for (const cookie of cookies) headers.append('set-cookie', cookie);
  return new Response(null, { status: 302, headers });
}

export function setCookie(name, value, maxAge) {
  return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

// 같은 이름의 쿠키가 둘 이상이면(덮어쓰기 공격 가능성) 없는 것으로 봅니다.
export function readCookie(request, name) {
  const matches = (request.headers.get('cookie') ?? '').split(';').map(part => part.trim()).filter(part => part.startsWith(`${name}=`));
  return matches.length === 1 ? matches[0].slice(name.length + 1) : null;
}

export function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && timingSafeEqual(left, right);
}

export function sameOrigin(request, origin) {
  if (request.headers.get('origin') !== origin) throw new HttpError(403, 'ORIGIN_REJECTED', '이 사이트에서 다시 시도해 주세요.');
}
```

`learn-server/session.mjs`:

```js
// HMAC-SHA256으로 서명한 쿠키 값: <base64url JSON>.<base64url 서명>
import { createHmac } from 'node:crypto';
import { safeEqual } from './http.mjs';

const mac = (body, secret) => createHmac('sha256', secret).update(body).digest('base64url');

export function sign(payload, secret) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${mac(body, secret)}`;
}

export function verify(value, secret, kind, nowSeconds) {
  if (typeof value !== 'string' || !value || value.length > 4096) return null;
  const parts = value.split('.');
  if (parts.length !== 2 || !safeEqual(parts[1], mac(parts[0], secret))) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    if (payload?.kind !== kind || !Number.isFinite(payload.exp) || payload.exp <= nowSeconds) return null;
    return payload;
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `node --test learn-server/tests/session.test.mjs`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add learn-server/http.mjs learn-server/session.mjs learn-server/tests/session.test.mjs
git commit -m "Add signed cookies and HTTP helpers for the learn server"
```

---

### Task 3: Google 로그인 주소·코드 교환·ID 토큰 검증

**Files:**
- Create: `learn-server/google.mjs`
- Modify: `learn-server/tests/helpers.mjs` (가짜 Google 추가)
- Test: `learn-server/tests/google.test.mjs`

- [ ] **Step 1: 테스트 도우미에 가짜 Google 추가**

`learn-server/tests/helpers.mjs` 끝에 이어 붙인다:

```js
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
```

- [ ] **Step 2: 실패하는 테스트 작성**

`learn-server/tests/google.test.mjs`:

```js
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
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `node --test learn-server/tests/google.test.mjs`
Expected: FAIL — `Cannot find module '.../learn-server/google.mjs'`

- [ ] **Step 4: 구현**

`learn-server/google.mjs`:

```js
// Google OpenID Connect: 로그인 주소 → 코드 교환 → ID 토큰 서명·내용 검증 → 서울대 계정 확인.
// hd=snu.ac.kr은 Google 화면의 계정 선택을 돕는 값일 뿐이라, 서버가 토큰 안의 hd·email을 다시 확인합니다.
import { createPublicKey, verify as verifySignature } from 'node:crypto';

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
export const SNU_DOMAIN = 'snu.ac.kr';

// reason: 'failed'(검증 실패·Google 오류) | 'not_snu'(서울대 계정 아님)
export class GoogleError extends Error {
  constructor(reason) { super(reason); this.reason = reason; }
}

export function authUrl({ clientId, redirectUri, state, nonce }) {
  const url = new URL(AUTH_URL);
  const params = { client_id: clientId, redirect_uri: redirectUri, response_type: 'code', scope: 'openid email profile', state, nonce, hd: SNU_DOMAIN, prompt: 'select_account' };
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return url.toString();
}

export async function exchangeCode({ code, clientId, clientSecret, redirectUri, fetchImpl }) {
  let data;
  try {
    const response = await fetchImpl(TOKEN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' }).toString(),
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error();
    data = await response.json();
  } catch {
    throw new GoogleError('failed');
  }
  if (typeof data?.id_token !== 'string') throw new GoogleError('failed');
  return data.id_token;
}

const keyCaches = new WeakMap();
async function googleKey(kid, fetchImpl, nowMs) {
  let cached = keyCaches.get(fetchImpl);
  if (!cached || cached.expires <= nowMs || (!cached.keys.some(key => key.kid === kid) && nowMs - cached.fetched >= 60000)) {
    const response = await fetchImpl(JWKS_URL, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error('jwks');
    const data = await response.json();
    if (!Array.isArray(data.keys) || data.keys.length > 20) throw new Error('jwks');
    const maxAge = Number(/max-age=(\d+)/i.exec(response.headers.get('cache-control') ?? '')?.[1] ?? 300);
    cached = { keys: data.keys, fetched: nowMs, expires: nowMs + Math.min(Math.max(maxAge, 60), 86400) * 1000 };
    keyCaches.set(fetchImpl, cached);
  }
  const jwk = cached.keys.find(key => key.kid === kid && key.kty === 'RSA' && (!key.alg || key.alg === 'RS256'));
  if (!jwk) throw new Error('unknown key');
  return createPublicKey({ key: jwk, format: 'jwk' });
}

const decode = part => JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));

export async function verifyIdToken(token, { clientId, nonce, fetchImpl, nowMs }) {
  let claims;
  try {
    if (typeof token !== 'string' || token.length > 16000) throw new Error();
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error();
    const header = decode(parts[0]);
    claims = decode(parts[1]);
    const seconds = Math.floor(nowMs / 1000);
    if (header.alg !== 'RS256' || typeof header.kid !== 'string') throw new Error();
    if (!['accounts.google.com', 'https://accounts.google.com'].includes(claims.iss) || claims.aud !== clientId || (claims.azp !== undefined && claims.azp !== clientId)) throw new Error();
    if (!Number.isFinite(claims.exp) || claims.exp <= seconds || !Number.isFinite(claims.iat) || claims.iat > seconds + 60) throw new Error();
    if (claims.nonce !== nonce || typeof claims.sub !== 'string' || !claims.sub || claims.sub.length > 255) throw new Error();
    const key = await googleKey(header.kid, fetchImpl, nowMs);
    if (!verifySignature('RSA-SHA256', Buffer.from(`${parts[0]}.${parts[1]}`), key, Buffer.from(parts[2], 'base64url'))) throw new Error();
  } catch {
    throw new GoogleError('failed');
  }
  const email = typeof claims.email === 'string' ? claims.email.toLowerCase() : '';
  if (claims.email_verified !== true || claims.hd !== SNU_DOMAIN || !email.endsWith(`@${SNU_DOMAIN}`)) throw new GoogleError('not_snu');
  const name = typeof claims.name === 'string' && claims.name.trim() ? claims.name.trim().slice(0, 100) : email.split('@')[0];
  return { sub: claims.sub, email, name };
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `node --test learn-server/tests/google.test.mjs`
Expected: PASS (5 tests)

- [ ] **Step 6: Commit**

```bash
git add learn-server/google.mjs learn-server/tests/google.test.mjs learn-server/tests/helpers.mjs
git commit -m "Verify Google sign-in and accept only snu.ac.kr accounts"
```

---

### Task 4: Supabase 클라이언트와 스키마

**Files:**
- Create: `learn-server/supabase.mjs`
- Create: `learn-server/schema.sql`
- Test: `learn-server/tests/app.test.mjs`에서 함께 검증 (Task 5). 이 작업은 단위 테스트 1개만 추가: `learn-server/tests/supabase.test.mjs`

- [ ] **Step 1: 실패하는 테스트 작성**

`learn-server/tests/supabase.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { supabaseClient } from '../supabase.mjs';
import { ENV, fakeFetch } from './helpers.mjs';

test('students are upserted by Google account with the service key', async () => {
  const state = {};
  const db = supabaseClient({ url: ENV.SUPABASE_URL, key: 'sb_secret_test', fetchImpl: fakeFetch(state) });
  const student = await db.upsertStudent({ googleSub: 'g1', email: 'a@snu.ac.kr', name: '가', now: '2026-10-27T12:00:00.000Z' });
  assert.deepEqual(student, { id: 'student-1', email: 'a@snu.ac.kr', name: '가' });
  const [call] = state.upserts;
  assert.match(call.url, /students\?on_conflict=google_sub&select=id,email,name$/);
  assert.equal(call.headers.apikey, 'sb_secret_test');
  assert.equal(call.headers.authorization, undefined);
  assert.equal(call.headers.prefer, 'resolution=merge-duplicates,return=representation');
  assert.deepEqual(call.body, { google_sub: 'g1', email: 'a@snu.ac.kr', name: '가', last_seen_at: '2026-10-27T12:00:00.000Z' });
});

test('a legacy JWT service key is also sent as a bearer token, and errors throw', async () => {
  const state = {};
  await supabaseClient({ url: ENV.SUPABASE_URL, key: 'eyJlegacy', fetchImpl: fakeFetch(state) }).upsertStudent({ googleSub: 'g', email: 'e', name: 'n', now: 't' });
  assert.equal(state.upserts[0].headers.authorization, 'Bearer eyJlegacy');
  const failing = supabaseClient({ url: ENV.SUPABASE_URL, key: 'k', fetchImpl: fakeFetch({ dbStatus: 500 }) });
  await assert.rejects(failing.upsertStudent({ googleSub: 'g', email: 'e', name: 'n', now: 't' }), /Supabase 500/);
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `node --test learn-server/tests/supabase.test.mjs`
Expected: FAIL — `Cannot find module '.../learn-server/supabase.mjs'`

- [ ] **Step 3: 구현**

`learn-server/supabase.mjs`:

```js
// Supabase REST(PostgREST) 클라이언트. 서비스 키는 서버에서만 씁니다(RLS를 우회하므로 브라우저로 보내지 않음).
// 새 키(sb_secret_…)는 apikey 헤더로, 예전 service_role JWT(eyJ…)는 Authorization 헤더로도 보냅니다.
export function supabaseClient({ url, key, fetchImpl = fetch }) {
  const base = { apikey: key, 'content-type': 'application/json', ...(key.startsWith('eyJ') ? { authorization: `Bearer ${key}` } : {}) };
  async function request(path, { headers = {}, ...init } = {}) {
    const response = await fetchImpl(`${url}/rest/v1/${path}`, { ...init, headers: { ...base, ...headers }, signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error(`Supabase ${response.status}`);
    return response.status === 204 ? null : response.json();
  }
  return {
    async upsertStudent({ googleSub, email, name, now }) {
      const rows = await request('students?on_conflict=google_sub&select=id,email,name', {
        method: 'POST',
        headers: { prefer: 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify({ google_sub: googleSub, email, name, last_seen_at: now })
      });
      if (!Array.isArray(rows) || !rows[0]?.id) throw new Error('Supabase empty');
      return rows[0];
    }
  };
}
```

`learn-server/schema.sql` (1–3단계 전체. Supabase SQL Editor에서 한 번 실행):

```sql
-- SNU 수업·질문 시스템. Supabase 대시보드 → SQL Editor에 붙여 넣고 Run.
-- 모든 테이블은 RLS를 켜고 정책을 만들지 않습니다: 서비스 키를 쓰는 Render 서버만 읽고 씁니다.

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  google_sub text not null unique,
  email text not null,
  name text not null default '',
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table if not exists public.progress (
  student_id uuid not null references public.students(id) on delete cascade,
  workshop smallint not null,
  step_id text not null,
  completed_at timestamptz not null default now(),
  primary key (student_id, workshop, step_id)
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  workshop smallint not null,
  step_id text not null,
  mode text check (mode in ('example', 'own')),
  status text not null default 'escalated' check (status in ('ai_answered', 'escalated', 'answered', 'resolved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists questions_status_idx on public.questions (status, updated_at desc);
create index if not exists questions_student_idx on public.questions (student_id, created_at desc);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  author text not null check (author in ('student', 'ai', 'operator')),
  operator_email text,
  body text not null check (char_length(body) between 1 and 4000),
  error_text text check (error_text is null or char_length(error_text) <= 4000),
  created_at timestamptz not null default now()
);
create index if not exists messages_question_idx on public.messages (question_id, created_at);

create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  uploader_id uuid not null references public.students(id) on delete cascade,
  message_id uuid references public.messages(id) on delete cascade,
  path text not null unique,
  mime text not null check (mime in ('image/png', 'image/jpeg', 'image/webp')),
  size integer not null check (size between 1 and 5242880),
  created_at timestamptz not null default now()
);
create index if not exists attachments_message_idx on public.attachments (message_id);

alter table public.students enable row level security;
alter table public.progress enable row level security;
alter table public.questions enable row level security;
alter table public.messages enable row level security;
alter table public.attachments enable row level security;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('question-images', 'question-images', false, 5242880, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `node --test learn-server/tests/supabase.test.mjs`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add learn-server/supabase.mjs learn-server/schema.sql learn-server/tests/supabase.test.mjs
git commit -m "Add Supabase client and database schema for the learn system"
```

---

### Task 5: 로그인 API (`app.mjs`)

**Files:**
- Create: `learn-server/app.mjs`
- Modify: `learn-server/tests/helpers.mjs` (요청·로그인 도우미)
- Test: `learn-server/tests/app.test.mjs`

- [ ] **Step 1: 테스트 도우미 추가**

`learn-server/tests/helpers.mjs` 끝에 이어 붙인다:

```js
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
  const query = callbackQuery ?? `code=code-1&state=${google.searchParams.get('state')}`;
  const callback = await app(api(`/api/auth/google/callback?${query}`, { cookie: cookiesFrom(start) }));
  return { start, google, callback, session: cookiesFrom(callback) };
}
```

- [ ] **Step 2: 실패하는 테스트 작성**

`learn-server/tests/app.test.mjs`:

```js
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
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `node --test learn-server/tests/app.test.mjs`
Expected: FAIL — `Cannot find module '.../learn-server/app.mjs'`

- [ ] **Step 4: 구현**

`learn-server/app.mjs`:

```js
// 수업 시스템 API. 포털(Cloudflare Pages)이 /api/*를 x-proxy-secret 헤더와 함께 전달합니다.
// 1단계: 상태 확인, SNU Google 로그인, 내 정보, 로그아웃.
import { randomBytes } from 'node:crypto';
import { loadConfig } from './config.mjs';
import { HttpError, json, readCookie, redirect, safeEqual, sameOrigin, setCookie } from './http.mjs';
import { sign, verify } from './session.mjs';
import { authUrl, exchangeCode, verifyIdToken, GoogleError } from './google.mjs';
import { supabaseClient } from './supabase.mjs';

const SESSION_COOKIE = '__Host-learn_session';
const OAUTH_COOKIE = '__Host-learn_oauth';
const SESSION_SECONDS = 14 * 24 * 60 * 60;
const OAUTH_SECONDS = 10 * 60;
// 로그인 후 돌아갈 곳: /learn/… 또는 /admin/… 폴더 주소만
const NEXT_PATH = /^\/(?:learn|admin)\/(?:[A-Za-z0-9_-]+\/)*$/;

export function createApp({ env, fetchImpl = fetch, now = Date.now, random = () => randomBytes(24).toString('base64url') }) {
  const config = loadConfig(env);
  const db = config.ok ? supabaseClient({ ...config.supabase, fetchImpl }) : null;
  const callbackUrl = `${config.publicOrigin}/api/auth/google/callback`;

  function currentSession(request, seconds) {
    return verify(readCookie(request, SESSION_COOKIE), config.sessionSecret, 'session', seconds);
  }

  function startLogin(url, seconds) {
    const requested = url.searchParams.get('next') ?? '';
    const next = NEXT_PATH.test(requested) ? requested : '/learn/';
    const state = random();
    const nonce = random();
    const cookie = sign({ kind: 'oauth', state, nonce, next, exp: seconds + OAUTH_SECONDS }, config.sessionSecret);
    return redirect(authUrl({ clientId: config.google.clientId, redirectUri: callbackUrl, state, nonce }), [setCookie(OAUTH_COOKIE, cookie, OAUTH_SECONDS)]);
  }

  async function finishLogin(request, url, seconds) {
    const fail = reason => redirect(`${config.publicOrigin}/learn/?error=${reason}`, [setCookie(OAUTH_COOKIE, '', 0)]);
    const oauth = verify(readCookie(request, OAUTH_COOKIE), config.sessionSecret, 'oauth', seconds);
    if (!oauth) return fail('expired');
    if (url.searchParams.has('error')) return fail('cancelled');
    const code = url.searchParams.get('code');
    if (!code || !safeEqual(url.searchParams.get('state') ?? '', oauth.state)) return fail('failed');
    let identity;
    try {
      const token = await exchangeCode({ code, clientId: config.google.clientId, clientSecret: config.google.clientSecret, redirectUri: callbackUrl, fetchImpl });
      identity = await verifyIdToken(token, { clientId: config.google.clientId, nonce: oauth.nonce, fetchImpl, nowMs: now() });
    } catch (error) {
      return fail(error instanceof GoogleError ? error.reason : 'failed');
    }
    let student;
    try {
      student = await db.upsertStudent({ googleSub: identity.sub, email: identity.email, name: identity.name, now: new Date(now()).toISOString() });
    } catch (error) {
      console.error('learn-server: student upsert failed', error.message);
      return fail('failed');
    }
    const session = sign({ kind: 'session', sid: student.id, email: identity.email, name: identity.name, exp: seconds + SESSION_SECONDS }, config.sessionSecret);
    return redirect(config.publicOrigin + oauth.next, [setCookie(SESSION_COOKIE, session, SESSION_SECONDS), setCookie(OAUTH_COOKIE, '', 0)]);
  }

  return async function handle(request) {
    const url = new URL(request.url);
    const seconds = Math.floor(now() / 1000);
    try {
      if (url.pathname === '/api/health') return json({ ok: true, configured: config.ok });
      if (!config.ok) throw new HttpError(503, 'LEARN_NOT_CONFIGURED', '수업 서버를 준비하고 있어요.');
      if (!safeEqual(request.headers.get('x-proxy-secret') ?? '', config.proxySecret)) throw new HttpError(403, 'DIRECT_ACCESS', '포털 주소로 접속해 주세요.');
      switch (`${request.method} ${url.pathname}`) {
        case 'GET /api/auth/google':
          return startLogin(url, seconds);
        case 'GET /api/auth/google/callback':
          return await finishLogin(request, url, seconds);
        case 'GET /api/me': {
          const session = currentSession(request, seconds);
          if (!session) throw new HttpError(401, 'LOGIN_REQUIRED', '서울대 계정으로 로그인해 주세요.');
          return json({ user: { email: session.email, name: session.name, operator: config.operators.has(session.email) } });
        }
        case 'DELETE /api/session':
          sameOrigin(request, config.publicOrigin);
          return json({ user: null }, 200, [setCookie(SESSION_COOKIE, '', 0)]);
        default:
          throw new HttpError(404, 'NOT_FOUND', '찾을 수 없는 요청입니다.');
      }
    } catch (error) {
      if (error instanceof HttpError) return json({ error: error.code, message: error.message }, error.status);
      console.error('learn-server: unexpected error', error?.message);
      return json({ error: 'SERVER_ERROR', message: '잠시 후 다시 시도해 주세요.' }, 500);
    }
  };
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `node --test learn-server/tests/*.test.mjs`
Expected: PASS (모든 learn-server 테스트, 실패 0)

- [ ] **Step 6: Commit**

```bash
git add learn-server/app.mjs learn-server/tests/app.test.mjs learn-server/tests/helpers.mjs
git commit -m "Add SNU Google login, session and logout API"
```

---

### Task 6: Node 서버 진입점, Render 설정, 문서

**Files:**
- Create: `learn-server/server.mjs`
- Create: `render.yaml`
- Create: `learn-server/README.md`
- Modify: `package.json` (루트 scripts)

- [ ] **Step 1: 서버 진입점 작성**

`learn-server/server.mjs`:

```js
// Render 웹 서비스 진입점: node:http 요청을 표준 Request로 바꿔 app에 넘깁니다.
import http from 'node:http';
import { Readable } from 'node:stream';
import { createApp } from './app.mjs';
import { loadConfig } from './config.mjs';

const { problems } = loadConfig(process.env);
if (problems.length) console.warn(`learn-server: 설정 필요 → ${problems.join(', ')}`);

const app = createApp({ env: process.env });
const port = Number(process.env.PORT ?? 8787);

http.createServer(async (req, res) => {
  try {
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (Array.isArray(value)) value.forEach(item => headers.append(key, item));
      else if (value !== undefined) headers.set(key, value);
    }
    const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
    const request = new Request(`http://${req.headers.host ?? 'localhost'}${req.url}`, {
      method: req.method, headers, body: hasBody ? Readable.toWeb(req) : undefined, duplex: 'half'
    });
    const response = await app(request);
    const out = {};
    response.headers.forEach((value, key) => { if (key !== 'set-cookie') out[key] = value; });
    const cookies = response.headers.getSetCookie();
    if (cookies.length) out['set-cookie'] = cookies;
    res.writeHead(response.status, out);
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    console.error('learn-server: request failed', error?.message);
    res.writeHead(500, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
    res.end('{"error":"SERVER_ERROR","message":"잠시 후 다시 시도해 주세요."}');
  }
}).listen(port, () => console.log(`learn-server: http://localhost:${port}/api/health`));
```

- [ ] **Step 2: 로컬 실행 확인**

Run (PowerShell): `$env:PORT='8799'; node learn-server/server.mjs` 를 백그라운드로 켜고, 다른 창에서 `curl.exe -s http://localhost:8799/api/health`
Expected: `{"ok":true,"configured":false}` 그리고 서버 로그에 `learn-server: 설정 필요 → PUBLIC_ORIGIN 없음, ...`. 확인 후 서버 종료.

- [ ] **Step 3: Render Blueprint 작성**

`render.yaml` (저장소 루트):

```yaml
# Render Blueprint: SNU 수업·질문 API 서버. learn-server/ 폴더만 배포합니다.
# 비밀값(sync: false)은 Render 대시보드에서 직접 입력합니다. 저장소에 값을 적지 마세요.
services:
  - type: web
    name: snu-learn-server
    runtime: node
    plan: free
    region: singapore
    rootDir: learn-server
    buildCommand: npm install --omit=dev
    startCommand: node server.mjs
    healthCheckPath: /api/health
    envVars:
      - key: NODE_VERSION
        value: "20"
      - key: PUBLIC_ORIGIN
        value: https://snu-student-collective.pages.dev
      - key: SESSION_SECRET
        generateValue: true
      - key: PROXY_SECRET
        sync: false
      - key: GOOGLE_CLIENT_ID
        sync: false
      - key: GOOGLE_CLIENT_SECRET
        sync: false
      - key: SUPABASE_URL
        sync: false
      - key: SUPABASE_SERVICE_KEY
        sync: false
      - key: OPERATOR_EMAILS
        sync: false
```

- [ ] **Step 4: 루트 scripts 추가**

`package.json`의 `"scripts"`에 두 줄 추가 (`"deploy:portal"` 다음):

```json
    "test:learn": "node --test learn-server/tests/*.test.mjs",
    "dev:learn": "node learn-server/server.mjs"
```

(바로 앞 줄 `"deploy:portal": ...` 끝에 쉼표를 붙인다.)

Run: `npm run test:learn`
Expected: PASS (learn-server 테스트 전부)

- [ ] **Step 5: README 작성**

`learn-server/README.md`:

````markdown
# 수업·질문 API 서버 (Render)

포털(`portal/`)의 `/learn/`·`/admin/` 화면이 쓰는 API 서버입니다. 학생 브라우저는 포털 주소의 `/api/*`로 요청하고, 포털의 Cloudflare Pages 함수가 이 서버로 그대로 전달합니다(같은 주소라 Safari·iOS에서도 로그인 쿠키가 유지됨).

- 외부 패키지 없음. Node.js 20 이상.
- 서울대 `@snu.ac.kr` Google 계정만 로그인됩니다. 서버가 ID 토큰의 `hd`와 이메일을 직접 확인합니다.
- 데이터: Supabase(Postgres + Storage). 모든 테이블 RLS 켬, 정책 없음 → 서비스 키를 쓰는 이 서버만 접근.
- 설계: `docs/superpowers/specs/2026-10-27-snu-learn-system-design.md`

## 파일

| 파일 | 역할 |
| --- | --- |
| `server.mjs` | Render 진입점 (node:http → app) |
| `app.mjs` | API 경로와 로그인 흐름 |
| `config.mjs` | 환경값 읽기·검사 |
| `google.mjs` | Google 로그인 주소, 코드 교환, ID 토큰 검증, SNU 확인 |
| `session.mjs` | 서명 쿠키 |
| `http.mjs` | 응답·쿠키·Origin 확인 도우미 |
| `supabase.mjs` | Supabase REST 클라이언트 |
| `schema.sql` | Supabase 테이블·RLS·Storage 버킷 (한 번 실행) |

## 명령 (저장소 루트에서)

| 하려는 일 | 명령 |
| --- | --- |
| 테스트 | `npm run test:learn` |
| 로컬 실행 (상태 확인용) | `npm run dev:learn` → http://localhost:8787/api/health |

## 환경값 (Render → Environment)

| 이름 | 내용 |
| --- | --- |
| `PUBLIC_ORIGIN` | `https://snu-student-collective.pages.dev` (끝에 / 없음) |
| `PROXY_SECRET` | 포털 Pages 비밀값과 같은 값 (32자 이상) |
| `SESSION_SECRET` | 쿠키 서명용 (Blueprint가 자동 생성) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google Cloud OAuth 클라이언트(웹) |
| `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` | Supabase Project URL, secret 키(`sb_secret_…`) |
| `OPERATOR_EMAILS` | 운영진 @snu.ac.kr 메일, 쉼표로 구분 |

비밀값은 저장소·대화·공개 파일에 넣지 않습니다. 빠진 값이 있으면 서버 로그에 이름만 나오고 `/api/health`가 `configured: false`를 돌려줍니다.

## 처음 준비 순서

1. **Supabase**: 새 프로젝트(Region: Northeast Asia (Seoul)) → SQL Editor에 `schema.sql` 붙여 넣고 Run → Project Settings → API Keys에서 Project URL과 secret 키 확인.
2. **Google Cloud**: APIs & Services → OAuth consent screen(User type External, 게시 상태 **In production**. Testing이면 테스트 사용자만 로그인됨) → Credentials → Create OAuth client ID → Web application → Authorized redirect URIs에 `https://snu-student-collective.pages.dev/api/auth/google/callback` → 클라이언트 ID·비밀번호 확인.
3. **Render**: New → Blueprint → 이 GitHub 저장소 선택 → `render.yaml` 확인 → `sync: false` 값 입력 → 배포. 서비스 주소(`https://snu-learn-server.onrender.com` 등) 확인.
4. **Cloudflare Pages 비밀값**: `LEARN_API_ORIGIN`(Render 서비스 주소)과 `PROXY_SECRET`(Render와 같은 값)을 넣고 포털을 다시 배포. 자세한 명령은 `portal/README.md`.

무료 요금제는 15분간 요청이 없으면 잠들고 첫 요청에 30초~1분이 걸립니다. 화면은 "서버를 깨우는 중"을 보여주며 자동으로 다시 시도합니다. 워크숍 전에 한 번 열어 두세요.
````

- [ ] **Step 6: Commit**

```bash
git add learn-server/server.mjs learn-server/README.md render.yaml package.json
git commit -m "Add learn server entrypoint, Render blueprint and setup guide"
```

---

### Task 7: 포털 `/api/*` 프록시

**Files:**
- Modify: `portal/functions/_middleware.js:9-12`
- Test: `portal/tests/portal.test.mjs` (끝에 테스트 추가)

- [ ] **Step 1: 실패하는 테스트 작성**

`portal/tests/portal.test.mjs` 끝에 추가:

```js
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
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm run test:portal`
Expected: FAIL — 새 테스트 3개 실패 (`/api`가 페이지 처리로 넘어가 `assets must not be used for /api` 또는 상태 코드 불일치)

- [ ] **Step 3: 구현**

`portal/functions/_middleware.js` 맨 위 주석 아래, `variantIndex` 앞에 추가:

```js
// /api/*는 수업 서버(Render)로 그대로 전달합니다. 같은 주소라 로그인 쿠키가 제3자 쿠키로 막히지 않습니다.
// PROXY_SECRET 헤더는 포털을 거친 요청만 Render가 받도록 하는 공유 비밀값입니다(브라우저가 보낸 값은 덮어씀).
const apiJson = (status, error, message) => new Response(JSON.stringify({ error, message }), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
});

export async function proxyApi(request, env, url) {
  if (!env.LEARN_API_ORIGIN || !env.PROXY_SECRET) return apiJson(503, 'LEARN_NOT_CONFIGURED', '수업 서버를 준비하고 있어요.');
  const headers = new Headers(request.headers);
  headers.set('x-proxy-secret', env.PROXY_SECRET);
  headers.set('x-forwarded-host', url.host);
  headers.delete('host');
  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
  try {
    const response = await fetch(new URL(url.pathname + url.search, env.LEARN_API_ORIGIN), {
      method: request.method, headers, body: hasBody ? await request.arrayBuffer() : undefined, redirect: 'manual'
    });
    const out = new Headers(response.headers);
    out.set('Cache-Control', 'no-store');
    return new Response(response.body, { status: response.status, headers: out });
  } catch {
    return apiJson(502, 'LEARN_UNAVAILABLE', '수업 서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.');
  }
}
```

그리고 `onRequest` 안, `/_v` 검사 바로 다음 줄에 추가:

```js
  if (url.pathname === '/api' || url.pathname.startsWith('/api/')) return proxyApi(request, env, url);
```

결과적으로 `onRequest` 앞부분은 다음과 같다:

```js
export async function onRequest({ request, env, next }) {
  const url = new URL(request.url);
  if (url.pathname === '/_v' || url.pathname.startsWith('/_v/')) return new Response('Not found', { status: 404 });
  if (url.pathname === '/api' || url.pathname.startsWith('/api/')) return proxyApi(request, env, url);
  if (request.method !== 'GET' && request.method !== 'HEAD') return next();
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm run test:portal`
Expected: PASS (기존 18개 + 새 3개, 실패 0)

- [ ] **Step 5: Commit**

```bash
git add portal/functions/_middleware.js portal/tests/portal.test.mjs
git commit -m "Forward portal /api requests to the learn server"
```

---

### Task 8: 포털 `/learn/` 페이지와 로그인 화면 스크립트

**Files:**
- Create: `portal/src/learn.js`
- Modify: `portal/src/pages.mjs` (끝에 `learnPage` 추가)
- Modify: `portal/src/layout.mjs:34-63` (추가 스크립트, 메뉴)
- Modify: `portal/scripts/build.mjs:68-78, 89, 114-135`
- Modify: `portal/src/styles.css` (끝에 추가)
- Test: `portal/tests/portal.test.mjs`

- [ ] **Step 1: 실패하는 테스트 작성**

`portal/tests/portal.test.mjs` 첫 번째 테스트의 경로 목록을 바꾼다:

```js
  assert.deepEqual(pages, ['/', '/roadmap/', '/workshops/', '/workshops/01/', '/workshops/02/', '/workshops/03/', '/workshops/04/', '/studio/', '/showcase/', '/about/', '/learn/']);
```

두 번째 테스트(`internal links resolve…`)의 공용 파일 목록에 `learn.js`를 넣는다(`learn.js`는 페이지 묶음이 아니라 루트에 한 번만 있음):

```js
        const shared = /^\/(styles\.css|main\.js|learn\.js|favicon\.svg|og\.png|images\/)/.test(clean);
```

끝에 테스트 추가:

```js
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
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm run test:portal`
Expected: FAIL — 경로 목록에 `/learn/` 없음, 새 테스트 실패

- [ ] **Step 3: 화면 스크립트 작성**

`portal/src/learn.js`:

```js
// 수업 듣기: 로그인 상태 확인 → 로그인 버튼 또는 내 정보·로그아웃.
// 수업 서버는 Render 무료 요금제라 잠들어 있을 수 있어요. 응답이 없으면 최대 1분 동안 5초마다 다시 시도합니다.
(() => {
  const root = document.querySelector('[data-learn]');
  if (!root) return;
  const messages = {
    not_snu: '서울대학교 @snu.ac.kr 계정으로 다시 로그인해 주세요.',
    cancelled: '로그인을 취소했어요. 다시 시도할 수 있어요.',
    expired: '로그인 시간이 지났어요. 다시 시도해 주세요.',
    failed: '로그인을 완료하지 못했어요. 잠시 후 다시 시도해 주세요.'
  };
  const params = new URLSearchParams(location.search);
  const loginError = messages[params.get('error')];
  if (params.has('error')) history.replaceState(null, '', location.pathname);

  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  };
  const show = (...nodes) => root.replaceChildren(...nodes);
  const button = (label, className, onClick) => {
    const node = el('button', className, label);
    node.type = 'button';
    node.addEventListener('click', onClick);
    return node;
  };

  function loginView() {
    const link = el('a', 'btn btn-fill', '서울대 계정으로 로그인');
    link.href = `/api/auth/google?next=${encodeURIComponent(location.pathname)}`;
    const nodes = [el('p', 'learn-status', '서울대 계정으로 로그인해 주세요.'), link];
    if (loginError) nodes.unshift(el('p', 'learn-error', loginError));
    show(...nodes);
  }

  function signedInView(user) {
    const logout = button('로그아웃', 'btn btn-ghost', async () => {
      logout.disabled = true;
      try {
        const response = await fetch('/api/session', { method: 'DELETE', credentials: 'same-origin' });
        if (!response.ok) throw new Error();
        location.replace('/');
      } catch {
        logout.disabled = false;
        show(el('p', 'learn-error', '로그아웃하지 못했어요. 다시 시도해 주세요.'), logout);
      }
    });
    const nodes = [el('p', 'learn-status', `${user.name}님, 로그인되었어요.`), el('p', 'hint', user.email)];
    if (user.operator) nodes.push(el('p', 'hint', '운영진 계정이에요.'));
    nodes.push(el('p', '', '수업 화면은 곧 열려요.'), logout);
    show(...nodes);
  }

  async function check(started) {
    let response = null;
    let data = {};
    try {
      response = await fetch('/api/me', { credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(15000) });
      data = await response.json().catch(() => ({}));
    } catch { /* 연결 실패: 서버가 깨어나는 중일 수 있어요. */ }
    if (response?.ok && data.user) return signedInView(data.user);
    if (response?.status === 401) return loginView();
    if (data.error === 'LEARN_NOT_CONFIGURED') return show(el('p', 'learn-status', '수업 서버를 준비하고 있어요. 운영진이 설정을 마치면 열려요.'));
    if (Date.now() - started < 60000) {
      show(el('p', 'learn-status', '서버를 깨우는 중이에요. 최대 1분 정도 걸려요…'));
      setTimeout(() => check(started), 5000);
      return;
    }
    show(el('p', 'learn-error', '수업 서버에 연결하지 못했어요.'), button('다시 시도', 'btn btn-ghost', () => check(Date.now())));
  }

  check(Date.now());
})();
```

- [ ] **Step 4: 페이지·레이아웃·빌드 연결**

`portal/src/pages.mjs` 끝(`notFoundPage` 다음)에 추가:

```js
export function learnPage() {
  return h`<header class="page-head">
  <h1>수업 듣기</h1>
  <p class="lead">서울대 계정으로 로그인하면 슬라이드를 보며 단계별로 따라 하고, 막힌 부분을 바로 질문할 수 있어요.</p>
</header>
<section class="box learn-box" data-learn aria-live="polite">
  <p class="learn-status">로그인 상태를 확인하고 있어요…</p>
  <noscript><p class="learn-error">이 화면은 JavaScript를 켜야 쓸 수 있어요.</p></noscript>
</section>
<p class="hint">@snu.ac.kr Google 계정만 로그인할 수 있어요. 이메일·이름과 작성한 질문은 수업 운영에만 사용합니다.</p>`;
}
```

`portal/src/layout.mjs`:
- `navGroups`의 첫 그룹을 다음으로 바꾼다:

```js
    { items: [{ path: '/', label: '홈', color: 'home' }, { path: '/learn/', label: '수업 듣기', sub: '서울대 계정 로그인', color: 'navy' }] },
```

- `layout` 함수 인자에 `script`를 추가하고, `main.js` 스크립트 줄 다음에 페이지별 스크립트를 넣는다:

```js
export function layout({ site, content, path, title, description, body, assets, script }) {
```

```js
<script src="/main.js?v=${assets.js}" defer></script>
${script ? h`<script src="/${script}?v=${assets[script]}" defer></script>` : ''}
```

`portal/scripts/build.mjs`:
- `routes()` 배열 끝(`/about/` 다음)에 추가:

```js
    { path: '/learn/', title: '수업 듣기', render: pages.learnPage, description: '서울대 계정으로 로그인하고 슬라이드를 보며 단계별로 실습해요.', script: 'learn.js' }
```

- `writePages`의 `layout({...})` 호출에 `script: route.script`를 추가:

```js
    await writeFile(file, layout({ site: content.site, content, path: route.path, title: route.title, description: route.description, body, assets, script: route.script }));
```

- `buildSite`에서 `main.js`를 읽고 쓰는 부분을 다음으로 바꾼다:

```js
  const css = await readFile(path.join(portal, 'src/styles.css'), 'utf8');
  const js = await readFile(path.join(portal, 'src/main.js'), 'utf8');
  const learnJs = await readFile(path.join(portal, 'src/learn.js'), 'utf8');
  const assets = { css: hash(css), js: hash(js), 'learn.js': hash(learnJs) };
  await writeFile(path.join(out, 'styles.css'), css);
  await writeFile(path.join(out, 'main.js'), js);
  await writeFile(path.join(out, 'learn.js'), learnJs);
```

- `_routes.json`의 `exclude`에 `'/learn.js'`를 추가:

```js
    exclude: ['/styles.css', '/main.js', '/learn.js', '/favicon.svg', '/og.png', '/images/*', '/sitemap.xml', '/robots.txt']
```

`portal/src/styles.css` 끝에 추가:

```css
/* 수업 듣기 (/learn/) */
.learn-box { display: grid; gap: 12px; justify-items: start; }
.learn-status { margin: 0; font-weight: 600; }
.learn-error { margin: 0; color: #b42318; font-weight: 600; }
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npm run test:portal`
Expected: PASS (실패 0)

- [ ] **Step 6: 화면 확인**

Run: `npm run dev:portal` 후 브라우저에서 `http://localhost:5174/learn/` 열기.
Expected: 메뉴에 "수업 듣기", 본문에 "로그인 상태를 확인하고 있어요…" → 로컬에는 `/api`가 없으므로 약 1분 동안 "서버를 깨우는 중이에요…" 뒤 "수업 서버에 연결하지 못했어요. [다시 시도]". 폰 너비(390px)에서도 글자·버튼이 잘리지 않음. 확인 후 서버 종료.

- [ ] **Step 7: Commit**

```bash
git add portal/src/learn.js portal/src/pages.mjs portal/src/layout.mjs portal/scripts/build.mjs portal/src/styles.css portal/tests/portal.test.mjs
git commit -m "Add the SNU login page to the portal"
```

---

### Task 9: 포털 문서

**Files:**
- Modify: `portal/README.md`

- [ ] **Step 1: README에 수업 듣기 절 추가**

`portal/README.md`의 `## 워크숍 2 예제 화면` 절 앞에 추가:

````markdown
## 수업 듣기 (/learn/)와 수업 서버

`/learn/`은 서울대 `@snu.ac.kr` 계정으로 로그인하는 수업 화면입니다. 로그인·진도·질문은 Render의 수업 서버(`../learn-server/`)가 처리하고, 이 포털은 화면과 전달만 맡습니다.

- 브라우저는 포털 주소의 `/api/*`로 요청하고, `functions/_middleware.js`가 Render로 그대로 전달합니다. 이때 `x-proxy-secret` 헤더를 붙여 포털을 거친 요청만 Render가 받게 합니다.
- Pages 비밀값 두 개가 필요합니다. 없으면 `/api/*`는 503(`LEARN_NOT_CONFIGURED`)을 돌려주고 화면은 "준비하고 있어요"를 보여줍니다.

```bash
npx --yes wrangler@4.152.0 pages secret put LEARN_API_ORIGIN --project-name snu-student-collective
npx --yes wrangler@4.152.0 pages secret put PROXY_SECRET --project-name snu-student-collective
```

`LEARN_API_ORIGIN`은 Render 서비스 주소(예: `https://snu-learn-server.onrender.com`, 끝에 / 없음), `PROXY_SECRET`은 Render 환경값과 같은 32자 이상 값입니다. 비밀값을 넣거나 바꾼 뒤에는 `npm run deploy:portal`로 다시 배포해야 적용됩니다.
````

- [ ] **Step 2: Commit**

```bash
git add portal/README.md
git commit -m "Document the learn page proxy and its secrets"
```

---

### Task 10: 외부 서비스 준비와 실제 배포 확인 (사람 + 에이전트)

이 작업은 사용자의 계정 조작이 필요하다. 에이전트는 각 단계에서 사용자에게 할 일을 짧게 안내하고, 사용자가 "했어"라고 하면 확인 명령을 실행한다. 비밀값을 대화로 받지 않는다.

- [ ] **Step 1: 코드 push**

```bash
npm run test:learn && npm run test:portal
git push
```
Expected: 테스트 실패 0, push 성공.

- [ ] **Step 2: PROXY_SECRET 만들기 (에이전트)**

Run (Git Bash): `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))" > learn-server/.env.proxy-secret`
그리고 `git check-ignore learn-server/.env.proxy-secret` 로 무시되는지 확인한다. 무시되지 않으면 파일을 지우고 멈춘다.
Expected: `git check-ignore`가 경로를 출력(= Git에 안 올라감). 사용자에게 파일 경로를 알려주고, Render에 같은 값을 넣게 한다.

- [ ] **Step 3: Supabase (사용자)**

안내: 새 프로젝트(Seoul) → SQL Editor에 `learn-server/schema.sql` 전체 붙여 넣고 Run → "Success" 확인 → Table Editor에 `students`, `progress`, `questions`, `messages`, `attachments` 5개, Storage에 `question-images`(Private) 확인 → Project URL과 secret 키는 Render에 직접 입력할 것.

- [ ] **Step 4: Google OAuth 클라이언트 (사용자)**

안내: `learn-server/README.md` "처음 준비 순서" 2번. 게시 상태가 **In production**인지, 리디렉션 URI가 정확히 `https://snu-student-collective.pages.dev/api/auth/google/callback`인지 확인.

- [ ] **Step 5: Render (사용자)**

안내: New → Blueprint → 저장소 연결 → 값 입력(`PROXY_SECRET`은 Step 2 파일 내용) → 배포 완료 후 서비스 주소 알려주기.
확인 (에이전트):

```bash
curl -s https://<서비스 주소>/api/health
curl -s -o /dev/null -w "%{http_code}\n" https://<서비스 주소>/api/me
```
Expected: `{"ok":true,"configured":true}` 와 `403` (포털을 거치지 않은 직접 접근 거부). `configured:false`면 Render 로그의 "설정 필요 →" 항목을 사용자에게 알려준다.

- [ ] **Step 6: Pages 비밀값과 포털 배포 (에이전트)**

```bash
printf '%s' 'https://<서비스 주소>' | npx --yes wrangler@4.152.0 pages secret put LEARN_API_ORIGIN --project-name snu-student-collective
cat learn-server/.env.proxy-secret | tr -d '\r\n' | npx --yes wrangler@4.152.0 pages secret put PROXY_SECRET --project-name snu-student-collective
npm run deploy:portal
curl -s https://snu-student-collective.pages.dev/api/health
curl -s -o /dev/null -w "%{http_code}\n" https://snu-student-collective.pages.dev/api/me
```
Expected: 비밀값 2개 저장 성공, 배포 완료, `{"ok":true,"configured":true}`, `401`(로그인 전).

- [ ] **Step 7: 실제 로그인 확인 (사용자 + 에이전트)**

사용자에게 요청:
1. `https://snu-student-collective.pages.dev/learn/` → "서울대 계정으로 로그인" → @snu.ac.kr 계정 → "○○님, 로그인되었어요."와 이메일(운영진이면 "운영진 계정이에요")이 보이는지.
2. 새로고침해도 로그인 유지, "로그아웃" 후 홈으로 이동.
3. 개인 Gmail로 시도 → "서울대학교 @snu.ac.kr 계정으로 다시 로그인해 주세요."
4. 가능하면 아이폰 Safari에서 1번 반복.

에이전트 확인: Supabase Table Editor의 `students`에 로그인한 계정 행이 생겼는지 사용자에게 확인받는다. 실제 로그인이 확인되기 전에는 "로그인 완료"라고 보고하지 않는다.

- [ ] **Step 8: 기록**

`learn-server/README.md` 끝에 확인 기록 한 줄 추가(날짜, 확인한 항목, 서비스 주소. 비밀값·이메일 제외) 후 commit·push:

```bash
git add learn-server/README.md
git commit -m "Record the first live SNU login check"
git push
```
