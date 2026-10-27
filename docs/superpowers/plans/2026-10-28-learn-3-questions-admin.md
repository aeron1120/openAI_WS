# 수업 시스템 3단계: 질문·이미지 첨부·운영진 페이지 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 학생이 수업 단계에서 바로 질문하고(오류 이미지 최대 3장), 운영진이 `/admin/`에서 답하며, 새 질문은 운영진 메일로 알린다.

**Architecture:** 수업 서버(`learn-server/`)에 질문·첨부·운영진 API를 더한다. 이미지는 Supabase Storage 비공개 버킷에 서버가 올리고, 볼 때마다 10분짜리 서명 주소를 준다. 메일은 Resend HTTP API(키가 없으면 건너뜀). AI 답변은 연결부만 두고 꺼 둔다. 포털은 수업 화면에 질문 칸, `/learn/questions/`(내 질문), `/admin/`(운영진)을 더한다. 화면 스크립트는 `learn.js`(공통 로그인·API + 수업 목록·수업 화면) 위에 `questions.js`(질문 칸·대화·이미지 올리기, 학생·운영진 공용)와 `admin.js`를 얹는다.

**Tech Stack:** Node 20+ 기본 기능, `node:test`, Supabase PostgREST·Storage, Resend, Cloudflare Pages.

**Spec:** `docs/superpowers/specs/2026-10-27-snu-learn-system-design.md` "질문하기", "운영진 페이지", "API". 1·2단계가 먼저 끝나 있어야 한다(`progress.mjs`의 `isOpen`, `learn-pages.mjs`, 2단계 `learn.js`).

**스펙과 다른 점 / 정한 점**
- 시간당 제한(질문 10, 메시지 30, 이미지 30)은 서버 메모리로 센다. 무료 서버가 잠들면 초기화되지만 장난·실수 방지에는 충분하다.
- 질문 경로 테스트는 가짜 fetch 대신 메모리 DB(`memoryDb`)를 주입해서 한다. Supabase 요청 모양은 `supabase.mjs` 단위 테스트에서 따로 확인한다.
- 학생 화면에는 운영진 이메일을 보여주지 않고 "운영진"으로만 표시한다.
- 메일은 운영진 1곳(`NOTIFY_EMAIL`)으로만 보낸다. Resend를 도메인 없이 쓰면 가입 메일로만 보낼 수 있다.

---

## File Structure

수업 서버 (`learn-server/`)
- Modify `http.mjs`: `readBody`(크기 제한), `readJson`
- Create `limits.mjs`: 학생별 시간당 횟수 제한
- Create `images.mjs`: 파일 앞부분으로 PNG·JPEG·WebP 확인
- Create `storage.mjs`: Supabase Storage(올리기·서명 주소·지우기)
- Modify `supabase.mjs`: 질문·메시지·첨부·전체 진도 쿼리
- Create `notify.mjs`: Resend 메일
- Create `ai.mjs`: AI 연결부(`none`)
- Create `questions.mjs`: 학생 질문 API + 공용 함수(`messageInput`, `summary`, `questionView`, `postMessage`, `usableAttachments`)
- Create `uploads.mjs`: 이미지 올리기 API, 오래된 첨부 정리
- Create `admin.mjs`: 운영진 API
- Modify `config.mjs`, `app.mjs`, `server.mjs`, `README.md`, `../render.yaml`
- Tests: `tests/helpers.mjs`(memoryDb 등), `tests/basics.test.mjs`, `tests/supabase.test.mjs`, `tests/notify.test.mjs`, `tests/questions.test.mjs`, `tests/admin.test.mjs`

포털 (`portal/`)
- Modify `src/layout.mjs`: 경로별 스크립트 여러 개
- Modify `src/learn-pages.mjs`: 질문 버튼, `/learn/questions/`, `/admin/` 페이지
- Modify `scripts/build.mjs`: 경로·스크립트 복사
- Modify `src/learn.js`: 공통 부분을 `window.Learn`으로 공개
- Create `src/questions.js`, `src/admin.js`
- Modify `src/styles.css`, `tests/portal.test.mjs`, `README.md`

---

### Task 1: 요청 본문·횟수 제한·이미지 확인 도우미

**Files:**
- Modify: `learn-server/http.mjs`
- Create: `learn-server/limits.mjs`, `learn-server/images.mjs`
- Test: `learn-server/tests/basics.test.mjs`

- [ ] **Step 1: 실패하는 테스트 작성**

`learn-server/tests/basics.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { HttpError, readBody, readJson } from '../http.mjs';
import { createLimiter } from '../limits.mjs';
import { imageType } from '../images.mjs';

const req = (body, headers = {}) => new Request('https://a.test/', { method: 'POST', body, headers, duplex: 'half' });
const code = async promise => { try { await promise; return 'ok'; } catch (error) { assert.ok(error instanceof HttpError); return `${error.status} ${error.code}`; } };

test('readBody stops at the size limit', async () => {
  assert.equal((await readBody(req('abc'), 3)).length, 3);
  assert.equal(await code(readBody(req('abcd'), 3)), '413 TOO_LARGE');
});

test('readJson needs a JSON object with the JSON content type', async () => {
  assert.deepEqual(await readJson(req('{"a":1}', { 'content-type': 'application/json; charset=utf-8' })), { a: 1 });
  assert.equal(await code(readJson(req('{"a":1}', { 'content-type': 'text/plain' }))), '415 INVALID_CONTENT_TYPE');
  for (const body of ['nope', '[]', 'null']) assert.equal(await code(readJson(req(body, { 'content-type': 'application/json' }))), '400 INVALID_REQUEST', body);
});

test('the limiter allows a number of hits per window and per key', () => {
  const allow = createLimiter({ limit: 2, windowMs: 1000 });
  assert.equal(allow('a', 0), true);
  assert.equal(allow('a', 10), true);
  assert.equal(allow('a', 20), false);
  assert.equal(allow('b', 20), true);
  assert.equal(allow('a', 1001), true);
});

test('image types come from the file bytes', () => {
  assert.equal(imageType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0])), 'image/png');
  assert.equal(imageType(Buffer.from([0xff, 0xd8, 0xff, 0xe0])), 'image/jpeg');
  assert.equal(imageType(Buffer.from('RIFF\0\0\0\0WEBPVP8 ')), 'image/webp');
  assert.equal(imageType(Buffer.from('GIF89a')), null);
  assert.equal(imageType(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>')), null);
  assert.equal(imageType(Buffer.alloc(0)), null);
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test learn-server/tests/basics.test.mjs`
Expected: FAIL — `readBody` export 없음 / `limits.mjs` 없음

- [ ] **Step 3: 구현**

`learn-server/http.mjs` 끝에 추가:

