import test from 'node:test';
import assert from 'node:assert/strict';
import { NOW, PNG, api, loginAs, questionApp, send } from './helpers.mjs';

async function upload(flow, cookie, bytes = PNG, type = 'image/png', options = {}) {
  return send(flow.app, '/api/uploads', cookie, { body: bytes, type, ...options });
}

test('an image is stored privately under the uploader and recorded', async () => {
  const flow = questionApp();
  const cookie = await loginAs(flow, 1);
  const response = await upload(flow, cookie);
  assert.equal(response.status, 201);
  const { attachment } = await response.json();
  const [row] = flow.db.tables.attachments;
  assert.equal(row.id, attachment.id);
  assert.equal(row.message_id, null);
  assert.equal(row.mime, 'image/png');
  assert.equal(row.size, PNG.length);
  assert.equal(row.path, `${flow.db.tables.students[0].id}/${attachment.id}.png`);
  assert.ok(flow.storage.files.has(row.path));
});

test('uploads reject wrong types, disguised files, big files, missing origin and too many uploads', async () => {
  const flow = questionApp();
  const cookie = await loginAs(flow, 1);
  assert.equal((await upload(flow, cookie, Buffer.from('hello'), 'text/plain')).status, 415);
  assert.equal((await upload(flow, cookie, Buffer.from('<svg/>'), 'image/png')).status, 415);
  assert.equal((await upload(flow, cookie, PNG, 'image/jpeg')).status, 415);
  assert.equal((await upload(flow, cookie, Buffer.alloc(5 * 1024 * 1024 + 1, 1))).status, 413);
  assert.equal((await upload(flow, cookie, PNG, 'image/png', { origin: null })).status, 403);
  assert.equal((await flow.app(api('/api/uploads', { cookie }))).status, 405);
  assert.equal(flow.db.tables.attachments.length, 0);
  for (let i = 0; i < 30; i++) assert.equal((await upload(flow, cookie)).status, 201);
  assert.equal((await upload(flow, cookie)).status, 429);
  flow.clock.now = NOW + 60 * 60 * 1000;
  assert.equal((await upload(flow, cookie)).status, 201);
});

test('uploads need a login', async () => {
  const flow = questionApp();
  assert.equal((await upload(flow, undefined)).status, 401);
});

test('unattached images older than a day are removed from storage and the database', async () => {
  const flow = questionApp();
  const cookie = await loginAs(flow, 1);
  await upload(flow, cookie);
  flow.clock.now = NOW + 25 * 60 * 60 * 1000;
  await upload(flow, cookie);
  assert.equal(await flow.app.cleanup(), 1);
  assert.equal(flow.db.tables.attachments.length, 1);
  assert.equal(flow.storage.files.size, 1);
});
