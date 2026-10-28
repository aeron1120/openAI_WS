// 테스트 공용 값과 가짜 외부 서비스. 실제 네트워크는 쓰지 않습니다.
export const ENV = {
  PUBLIC_ORIGIN: 'https://portal.test',
  PROXY_SECRET: 'p'.repeat(40),
  SESSION_SECRET: 's'.repeat(40),
  GOOGLE_CLIENT_ID: 'client-123.apps.googleusercontent.com',
  GOOGLE_CLIENT_SECRET: 'google-secret',
  SUPABASE_URL: 'https://db.test',
  SUPABASE_SERVICE_KEY: 'sb_secret_test',
  OPERATOR_EMAILS: 'op@snu.ac.kr'
};
export const NOW = Date.parse('2026-10-27T12:00:00Z');

import { generateKeyPairSync, sign as rsaSign } from 'node:crypto';

const google = generateKeyPairSync('rsa', { modulusLength: 2048 });
export const otherKey = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey;
export const jwk = { ...google.publicKey.export({ format: 'jwk' }), kid: 'test-key', alg: 'RS256', use: 'sig' };

export function idToken(claims, { key = google.privateKey, kid = 'test-key' } = {}) {
  const part = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const head = `${part({ alg: 'RS256', kid, typ: 'JWT' })}.${part(claims)}`;
  return `${head}.${rsaSign('RSA-SHA256', Buffer.from(head), key).toString('base64url')}`;
}

export function claims(nonce, overrides = {}) {
  const seconds = Math.floor(NOW / 1000);
  return {
    iss: 'https://accounts.google.com', aud: ENV.GOOGLE_CLIENT_ID, azp: ENV.GOOGLE_CLIENT_ID,
    sub: 'google-123', email: 'student@snu.ac.kr', email_verified: true, hd: 'snu.ac.kr', name: '김학생',
    nonce, iat: seconds - 10, exp: seconds + 3600, ...overrides
  };
}

// state.idToken: 토큰 교환 때 돌려줄 값, state.upserts: Supabase에 들어온 요청
export function fakeFetch(state = {}) {
  state.upserts ??= [];
  state.tokenRequests ??= [];
  return async (input, init = {}) => {
    const url = String(input);
    if (url === 'https://oauth2.googleapis.com/token') {
      state.tokenRequests.push(new URLSearchParams(String(init.body)));
      return Response.json(state.tokenStatus ? { error: 'invalid_grant' } : { id_token: state.idToken }, { status: state.tokenStatus ?? 200 });
    }
    if (url === 'https://www.googleapis.com/oauth2/v3/certs') return Response.json({ keys: [jwk] }, { headers: { 'cache-control': 'public, max-age=300' } });
    if (url.startsWith(`${ENV.SUPABASE_URL}/rest/v1/students`)) {
      if (state.dbStatus) return new Response('{}', { status: state.dbStatus });
      const body = JSON.parse(init.body);
      state.upserts.push({ url, body, headers: init.headers });
      return Response.json([{ id: 'student-1', email: body.email, name: body.name }], { status: 201 });
    }
    if (url.startsWith(`${ENV.SUPABASE_URL}/rest/v1/progress`)) {
      if (state.dbStatus) return new Response('{}', { status: state.dbStatus });
      state.progress ??= [];
      const query = new URL(url).searchParams;
      const eq = name => query.get(name)?.replace(/^eq\./, '');
      const method = init.method ?? 'GET';
      if (method === 'GET') {
        return Response.json(state.progress.filter(row => row.student_id === eq('student_id')).map(({ workshop, step_id, completed_at }) => ({ workshop, step_id, completed_at })));
      }
      if (method === 'POST') {
        const row = JSON.parse(init.body);
        if (!state.progress.some(r => r.student_id === row.student_id && r.workshop === row.workshop && r.step_id === row.step_id)) state.progress.push(row);
        return new Response(null, { status: 201 });
      }
      if (method === 'DELETE') {
        state.progress = state.progress.filter(r => !(r.student_id === eq('student_id') && String(r.workshop) === eq('workshop') && r.step_id === eq('step_id')));
        return new Response(null, { status: 204 });
      }
    }
    throw new Error(`unexpected fetch ${url}`);
  };
}

