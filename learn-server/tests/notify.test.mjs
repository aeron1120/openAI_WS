import test from 'node:test';
import assert from 'node:assert/strict';
import { createNotifier } from '../notify.mjs';

const info = { questionId: 'q1', workshop: 2, step: 'record', email: 's@snu.ac.kr', body: '푸시가 안 돼요', followUp: false };

test('without a key or address nothing is sent', async () => {
  let called = false;
  const fetchImpl = async () => { called = true; return new Response('{}'); };
  assert.equal(await createNotifier({ apiKey: null, to: 'op@snu.ac.kr', publicOrigin: 'https://portal.test', fetchImpl }).questionWaiting(info), false);
  assert.equal(await createNotifier({ apiKey: 're_x', to: null, publicOrigin: 'https://portal.test', fetchImpl }).questionWaiting(info), false);
  assert.equal(called, false);
});

test('a waiting question is mailed to the operators with a link to answer', async () => {
  const calls = [];
  const fetchImpl = async (url, init) => { calls.push({ url, init }); return new Response('{"id":"e1"}'); };
  const notifier = createNotifier({ apiKey: 're_x', to: 'op@snu.ac.kr', publicOrigin: 'https://portal.test', fetchImpl });
  assert.equal(await notifier.questionWaiting({ ...info, followUp: true }), true);
  assert.equal(calls[0].url, 'https://api.resend.com/emails');
  assert.equal(calls[0].init.headers.authorization, 'Bearer re_x');
  const mail = JSON.parse(calls[0].init.body);
  assert.deepEqual(mail.to, ['op@snu.ac.kr']);
  assert.match(mail.from, /onboarding@resend\.dev/);
  assert.equal(mail.subject, '[수업 질문] Workshop 2 · record (추가 질문)');
  assert.match(mail.text, /s@snu\.ac\.kr/);
  assert.match(mail.text, /푸시가 안 돼요/);
  assert.match(mail.text, /https:\/\/portal\.test\/admin\/\?q=q1/);
});

test('a mail failure is reported as false, never thrown', async () => {
  const failing = createNotifier({ apiKey: 're_x', to: 'op@snu.ac.kr', publicOrigin: 'https://portal.test', fetchImpl: async () => new Response('no', { status: 500 }) });
  assert.equal(await failing.questionWaiting(info), false);
  const broken = createNotifier({ apiKey: 're_x', to: 'op@snu.ac.kr', publicOrigin: 'https://portal.test', fetchImpl: async () => { throw new Error('down'); } });
  assert.equal(await broken.questionWaiting(info), false);
});

test('configured tells whether mail can be sent', () => {
  const make = (apiKey, to) => createNotifier({ apiKey, to, publicOrigin: 'https://portal.test', fetchImpl: async () => new Response('{}') });
  assert.equal(make('re_x', 'op@snu.ac.kr').configured, true);
  assert.equal(make(null, 'op@snu.ac.kr').configured, false);
  assert.equal(make('re_x', '').configured, false);
});

test('test() sends a test mail with the admin link', async () => {
  const calls = [];
  const fetchImpl = async (url, init) => { calls.push(JSON.parse(init.body)); return new Response('{"id":"e1"}'); };
  const notifier = createNotifier({ apiKey: 're_x', to: 'op@snu.ac.kr', publicOrigin: 'https://portal.test', fetchImpl });
  assert.deepEqual(await notifier.test(), { ok: true });
  assert.equal(calls[0].subject, '[수업 질문] 알림 메일 시험');
  assert.deepEqual(calls[0].to, ['op@snu.ac.kr']);
  assert.match(calls[0].text, /https:\/\/portal\.test\/admin\//);
});

test('test() explains why Resend refused the mail', async () => {
  const body = '{"statusCode":403,"message":"You can only send testing emails to your own email address (a@b.c)."}';
  const notifier = createNotifier({ apiKey: 're_x', to: 'op@snu.ac.kr', publicOrigin: 'https://portal.test', fetchImpl: async () => new Response(body, { status: 403 }) });
  const result = await notifier.test();
  assert.equal(result.ok, false);
  assert.match(result.reason, /Resend 403/);
  assert.match(result.reason, /You can only send testing emails/);
  const broken = createNotifier({ apiKey: 're_x', to: 'op@snu.ac.kr', publicOrigin: 'https://portal.test', fetchImpl: async () => { throw new Error('down'); } });
  assert.deepEqual(await broken.test(), { ok: false, reason: 'down' });
});

test('test() without configuration says what to set', async () => {
  const result = await createNotifier({ apiKey: null, to: null, publicOrigin: 'https://portal.test' }).test();
  assert.equal(result.ok, false);
  assert.match(result.reason, /RESEND_API_KEY/);
  assert.match(result.reason, /NOTIFY_EMAIL/);
});