```js
// 요청 본문을 maxBytes까지만 읽습니다. 넘으면 413(TOO_LARGE).
export async function readBody(request, maxBytes, message = '보낸 내용이 너무 커요.') {
  if (Number(request.headers.get('content-length') ?? 0) > maxBytes) throw new HttpError(413, 'TOO_LARGE', message);
  const reader = request.body?.getReader();
  if (!reader) return Buffer.alloc(0);
  const chunks = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new HttpError(413, 'TOO_LARGE', message);
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

export async function readJson(request, maxBytes = 20000) {
  if (!/^application\/json(;|$)/i.test(request.headers.get('content-type') ?? '')) throw new HttpError(415, 'INVALID_CONTENT_TYPE', '요청 형식을 확인해 주세요.');
  const bytes = await readBody(request, maxBytes);
  try {
    const data = JSON.parse(bytes.toString('utf8'));
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error();
    return data;
  } catch {
    throw new HttpError(400, 'INVALID_REQUEST', '요청 내용을 확인해 주세요.');
  }
}
```

`learn-server/limits.mjs`:

```js
// 학생별 시간당 요청 횟수 제한(서버 메모리). 무료 서버가 잠들면 초기화되지만, 장난·실수로 많이 보내는 것은 막습니다.
export function createLimiter({ limit, windowMs }) {
  const hits = new Map();
  return function allow(key, nowMs) {
    const recent = (hits.get(key) ?? []).filter(time => nowMs - time < windowMs);
    const allowed = recent.length < limit;
    if (allowed) recent.push(nowMs);
    hits.set(key, recent);
    return allowed;
  };
}
```

`learn-server/images.mjs`:

```js
// 첨부 이미지: 파일 앞부분 바이트로 실제 형식을 확인합니다(Content-Type 헤더만 믿지 않음). SVG·GIF는 받지 않습니다.
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const EXTENSIONS = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };

const starts = (bytes, values, offset = 0) => values.every((value, i) => bytes[offset + i] === value);
const ascii = text => [...text].map(char => char.charCodeAt(0));

export function imageType(bytes) {
  if (starts(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  if (starts(bytes, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (starts(bytes, ascii('RIFF')) && starts(bytes, ascii('WEBP'), 8)) return 'image/webp';
  return null;
}
```

- [ ] **Step 4: 통과 확인**

Run: `node --test learn-server/tests/*.test.mjs`
Expected: PASS, 실패 0

- [ ] **Step 5: Commit**

```bash
git add learn-server/http.mjs learn-server/limits.mjs learn-server/images.mjs learn-server/tests/basics.test.mjs
git commit -m "Add body size limits, per-student rate limits and image checks"
```

---

### Task 2: Supabase 질문·첨부 쿼리와 Storage

**Files:**
- Modify: `learn-server/supabase.mjs`
- Create: `learn-server/storage.mjs`
- Test: `learn-server/tests/supabase.test.mjs`

- [ ] **Step 1: 실패하는 테스트 작성**

`learn-server/tests/supabase.test.mjs` 끝에 추가:

```js
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
    'DELETE attachments?id=in.(a1,a2)',
    'GET progress?select=workshop,step_id&limit=10000'
  ]);
  assert.deepEqual(JSON.parse(calls[0].body), { student_id: 's1', workshop: 1, step_id: 'run-local', mode: 'own', status: 'escalated', created_at: 't', updated_at: 't' });
  assert.equal(calls[0].headers.prefer, 'return=representation');
  assert.deepEqual(JSON.parse(calls[1].body), { question_id: 'q1', author: 'student', operator_email: null, body: '도와줘', error_text: null, created_at: 't' });
  assert.deepEqual(JSON.parse(calls[7].body), { message_id: 'm1' });
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
```

- [ ] **Step 2: 실패 확인**

Run: `node --test learn-server/tests/supabase.test.mjs`
Expected: FAIL — `storage.mjs` 없음 / `createQuestion` 없음

- [ ] **Step 3: 구현**

`learn-server/supabase.mjs`:
- `export function supabaseClient` 위에 상수 추가:

```js
const enc = encodeURIComponent;
const inList = ids => `in.(${ids.map(enc).join(',')})`;
// 질문 목록(요약)과 질문 하나(대화·첨부까지). student:students(...)는 questions.student_id 외래키로 학생을 붙입니다.
const SUMMARY = 'id,workshop,step_id,mode,status,created_at,updated_at,student:students(email,name),messages(author,body,created_at)';
const DETAIL = 'id,student_id,workshop,step_id,mode,status,created_at,updated_at,student:students(email,name),messages(id,author,operator_email,body,error_text,created_at,attachments(id,path,mime))';
```

- 반환 객체의 `unmarkStep` 다음에 추가:

```js
    listAllProgress() {
      return request('progress?select=workshop,step_id&limit=10000');
    },
    async createQuestion({ studentId, workshop, stepId, mode, status, now }) {
      const rows = await request('questions?select=id', {
        method: 'POST',
        headers: { prefer: 'return=representation' },
        body: JSON.stringify({ student_id: studentId, workshop, step_id: stepId, mode, status, created_at: now, updated_at: now })
      });
      return rows[0].id;
    },
    async addMessage({ questionId, author, operatorEmail = null, body, errorText = null, now }) {
      const rows = await request('messages?select=id', {
        method: 'POST',
        headers: { prefer: 'return=representation' },
        body: JSON.stringify({ question_id: questionId, author, operator_email: operatorEmail, body, error_text: errorText, created_at: now })
      });
      return rows[0].id;
    },
    async updateQuestion(id, fields) {
      await request(`questions?id=eq.${enc(id)}`, { method: 'PATCH', headers: { prefer: 'return=minimal' }, body: JSON.stringify(fields) });
    },
    async getQuestion(id) {
      const rows = await request(`questions?id=eq.${enc(id)}&select=${DETAIL}&messages.order=created_at.asc`);
      return rows?.[0] ?? null;
    },
    listQuestions({ studentId, status, workshop } = {}) {
      const filters = [];
      if (studentId) filters.push(`student_id=eq.${enc(studentId)}`);
      if (status) filters.push(`status=eq.${enc(status)}`);
      if (workshop) filters.push(`workshop=eq.${enc(workshop)}`);
      return request(`questions?${[...filters, `select=${SUMMARY}`, 'messages.order=created_at.asc', 'order=updated_at.desc', 'limit=200'].join('&')}`);
    },
    async createAttachment({ id, uploaderId, path, mime, size, now }) {
      await request('attachments', {
        method: 'POST',
        headers: { prefer: 'return=minimal' },
        body: JSON.stringify({ id, uploader_id: uploaderId, path, mime, size, created_at: now })
      });
    },
    // 내가 올렸고, 아직 메시지에 안 붙었고, since 이후에 올린 첨부만 돌려줍니다.
    claimableAttachments({ ids, uploaderId, since }) {
      return request(`attachments?id=${inList(ids)}&uploader_id=eq.${enc(uploaderId)}&message_id=is.null&created_at=gte.${enc(since)}&select=id`);
    },
    async attachToMessage({ ids, messageId }) {
      await request(`attachments?id=${inList(ids)}`, { method: 'PATCH', headers: { prefer: 'return=minimal' }, body: JSON.stringify({ message_id: messageId }) });
    },
    staleAttachments(before) {
      return request(`attachments?message_id=is.null&created_at=lt.${enc(before)}&select=id,path&limit=500`);
    },
    async deleteAttachments(ids) {
      await request(`attachments?id=${inList(ids)}`, { method: 'DELETE', headers: { prefer: 'return=minimal' } });
    }
```

`learn-server/storage.mjs`:

