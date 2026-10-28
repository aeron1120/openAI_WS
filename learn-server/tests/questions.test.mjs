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

test('images attached to a message survive cleanup', async () => {
  const flow = questionApp();
  const cookie = await loginAs(flow, 1);
  const { attachment } = await (await upload(flow, cookie)).json();
  await send(flow.app, '/api/questions', cookie, { body: { workshop: 1, step: 'run-local', body: '봐 주세요', attachmentIds: [attachment.id] } });
  flow.clock.now = NOW + 3 * 24 * 60 * 60 * 1000;
  assert.equal(await flow.app.cleanup(), 0);
  assert.equal(flow.db.tables.attachments.length, 1);
  assert.equal(flow.storage.files.size, 1);
});

test('a failed database write removes the just-uploaded file', async () => {
  const flow = questionApp();
  const cookie = await loginAs(flow, 1);
  flow.db.createAttachment = async () => { throw new Error('Supabase 500'); };
  assert.equal((await upload(flow, cookie)).status, 500);
  assert.equal(flow.storage.files.size, 0);
});

const ask = (flow, cookie, body) => send(flow.app, '/api/questions', cookie, { body });
const question = { workshop: 1, step: 'run-local', mode: 'own', body: '서버가 안 켜져요', errorText: 'EADDRINUSE' };

test('a student asks a question at an open step and operators are told', async () => {
  const flow = questionApp();
  const cookie = await loginAs(flow, 1);
  const response = await ask(flow, cookie, question);
  assert.equal(response.status, 201);
  const { question: created } = await response.json();
  assert.equal(created.status, 'escalated');
  const [row] = flow.db.tables.questions;
  assert.deepEqual({ workshop: row.workshop, step: row.step_id, mode: row.mode, status: row.status }, { workshop: 1, step: 'run-local', mode: 'own', status: 'escalated' });
  assert.deepEqual(flow.db.tables.messages.map(m => [m.author, m.body, m.error_text]), [['student', '서버가 안 켜져요', 'EADDRINUSE']]);
  assert.deepEqual(flow.notifier.sent, [{ questionId: created.id, workshop: 1, step: 'run-local', email: 's1@snu.ac.kr', body: '서버가 안 켜져요', followUp: false }]);
  const list = await (await flow.app(api('/api/questions', { cookie }))).json();
  assert.deepEqual(list.questions.map(q => [q.id, q.status, q.preview, q.lastAuthor]), [[created.id, 'escalated', '서버가 안 켜져요', 'student']]);
  const detail = await (await flow.app(api(`/api/questions/${created.id}`, { cookie }))).json();
  assert.equal(detail.question.messages[0].errorText, 'EADDRINUSE');
  assert.equal(detail.question.messages[0].operatorEmail, undefined);
});

test('images are attached once, only by their uploader, within an hour', async () => {
  const flow = questionApp();
  const one = await loginAs(flow, 1);
  const two = await loginAs(flow, 2);
  const { attachment } = await (await send(flow.app, '/api/uploads', one, { body: PNG, type: 'image/png' })).json();
  assert.equal((await ask(flow, two, { ...question, attachmentIds: [attachment.id] })).status, 400);
  assert.equal(flow.db.tables.questions.length, 0);
  const created = await (await ask(flow, one, { ...question, attachmentIds: [attachment.id] })).json();
  const detail = await (await flow.app(api(`/api/questions/${created.question.id}`, { cookie: one }))).json();
  assert.deepEqual(detail.question.messages[0].images, [{ id: attachment.id, url: `https://storage.test/${flow.db.tables.attachments[0].path}?token=t` }]);
  assert.equal((await ask(flow, one, { ...question, attachmentIds: [attachment.id] })).status, 400);
  const late = await (await send(flow.app, '/api/uploads', one, { body: PNG, type: 'image/png' })).json();
  flow.clock.now = NOW + 61 * 60 * 1000;
  assert.equal((await ask(flow, one, { ...question, attachmentIds: [late.attachment.id] })).status, 400);
});

