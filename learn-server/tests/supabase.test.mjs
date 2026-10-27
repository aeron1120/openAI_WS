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

test('progress is listed per student, first completion time kept, and removed', async () => {
  const state = {};
  const db = supabaseClient({ url: ENV.SUPABASE_URL, key: 'sb_secret_test', fetchImpl: fakeFetch(state) });
  await db.markStep({ studentId: 's1', workshop: 1, stepId: 'run-local', now: 't1' });
  await db.markStep({ studentId: 's1', workshop: 1, stepId: 'run-local', now: 't2' });
  await db.markStep({ studentId: 's2', workshop: 1, stepId: 'compare', now: 't1' });
  assert.deepEqual(await db.listProgress('s1'), [{ workshop: 1, step_id: 'run-local', completed_at: 't1' }]);
  await db.unmarkStep({ studentId: 's1', workshop: 1, stepId: 'run-local' });
  assert.deepEqual(await db.listProgress('s1'), []);
  assert.equal((await db.listProgress('s2')).length, 1);
});

test('progress requests use the right PostgREST filters and headers', async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url: String(url), init });
    if (init.method === 'POST') return new Response(null, { status: 201 });
    if (init.method === 'DELETE') return new Response(null, { status: 204 });
    return new Response('[]', { status: 200 });
  };
  const db = supabaseClient({ url: 'https://db.test', key: 'k', fetchImpl });
  await db.listProgress('s 1');
  await db.markStep({ studentId: 's1', workshop: 2, stepId: 'record', now: 't' });
  await db.unmarkStep({ studentId: 's1', workshop: 2, stepId: 'record' });
  assert.equal(calls[0].url, 'https://db.test/rest/v1/progress?student_id=eq.s%201&select=workshop,step_id,completed_at&order=completed_at.asc');
  assert.equal(calls[1].url, 'https://db.test/rest/v1/progress?on_conflict=student_id,workshop,step_id');
  assert.equal(calls[1].init.headers.prefer, 'resolution=ignore-duplicates,return=minimal');
  assert.deepEqual(JSON.parse(calls[1].init.body), { student_id: 's1', workshop: 2, step_id: 'record', completed_at: 't' });
  assert.equal(calls[2].url, 'https://db.test/rest/v1/progress?student_id=eq.s1&workshop=eq.2&step_id=eq.record');
  assert.equal(calls[2].init.method, 'DELETE');
});
