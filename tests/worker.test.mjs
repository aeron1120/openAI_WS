import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../server/worker.mjs';

test('Worker routes API errors as JSON without falling back to HTML', async () => {
  const response = await worker.fetch(new Request('https://example.com/api/weather?date=bad&time=18:00'), {});
  assert.equal(response.status, 400);
  assert.equal((await response.json()).code, 'INVALID_WEATHER_QUERY');
  assert.equal((await worker.fetch(new Request('https://example.com/api/unknown'), {})).status, 404);
});
test('public assets stay available through Worker fallback', async () => {
  const result = await worker.fetch(new Request('https://example.com/'), { ASSETS: { fetch: () => new Response('home') } });
  assert.equal(await result.text(), 'home');
});
