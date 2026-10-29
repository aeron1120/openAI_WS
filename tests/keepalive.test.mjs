import test from 'node:test';
import assert from 'node:assert/strict';
import worker, { HEALTH_URL, ping } from '../learn-keepalive/worker.mjs';

test('the keep-alive Worker calls the learn server health check and survives failures', async () => {
  const calls = [];
  assert.equal(await ping(async url => { calls.push(url); return new Response('{}', { status: 200 }); }), 200);
  assert.deepEqual(calls, [HEALTH_URL]);
  assert.match(HEALTH_URL, /^https:\/\/snu-learn-server\.onrender\.com\/api\/health$/);
  assert.equal(await ping(async () => { throw new Error('down'); }), 0);
  assert.equal(typeof worker.scheduled, 'function');
});
