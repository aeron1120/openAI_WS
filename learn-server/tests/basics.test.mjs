import test from 'node:test';
import assert from 'node:assert/strict';
import { HttpError, readBody, readJson } from '../http.mjs';
import { createLimiter } from '../limits.mjs';
import { imageType } from '../images.mjs';

const req = (body, headers = {}) => new Request('https://a.test/', { method: 'POST', body, headers, duplex: 'half' });
const code = async promise => { try { await promise; return 'ok'; } catch (error) { assert.ok(error instanceof HttpError); return `${error.status} ${error.code}`; } };

test('readBody stops at the size limit', async () => {
  assert.equal((await readBody(req('abc'), 3)).length, 3);
  assert.equal(await code(readBody(req('abcd'), 3)), '413 TOO_LARGE');
});

test('readJson needs a JSON object with the JSON content type', async () => {
  assert.deepEqual(await readJson(req('{"a":1}', { 'content-type': 'application/json; charset=utf-8' })), { a: 1 });
  assert.equal(await code(readJson(req('{"a":1}', { 'content-type': 'text/plain' }))), '415 INVALID_CONTENT_TYPE');
  for (const body of ['nope', '[]', 'null']) assert.equal(await code(readJson(req(body, { 'content-type': 'application/json' }))), '400 INVALID_REQUEST', body);
});

test('the limiter allows a number of hits per window and per key', () => {
  const allow = createLimiter({ limit: 2, windowMs: 1000 });
  assert.equal(allow('a', 0), true);
  assert.equal(allow('a', 10), true);
  assert.equal(allow('a', 20), false);
  assert.equal(allow('b', 20), true);
  assert.equal(allow('a', 1001), true);
});

test('image types come from the file bytes', () => {
  assert.equal(imageType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0])), 'image/png');
  assert.equal(imageType(Buffer.from([0xff, 0xd8, 0xff, 0xe0])), 'image/jpeg');
  assert.equal(imageType(Buffer.from('RIFF\0\0\0\0WEBPVP8 ')), 'image/webp');
  assert.equal(imageType(Buffer.from('GIF89a')), null);
  assert.equal(imageType(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>')), null);
  assert.equal(imageType(Buffer.alloc(0)), null);
});