```js
// Supabase Storage 비공개 버킷(question-images). 공개 주소는 만들지 않고, 볼 때마다 10분짜리 서명 주소를 만듭니다.
export const BUCKET = 'question-images';

export function storageClient({ url, key, fetchImpl = fetch }) {
  const auth = { apikey: key, ...(key.startsWith('eyJ') ? { authorization: `Bearer ${key}` } : {}) };
  async function call(path, { headers = {}, ...init }) {
    const response = await fetchImpl(`${url}/storage/v1/${path}`, { ...init, headers: { ...auth, ...headers }, signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error(`Storage ${response.status}`);
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }
  return {
    async upload(path, bytes, mime) {
      await call(`object/${BUCKET}/${path}`, { method: 'POST', headers: { 'content-type': mime, 'x-upsert': 'false' }, body: bytes });
    },
    async signedUrl(path, seconds = 600) {
      const data = await call(`object/sign/${BUCKET}/${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ expiresIn: seconds }) });
      return `${url}/storage/v1${data.signedURL}`;
    },
    async remove(paths) {
      await call(`object/${BUCKET}`, { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ prefixes: paths }) });
    }
  };
}
```

- [ ] **Step 4: 통과 확인**

Run: `node --test learn-server/tests/*.test.mjs`
Expected: PASS, 실패 0

- [ ] **Step 5: Commit**

```bash
git add learn-server/supabase.mjs learn-server/storage.mjs learn-server/tests/supabase.test.mjs
git commit -m "Add question, attachment and storage queries for Supabase"
```

---

### Task 3: 메일 알림·AI 연결부·설정

**Files:**
- Create: `learn-server/notify.mjs`, `learn-server/ai.mjs`
- Modify: `learn-server/config.mjs`
- Test: `learn-server/tests/notify.test.mjs`, `learn-server/tests/config.test.mjs`

- [ ] **Step 1: 실패하는 테스트 작성**

`learn-server/tests/notify.test.mjs`:

```js
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
```

`learn-server/tests/config.test.mjs` 끝에 추가:

```js
test('mail and AI settings are optional, and only the none AI provider is accepted', () => {
  const plain = loadConfig(ENV);
  assert.equal(plain.notify.apiKey, null);
  assert.equal(plain.notify.to, null);
  assert.equal(plain.aiProvider, 'none');
  const mail = loadConfig({ ...ENV, RESEND_API_KEY: 're_x', NOTIFY_EMAIL: 'op@snu.ac.kr' });
  assert.deepEqual(mail.notify, { apiKey: 're_x', to: 'op@snu.ac.kr' });
  assert.ok(loadConfig({ ...ENV, AI_PROVIDER: 'openai' }).problems.some(p => p.startsWith('AI_PROVIDER')));
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test learn-server/tests/notify.test.mjs learn-server/tests/config.test.mjs`
Expected: FAIL — `notify.mjs` 없음, `plain.notify` 없음

- [ ] **Step 3: 구현**

`learn-server/notify.mjs`:

```js
// 새 질문·추가 질문을 운영진 메일로 알립니다(Resend HTTP API).
// 키나 받는 주소가 없으면 보내지 않고, 실패해도 질문 저장은 막지 않습니다(서버 로그만 남김).
export function createNotifier({ apiKey, to, publicOrigin, fetchImpl = fetch }) {
  return {
    async questionWaiting({ questionId, workshop, step, email, body, followUp }) {
      if (!apiKey || !to) return false;
      try {
        const response = await fetchImpl('https://api.resend.com/emails', {
          method: 'POST',
          headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
          body: JSON.stringify({
            from: 'SNU 수업 알림 <onboarding@resend.dev>',
            to: [to],
            subject: `[수업 질문] Workshop ${workshop} · ${step}${followUp ? ' (추가 질문)' : ''}`,
            text: `${email}\n\n${body.slice(0, 500)}\n\n답변하기: ${publicOrigin}/admin/?q=${questionId}`
          }),
          signal: AbortSignal.timeout(10000)
        });
        if (!response.ok) throw new Error(`Resend ${response.status}`);
        return true;
      } catch (error) {
        console.error('learn-server: notify failed', error.message);
        return false;
      }
    }
  };
}
```

`learn-server/ai.mjs`:

```js
// AI 답변 연결부. 지금은 AI_PROVIDER=none만 지원해서 항상 null(→ 질문은 바로 운영진에게)을 돌려줍니다.
// 나중에 서비스를 정하면 여기서 { question, step } 내용으로 답을 만들어 문자열로 돌려주면 됩니다.
export function createAi({ provider }) {
  return {
    provider,
    async answer() {
      return null;
    }
  };
}
```

`learn-server/config.mjs`:
- `workshopOpenAt` 처리 다음, `return {` 위에 추가:

```js
  const aiProvider = env.AI_PROVIDER || 'none';
  if (aiProvider !== 'none') problems.push('AI_PROVIDER는 아직 none만 지원합니다');
```

- 반환 객체에 추가:

```js
    notify: { apiKey: env.RESEND_API_KEY || null, to: env.NOTIFY_EMAIL || null },
    aiProvider,
```

- [ ] **Step 4: 통과 확인**

Run: `node --test learn-server/tests/*.test.mjs`
Expected: PASS, 실패 0

- [ ] **Step 5: Commit**

```bash
git add learn-server/notify.mjs learn-server/ai.mjs learn-server/config.mjs learn-server/tests/notify.test.mjs learn-server/tests/config.test.mjs
git commit -m "Add operator mail alerts and an AI answer hook that is off"
```

---

### Task 4: 메모리 DB와 테스트 도우미

**Files:**
- Modify: `learn-server/tests/helpers.mjs`
- Modify: `learn-server/app.mjs` (의존성 주입만)

- [ ] **Step 1: app.mjs가 db·storage·notifier·ai·newId를 주입받게 하기**

`learn-server/app.mjs`:
- import 줄 변경·추가:

```js
import { randomBytes, randomUUID } from 'node:crypto';
import { storageClient } from './storage.mjs';
import { createNotifier } from './notify.mjs';
import { createAi } from './ai.mjs';
```

- `createApp` 시그니처와 첫 줄들을 다음으로 바꾼다:

```js
export function createApp({ env, fetchImpl = fetch, now = Date.now, random = () => randomBytes(24).toString('base64url'), newId = randomUUID, db: givenDb, storage: givenStorage, notifier: givenNotifier, ai: givenAi }) {
  const config = loadConfig(env);
  const db = givenDb ?? (config.ok ? supabaseClient({ ...config.supabase, fetchImpl }) : null);
  const storage = givenStorage ?? (config.ok ? storageClient({ ...config.supabase, fetchImpl }) : null);
  const notifier = givenNotifier ?? createNotifier({ ...config.notify, publicOrigin: config.publicOrigin, fetchImpl });
  const ai = givenAi ?? createAi({ provider: config.aiProvider });
  const callbackUrl = `${config.publicOrigin}/api/auth/google/callback`;
```

(`newId`, `storage`, `notifier`, `ai`는 Task 5–7에서 쓴다.)

- [ ] **Step 2: 테스트 도우미 추가**

`learn-server/tests/helpers.mjs`:
- `makeApp`을 다음으로 바꾼다(기존 호출 `makeApp(state)`, `makeApp(state, env)`는 그대로 동작):

```js
export function makeApp(state = {}, env = ENV, deps = {}) {
  return { state, app: createApp({ env, fetchImpl: fakeFetch(state), now: () => NOW, ...deps }) };
}
```

- 파일 끝에 추가:

```js
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
    async attachToMessage({ ids, messageId }) { for (const a of t.attachments) if (ids.includes(a.id)) a.message_id = messageId; },
    async staleAttachments(before) { return t.attachments.filter(a => a.message_id === null && a.created_at < before).map(({ id, path }) => ({ id, path })); },
    async deleteAttachments(ids) { t.attachments = t.attachments.filter(a => !ids.includes(a.id)); }
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
```

- [ ] **Step 3: 기존 테스트 확인**

Run: `node --test learn-server/tests/*.test.mjs`
Expected: PASS, 실패 0 (동작 변화 없음)

- [ ] **Step 4: Commit**

```bash
git add learn-server/app.mjs learn-server/tests/helpers.mjs
git commit -m "Let the learn app take injected services and add in-memory test doubles"
```

---

### Task 5: 이미지 올리기 API와 오래된 첨부 정리

**Files:**
- Create: `learn-server/uploads.mjs`
- Modify: `learn-server/app.mjs`, `learn-server/server.mjs`
- Test: `learn-server/tests/questions.test.mjs` (새 파일, 이 작업은 업로드 테스트만)

- [ ] **Step 1: 실패하는 테스트 작성**

`learn-server/tests/questions.test.mjs`:

```js
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
```

- [ ] **Step 2: 실패 확인**

Run: `node --test learn-server/tests/questions.test.mjs`
Expected: FAIL — `/api/uploads` 404, `flow.app.cleanup is not a function`

- [ ] **Step 3: 구현**

`learn-server/uploads.mjs`:

```js
// 오류 화면 이미지 올리기. 브라우저는 이미지 바이트를 그대로 보내고(Content-Type: image/png 등), 서버는
// 실제 형식·크기를 확인한 뒤 Storage에 <학생 id>/<첨부 id>.<확장자>로 저장합니다. 메시지에 붙이는 건 질문 API가 합니다.
import { HttpError, json, readBody, sameOrigin } from './http.mjs';
import { EXTENSIONS, MAX_IMAGE_BYTES, imageType } from './images.mjs';

const DAY = 24 * 60 * 60 * 1000;

export async function handleUpload({ request, session, config, db, storage, limiter, nowMs, newId }) {
  if (request.method !== 'POST') throw new HttpError(405, 'METHOD_NOT_ALLOWED', '지원하지 않는 요청입니다.');
  sameOrigin(request, config.publicOrigin);
  const declared = (request.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
  if (!EXTENSIONS[declared]) throw new HttpError(415, 'UNSUPPORTED_IMAGE', 'PNG·JPEG·WebP 이미지만 올릴 수 있어요.');
  const bytes = await readBody(request, MAX_IMAGE_BYTES, '이미지는 5MB 이하로 올려 주세요.');
  const mime = imageType(bytes);
  if (mime !== declared) throw new HttpError(415, 'UNSUPPORTED_IMAGE', 'PNG·JPEG·WebP 이미지만 올릴 수 있어요.');
  // 올바른 이미지만 횟수에 셉니다(형식이 틀려 거절된 시도는 세지 않음).
  if (!limiter.uploads(session.sid, nowMs)) throw new HttpError(429, 'TOO_MANY', '이미지는 1시간에 30장까지 올릴 수 있어요. 잠시 후 다시 시도해 주세요.');
  const id = newId();
  const path = `${session.sid}/${id}.${EXTENSIONS[mime]}`;
  await storage.upload(path, bytes, mime);
  await db.createAttachment({ id, uploaderId: session.sid, path, mime, size: bytes.length, now: new Date(nowMs).toISOString() });
  return json({ attachment: { id } }, 201);
}

// 메시지에 붙지 않은 채 하루가 지난 첨부를 지웁니다. 지운 개수를 돌려줍니다.
export async function cleanupAttachments({ db, storage, nowMs }) {
  const stale = await db.staleAttachments(new Date(nowMs - DAY).toISOString());
  if (!stale?.length) return 0;
  await storage.remove(stale.map(item => item.path));
  await db.deleteAttachments(stale.map(item => item.id));
  return stale.length;
}
```

`learn-server/app.mjs`:
- import 추가:

```js
import { createLimiter } from './limits.mjs';
import { cleanupAttachments, handleUpload } from './uploads.mjs';
```

- `const callbackUrl = …` 다음에 추가:

```js
  const HOUR = 60 * 60 * 1000;
  const limiter = {
    questions: createLimiter({ limit: 10, windowMs: HOUR }),
    messages: createLimiter({ limit: 30, windowMs: HOUR }),
    uploads: createLimiter({ limit: 30, windowMs: HOUR })
  };
```

- `/api/progress` 분기 다음에 추가:

```js
      if (url.pathname === '/api/uploads') {
        return await handleUpload({ request, session: requireSession(request, seconds), config, db, storage, limiter, nowMs: now(), newId });
      }
```

- `return async function handle(request) {`를 다음으로 바꾸고, 함수 끝(`};`)을 아래처럼 바꿔 정리 함수를 붙인다:

```js
  async function handle(request) {
```

```js
  }
  handle.cleanup = () => cleanupAttachments({ db, storage, nowMs: now() });
  return handle;
}
```

`learn-server/server.mjs`의 `const app = createApp(...)` 다음에 추가:

```js
// 메시지에 붙지 않은 오래된 첨부 이미지를 시작할 때와 하루에 한 번 정리합니다.
const cleanup = () => app.cleanup().then(count => { if (count) console.log(`learn-server: 오래된 첨부 ${count}개 정리`); }).catch(error => console.error('learn-server: cleanup failed', error.message));
if (!problems.length) {
  cleanup();
  setInterval(cleanup, 24 * 60 * 60 * 1000).unref();
}
```

- [ ] **Step 4: 통과 확인**

Run: `node --test learn-server/tests/*.test.mjs`
Expected: PASS, 실패 0

- [ ] **Step 5: Commit**

```bash
git add learn-server/uploads.mjs learn-server/app.mjs learn-server/server.mjs learn-server/tests/questions.test.mjs
git commit -m "Add private image uploads and daily cleanup of unused images"
```

---

### Task 6: 학생 질문 API

**Files:**
- Create: `learn-server/questions.mjs`
- Modify: `learn-server/app.mjs`
- Test: `learn-server/tests/questions.test.mjs` (테스트 추가)

- [ ] **Step 1: 실패하는 테스트 작성**

`learn-server/tests/questions.test.mjs` 끝에 추가:

```js
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
```

- [ ] **Step 2: 실패 확인**

Run: `node --test learn-server/tests/questions.test.mjs`
Expected: FAIL — `/api/questions` 404

- [ ] **Step 3: 구현**

`learn-server/questions.mjs`:

```js
// 질문하기: 학생이 단계별로 질문하고, 대화를 이어 가고, 해결 처리합니다.
// 운영진 API(admin.mjs)도 여기 있는 입력 확인·첨부 붙이기·화면용 모양 만들기를 함께 씁니다.
import { HttpError, json, readJson, sameOrigin } from './http.mjs';
import { isOpen } from './progress.mjs';

const STEP = /^[a-z0-9-]{1,40}$/;
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const QUESTION_PATH = /^\/api\/questions\/([^/]+)(\/messages)?$/;
const HOUR = 60 * 60 * 1000;
const MAX_IMAGES = 3;

const bad = message => new HttpError(400, 'INVALID_REQUEST', message);
const notFound = () => new HttpError(404, 'NOT_FOUND', '찾을 수 없는 질문이에요.');
const methodNotAllowed = () => new HttpError(405, 'METHOD_NOT_ALLOWED', '지원하지 않는 요청입니다.');
const iso = ms => new Date(ms).toISOString();

function text(value, max, label, required) {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  if (required && !trimmed) throw bad(`${label}을 적어 주세요.`);
  if (trimmed.length > max) throw bad(`${label}은 ${max}자 이하로 적어 주세요.`);
  return trimmed || null;
}

// 메시지 입력: 내용(필수), 오류 문구(선택), 첨부 id(최대 3개)
export function messageInput(data, { max = 2000, label = '질문 내용' } = {}) {
  const body = text(data.body, max, label, true);
  const errorText = text(data.errorText, 4000, '오류 문구', false);
  const ids = data.attachmentIds ?? [];
  if (!Array.isArray(ids) || ids.length > MAX_IMAGES || !ids.every(id => typeof id === 'string' && UUID.test(id)) || new Set(ids).size !== ids.length) {
    throw bad(`이미지는 ${MAX_IMAGES}장까지 붙일 수 있어요.`);
  }
  return { body, errorText, attachmentIds: ids };
}

// 첨부는 올린 사람이, 1시간 안에, 아직 메시지에 붙지 않은 것만 쓸 수 있습니다.
export async function usableAttachments({ db, input, uploaderId, nowMs }) {
  if (!input.attachmentIds.length) return;
  const usable = await db.claimableAttachments({ ids: input.attachmentIds, uploaderId, since: iso(nowMs - HOUR) });
  if (usable.length !== input.attachmentIds.length) throw new HttpError(400, 'ATTACHMENT_INVALID', '이미지를 다시 올려 주세요.');
}

export async function postMessage({ db, questionId, author, operatorEmail = null, input, nowMs }) {
  const messageId = await db.addMessage({ questionId, author, operatorEmail, body: input.body, errorText: input.errorText, now: iso(nowMs) });
  if (input.attachmentIds.length) await db.attachToMessage({ ids: input.attachmentIds, messageId });
  return messageId;
}

export function summary(row) {
  const messages = row.messages ?? [];
  const first = messages.find(m => m.author === 'student');
  return {
    id: row.id, workshop: row.workshop, step: row.step_id, mode: row.mode, status: row.status,
    createdAt: row.created_at, updatedAt: row.updated_at,
    preview: (first?.body ?? '').slice(0, 80), lastAuthor: messages.at(-1)?.author ?? null
  };
}

// 화면용 질문: 대화와 첨부(10분짜리 서명 주소). 운영진 화면에만 운영진 이메일·학생 정보를 넣습니다.
export async function questionView(row, storage, { operator = false } = {}) {
  const messages = await Promise.all((row.messages ?? []).map(async m => ({
    id: m.id, author: m.author, body: m.body, errorText: m.error_text, createdAt: m.created_at,
    ...(operator && m.operator_email ? { operatorEmail: m.operator_email } : {}),
    images: await Promise.all((m.attachments ?? []).map(async a => ({ id: a.id, url: await storage.signedUrl(a.path) })))
  })));
  return { ...summary(row), messages, ...(operator ? { student: row.student } : {}) };
}

export async function handleQuestions({ request, url, session, config, db, storage, notifier, ai, limiter, nowMs }) {
  if (url.pathname === '/api/questions') {
    if (request.method === 'GET') return json({ questions: (await db.listQuestions({ studentId: session.sid })).map(summary) });
    if (request.method !== 'POST') throw methodNotAllowed();
    sameOrigin(request, config.publicOrigin);
    const data = await readJson(request);
    const workshop = Number(data.workshop);
    if (!Number.isInteger(workshop) || !isOpen(config, workshop, nowMs)) throw new HttpError(403, 'WORKSHOP_CLOSED', '아직 열리지 않은 회차예요.');
    if (typeof data.step !== 'string' || !STEP.test(data.step)) throw bad('단계를 확인해 주세요.');
    if (data.mode != null && !['example', 'own'].includes(data.mode)) throw bad('진행 방식을 확인해 주세요.');
    const input = messageInput(data);
    if (!limiter.questions(session.sid, nowMs)) throw new HttpError(429, 'TOO_MANY', '질문은 1시간에 10개까지 보낼 수 있어요. 잠시 후 다시 보내 주세요.');
    await usableAttachments({ db, input, uploaderId: session.sid, nowMs });
    const step = data.step;
    const questionId = await db.createQuestion({ studentId: session.sid, workshop, stepId: step, mode: data.mode ?? null, status: 'escalated', now: iso(nowMs) });
    await postMessage({ db, questionId, author: 'student', input, nowMs });
    // AI가 켜져 있으면 먼저 답합니다(지금은 꺼져 있어 항상 운영진에게 갑니다).
    const aiText = await ai.answer({ question: input.body, workshop, step });
    if (aiText) {
      await db.addMessage({ questionId, author: 'ai', body: aiText, now: iso(nowMs) });
      await db.updateQuestion(questionId, { status: 'ai_answered', updated_at: iso(nowMs) });
      return json({ question: { id: questionId, status: 'ai_answered' } }, 201);
    }
    await notifier.questionWaiting({ questionId, workshop, step, email: session.email, body: input.body, followUp: false });
    return json({ question: { id: questionId, status: 'escalated' } }, 201);
  }

  const match = QUESTION_PATH.exec(url.pathname);
  if (!match || !UUID.test(match[1])) throw notFound();
  const row = await db.getQuestion(match[1]);
  if (!row || row.student_id !== session.sid) throw notFound();

  if (!match[2]) {
    if (request.method === 'GET') return json({ question: await questionView(row, storage) });
    if (request.method !== 'PATCH') throw methodNotAllowed();
    sameOrigin(request, config.publicOrigin);
    const data = await readJson(request);
    // 학생은 '해결됐어요'와, AI 답변 뒤 '운영진에게 물어보기'만 할 수 있습니다.
    const allowed = data.status === 'resolved' || (data.status === 'escalated' && row.status === 'ai_answered');
    if (!allowed) throw bad('바꿀 수 없는 상태예요.');
    await db.updateQuestion(row.id, { status: data.status, updated_at: iso(nowMs) });
    if (data.status === 'escalated') await notifier.questionWaiting({ questionId: row.id, workshop: row.workshop, step: row.step_id, email: session.email, body: summary(row).preview, followUp: true });
    return json({ question: { id: row.id, status: data.status } });
  }

  if (request.method !== 'POST') throw methodNotAllowed();
  sameOrigin(request, config.publicOrigin);
  const input = messageInput(await readJson(request));
  if (!limiter.messages(session.sid, nowMs)) throw new HttpError(429, 'TOO_MANY', '메시지는 1시간에 30개까지 보낼 수 있어요. 잠시 후 다시 보내 주세요.');
  await usableAttachments({ db, input, uploaderId: session.sid, nowMs });
  await postMessage({ db, questionId: row.id, author: 'student', input, nowMs });
  await db.updateQuestion(row.id, { status: 'escalated', updated_at: iso(nowMs) });
  await notifier.questionWaiting({ questionId: row.id, workshop: row.workshop, step: row.step_id, email: session.email, body: input.body, followUp: true });
  return json({ question: { id: row.id, status: 'escalated' } }, 201);
}
```

`learn-server/app.mjs`:
- import 추가: `import { handleQuestions } from './questions.mjs';`
- `/api/uploads` 분기 다음에 추가:

```js
      if (url.pathname === '/api/questions' || url.pathname.startsWith('/api/questions/')) {
        return await handleQuestions({ request, url, session: requireSession(request, seconds), config, db, storage, notifier, ai, limiter, nowMs: now() });
      }
```

- [ ] **Step 4: 통과 확인**

Run: `node --test learn-server/tests/*.test.mjs`
Expected: PASS, 실패 0

- [ ] **Step 5: Commit**

```bash
git add learn-server/questions.mjs learn-server/app.mjs learn-server/tests/questions.test.mjs
git commit -m "Add the student question API with image attachments and mail alerts"
```

---

### Task 7: 운영진 API

**Files:**
- Create: `learn-server/admin.mjs`
- Modify: `learn-server/app.mjs`
- Test: `learn-server/tests/admin.test.mjs`

- [ ] **Step 1: 실패하는 테스트 작성**

`learn-server/tests/admin.test.mjs`:

```js
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
```

- [ ] **Step 2: 실패 확인**

Run: `node --test learn-server/tests/admin.test.mjs`
Expected: FAIL — `/api/admin/questions` 404

- [ ] **Step 3: 구현**

`learn-server/admin.mjs`:

```js
// 운영진 API: 질문 목록·상세·답변·상태 변경, 단계별 완료 학생 수. OPERATOR_EMAILS에 있는 계정만 씁니다.
import { HttpError, json, readJson, sameOrigin } from './http.mjs';
import { UUID, messageInput, postMessage, questionView, summary, usableAttachments } from './questions.mjs';

const STATUSES = ['ai_answered', 'escalated', 'answered', 'resolved'];
const OPERATOR_SETS = ['escalated', 'answered', 'resolved'];
const PATH = /^\/api\/admin\/questions\/([^/]+)(\/messages)?$/;
const bad = message => new HttpError(400, 'INVALID_REQUEST', message);
const methodNotAllowed = () => new HttpError(405, 'METHOD_NOT_ALLOWED', '지원하지 않는 요청입니다.');
const iso = ms => new Date(ms).toISOString();

export async function handleAdmin({ request, url, session, config, db, storage, nowMs }) {
  if (!config.operators.has(session.email)) throw new HttpError(403, 'OPERATOR_ONLY', '운영진만 쓸 수 있어요.');

  if (url.pathname === '/api/admin/progress') {
    if (request.method !== 'GET') throw methodNotAllowed();
    const counts = new Map();
    for (const row of await db.listAllProgress()) {
      const key = `${row.workshop}\n${row.step_id}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const progress = [...counts].map(([key, count]) => { const [workshop, step] = key.split('\n'); return { workshop: Number(workshop), step, count }; })
      .sort((a, b) => a.workshop - b.workshop || a.step.localeCompare(b.step));
    return json({ progress });
  }

  if (url.pathname === '/api/admin/questions') {
    if (request.method !== 'GET') throw methodNotAllowed();
    const status = url.searchParams.get('status') || null;
    const workshop = url.searchParams.get('workshop') ? Number(url.searchParams.get('workshop')) : null;
    if (status && !STATUSES.includes(status)) throw bad('상태 값을 확인해 주세요.');
    if (workshop !== null && !Number.isInteger(workshop)) throw bad('회차 값을 확인해 주세요.');
    const rows = await db.listQuestions({ status, workshop });
    return json({ questions: rows.map(row => ({ ...summary(row), student: row.student })) });
  }

  const match = PATH.exec(url.pathname);
  if (!match || !UUID.test(match[1])) throw new HttpError(404, 'NOT_FOUND', '찾을 수 없는 질문이에요.');
  const row = await db.getQuestion(match[1]);
  if (!row) throw new HttpError(404, 'NOT_FOUND', '찾을 수 없는 질문이에요.');

  if (!match[2]) {
    if (request.method === 'GET') return json({ question: await questionView(row, storage, { operator: true }) });
    if (request.method !== 'PATCH') throw methodNotAllowed();
    sameOrigin(request, config.publicOrigin);
    const data = await readJson(request);
    if (!OPERATOR_SETS.includes(data.status)) throw bad('바꿀 수 없는 상태예요.');
    await db.updateQuestion(row.id, { status: data.status, updated_at: iso(nowMs) });
    return json({ question: { id: row.id, status: data.status } });
  }

  if (request.method !== 'POST') throw methodNotAllowed();
  sameOrigin(request, config.publicOrigin);
  const input = messageInput(await readJson(request), { max: 4000, label: '답변' });
  await usableAttachments({ db, input, uploaderId: session.sid, nowMs });
  await postMessage({ db, questionId: row.id, author: 'operator', operatorEmail: session.email, input, nowMs });
  await db.updateQuestion(row.id, { status: 'answered', updated_at: iso(nowMs) });
  return json({ question: { id: row.id, status: 'answered' } }, 201);
}
```

`learn-server/app.mjs`:
- import 추가: `import { handleAdmin } from './admin.mjs';`
- `/api/questions` 분기 다음에 추가:

```js
      if (url.pathname.startsWith('/api/admin/')) {
        return await handleAdmin({ request, url, session: requireSession(request, seconds), config, db, storage, nowMs: now() });
      }
```

- [ ] **Step 4: 통과 확인**

Run: `node --test learn-server/tests/*.test.mjs`
Expected: PASS, 실패 0

- [ ] **Step 5: Commit**

```bash
git add learn-server/admin.mjs learn-server/app.mjs learn-server/tests/admin.test.mjs
git commit -m "Add the operator API for answering questions and viewing progress"
```

---

### Task 8: 서버 문서·Render 설정

**Files:**
- Modify: `learn-server/README.md`, `render.yaml`

- [ ] **Step 1: render.yaml**

`envVars` 끝에 추가:

```yaml
      - key: RESEND_API_KEY
        sync: false
      - key: NOTIFY_EMAIL
        sync: false
      - key: AI_PROVIDER
        value: none
```

- [ ] **Step 2: README**

- 파일 표에 행 추가: `questions.mjs`(학생 질문 API·공용 함수), `admin.mjs`(운영진 API), `uploads.mjs`(이미지 올리기·정리), `storage.mjs`(Supabase Storage), `images.mjs`(이미지 형식 확인), `limits.mjs`(시간당 횟수 제한), `notify.mjs`(Resend 메일), `ai.mjs`(AI 연결부, 꺼짐).
- 환경값 표에 행 추가: `RESEND_API_KEY`(선택. 없으면 메일 안 보냄), `NOTIFY_EMAIL`(알림 받을 운영진 메일. Resend를 도메인 없이 쓰면 Resend 가입 메일만 가능), `AI_PROVIDER`(지금은 `none`만).
- `## API` 표에 행 추가:

```markdown
| `POST /api/uploads` (본문: 이미지 바이트, `Content-Type: image/png·jpeg·webp`) | 이미지 1장 올리기 → `{ attachment: { id } }`. 5MB 이하, 1시간 30장 |
| `GET` / `POST /api/questions` | 내 질문 목록 / 질문하기 `{ workshop, step, mode?, body, errorText?, attachmentIds? }` (1시간 10개) |
| `GET /api/questions/<id>`, `POST …/messages`, `PATCH` `{ status: 'resolved' }` | 내 질문 대화(이미지는 10분짜리 주소), 추가 질문, 해결 처리 |
| `GET /api/admin/questions?status=&workshop=`, `GET /api/admin/questions/<id>` | (운영진) 질문 목록·상세 |
| `POST /api/admin/questions/<id>/messages`, `PATCH /api/admin/questions/<id>` | (운영진) 답변(최대 4000자, 이미지 가능), 상태 변경 |
| `GET /api/admin/progress` | (운영진) 회차·단계별 완료 학생 수 |
```

- [ ] **Step 3: Commit**

```bash
git add learn-server/README.md render.yaml
git commit -m "Document the question, upload and operator APIs"
```

---

### Task 9: 포털 — 페이지 뼈대와 스크립트 여러 개

**Files:**
- Modify: `portal/src/layout.mjs`, `portal/src/learn-pages.mjs`, `portal/scripts/build.mjs`, `portal/tests/portal.test.mjs`
- Create: `portal/src/questions.js`, `portal/src/admin.js` (이 작업에서는 빈 모듈 골격만, 내용은 Task 10·11)

요구 사항 (테스트로 확인):
1. `layout({ …, script })`의 `script`가 문자열 또는 배열이면 순서대로 `<script src="/<이름>?v=<해시>" defer>`를 넣는다. `assets`에는 `learn.js`, `questions.js`, `admin.js` 해시가 모두 있고, 세 파일 모두 `dist/` 루트에 복사되며 `_routes.json`의 `exclude`에 들어간다.
2. 경로:
   - `/learn/`: `['learn.js', 'questions.js']`
   - `/learn/<slug>/`: `['learn.js', 'questions.js']`
   - `/learn/questions/`(새로, 제목 "내 질문"): `['learn.js', 'questions.js']`. 본문은 `learn-pages.mjs`의 `questionsPage()`: 머리말, 2단계의 `gate`, `<div class="questions" data-learn-content data-questions hidden></div>`, 안내 문구.
   - `/admin/`(새로, 제목 "운영진"): `['learn.js', 'questions.js', 'admin.js']`. 본문은 `adminPage(content)`: 머리말, `gate`, `<div class="admin" data-learn-content data-admin hidden data-steps='<JSON>'></div>`. `data-steps`는 열린 회차들의 `{ number, title, steps: [{ id, title }] }` 배열 JSON이다(`esc` 처리. 운영진 화면이 단계 이름을 보여줄 때 씀).
   - 메뉴: `수업 듣기` 항목 아래에 따로 넣지 않는다(`/learn/` 화면 안에서 "내 질문"으로 이동). `/admin/`은 메뉴에 넣지 않는다.
3. 수업 화면 단계마다 `lesson-actions`에 `<button type="button" class="btn btn-ghost" data-ask-open>막혔어요 · 질문하기</button>`와 그 아래 `<div class="ask" data-ask hidden></div>`를 넣는다.
4. `/learn/`의 목록 위에 `<p class="learn-links"><a href="/learn/questions/">내 질문</a> <span data-answer-count></span></p>`를 넣는다(로그인 전에는 `data-learn-content` 안이라 숨김).

테스트 추가 (`portal/tests/portal.test.mjs`):
- 경로 목록에 `'/learn/questions/'`, `'/admin/'` 추가(`/learn/` 다음, `/learn/01/` 앞 또는 뒤 — 구현한 `routes()` 순서에 맞춘다).
- `/admin/` HTML에 `learn.js`, `questions.js`, `admin.js` 스크립트가 이 순서로, `data-admin`, `data-steps`가 있고 `data-steps` JSON을 되살리면 1회차 단계 id 목록이 `['open-starter','run-local','first-change','connect-feature']`.
- `/learn/01/`에 `data-ask-open` 버튼 수 = 단계 수.
- 내부 링크 테스트의 `shared` 정규식에 `questions\.js|admin\.js` 추가.

TDD로 진행하고 `npm run test:portal` 실패 0, `node --check`로 세 JS 파일 문법 확인 후 commit: `"Add question and operator pages with per-page scripts"`.

---

### Task 10: 포털 — 공통 스크립트와 학생 질문 화면

**Files:**
- Modify: `portal/src/learn.js`
- Modify: `portal/src/questions.js`
- Modify: `portal/src/styles.css`

**`learn.js` 변경(2단계 코드를 바탕으로):**
- 공통 기능을 `window.Learn`으로 공개한다: `api(path, init)`(2단계 그대로: `{ response, data }`), `el`, `button`, `register(name, init)`, `user`(로그인 후 채움).
- 로그인 확인(`check`)은 `DOMContentLoaded`에서 시작한다(뒤에 오는 `questions.js`·`admin.js`가 먼저 `register`할 수 있게).
- 로그인 후 `content.dataset`을 보고 초기화 함수를 부른다: `lesson` → 2단계 `initLesson`, `questions` → `register('questions')`로 등록된 함수, `admin` → `register('admin')`, 그 밖(목록) → 2단계 `initList`. 각 함수는 `(content, user)`를 받는다.
- 수업 화면: `[data-ask-open]` 클릭 시 `Learn.openAsk(stepSection, { workshop, step })`(questions.js가 제공)를 부른다.
- 목록 화면: `GET /api/questions`로 `status === 'answered'`인 질문 수를 세어 `[data-answer-count]`에 "답변 N개"를 넣는다(0이면 비움).
- `/admin/`에서 로그인했지만 `user.operator`가 아니면 내용 대신 "운영진만 볼 수 있어요."를 보여준다.

**`questions.js` (학생·운영진 공용):** `window.Learn`이 없으면 아무것도 하지 않는다.
- `Learn.openAsk(stepSection, { workshop, step })`: 해당 단계의 `[data-ask]`를 열고(이미 열려 있으면 닫기) 질문 칸을 만든다.
  - 진행 방식 라디오 2개("예제 그대로", "내 아이디어로", 선택 안 해도 됨) → `mode: 'example' | 'own' | 생략`
  - 질문 내용 `textarea`(필수, `maxlength=2000`, 남은 글자 수 표시), 오류 문구 `textarea`(선택, `maxlength=4000`)
  - 이미지: 파일 선택(`accept="image/png,image/jpeg,image/webp"`, `multiple`), 칸에 끌어다 놓기, 칸에 붙여넣기(`paste` 이벤트의 이미지 파일). 최대 3장, 장당 5MB, 형식이 다르면 바로 안내. 미리보기(`URL.createObjectURL`)와 장마다 "빼기" 버튼. 안내 문구: "API 키·비밀번호·개인정보가 보이면 가린 뒤 올려 주세요."
  - 보내기: 이미지마다 `fetch('/api/uploads', { method: 'POST', headers: { 'content-type': file.type }, body: file })`로 올려 `attachment.id`를 모은 뒤, `POST /api/questions` JSON `{ workshop, step, mode, body, errorText, attachmentIds }`. 실패하면 서버 `message`를 그대로 보여주고 입력은 유지한다. 보내는 동안 버튼을 막는다.
  - 성공하면 칸을 닫고 "질문을 보냈어요. 답변은 [내 질문]에서 볼 수 있어요." (링크 `/learn/questions/?id=<id>`).
  - 임시 저장: 질문 내용·오류 문구·진행 방식을 `localStorage['learn-ask:<workshop>:<step>']`에 입력할 때마다 저장(try/catch), 성공하면 지운다. 다시 열 때 복원. 이미지는 저장하지 않으므로 복원했을 때 "이미지는 다시 붙여 주세요." 안내.
- `register('questions', init)`: `/learn/questions/`
  - 주소에 `?id=`가 없으면 `GET /api/questions` 목록: 회차·단계, 상태 배지(답변 대기 / 답변 옴 / 해결됨 / AI 답변), 미리보기, 갱신 시각(`toLocaleString('ko-KR')`). 각 항목은 `?id=<id>` 링크. 질문이 없으면 "아직 질문이 없어요. 수업 화면에서 막힌 단계의 '막혔어요 · 질문하기'를 눌러 보세요."
  - `?id=`가 있으면 `GET /api/questions/<id>` 대화: 말풍선마다 쓴 사람("나" / "운영진" / "AI"), 시각, 내용(줄바꿈 유지, `textContent`), 오류 문구(`<pre>`), 이미지(작게, 누르면 새 창으로 원본). 아래에 추가 질문 칸(위와 같은 입력·이미지, `POST /api/questions/<id>/messages`)과, 상태가 `resolved`가 아니면 "해결됐어요" 버튼(`PATCH { status: 'resolved' }`). 상태가 `ai_answered`면 "운영진에게 물어보기" 버튼(`PATCH { status: 'escalated' }`). 보낸 뒤 대화를 다시 불러온다. "← 내 질문 목록" 링크.
- 대화 그리기·입력 칸 만들기는 운영진 화면이 다시 쓰도록 `Learn.thread(container, question, { operator })`와 `Learn.composer({ submitLabel, maxLength, onSubmit })`로 공개한다(`onSubmit({ body, errorText, attachmentIds, mode })`).
- 모든 서버 문자열은 `textContent`로만 넣는다(`innerHTML` 금지).

**`styles.css`:** 질문 칸(`.ask`), 이미지 미리보기 줄, 말풍선(`.msg`, `.msg-student`/`.msg-operator`/`.msg-ai`), 상태 배지 색(기존 `.badge` 재사용), 목록(`.q-list`). 폰 너비에서 가로 스크롤이 생기지 않게.

**확인:** `node --check portal/src/learn.js portal/src/questions.js`, `npm run test:portal` 실패 0, `npm run build:portal` 성공. 로그인 없이 확인할 수 있는 부분은 `dist/learn/01/index.html`에서 버튼·칸 마크업 확인. Commit: `"Let students ask questions with images and follow their threads"`.

---

### Task 11: 포털 — 운영진 화면

**Files:**
- Modify: `portal/src/admin.js`, `portal/src/styles.css`

**`admin.js`:** `register('admin', init)`
- 운영진이 아니면 `learn.js`가 막으므로 여기서는 운영진만 가정한다.
- 위쪽 탭 2개: "질문" / "진도".
- 질문 탭: 거르기(상태: 답변 대기(기본) / 답변 옴 / 해결됨 / 전체, 회차: 전체 / 열린 회차들 — `data-steps`에서), `GET /api/admin/questions?status=&workshop=`. 목록 항목: 학생 이름(첫 부분)·이메일, 회차·단계 제목(`data-steps`에서 찾음, 없으면 id), 상태, 미리보기, 시각. 항목을 누르면 오른쪽(폰에서는 아래)에 상세: `GET /api/admin/questions/<id>` → `Learn.thread(..., { operator: true })`, 답변 칸(`Learn.composer({ submitLabel: '답변 보내기', maxLength: 4000 })` → `POST /api/admin/questions/<id>/messages`), 상태 버튼("해결됨으로", "답변 대기로" → `PATCH`). 답변·상태 변경 뒤 목록과 상세를 다시 불러온다.
- 주소 `?q=<id>`로 들어오면(메일 링크) 그 질문 상세를 바로 연다.
- 진도 탭: `GET /api/admin/progress` → 회차별 표(단계 제목, 완료 학생 수). `data-steps`의 단계 순서대로, 기록 없는 단계는 0.
- 서버 문자열은 `textContent`로만.

**확인:** `node --check portal/src/admin.js`, `npm run test:portal`, `npm run build:portal`. Commit: `"Add the operator page for answering questions and viewing progress"`.

---

### Task 12: 포털 문서

**Files:**
- Modify: `portal/README.md`

`## 수업 듣기 (/learn/)와 수업 서버` 절에 추가: `/learn/questions/`(내 질문), `/admin/`(운영진, `OPERATOR_EMAILS` 계정만, 메일 링크 `?q=`), 스크립트 역할(`learn.js` 공통·수업 / `questions.js` 질문 칸·대화 / `admin.js` 운영진), 이미지 첨부 규칙(3장·5MB·PNG/JPEG/WebP, 비공개 저장, 10분 주소). Commit: `"Document the question and operator pages"`.

---

### Task 13: 배포와 확인 (에이전트 + 사용자)

- [ ] **Step 1:** `npm run test:learn && npm run test:portal` 실패 0 → main에 합치고 push → Render 자동 배포.
- [ ] **Step 2 (에이전트):** `curl` 확인 — 포털 경유 `/api/questions` → 401, `/api/admin/questions` → 401, `/api/uploads`(GET) → 401. Render 직접 `/api/health` → `configured: true`.
- [ ] **Step 3 (에이전트):** `npm run deploy:portal` → `/learn/questions/`·`/admin/` 200, `/learn/01/`에 `data-ask-open` 4개.
- [ ] **Step 4 (사용자, 계정 필요):** Resend 가입 → API 키 → Render에 `RESEND_API_KEY`, `NOTIFY_EMAIL`(Resend 가입 메일) 입력.
- [ ] **Step 5 (사용자):** 학생 계정으로 `/learn/01/` 2단계에서 질문(캡처 이미지 Ctrl+V 포함) → 메일 수신 → 운영진 계정 `/admin/`에서 답변(이미지 포함) → 학생 `/learn/questions/`에서 답변·이미지 확인 → "해결됐어요". Supabase Storage `question-images`에 파일이 생겼는지 확인.
- [ ] **Step 6:** 확인 결과를 `learn-server/README.md` `## 확인 기록`에 추가, commit·push. 실제 확인 전에는 "완료"라고 보고하지 않는다.