import { createApp } from '../app.mjs';

export function api(path, { method = 'GET', headers = {}, proxy = true, cookie } = {}) {
  return new Request(`https://learn.onrender.test${path}`, {
    method,
    headers: { ...(proxy ? { 'x-proxy-secret': ENV.PROXY_SECRET } : {}), ...(cookie ? { cookie } : {}), ...headers }
  });
}

// set-cookie 중 지우는 쿠키(Max-Age=0)를 뺀 "이름=값" 목록
export const cookiesFrom = response => response.headers.getSetCookie().filter(c => !/Max-Age=0/.test(c)).map(c => c.split(';')[0]).join('; ');

export function makeApp(state = {}, env = ENV, deps = {}) {
  return { state, app: createApp({ env, fetchImpl: fakeFetch(state), now: () => NOW, ...deps }) };
}

// 로그인 시작 → 가짜 Google 토큰 준비 → 콜백까지. override로 토큰 내용을 바꿉니다.
export async function login({ app, state }, { next = '/learn/', override = {}, callbackQuery } = {}) {
  const start = await app(api(`/api/auth/google?next=${encodeURIComponent(next)}`));
  const google = new URL(start.headers.get('location'));
  state.idToken = idToken(claims(google.searchParams.get('nonce'), override));
  const realState = google.searchParams.get('state');
  const query = typeof callbackQuery === 'function' ? callbackQuery(realState) : callbackQuery ?? `code=code-1&state=${realState}`;
  const callback = await app(api(`/api/auth/google/callback?${query}`, { cookie: cookiesFrom(start) }));
  return { start, google, callback, session: cookiesFrom(callback) };
}

// 메모리 DB: supabase.mjs와 같은 함수 모양. 질문·첨부·운영진 경로 테스트용.
export function memoryDb() {
  const t = { students: [], progress: [], questions: [], messages: [], attachments: [] };
  let seq = 0;
  const uuid = () => `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`;
  const detail = q => q && {
    ...q,
    student: (({ email, name }) => ({ email, name }))(t.students.find(s => s.id === q.student_id) ?? {}),
    messages: t.messages.filter(m => m.question_id === q.id).map(m => ({
      ...m,
      attachments: t.attachments.filter(a => a.message_id === m.id).map(({ id, path, mime }) => ({ id, path, mime }))
    }))
  };
  return {
    tables: t,
    async upsertStudent({ googleSub, email, name, now }) {
      let s = t.students.find(x => x.google_sub === googleSub);
      if (!s) { s = { id: uuid(), google_sub: googleSub, created_at: now }; t.students.push(s); }
      Object.assign(s, { email, name, last_seen_at: now });
      return { id: s.id, email, name };
    },
    async listProgress(studentId) { return t.progress.filter(p => p.student_id === studentId); },
    async markStep({ studentId, workshop, stepId, now }) {
      if (!t.progress.some(p => p.student_id === studentId && p.workshop === workshop && p.step_id === stepId)) t.progress.push({ student_id: studentId, workshop, step_id: stepId, completed_at: now });
    },
    async unmarkStep({ studentId, workshop, stepId }) { t.progress = t.progress.filter(p => !(p.student_id === studentId && p.workshop === workshop && p.step_id === stepId)); },
    async listAllProgress() { return t.progress.map(({ workshop, step_id }) => ({ workshop, step_id })); },
    async createQuestion({ studentId, workshop, stepId, mode, status, now }) {
      const id = uuid();
      t.questions.push({ id, student_id: studentId, workshop, step_id: stepId, mode, status, created_at: now, updated_at: now });
      return id;
    },
    async addMessage({ questionId, author, operatorEmail = null, body, errorText = null, now }) {
      const id = uuid();
      t.messages.push({ id, question_id: questionId, author, operator_email: operatorEmail, body, error_text: errorText, created_at: now });
      return id;
    },
    async deleteQuestion(id) {
      const gone = t.messages.filter(m => m.question_id === id).map(m => m.id);
      t.messages = t.messages.filter(m => m.question_id !== id);
      t.attachments = t.attachments.filter(a => !gone.includes(a.message_id));
      t.questions = t.questions.filter(q => q.id !== id);
    },
    async deleteMessage(id) {
      t.messages = t.messages.filter(m => m.id !== id);
      t.attachments = t.attachments.filter(a => a.message_id !== id);
    },
    async updateQuestion(id, fields) { Object.assign(t.questions.find(q => q.id === id), fields); },
    async getQuestion(id) { return detail(t.questions.find(q => q.id === id)) ?? null; },
    async listQuestions({ studentId, status, workshop } = {}) {
      return t.questions.filter(q => (!studentId || q.student_id === studentId) && (!status || q.status === status) && (!workshop || q.workshop === workshop))
        .map(detail).sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    },
    async createAttachment({ id, uploaderId, path, mime, size, now }) { t.attachments.push({ id, uploader_id: uploaderId, message_id: null, path, mime, size, created_at: now }); },
    async claimableAttachments({ ids, uploaderId, since }) {
      return t.attachments.filter(a => ids.includes(a.id) && a.uploader_id === uploaderId && a.message_id === null && a.created_at >= since).map(({ id }) => ({ id }));
    },
    // 내가 올렸고 아직 비어 있는 첨부만 붙이고, 붙인 개수를 돌려줍니다.
    async attachToMessage({ ids, messageId, uploaderId }) {
      const mine = t.attachments.filter(a => ids.includes(a.id) && a.uploader_id === uploaderId && a.message_id === null);
      for (const a of mine) a.message_id = messageId;
      return mine.length;
    },
    async staleAttachments(before) { return t.attachments.filter(a => a.message_id === null && a.created_at < before).map(({ id, path }) => ({ id, path })); },
    async deleteAttachments(ids) { t.attachments = t.attachments.filter(a => !(ids.includes(a.id) && a.message_id === null)); }
  };
}

