// 관리자 Google 로그인: 로그인 주소 → 코드 교환 → ID 토큰 서명·내용 검증 → 허용 목록(ADMIN_EMAILS) 확인.
// learn-server/google.mjs의 검증 방식을 그대로 쓰되, 서울대 도메인 대신 정확한 관리자 메일만 통과시킵니다.
// 기존 SNU 학습실의 도메인 제한은 learn-server에 그대로 남아 있습니다.
// 서명 확인은 Node와 Cloudflare 모두에 있는 WebCrypto(crypto.subtle)로 합니다.

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';

// reason: 'failed'(검증 실패·Google 오류) | 'not_admin'(허용되지 않은 계정)
export class GoogleError extends Error {
  constructor(reason) { super(reason); this.reason = reason; }
}

export function authUrl({ clientId, redirectUri, state, nonce, loginHint }) {
  const url = new URL(AUTH_URL);
  const params = { client_id: clientId, redirect_uri: redirectUri, response_type: 'code', scope: 'openid email profile', state, nonce, prompt: 'select_account' };
  if (loginHint) params.login_hint = loginHint;
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
  return crypto.subtle.importKey('jwk', { kty: 'RSA', n: jwk.n, e: jwk.e, alg: 'RS256', ext: true }, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
}

const decode = part => JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));

export async function verifyIdToken(token, { clientId, nonce, admins, fetchImpl, nowMs }) {
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
    if (!(await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, Buffer.from(parts[2], 'base64url'), new TextEncoder().encode(`${parts[0]}.${parts[1]}`)))) throw new Error();
  } catch {
    throw new GoogleError('failed');
  }
  const email = typeof claims.email === 'string' ? claims.email.toLowerCase() : '';
  if (claims.email_verified !== true || !admins.has(email)) throw new GoogleError('not_admin');
  const name = typeof claims.name === 'string' && claims.name.trim() ? claims.name.trim().slice(0, 100) : email.split('@')[0];
  return { sub: claims.sub, email, name };
}
