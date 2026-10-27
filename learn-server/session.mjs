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