export function memoryStorage() {
  const files = new Map();
  return {
    files,
    async upload(path, bytes, mime) { files.set(path, { bytes, mime }); },
    async signedUrl(path) { return `https://storage.test/${path}?token=t`; },
    async remove(paths) { for (const path of paths) files.delete(path); }
  };
}

export function fakeNotifier() {
  const sent = [];
  return { sent, async questionWaiting(info) { sent.push(info); return true; } };
}

export const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);
export const OPEN_ENV = { ...ENV, WORKSHOP_OPEN_AT: JSON.stringify({ 1: '2026-10-26T18:00:00+09:00', 2: '2026-11-02T18:00:00+09:00' }) };

// 질문 경로용: 메모리 DB·저장소·알림과 움직이는 시계
export function questionApp() {
  const clock = { now: NOW };
  let ids = 0;
  const deps = { db: memoryDb(), storage: memoryStorage(), notifier: fakeNotifier(), now: () => clock.now, newId: () => `10000000-0000-4000-8000-${String(++ids).padStart(12, '0')}` };
  return { ...makeApp({}, OPEN_ENV, deps), ...deps, clock };
}

export async function loginAs(flow, n, email = `s${n}@snu.ac.kr`) {
  const { session } = await login(flow, { override: { sub: `google-${n}`, email, name: `학생${n} / 학생 / 공과대학` } });
  return session;
}

// 포털 Origin·JSON으로 보내는 요청 (body가 Buffer면 그대로)
export function send(app, path, cookie, { method = 'POST', body, type = 'application/json', origin = 'https://portal.test' } = {}) {
  const headers = { 'x-proxy-secret': ENV.PROXY_SECRET, cookie, 'content-type': type };
  if (origin) headers.origin = origin;
  return app(new Request(`https://learn.onrender.test${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : Buffer.isBuffer(body) || typeof body === 'string' ? body : JSON.stringify(body),
    duplex: 'half'
  }));
}
