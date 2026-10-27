import test from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig } from '../config.mjs';
import { ENV } from './helpers.mjs';

test('a complete environment is ready and operators are lower-cased', () => {
  const config = loadConfig({ ...ENV, OPERATOR_EMAILS: ' Op@snu.ac.kr, second@snu.ac.kr ,' });
  assert.equal(config.ok, true);
  assert.deepEqual(config.problems, []);
  assert.deepEqual([...config.operators], ['op@snu.ac.kr', 'second@snu.ac.kr']);
  assert.equal(config.publicOrigin, ENV.PUBLIC_ORIGIN);
});

test('missing or weak values are listed by name only', () => {
  const config = loadConfig({ ...ENV, GOOGLE_CLIENT_SECRET: '', SESSION_SECRET: 'short', PUBLIC_ORIGIN: 'https://portal.test/' });
  assert.equal(config.ok, false);
  assert.ok(config.problems.includes('GOOGLE_CLIENT_SECRET 없음'));
  assert.ok(config.problems.includes('SESSION_SECRET은 32자 이상'));
  assert.ok(config.problems.some(p => p.startsWith('PUBLIC_ORIGIN')));
  assert.ok(config.problems.every(p => !p.includes('short')));
});

test('no operators means nobody is an operator', () => {
  assert.equal(loadConfig({ ...ENV, OPERATOR_EMAILS: undefined }).operators.size, 0);
});

test('WORKSHOP_OPEN_AT gives each workshop its opening time', () => {
  const config = loadConfig({ ...ENV, WORKSHOP_OPEN_AT: '{"1":"2026-10-26T18:00:00+09:00","2":"2026-11-02T18:00:00+09:00"}' });
  assert.equal(config.ok, true);
  assert.equal(config.workshopOpenAt.get(2), Date.parse('2026-11-02T09:00:00Z'));
  assert.equal(loadConfig(ENV).workshopOpenAt.size, 0);
  for (const bad of ['not json', '[]', '{"one":"2026-10-26T18:00:00+09:00"}', '{"1":"2026-10-26T18:00:00"}', '{"1":5}']) {
    assert.ok(loadConfig({ ...ENV, WORKSHOP_OPEN_AT: bad }).problems.some(p => p.startsWith('WORKSHOP_OPEN_AT')), bad);
  }
});

test('mail and AI settings are optional, and only the none AI provider is accepted', () => {
  const plain = loadConfig(ENV);
  assert.equal(plain.notify.apiKey, null);
  assert.equal(plain.notify.to, null);
  assert.equal(plain.aiProvider, 'none');
  const mail = loadConfig({ ...ENV, RESEND_API_KEY: 're_x', NOTIFY_EMAIL: 'op@snu.ac.kr' });
  assert.deepEqual(mail.notify, { apiKey: 're_x', to: 'op@snu.ac.kr' });
  assert.ok(loadConfig({ ...ENV, AI_PROVIDER: 'openai' }).problems.some(p => p.startsWith('AI_PROVIDER')));
});
