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