test('students only see and change their own questions', async () => {
  const flow = questionApp();
  const one = await loginAs(flow, 1);
  const two = await loginAs(flow, 2);
  const { question: q } = await (await ask(flow, one, question)).json();
  assert.equal((await flow.app(api(`/api/questions/${q.id}`, { cookie: two }))).status, 404);
  assert.equal((await send(flow.app, `/api/questions/${q.id}/messages`, two, { body: { body: '나도' } })).status, 404);
  assert.equal((await send(flow.app, `/api/questions/${q.id}`, two, { method: 'PATCH', body: { status: 'resolved' } })).status, 404);
  assert.deepEqual((await (await flow.app(api('/api/questions', { cookie: two }))).json()).questions, []);
  assert.equal((await flow.app(api('/api/questions/not-a-uuid', { cookie: one }))).status, 404);
});

test('follow-ups go back to the operators and a student can mark a question resolved', async () => {
  const flow = questionApp();
  const cookie = await loginAs(flow, 1);
  const { question: q } = await (await ask(flow, cookie, question)).json();
  flow.db.tables.questions[0].status = 'answered';
  flow.clock.now = NOW + 1000;
  const follow = await send(flow.app, `/api/questions/${q.id}/messages`, cookie, { body: { body: '아직 안 돼요' } });
  assert.equal(follow.status, 201);
  assert.equal(flow.db.tables.questions[0].status, 'escalated');
  assert.equal(flow.db.tables.questions[0].updated_at, new Date(NOW + 1000).toISOString());
  assert.equal(flow.notifier.sent.at(-1).followUp, true);
  assert.equal((await send(flow.app, `/api/questions/${q.id}`, cookie, { method: 'PATCH', body: { status: 'answered' } })).status, 400);
  assert.equal((await send(flow.app, `/api/questions/${q.id}`, cookie, { method: 'PATCH', body: { status: 'resolved' } })).status, 200);
  assert.equal(flow.db.tables.questions[0].status, 'resolved');
});

test('questions are validated and limited', async () => {
  const flow = questionApp();
  const cookie = await loginAs(flow, 1);
  const status = async body => (await ask(flow, cookie, body)).status;
  assert.equal(await status({ ...question, workshop: 2 }), 403);
  assert.equal(await status({ ...question, body: '   ' }), 400);
  assert.equal(await status({ ...question, body: 'a'.repeat(2001) }), 400);
  assert.equal(await status({ ...question, errorText: 'a'.repeat(4001) }), 400);
  assert.equal(await status({ ...question, step: 'Bad Step' }), 400);
  assert.equal(await status({ ...question, mode: 'other' }), 400);
  assert.equal(await status({ ...question, attachmentIds: ['x'] }), 400);
  assert.equal((await send(flow.app, '/api/questions', cookie, { body: 'body=1', type: 'application/x-www-form-urlencoded' })).status, 415);
  assert.equal((await send(flow.app, '/api/questions', cookie, { body: question, origin: null })).status, 403);
  assert.equal(flow.db.tables.questions.length, 0);
  for (let i = 0; i < 10; i++) assert.equal(await status(question), 201);
  assert.equal(await status(question), 429);
  flow.clock.now = NOW + 60 * 60 * 1000;
  assert.equal(await status(question), 201);
});

test('follow-ups on a question already waiting send no extra mail, and a broken image still shows the thread', async () => {
  const flow = questionApp();
  const cookie = await loginAs(flow, 1);
  const { attachment } = await (await upload(flow, cookie)).json();
  const { question: q } = await (await ask(flow, cookie, { ...question, attachmentIds: [attachment.id] })).json();
  await send(flow.app, `/api/questions/${q.id}/messages`, cookie, { body: { body: '하나 더' } });
  assert.equal(flow.notifier.sent.length, 1);
  flow.storage.signedUrl = async () => { throw new Error('Storage 500'); };
  const detail = await (await flow.app(api(`/api/questions/${q.id}`, { cookie }))).json();
  assert.deepEqual(detail.question.messages[0].images, [{ id: attachment.id, url: null }]);
});

test('a question whose first message cannot be saved is removed', async () => {
  const flow = questionApp();
  const cookie = await loginAs(flow, 1);
  const addMessage = flow.db.addMessage;
  flow.db.addMessage = async () => { flow.db.addMessage = addMessage; throw new Error('Supabase 500'); };
  assert.equal((await ask(flow, cookie, question)).status, 500);
  assert.equal(flow.db.tables.questions.length, 0);
  assert.equal((await ask(flow, cookie, question)).status, 201);
  assert.equal(flow.db.tables.questions.length, 1);
});
