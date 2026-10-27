import test from 'node:test';
import assert from 'node:assert/strict';
import { supabaseClient } from '../supabase.mjs';
import { ENV, fakeFetch } from './helpers.mjs';

test('students are upserted by Google account with the service key', async () => {
  const state = {};
  const db = supabaseClient({ url: ENV.SUPABASE_URL, key: 'sb_secret_test', fetchImpl: fakeFetch(state) });
  const student = await db.upsertStudent({ googleSub: 'g1', email: 'a@snu.ac.kr', name: '가', now: '2026-10-27T12:00:00.000Z' });
  assert.deepEqual(student, { id: 'student-1', email: 'a@snu.ac.kr', name: '가' });
  const [call] = state.upserts;
  assert.match(call.url, /students\?on_conflict=google_sub&select=id,email,name$/);
  assert.equal(call.headers.apikey, 'sb_secret_test');
  assert.equal(call.headers.authorization, undefined);
  assert.equal(call.headers.prefer, 'resolution=merge-duplicates,return=representation');
  assert.deepEqual(call.body, { google_sub: 'g1', email: 'a@snu.ac.kr', name: '가', last_seen_at: '2026-10-27T12:00:00.000Z' });
});

test('a legacy JWT service key is also sent as a bearer token, and errors throw', async () => {
  const state = {};
  await supabaseClient({ url: ENV.SUPABASE_URL, key: 'eyJlegacy', fetchImpl: fakeFetch(state) }).upsertStudent({ googleSub: 'g', email: 'e', name: 'n', now: 't' });
  assert.equal(state.upserts[0].headers.authorization, 'Bearer eyJlegacy');
  const failing = supabaseClient({ url: ENV.SUPABASE_URL, key: 'k', fetchImpl: fakeFetch({ dbStatus: 500 }) });
  await assert.rejects(failing.upsertStudent({ googleSub: 'g', email: 'e', name: 'n', now: 't' }), /Supabase 500/);
});
