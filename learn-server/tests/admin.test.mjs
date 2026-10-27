import test from 'node:test';
import assert from 'node:assert/strict';
import { NOW, PNG, api, loginAs, questionApp, send } from './helpers.mjs';

async function withQuestion() {
  const flow = questionApp();
  const student = await loginAs(flow, 1);
  const operator = await loginAs(flow, 9, 'op@snu.ac.kr');
  const { question } = await (await send(flow.app, '/api/questions', student, { body: { workshop: 1, step: 'run-local', body: '도와주세요' } })).json();
  return { flow, student, operator, id: question.id };
}

test('only operators can use the admin API', async () => {
  const { flow, student } = await withQuestion();
  for (const path of ['/api/admin/questions', '/api/admin/progress']) assert.equal((await flow.app(api(path, { cookie: student }))).status, 403, path);
  assert.equal((await flow.app(api('/api/admin/questions'))).status, 401);
});

test('operators list and filter questions with the student who asked', async () => {
  const { flow, operator, id } = await withQuestion();
  const all = await (await flow.app(api('/api/admin/questions', { cookie: operator }))).json();
  assert.deepEqual(all.questions.map(q => [q.id, q.status, q.student.email]), [[id, 'escalated', 's1@snu.ac.kr']]);
  const none = await (await flow.app(api('/api/admin/questions?status=resolved', { cookie: operator }))).json();
  assert.deepEqual(none.questions, []);
  const ws2 = await (await flow.app(api('/api/admin/questions?workshop=2', { cookie: operator }))).json();
  assert.deepEqual(ws2.questions, []);
  assert.equal((await flow.app(api('/api/admin/questions?status=weird', { cookie: operator }))).status, 400);
});

test('an operator answer with an image reaches the student, who does not see the operator email', async () => {
  const { flow, student, operator, id } = await withQuestion();
  const { attachment } = await (await send(flow.app, '/api/uploads', operator, { body: PNG, type: 'image/png' })).json();
  flow.clock.now = NOW + 5000;
  const answer = await send(flow.app, `/api/admin/questions/${id}/messages`, operator, { body: { body: '포트를 바꿔 보세요', attachmentIds: [attachment.id] } });
  assert.equal(answer.status, 201);
  assert.equal(flow.db.tables.questions[0].status, 'answered');
  const adminView = await (await flow.app(api(`/api/admin/questions/${id}`, { cookie: operator }))).json();
  assert.equal(adminView.question.student.email, 's1@snu.ac.kr');
  assert.equal(adminView.question.messages[1].operatorEmail, 'op@snu.ac.kr');
  assert.equal(adminView.question.messages[1].images.length, 1);
  const studentView = await (await flow.app(api(`/api/questions/${id}`, { cookie: student }))).json();
  assert.equal(studentView.question.status, 'answered');
  assert.equal(studentView.question.messages[1].author, 'operator');
  assert.equal(studentView.question.messages[1].operatorEmail, undefined);
  assert.equal(studentView.question.student, undefined);
});

test('operators change status and answers are validated', async () => {
  const { flow, operator, id } = await withQuestion();
  assert.equal((await send(flow.app, `/api/admin/questions/${id}`, operator, { method: 'PATCH', body: { status: 'resolved' } })).status, 200);
  assert.equal(flow.db.tables.questions[0].status, 'resolved');
  assert.equal((await send(flow.app, `/api/admin/questions/${id}`, operator, { method: 'PATCH', body: { status: 'ai_answered' } })).status, 400);
  assert.equal((await send(flow.app, `/api/admin/questions/${id}/messages`, operator, { body: { body: 'a'.repeat(4001) } })).status, 400);
  assert.equal((await send(flow.app, `/api/admin/questions/${id}/messages`, operator, { body: { body: '답' }, origin: null })).status, 403);
  assert.equal((await flow.app(api('/api/admin/questions/00000000-0000-4000-8000-999999999999', { cookie: operator }))).status, 404);
});

test('operators see how many students finished each step', async () => {
  const { flow, student, operator } = await withQuestion();
  await send(flow.app, '/api/progress/1/run-local', student, { method: 'PUT' });
  await send(flow.app, '/api/progress/1/run-local', operator, { method: 'PUT' });
  await send(flow.app, '/api/progress/1/compare', student, { method: 'PUT' });
  const { progress } = await (await flow.app(api('/api/admin/progress', { cookie: operator }))).json();
  assert.deepEqual(progress, [{ workshop: 1, step: 'compare', count: 1 }, { workshop: 1, step: 'run-local', count: 2 }]);
});
