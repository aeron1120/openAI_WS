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
