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

export async function readJson(request, maxBytes = 20000) {
  if (!/^application\/json(;|$)/i.test(request.headers.get('content-type') ?? '')) throw new HttpError(415, 'INVALID_CONTENT_TYPE', '요청 형식을 확인해 주세요.');
  const bytes = await readBody(request, maxBytes);
  try {
    const data = JSON.parse(bytes.toString('utf8'));
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error();
    return data;
  } catch {
    throw new HttpError(400, 'INVALID_REQUEST', '요청 내용을 확인해 주세요.');
  }
}
