// 응답·쿠키·요청 확인 도우미. learn-server/http.mjs와 같은 방식이며, 배포를 분리하려고 복사해 둡니다.
import { timingSafeEqual } from 'node:crypto';

export class HttpError extends Error {
  constructor(status, code, message, extra = {}) { super(message); this.status = status; this.code = code; this.extra = extra; }
}

const SECURITY = {
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'x-frame-options': 'DENY'
};

function headersFor(type, { cache = 'no-store', cookies = [], extra = {} } = {}) {
  const headers = new Headers({ ...SECURITY, 'content-type': type, 'cache-control': cache, ...extra });
  for (const cookie of cookies) headers.append('set-cookie', cookie);
  return headers;
}

export function json(data, status = 200, cookies = []) {
  return new Response(JSON.stringify(data), { status, headers: headersFor('application/json; charset=utf-8', { cookies }) });
}

// 공개 페이지도 처음에는 캐시하지 않습니다(게시·비공개 전환이 다음 요청에 바로 반영되도록).
export function html(body, status = 200, { cookies = [], noindex = false } = {}) {
  const extra = noindex ? { 'x-robots-tag': 'noindex, nofollow' } : {};
  extra['content-security-policy'] = "default-src 'self'; img-src 'self' data: https:; style-src 'self' https://cdn.jsdelivr.net; font-src https://cdn.jsdelivr.net; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self' https://accounts.google.com";
  return new Response(body, { status, headers: headersFor('text/html; charset=utf-8', { cookies, extra }) });
}

export function redirect(location, cookies = [], status = 302) {
  return new Response(null, { status, headers: headersFor('text/plain', { cookies, extra: { location } }) });
}

export function bytes(body, type, { cache = 'no-store', filename = null } = {}) {
  const extra = filename ? { 'content-disposition': `inline; filename*=UTF-8''${encodeURIComponent(filename)}` } : {};
  return new Response(body, { status: 200, headers: headersFor(type, { cache, extra }) });
}

// localhost는 브라우저가 Secure 쿠키를 허용하므로 개발 중에도 같은 설정을 씁니다.
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

// 요청 본문을 maxBytes까지만 읽습니다. 넘으면 413(TOO_LARGE).
export async function readBody(request, maxBytes, message = '보낸 내용이 너무 커요.') {
  if (Number(request.headers.get('content-length') ?? 0) > maxBytes) throw new HttpError(413, 'TOO_LARGE', message);
  const reader = request.body?.getReader();
  if (!reader) return Buffer.alloc(0);
  const chunks = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new HttpError(413, 'TOO_LARGE', message);
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

export async function readJson(request, maxBytes = 200000) {
  if (!/^application\/json(;|$)/i.test(request.headers.get('content-type') ?? '')) throw new HttpError(415, 'INVALID_CONTENT_TYPE', '요청 형식을 확인해 주세요.');
  const body = await readBody(request, maxBytes);
  try {
    const data = JSON.parse(body.toString('utf8'));
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error();
    return data;
  } catch {
    throw new HttpError(400, 'INVALID_REQUEST', '요청 내용을 확인해 주세요.');
  }
}
