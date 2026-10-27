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
