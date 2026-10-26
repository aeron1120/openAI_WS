const SESSION_COOKIE = '__Host-workshop_session';
const NONCE_COOKIE = '__Host-workshop_nonce';
const JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const SESSION_SECONDS = 8 * 60 * 60;
const NONCE_SECONDS = 10 * 60;
const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });
const keyCaches = new WeakMap();

class AuthError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}
function response(data, status = 200, cookies = []) {
  const headers = new Headers({ 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
  for (const cookie of cookies) headers.append('set-cookie', cookie);
  return new Response(JSON.stringify(data), { status, headers });
}
function cookie(name, value, age) {
  return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${age}`;
}
function readCookie(request, name) {
  const matches = (request.headers.get('cookie') || '').split(';').map(part => part.trim()).filter(part => part.startsWith(`${name}=`));
  return matches.length === 1 ? matches[0].slice(name.length + 1) : null;
}
function base64url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}
function unbase64url(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('Invalid encoding');
  return Uint8Array.from(atob(value.replaceAll('-', '+').replaceAll('_', '/')), char => char.charCodeAt(0));
}
function parsePart(value) { return JSON.parse(decoder.decode(unbase64url(value))); }
function configured(env) {
  return typeof env.GOOGLE_CLIENT_ID === 'string' && /^[A-Za-z0-9._-]+\.apps\.googleusercontent\.com$/.test(env.GOOGLE_CLIENT_ID) && typeof env.SESSION_SECRET === 'string' && env.SESSION_SECRET.length >= 32;
}
async function signingKey(secret) {
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}
async function signCookie(payload, secret) {
  const body = base64url(encoder.encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign('HMAC', await signingKey(secret), encoder.encode(body));
  return `${body}.${base64url(new Uint8Array(signature))}`;
}
async function verifyCookie(value, secret, kind, origin, seconds) {
  try {
    if (!value || value.length > 4096 || !secret) return null;
    const parts = value.split('.');
    if (parts.length !== 2) return null;
    const valid = await crypto.subtle.verify('HMAC', await signingKey(secret), unbase64url(parts[1]), encoder.encode(parts[0]));
    if (!valid) return null;
    const payload = parsePart(parts[0]);
    if (payload.kind !== kind || payload.origin !== origin || !Number.isFinite(payload.exp) || payload.exp <= seconds) return null;
    return payload;
  } catch { return null; }
}
function sameOrigin(request, required = true) {
  const actual = request.headers.get('origin');
  if ((required && !actual) || (actual && actual !== new URL(request.url).origin) || request.headers.get('sec-fetch-site') === 'cross-site') {
    throw new AuthError(403, 'ORIGIN_REJECTED', '이 사이트에서 다시 로그인해 주세요.');
  }
}
async function jsonBody(request) {
  if (!/^application\/json(?:;|$)/i.test(request.headers.get('content-type') || '')) throw new AuthError(415, 'INVALID_CONTENT_TYPE', '지원하지 않는 요청 형식입니다.');
  const reader = request.body?.getReader();
  if (!reader) throw new AuthError(400, 'INVALID_REQUEST', '로그인 요청을 확인해 주세요.');
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 20000) { await reader.cancel(); throw new AuthError(413, 'REQUEST_TOO_LARGE', '로그인 요청이 너무 큽니다.'); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    const body = JSON.parse(decoder.decode(bytes));
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error();
    return body;
  } catch (error) {
    if (error instanceof AuthError) throw error;
    throw new AuthError(400, 'INVALID_REQUEST', '로그인 요청을 확인해 주세요.');
  }
}
async function googleKey(kid, fetchImpl, milliseconds) {
  let cached = keyCaches.get(fetchImpl);
  const missing = cached && !cached.keys.some(key => key.kid === kid);
  if (!cached || cached.expires <= milliseconds || (missing && milliseconds - cached.fetched >= 60000)) {
    try {
      const result = await fetchImpl(JWKS_URL, { signal: AbortSignal.timeout(8000) });
      if (!result.ok) throw new Error();
      const data = await result.json();
      if (!Array.isArray(data.keys) || data.keys.length > 20) throw new Error();
      const maxAge = Number(/(?:^|,)\s*max-age=(\d+)/i.exec(result.headers.get('cache-control') || '')?.[1] || 300);
      cached = { keys: data.keys, fetched: milliseconds, expires: milliseconds + Math.min(Math.max(maxAge, 60), 86400) * 1000 };
      keyCaches.set(fetchImpl, cached);
    } catch { throw new AuthError(503, 'GOOGLE_UNAVAILABLE', 'Google 인증을 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.'); }
  }
  const jwk = cached.keys.find(key => key.kid === kid && key.kty === 'RSA' && (!key.alg || key.alg === 'RS256') && (!key.use || key.use === 'sig'));
  if (!jwk) throw new AuthError(401, 'INVALID_CREDENTIAL', 'Google 로그인 정보를 확인하지 못했습니다. 다시 로그인해 주세요.');
  return crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
}
function safePicture(value) {
  try {
    const url = new URL(value);
    if (url.protocol === 'https:' && !url.username && !url.password && (url.hostname === 'googleusercontent.com' || url.hostname.endsWith('.googleusercontent.com')) && value.length < 1500) return url.href;
  } catch { /* Google can omit a profile picture. */ }
  return null;
}
async function verifyGoogleToken(credential, expectedNonce, clientId, fetchImpl, milliseconds) {
  const invalid = () => new AuthError(401, 'INVALID_CREDENTIAL', 'Google 로그인 정보를 확인하지 못했습니다. 다시 로그인해 주세요.');
  try {
    if (typeof credential !== 'string' || credential.length > 16000) throw invalid();
    const parts = credential.split('.');
    if (parts.length !== 3) throw invalid();
    const header = parsePart(parts[0]);
    const claims = parsePart(parts[1]);
    const seconds = Math.floor(milliseconds / 1000);
    if (header.alg !== 'RS256' || typeof header.kid !== 'string' || header.kid.length > 200) throw invalid();
    if (!['accounts.google.com', 'https://accounts.google.com'].includes(claims.iss) || claims.aud !== clientId || (claims.azp !== undefined && claims.azp !== clientId)) throw invalid();
    if (!Number.isFinite(claims.exp) || claims.exp <= seconds || !Number.isFinite(claims.iat) || claims.iat > seconds + 60 || claims.exp <= claims.iat) throw invalid();
    if (claims.nonce !== expectedNonce || typeof claims.sub !== 'string' || claims.sub.length < 1 || claims.sub.length > 255) throw invalid();
    const key = await googleKey(header.kid, fetchImpl, milliseconds);
    if (!await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, unbase64url(parts[2]), encoder.encode(`${parts[0]}.${parts[1]}`))) throw invalid();
    return { id: claims.sub, name: typeof claims.name === 'string' ? claims.name.slice(0, 100) : 'Google 사용자', picture: safePicture(claims.picture) };
  } catch (error) {
    if (error instanceof AuthError) throw error;
    throw invalid();
  }
}

/** Worker entrypoint delegates /api/auth/* here. No client secret is required. */
export async function handleAuth(request, env, { fetchImpl = fetch, now = Date.now } = {}) {
  const url = new URL(request.url);
  const milliseconds = typeof now === 'function' ? Number(now()) : Number(now);
  const seconds = Math.floor(milliseconds / 1000);
  const route = url.pathname.replace(/^\/api\/auth\//, '');
  const methods = { config: 'GET', nonce: 'GET', google: 'POST', session: 'GET', logout: 'POST' };
  if (!Object.hasOwn(methods, route)) return response({ error: 'NOT_FOUND', message: '찾을 수 없는 요청입니다.' }, 404);
  if (request.method !== methods[route]) {
    const result = response({ error: 'METHOD_NOT_ALLOWED', message: '지원하지 않는 요청입니다.' }, 405);
    result.headers.set('allow', methods[route]);
    return result;
  }
  try {
    if (route === 'config') return response({ configured: configured(env), clientId: configured(env) ? env.GOOGLE_CLIENT_ID : null });
    if (route === 'session') {
      const payload = configured(env) ? await verifyCookie(readCookie(request, SESSION_COOKIE), env.SESSION_SECRET, 'session', url.origin, seconds) : null;
      return response({ user: payload?.user || null });
    }
    if (route === 'logout') {
      sameOrigin(request);
      return response({ user: null }, 200, [cookie(SESSION_COOKIE, '', 0), cookie(NONCE_COOKIE, '', 0)]);
    }
    if (!configured(env)) throw new AuthError(503, 'AUTH_NOT_CONFIGURED', 'Google 로그인 설정을 준비하고 있어요. 모임은 로그인 없이 둘러볼 수 있어요.');
    if (route === 'nonce') {
      sameOrigin(request, false);
      const nonce = base64url(crypto.getRandomValues(new Uint8Array(32)));
      const signed = await signCookie({ kind: 'nonce', origin: url.origin, nonce, exp: seconds + NONCE_SECONDS }, env.SESSION_SECRET);
      return response({ nonce }, 200, [cookie(NONCE_COOKIE, signed, NONCE_SECONDS)]);
    }
    sameOrigin(request);
    const body = await jsonBody(request);
    const challenge = await verifyCookie(readCookie(request, NONCE_COOKIE), env.SESSION_SECRET, 'nonce', url.origin, seconds);
    if (!challenge) throw new AuthError(401, 'NONCE_EXPIRED', '로그인 요청이 만료됐어요. 다시 시도해 주세요.');
    const user = await verifyGoogleToken(body.credential, challenge.nonce, env.GOOGLE_CLIENT_ID, fetchImpl, milliseconds);
    const session = await signCookie({ kind: 'session', origin: url.origin, user, exp: seconds + SESSION_SECONDS }, env.SESSION_SECRET);
    return response({ user }, 200, [cookie(SESSION_COOKIE, session, SESSION_SECONDS), cookie(NONCE_COOKIE, '', 0)]);
  } catch (error) {
    if (error instanceof AuthError) return response({ error: error.code, message: error.message }, error.status);
    return response({ error: 'AUTH_UNAVAILABLE', message: '로그인을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.' }, 503);
  }
}
