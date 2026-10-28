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

import { storageClient } from '../storage.mjs';

function recorder(responses = {}) {
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    calls.push({ url: String(url), method: init.method ?? 'GET', headers: init.headers, body: init.body });
    const reply = responses[init.method ?? 'GET'] ?? '[]';
    return new Response(reply, { status: reply ? 200 : 204 });
  };
  return { calls, fetchImpl };
}

test('question queries use PostgREST filters, embeds and ordering', async () => {
  const { calls, fetchImpl } = recorder({ POST: '[{"id":"q1"}]', PATCH: '[{"id":"a1"}]' });
  const db = supabaseClient({ url: 'https://db.test', key: 'k', fetchImpl });
  assert.equal(await db.createQuestion({ studentId: 's1', workshop: 1, stepId: 'run-local', mode: 'own', status: 'escalated', now: 't' }), 'q1');
  assert.equal(await db.addMessage({ questionId: 'q1', author: 'student', body: '도와줘', errorText: null, now: 't' }), 'q1');
  await db.updateQuestion('q1', { status: 'resolved', updated_at: 't' });
  await db.getQuestion('q 1');
  await db.listQuestions({ studentId: 's1' });
  await db.listQuestions({ status: 'escalated', workshop: 2 });
  await db.claimableAttachments({ ids: ['a1', 'a2'], uploaderId: 's1', since: '2026-10-27T11:00:00.000Z' });
  await db.attachToMessage({ ids: ['a1'], messageId: 'm1' });
  await db.staleAttachments('2026-10-26T12:00:00.000Z');
  await db.deleteAttachments(['a1', 'a2']);
  await db.listAllProgress();
  await db.deleteQuestion('q 1');
  const urls = calls.map(c => `${c.method} ${c.url.replace('https://db.test/rest/v1/', '')}`);
  assert.deepEqual(urls, [
    'POST questions?select=id',
    'POST messages?select=id',
    'PATCH questions?id=eq.q1',
    'GET questions?id=eq.q%201&select=id,student_id,workshop,step_id,mode,status,created_at,updated_at,student:students(email,name),messages(id,author,operator_email,body,error_text,created_at,attachments(id,path,mime))&messages.order=created_at.asc',
    'GET questions?student_id=eq.s1&select=id,workshop,step_id,mode,status,created_at,updated_at,student:students(email,name),messages(author,body,created_at)&messages.order=created_at.asc&order=updated_at.desc&limit=200',
    'GET questions?status=eq.escalated&workshop=eq.2&select=id,workshop,step_id,mode,status,created_at,updated_at,student:students(email,name),messages(author,body,created_at)&messages.order=created_at.asc&order=updated_at.desc&limit=200',
    'GET attachments?id=in.(a1,a2)&uploader_id=eq.s1&message_id=is.null&created_at=gte.2026-10-27T11%3A00%3A00.000Z&select=id',
    'PATCH attachments?id=in.(a1)',
    'GET attachments?message_id=is.null&created_at=lt.2026-10-26T12%3A00%3A00.000Z&select=id,path&limit=500',
    'DELETE attachments?id=in.(a1,a2)&message_id=is.null',
    'GET progress?select=workshop,step_id&limit=10000',
    'DELETE questions?id=eq.q%201'
  ]);
  assert.deepEqual(JSON.parse(calls[0].body), { student_id: 's1', workshop: 1, step_id: 'run-local', mode: 'own', status: 'escalated', created_at: 't', updated_at: 't' });
  assert.equal(calls[0].headers.prefer, 'return=representation');
  assert.deepEqual(JSON.parse(calls[1].body), { question_id: 'q1', author: 'student', operator_email: null, body: '도와줘', error_text: null, created_at: 't' });
  assert.deepEqual(JSON.parse(calls[7].body), { message_id: 'm1' });
  assert.equal(calls[11].headers.prefer, 'return=minimal');
});

test('storage uploads privately, signs short-lived URLs and removes files', async () => {
  const { calls, fetchImpl } = recorder({ POST: '{"signedURL":"/object/sign/question-images/s1/a.png?token=x"}', DELETE: '[]' });
  const storage = storageClient({ url: 'https://db.test', key: 'sb_secret_k', fetchImpl });
  await storage.upload('s1/a.png', Buffer.from([1, 2]), 'image/png');
  assert.equal(await storage.signedUrl('s1/a.png'), 'https://db.test/storage/v1/object/sign/question-images/s1/a.png?token=x');
  await storage.remove(['s1/a.png']);
  assert.equal(calls[0].url, 'https://db.test/storage/v1/object/question-images/s1/a.png');
  assert.equal(calls[0].headers['content-type'], 'image/png');
  assert.equal(calls[0].headers['x-upsert'], 'false');
  assert.equal(calls[0].headers.apikey, 'sb_secret_k');
  assert.equal(calls[1].url, 'https://db.test/storage/v1/object/sign/question-images/s1/a.png');
  assert.deepEqual(JSON.parse(calls[1].body), { expiresIn: 600 });
  assert.equal(calls[2].method, 'DELETE');
  assert.equal(calls[2].url, 'https://db.test/storage/v1/object/question-images');
  assert.deepEqual(JSON.parse(calls[2].body), { prefixes: ['s1/a.png'] });
});
