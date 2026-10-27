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
