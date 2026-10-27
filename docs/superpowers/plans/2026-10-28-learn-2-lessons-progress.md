# 수업 시스템 2단계: 수업 화면과 진도 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 로그인한 학생이 `/learn/`에서 열린 회차와 내 진도를 보고, `/learn/<slug>/`에서 학생용 슬라이드와 단계를 나란히 보며 단계 완료를 저장한다.

**Architecture:** 포털 빌드가 열린 회차마다 `/learn/<slug>/` HTML(슬라이드 임베드 + 단계 내용)을 만든다. 공개 시각 전 회차는 기존 시각별 페이지 묶음 방식으로 페이지 자체가 없다. `learn.js`가 로그인을 확인한 뒤 화면을 열고, 진도는 Render 서버의 `/api/progress`로 Supabase `progress` 테이블에 저장한다. 서버는 `WORKSHOP_OPEN_AT`으로 열린 회차만 기록을 받는다.

**Tech Stack:** Node 20+ 기본 기능, `node:test`, Supabase PostgREST, Cloudflare Pages(정적 빌드 + 함수), Google Slides 임베드(`/embed?slide=id.<페이지 ID>`).

**Spec:** `docs/superpowers/specs/2026-10-27-snu-learn-system-design.md` "수업 화면". 1단계(로그인)는 완료·배포됨. 스펙과 다른 점: 진도 조회는 `GET /api/progress` 하나로 내 모든 회차를 돌려준다(회차 파라미터 없음). 질문하기 버튼은 3단계에서 붙인다.

**슬라이드 연결(사용자 확인 완료):** 번호는 학생용 슬라이드 기준.
- WS1 (`1pUcnsVa0Ab_z_ZxbVnO6cCHCIcTYVVvz10C9Tt52xuU`): open-starter 1 `h2ea000745df279bf_2_24`, run-local 4 `h2ea000745df279bf_2_62`, first-change 4 `h2ea000745df279bf_2_62`, connect-feature 9 `h2ea000745df279bf_2_126`. 선택지: 날씨 9 `h2ea000745df279bf_2_126`, 로그인 15 `h2ea000745df279bf_2_267`, 지도 21 `h2ea000745df279bf_2_421`.
- WS2 (`1N_guFeYU5IbLcgVMR8LI8MYdEZup9dK0gm32qI8W4kE`): compare 1 `ws2_activity_20261019_01`, add-favorite 7 `ws2_activity_20261019_07`, record 14 `ws2_activity_20261019_14`, recover 17 `ws2_activity_20261019_17`.

---

## File Structure

수업 서버 (`learn-server/`)
- Modify `supabase.mjs`: 빈 응답 처리, `listProgress`·`markStep`·`unmarkStep`
- Modify `config.mjs`: `WORKSHOP_OPEN_AT` → `workshopOpenAt` (Map 회차→ms)
- Create `progress.mjs`: `/api/progress` 경로 처리
- Modify `app.mjs`: `requireSession`, 진도 경로 연결
- Modify `tests/helpers.mjs`: 가짜 Supabase `progress` 테이블
- Create `tests/progress.test.mjs`; Modify `tests/config.test.mjs`, `tests/supabase.test.mjs`
- Modify `README.md`, `../render.yaml`

포털 (`portal/`)
- Modify `content/workshops.mjs`: 미션·선택지에 `slide`·`slideId`
- Modify `scripts/build.mjs`: 슬라이드 값 검사, `/learn/<slug>/` 경로
- Modify `src/pages.mjs`: `missionBody` 분리·export, `slidesOf` export, `learnPage` 제거
- Create `src/learn-pages.mjs`: `learnPage`, `lessonPage`, 도우미
- Rewrite `src/learn.js`: 로그인 확인, 목록 진도, 단계 이동·슬라이드·완료
- Modify `src/styles.css`, `tests/portal.test.mjs`, `README.md`

---

### Task 1: Supabase 진도 함수

**Files:**
- Modify: `learn-server/supabase.mjs`
- Modify: `learn-server/tests/helpers.mjs` (fakeFetch에 progress 추가)
- Test: `learn-server/tests/supabase.test.mjs`

- [ ] **Step 1: 가짜 progress 테이블 추가**

`learn-server/tests/helpers.mjs`의 `fakeFetch` 안, `throw new Error(\`unexpected fetch ${url}\`);` 바로 위에 넣는다:

```js
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
```

- [ ] **Step 2: 실패하는 테스트 작성**

`learn-server/tests/supabase.test.mjs` 끝에 추가:

```js
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
```

- [ ] **Step 3: 실패 확인**

Run: `node --test learn-server/tests/supabase.test.mjs`
Expected: FAIL — `db.markStep is not a function`

- [ ] **Step 4: 구현**

`learn-server/supabase.mjs`의 `request` 함수의 마지막 줄을 바꾼다(PostgREST는 `return=minimal`일 때 본문 없이 201·204를 돌려줌):

```js
    if (!response.ok) throw new Error(`Supabase ${response.status}`);
    const text = await response.text();
    return text ? JSON.parse(text) : null;
```

그리고 반환 객체에 `upsertStudent` 다음으로 추가:

```js
    listProgress(studentId) {
      return request(`progress?student_id=eq.${encodeURIComponent(studentId)}&select=workshop,step_id,completed_at&order=completed_at.asc`);
    },
    // 이미 완료한 단계를 다시 눌러도 처음 완료한 시각을 유지합니다.
    async markStep({ studentId, workshop, stepId, now }) {
      await request('progress?on_conflict=student_id,workshop,step_id', {
        method: 'POST',
        headers: { prefer: 'resolution=ignore-duplicates,return=minimal' },
        body: JSON.stringify({ student_id: studentId, workshop, step_id: stepId, completed_at: now })
      });
    },
    async unmarkStep({ studentId, workshop, stepId }) {
      await request(`progress?student_id=eq.${encodeURIComponent(studentId)}&workshop=eq.${encodeURIComponent(workshop)}&step_id=eq.${encodeURIComponent(stepId)}`, {
        method: 'DELETE',
        headers: { prefer: 'return=minimal' }
      });
    }
```

- [ ] **Step 5: 통과 확인**

Run: `node --test learn-server/tests/*.test.mjs`
Expected: PASS, 실패 0

- [ ] **Step 6: Commit**

```bash
git add learn-server/supabase.mjs learn-server/tests/helpers.mjs learn-server/tests/supabase.test.mjs
git commit -m "Add progress queries to the Supabase client"
```

---

### Task 2: 회차 공개 시각 설정 (`WORKSHOP_OPEN_AT`)

**Files:**
- Modify: `learn-server/config.mjs`
- Test: `learn-server/tests/config.test.mjs`

- [ ] **Step 1: 실패하는 테스트 작성**

`learn-server/tests/config.test.mjs` 끝에 추가:

```js
test('WORKSHOP_OPEN_AT gives each workshop its opening time', () => {
  const config = loadConfig({ ...ENV, WORKSHOP_OPEN_AT: '{"1":"2026-10-26T18:00:00+09:00","2":"2026-11-02T18:00:00+09:00"}' });
  assert.equal(config.ok, true);
  assert.equal(config.workshopOpenAt.get(2), Date.parse('2026-11-02T09:00:00Z'));
  assert.equal(loadConfig(ENV).workshopOpenAt.size, 0);
  for (const bad of ['not json', '[]', '{"one":"2026-10-26T18:00:00+09:00"}', '{"1":"2026-10-26T18:00:00"}', '{"1":5}']) {
    assert.ok(loadConfig({ ...ENV, WORKSHOP_OPEN_AT: bad }).problems.some(p => p.startsWith('WORKSHOP_OPEN_AT')), bad);
  }
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test learn-server/tests/config.test.mjs`
Expected: FAIL — `Cannot read properties of undefined (reading 'get')`

- [ ] **Step 3: 구현**

`learn-server/config.mjs`의 `return {` 바로 위에 추가:

```js
  // 회차별 공개 시각. 이 시각이 지난 회차만 진도·질문을 받습니다. 없으면 모든 회차가 닫힘.
  const workshopOpenAt = new Map();
  if (env.WORKSHOP_OPEN_AT) {
    try {
      const parsed = JSON.parse(env.WORKSHOP_OPEN_AT);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error();
      for (const [number, time] of Object.entries(parsed)) {
        if (!/^\d{1,2}$/.test(number) || typeof time !== 'string' || !/([+-]\d\d:\d\d|Z)$/.test(time) || Number.isNaN(Date.parse(time))) throw new Error();
        workshopOpenAt.set(Number(number), Date.parse(time));
      }
    } catch {
      problems.push('WORKSHOP_OPEN_AT 형식 (예: {"1":"2026-10-26T18:00:00+09:00"})');
    }
  }
```

그리고 반환 객체 마지막 속성(`operators`) 뒤에 `,` 와 함께 `workshopOpenAt`을 추가한다.

- [ ] **Step 4: 통과 확인**

Run: `node --test learn-server/tests/*.test.mjs`
Expected: PASS, 실패 0

- [ ] **Step 5: Commit**

```bash
git add learn-server/config.mjs learn-server/tests/config.test.mjs
git commit -m "Read workshop opening times for the learn server"
```

---

### Task 3: 진도 API

**Files:**
- Create: `learn-server/progress.mjs`
- Modify: `learn-server/app.mjs`
- Test: `learn-server/tests/progress.test.mjs`

- [ ] **Step 1: 실패하는 테스트 작성**

`learn-server/tests/progress.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { ENV, api, login, makeApp } from './helpers.mjs';

// NOW(2026-10-27 21:00 KST) 기준: 1회차 열림, 2회차 닫힘
const OPEN = { ...ENV, WORKSHOP_OPEN_AT: JSON.stringify({ 1: '2026-10-26T18:00:00+09:00', 2: '2026-11-02T18:00:00+09:00' }) };
const portal = { origin: 'https://portal.test' };

async function signedIn(state = {}, env = OPEN) {
  const flow = makeApp(state, env);
  const { session } = await login(flow);
  return { ...flow, session };
}

test('a student marks, lists and unmarks steps of an open workshop', async () => {
  const { app, session, state } = await signedIn();
  const put = await app(api('/api/progress/1/run-local', { method: 'PUT', cookie: session, headers: portal }));
  assert.equal(put.status, 200);
  assert.deepEqual(await put.json(), { workshop: 1, step: 'run-local', done: true });
  await app(api('/api/progress/1/run-local', { method: 'PUT', cookie: session, headers: portal }));
  assert.equal(state.progress.length, 1);
  assert.equal(state.progress[0].student_id, 'student-1');
  const list = await (await app(api('/api/progress', { cookie: session }))).json();
  assert.deepEqual(list, { progress: [{ workshop: 1, step: 'run-local', completedAt: '2026-10-27T12:00:00.000Z' }] });
  const del = await app(api('/api/progress/1/run-local', { method: 'DELETE', cookie: session, headers: portal }));
  assert.deepEqual(await del.json(), { workshop: 1, step: 'run-local', done: false });
  assert.deepEqual((await (await app(api('/api/progress', { cookie: session }))).json()).progress, []);
});

test('progress needs a login, the portal origin and an open workshop', async () => {
  const { app, session } = await signedIn();
  assert.equal((await app(api('/api/progress'))).status, 401);
  assert.equal((await app(api('/api/progress/1/run-local', { method: 'PUT', cookie: session }))).status, 403);
  const closed = await app(api('/api/progress/2/compare', { method: 'PUT', cookie: session, headers: portal }));
  assert.equal(closed.status, 403);
  assert.equal((await closed.json()).error, 'WORKSHOP_CLOSED');
  assert.equal((await app(api('/api/progress/3/x', { method: 'PUT', cookie: session, headers: portal }))).status, 403);
});

test('bad step paths and methods are rejected', async () => {
  const { app, session } = await signedIn();
  for (const path of ['/api/progress/1/Bad_Step', '/api/progress/1/', '/api/progress/x/run-local', `/api/progress/1/${'a'.repeat(41)}`]) {
    assert.equal((await app(api(path, { method: 'PUT', cookie: session, headers: portal }))).status, 404, path);
  }
  assert.equal((await app(api('/api/progress', { method: 'POST', cookie: session, headers: portal }))).status, 405);
  assert.equal((await app(api('/api/progress/1/run-local', { cookie: session }))).status, 405);
});

test('without WORKSHOP_OPEN_AT every workshop is closed', async () => {
  const { app, session } = await signedIn({}, ENV);
  assert.equal((await app(api('/api/progress/1/run-local', { method: 'PUT', cookie: session, headers: portal }))).status, 403);
});

test('database errors become a generic 500', async () => {
  const { app, session, state } = await signedIn();
  state.dbStatus = 500;
  const response = await app(api('/api/progress', { cookie: session }));
  assert.equal(response.status, 500);
  assert.equal((await response.json()).error, 'SERVER_ERROR');
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test learn-server/tests/progress.test.mjs`
Expected: FAIL — `/api/progress`가 404

- [ ] **Step 3: 진도 처리 파일 작성**

`learn-server/progress.mjs`:

```js
// 진도: 단계 완료 표시. 공개 시각(WORKSHOP_OPEN_AT)이 지난 회차만 기록합니다.
import { HttpError, json, sameOrigin } from './http.mjs';

const STEP_PATH = /^\/api\/progress\/(\d{1,2})\/([a-z0-9-]{1,40})$/;

export function isOpen(config, workshop, nowMs) {
  const openAt = config.workshopOpenAt.get(workshop);
  return openAt !== undefined && nowMs >= openAt;
}

export async function handleProgress({ request, url, session, config, db, nowMs }) {
  if (url.pathname === '/api/progress') {
    if (request.method !== 'GET') throw new HttpError(405, 'METHOD_NOT_ALLOWED', '지원하지 않는 요청입니다.');
    const rows = await db.listProgress(session.sid);
    return json({ progress: rows.map(row => ({ workshop: row.workshop, step: row.step_id, completedAt: row.completed_at })) });
  }
  const match = STEP_PATH.exec(url.pathname);
  if (!match) throw new HttpError(404, 'NOT_FOUND', '찾을 수 없는 요청입니다.');
  if (request.method !== 'PUT' && request.method !== 'DELETE') throw new HttpError(405, 'METHOD_NOT_ALLOWED', '지원하지 않는 요청입니다.');
  sameOrigin(request, config.publicOrigin);
  const workshop = Number(match[1]);
  const stepId = match[2];
  if (!isOpen(config, workshop, nowMs)) throw new HttpError(403, 'WORKSHOP_CLOSED', '아직 열리지 않은 회차예요.');
  if (request.method === 'PUT') await db.markStep({ studentId: session.sid, workshop, stepId, now: new Date(nowMs).toISOString() });
  else await db.unmarkStep({ studentId: session.sid, workshop, stepId });
  return json({ workshop, step: stepId, done: request.method === 'PUT' });
}
```

- [ ] **Step 4: app.mjs 연결**

`learn-server/app.mjs`:
- import 줄 추가: `import { handleProgress } from './progress.mjs';`
- `currentSession` 함수 다음에 추가:

```js
  function requireSession(request, seconds) {
    const session = currentSession(request, seconds);
    if (!session) throw new HttpError(401, 'LOGIN_REQUIRED', '서울대 계정으로 로그인해 주세요.');
    return session;
  }
```

- `handle` 안, 프록시 비밀값 검사 다음·`switch` 앞에 추가:

```js
      if (url.pathname === '/api/progress' || url.pathname.startsWith('/api/progress/')) {
        return await handleProgress({ request, url, session: requireSession(request, seconds), config, db, nowMs: now() });
      }
```

- `case 'GET /api/me':` 블록을 다음으로 바꾼다:

```js
        case 'GET /api/me': {
          const session = requireSession(request, seconds);
          return json({ user: { email: session.email, name: session.name, operator: config.operators.has(session.email) } });
        }
```

- [ ] **Step 5: 통과 확인**

Run: `node --test learn-server/tests/*.test.mjs`
Expected: PASS, 실패 0

- [ ] **Step 6: Commit**

```bash
git add learn-server/progress.mjs learn-server/app.mjs learn-server/tests/progress.test.mjs
git commit -m "Add the step progress API for open workshops"
```

---

### Task 4: 서버 문서와 Render 설정

**Files:**
- Modify: `render.yaml`
- Modify: `learn-server/README.md`

- [ ] **Step 1: render.yaml에 공개 시각 추가**

`envVars`의 `OPERATOR_EMAILS` 항목 다음에 추가 (비밀값 아님):

```yaml
      - key: WORKSHOP_OPEN_AT
        value: '{"1":"2026-10-26T18:00:00+09:00","2":"2026-11-02T18:00:00+09:00"}'
```

- [ ] **Step 2: README 갱신**

`learn-server/README.md`:
- 파일 표에 행 추가: `| \`progress.mjs\` | 진도 API (단계 완료 표시) |`
- 환경값 표에 행 추가: `| \`WORKSHOP_OPEN_AT\` | 회차별 공개 시각 JSON. 예: \`{"1":"2026-10-26T18:00:00+09:00"}\`. 포털 \`workshops.mjs\`의 공개 시각과 같게. 없는 회차는 닫힘 |`
- `## 확인 기록` 앞에 절 추가:

```markdown
## API

| 요청 | 하는 일 |
| --- | --- |
| `GET /api/health` | 상태 확인 (프록시 없이도 응답) |
| `GET /api/auth/google?next=/learn/…` → `GET /api/auth/google/callback` | SNU 로그인 |
| `GET /api/me`, `DELETE /api/session` | 내 정보, 로그아웃 |
| `GET /api/progress` | 내 완료 단계 전체 `{ progress: [{ workshop, step, completedAt }] }` |
| `PUT` / `DELETE /api/progress/<회차>/<단계 id>` | 단계 완료 / 취소 (열린 회차만, 포털 Origin 필요) |
```

- [ ] **Step 3: Commit**

```bash
git add render.yaml learn-server/README.md
git commit -m "Document the progress API and workshop opening times"
```

---

### Task 5: 미션별 시작 슬라이드

**Files:**
- Modify: `portal/content/workshops.mjs`
- Modify: `portal/scripts/build.mjs` (`validateContent`)
- Test: `portal/tests/portal.test.mjs`

- [ ] **Step 1: 실패하는 테스트 작성**

`portal/tests/portal.test.mjs`의 `content validation rejects …` 테스트 안, `const badOpen = clone(defaultContent);` 바로 위에 추가:

```js
  const noSlide = clone(defaultContent);
  delete noSlide.workshops[1].missions[0].slideId;
  assert.throws(() => validateContent(noSlide), /slideId/);
  const badOption = clone(defaultContent);
  badOption.workshops[0].missions.find(m => m.options).options[0].slide = 0;
  assert.throws(() => validateContent(badOption), /slideId/);
```

- [ ] **Step 2: 실패 확인**

Run: `npm run test:portal`
Expected: FAIL — `Missing expected exception` (검사 없음)

- [ ] **Step 3: 검사 추가**

`portal/scripts/build.mjs`의 `validateContent` 안, 슬라이드 학생용 검사(`w.resources.forEach((r, i) => { const isSlides …`) 다음에 추가:

```js
    // 수업 화면(/learn/)용: 학생용 슬라이드가 있는 회차는 단계마다 시작 슬라이드(번호·ID)가 필요합니다.
    if (w.resources.some(r => r.kind === 'slides')) {
      const slideOk = item => Number.isInteger(item.slide) && item.slide >= 1 && /^[A-Za-z0-9_-]+$/.test(item.slideId ?? '');
      for (const m of w.missions) {
        if (!slideOk(m)) problems.push(`${where} ${m.id}: slide(슬라이드 번호)와 slideId(슬라이드 ID)를 적어 주세요.`);
        m.options?.forEach((o, i) => {
          if ((o.slide != null || o.slideId != null) && !slideOk(o)) problems.push(`${where} ${m.id}.options[${i}]: slide와 slideId를 함께 적어 주세요.`);
        });
      }
    }
```

- [ ] **Step 4: 콘텐츠에 슬라이드 값 넣기**

`portal/content/workshops.mjs` 맨 위 주석 블록 끝(`// - 확정되지 않은 값은 null로 둡니다…` 다음)에 한 줄 추가:

```js
// - missions[].slide / slideId: 수업 화면에서 이 단계가 시작되는 학생용 슬라이드 번호(1부터)와 Google Slides 페이지 ID.
```

각 미션의 `id:` 줄 바로 다음에 넣는다:

| 미션 id | 넣을 줄 |
| --- | --- |
| `open-starter` | `slide: 1, slideId: 'h2ea000745df279bf_2_24',` |
| `run-local` | `slide: 4, slideId: 'h2ea000745df279bf_2_62',` |
| `first-change` | `slide: 4, slideId: 'h2ea000745df279bf_2_62',` |
| `connect-feature` | `slide: 9, slideId: 'h2ea000745df279bf_2_126',` |
| `compare` | `slide: 1, slideId: 'ws2_activity_20261019_01',` |
| `add-favorite` | `slide: 7, slideId: 'ws2_activity_20261019_07',` |
| `record` | `slide: 14, slideId: 'ws2_activity_20261019_14',` |
| `recover` | `slide: 17, slideId: 'ws2_activity_20261019_17',` |

`connect-feature`의 `options` 각 항목 `label:` 줄 다음에 넣는다:

| 선택지 label | 넣을 줄 |
| --- | --- |
| `'날씨 — 기상청 단기예보'` | `slide: 9, slideId: 'h2ea000745df279bf_2_126',` |
| `'로그인 — Google 계정'` | `slide: 15, slideId: 'h2ea000745df279bf_2_267',` |
| `'지도 — Google Maps'` | `slide: 21, slideId: 'h2ea000745df279bf_2_421',` |

- [ ] **Step 5: 통과 확인**

Run: `npm run test:portal`
Expected: PASS, 실패 0

- [ ] **Step 6: Commit**

```bash
git add portal/content/workshops.mjs portal/scripts/build.mjs portal/tests/portal.test.mjs
git commit -m "Link each workshop step to its starting student slide"
```

---

### Task 6: 수업 목록·수업 화면 HTML

**Files:**
- Modify: `portal/src/pages.mjs` (`missionBody` 분리, `slidesOf` export, `learnPage` 삭제)
- Create: `portal/src/learn-pages.mjs`
- Modify: `portal/scripts/build.mjs` (`routes`)
- Modify: `portal/src/styles.css`
- Test: `portal/tests/portal.test.mjs`

- [ ] **Step 1: 실패하는 테스트 작성**

`portal/tests/portal.test.mjs` 첫 테스트의 경로 목록 끝에 `'/learn/01/'`를 추가한다:

```js
  assert.deepEqual(pages, ['/', '/roadmap/', '/workshops/', '/workshops/01/', '/workshops/02/', '/workshops/03/', '/workshops/04/', '/studio/', '/showcase/', '/about/', '/learn/', '/learn/01/']);
```

끝에 테스트 추가:

```js
test('each open workshop gets a lesson page with the student slides and every step', async t => {
  const { read } = await build(t, defaultContent, WS2_OPENS);
  const html = await read('/learn/02/');
  const ws2 = defaultContent.workshops[1];
  assert.match(html, /<iframe data-slides data-embed-base="https:\/\/docs\.google\.com\/presentation\/d\/1N_guFeYU5IbLcgVMR8LI8MYdEZup9dK0gm32qI8W4kE\/embed\?start=false&amp;loop=false&amp;delayms=60000&amp;slide=id\." src="[^"]+slide=id\.ws2_activity_20261019_01"/);
  for (const m of ws2.missions) assert.match(html, new RegExp(`data-step="${m.id}" data-slide-id="${m.slideId}"`));
  assert.equal((html.match(/class="lesson-step"/g) ?? []).length, ws2.missions.length);
  assert.match(html, /data-learn-content data-lesson="2" hidden/);
  assert.match(html, /<script src="\/learn\.js\?v=/);
  assert.match(await read('/learn/'), /href="\/learn\/02\/"/);
  const ws1 = await read('/learn/01/');
  assert.match(ws1, /<details class="option" data-slide-id="h2ea000745df279bf_2_267">/);
});

test('a lesson page does not exist before its workshop opens', async t => {
  const { outDir, read } = await build(t, defaultContent, WS2_OPENS - 60_000);
  assert.equal(await exists(path.join(outDir, 'learn/02/index.html')), false);
  assert.ok(await exists(path.join(outDir, 'learn/01/index.html')));
  assert.match(await read('/learn/'), /11\/2 \(월\) 18:00에 열려요/);
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm run test:portal`
Expected: FAIL — `/learn/01/` 없음

- [ ] **Step 3: pages.mjs에서 미션 본문 분리**

`portal/src/pages.mjs`:
- `const slidesOf = …` 줄 앞에 `export `를 붙인다.
- `missionBlock` 함수를 다음 두 함수로 바꾼다 (선택지에 `data-slide-id`가 추가된 것 외에는 기존 마크업과 같음):

```js
// 미션 본문: 공개 워크숍 페이지(접히는 미션)와 수업 화면(/learn/)이 함께 씁니다.
export function missionBody(m) {
  return h`<p>${m.todo}</p>
    ${m.prompt ? copyBlock(m.prompt) : ''}
    ${m.commands ? copyBlock(m.commands, '터미널 명령 (한 줄씩 실행)', { code: true }) : ''}
    ${m.options ? h`<div class="options">${m.options.map(o => h`<details class="option"${o.slideId ? h` data-slide-id="${o.slideId}"` : ''}>
      <summary>${o.label}</summary>
      <p class="hint">먼저 필요한 것: ${o.needs}</p>
      ${copyBlock(o.prompt)}
      <p>${link(o.guide, '자세한 안내')}</p>
    </details>`)}</div>` : ''}
    <div class="result">
      <p><strong>예상 결과</strong>${m.expected}</p>
      ${m.verify?.length ? h`<div><strong>확인</strong>${checks(m.verify)}</div>` : ''}
    </div>
    ${m.stuck?.length ? h`<details class="stuck"><summary>막혔을 때</summary><ul>${m.stuck.map(s => h`<li>${s}</li>`)}</ul></details>` : ''}`;
}

function missionBlock(m, index) {
  return h`<details class="mission" id="mission-${m.id}" ${index === 0 ? raw('open') : ''}>
  <summary><span class="mission-no">${index + 1}</span><span class="mission-title">${m.title}</span></summary>
  <div class="mission-body">
    ${missionBody(m)}
  </div>
</details>`;
}
```

- 파일 끝의 `export function learnPage() { … }` 함수를 통째로 지운다 (learn-pages.mjs로 옮김).

- [ ] **Step 4: learn-pages.mjs 작성**

`portal/src/learn-pages.mjs`:

```js
// 수업 듣기(/learn/) 화면의 HTML. 로그인 확인·진도·단계 이동은 learn.js가 맡습니다.
// 화면 내용은 로그인 전에는 숨겨 두고(hidden), learn.js가 로그인을 확인한 뒤 엽니다.
import { h, raw, link } from './render.mjs';
import { missionBody, slidesOf } from './pages.mjs';

const pad = n => String(n).padStart(2, '0');
export const lessonPath = w => `/learn/${w.slug}/`;
const deckId = url => /\/presentation\/d\/([A-Za-z0-9_-]+)/.exec(url)?.[1];
// Google Slides 임베드 주소. 끝에 슬라이드 페이지 ID를 붙이면 그 슬라이드부터 보여줍니다.
export const embedBase = url => `https://docs.google.com/presentation/d/${deckId(url)}/embed?start=false&loop=false&delayms=60000&slide=id.`;

// 학생용 슬라이드와 단계가 있는, 자료가 열린 회차만 수업 화면을 만듭니다.
export const lessonWorkshops = content => content.workshops.filter(w => w.materials === 'open' && slidesOf(w) && w.missions.length);

const gate = h`<section class="box learn-box" data-learn-gate aria-live="polite">
  <p class="learn-status">로그인 상태를 확인하고 있어요…</p>
  <noscript><p class="learn-error">이 화면은 JavaScript를 켜야 쓸 수 있어요.</p></noscript>
</section>`;

export function learnPage(content) {
  const open = lessonWorkshops(content);
  const locked = content.workshops.filter(w => w.materials === 'locked');
  return h`<header class="page-head">
  <h1>수업 듣기</h1>
  <p class="lead">서울대 계정으로 로그인하면 슬라이드를 보며 단계별로 따라 하고, 막힌 부분을 바로 질문할 수 있어요.</p>
</header>
${gate}
<section class="learn-list" data-learn-content hidden aria-label="수업 목록">
  ${open.map(w => h`<a class="learn-card c-${w.color}" href="${lessonPath(w)}">
    <span class="track-kicker">Workshop ${pad(w.number)}</span>
    <strong>${w.title}</strong>
    <span class="learn-progress" data-progress-for="${w.number}" data-total="${w.missions.length}">${w.missions.length}단계</span>
  </a>`)}
  ${locked.map(w => h`<div class="learn-card is-locked c-${w.color}">
    <span class="track-kicker">Workshop ${pad(w.number)}</span>
    <strong>${w.title}</strong>
    <span class="learn-progress">${w.opensLabel}에 열려요</span>
  </div>`)}
  ${open.length || locked.length ? '' : h`<p class="hint">지금 열린 수업이 없어요.</p>`}
</section>
<p class="hint">@snu.ac.kr Google 계정만 로그인할 수 있어요. 이메일·이름과 작성한 질문은 수업 운영에만 사용합니다.</p>`;
}

function lessonStep(m, i, total) {
  return h`<section class="lesson-step" id="step-${m.id}" data-step="${m.id}" data-slide-id="${m.slideId}" ${i ? raw('hidden') : ''}>
  <p class="track-kicker">${i + 1} / ${total} 단계</p>
  <h2 tabindex="-1">${m.title}</h2>
  ${missionBody(m)}
  <div class="lesson-actions">
    <button type="button" class="btn btn-ghost" data-prev ${i === 0 ? raw('disabled') : ''}>← 이전</button>
    <button type="button" class="btn btn-fill" data-done aria-pressed="false">이 단계 완료</button>
    <button type="button" class="btn btn-ghost" data-next ${i === total - 1 ? raw('disabled') : ''}>다음 →</button>
  </div>
  <p class="lesson-status" data-done-status role="status" aria-live="polite"></p>
</section>`;
}

export function lessonPage(content, w) {
  const slides = slidesOf(w);
  const base = embedBase(slides.url);
  return h`<nav class="crumbs" aria-label="현재 위치"><a href="/learn/">수업 듣기</a> › Workshop ${pad(w.number)}</nav>
<header class="page-head c-${w.color}">
  <p class="track-kicker">Workshop ${pad(w.number)}</p>
  <h1>${w.title}</h1>
</header>
${gate}
<div class="lesson c-${w.color}" data-learn-content data-lesson="${w.number}" hidden>
  <ol class="lesson-dots" aria-label="단계">
    ${w.missions.map((m, i) => h`<li><button type="button" data-goto="${m.id}" aria-label="${i + 1}단계: ${m.title}">${i + 1}</button></li>`)}
  </ol>
  <div class="lesson-grid">
    <div class="lesson-slides">
      <div class="slides-frame"><iframe data-slides data-embed-base="${base}" src="${base}${w.missions[0].slideId}" title="Workshop ${w.number} 학생용 슬라이드" allowfullscreen></iframe></div>
      <p class="hint">${link(slides.url, '슬라이드 새 창으로 열기')}</p>
    </div>
    <div class="lesson-steps">${w.missions.map((m, i) => lessonStep(m, i, w.missions.length))}</div>
  </div>
</div>`;
}
```

- [ ] **Step 5: 빌드 경로 연결**

`portal/scripts/build.mjs`:
- import 추가: `import * as learnPages from '../src/learn-pages.mjs';`
- `routes()`의 `/learn/` 항목을 다음 두 줄로 바꾼다:

```js
    { path: '/learn/', title: '수업 듣기', render: learnPages.learnPage, description: '서울대 계정으로 로그인하고 슬라이드를 보며 단계별로 실습해요.', script: 'learn.js' },
    ...learnPages.lessonWorkshops(content).map(w => ({ path: learnPages.lessonPath(w), title: `수업 · Workshop ${w.slug}`, render: c => learnPages.lessonPage(c, w), description: `${w.title} — 슬라이드를 보며 단계별로 실습해요.`, script: 'learn.js' }))
```

- [ ] **Step 6: 스타일 추가**

`portal/src/styles.css`의 `/* 수업 듣기 (/learn/) */` 블록 끝에 추가:

```css
.learn-user { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 16px; }
.learn-list { display: grid; gap: 12px; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); margin: 20px 0; }
.learn-card { display: grid; gap: 6px; padding: 18px; border: 1px solid var(--line); border-radius: 16px; background: var(--surface); color: var(--ink); text-decoration: none; }
a.learn-card:hover { border-color: var(--c); }
.learn-card.is-locked { opacity: .7; }
.learn-progress { color: var(--muted); font-size: .92rem; }
.lesson { margin-top: 20px; }
.lesson-dots { display: flex; flex-wrap: wrap; gap: 8px; list-style: none; padding: 0; margin: 0 0 16px; }
.lesson-dots button { width: 40px; height: 40px; border-radius: 50%; border: 1px solid var(--line); background: var(--surface); color: var(--ink); font-weight: 700; cursor: pointer; }
.lesson-dots button[aria-current="step"] { border-color: var(--c); box-shadow: 0 0 0 2px var(--c); }
.lesson-dots button.is-done { background: var(--c); border-color: var(--c); color: #fff; }
.lesson-grid { display: grid; gap: 24px; grid-template-columns: minmax(0, 3fr) minmax(0, 2fr); align-items: start; }
.lesson-slides { position: sticky; top: 16px; }
.slides-frame { position: relative; aspect-ratio: 16 / 9; border-radius: 12px; overflow: hidden; background: #0b1020; }
.slides-frame iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
.lesson-step h2 { margin: 4px 0 12px; }
.lesson-step h2:focus { outline: none; }
.lesson-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 20px; }
.lesson-status { margin: 8px 0 0; color: #b42318; font-weight: 600; }
.lesson-status:empty { display: none; }
@media (max-width: 960px) {
  .lesson-grid { grid-template-columns: 1fr; }
  .lesson-slides { position: static; }
}
```

- [ ] **Step 7: 통과 확인**

Run: `npm run test:portal`
Expected: PASS, 실패 0

- [ ] **Step 8: Commit**

```bash
git add portal/src/pages.mjs portal/src/learn-pages.mjs portal/scripts/build.mjs portal/src/styles.css portal/tests/portal.test.mjs
git commit -m "Build the lesson list and lesson pages for open workshops"
```

---

### Task 7: 수업 화면 스크립트

**Files:**
- Rewrite: `portal/src/learn.js`

- [ ] **Step 1: learn.js 전체를 다음으로 바꾼다**

```js
// 수업 듣기(/learn/…): 로그인 확인 → 화면 열기 → 진도 표시·단계 이동·슬라이드 맞추기.
// 수업 서버는 Render 무료 요금제라 잠들어 있을 수 있어요. 응답이 없으면 최대 1분 동안 5초마다 다시 시도합니다.
(() => {
  const gate = document.querySelector('[data-learn-gate]');
  const content = document.querySelector('[data-learn-content]');
  if (!gate) return;
  const messages = {
    not_snu: '서울대학교 @snu.ac.kr 계정으로 다시 로그인해 주세요.',
    cancelled: '로그인을 취소했어요. 다시 시도할 수 있어요.',
    expired: '로그인 시간이 지났어요. 다시 시도해 주세요.',
    failed: '로그인을 완료하지 못했어요. 잠시 후 다시 시도해 주세요.'
  };
  const params = new URLSearchParams(location.search);
  const errorCode = params.get('error');
  const loginError = Object.hasOwn(messages, errorCode) ? messages[errorCode] : null;
  if (params.has('error')) history.replaceState(null, '', location.pathname);

  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  };
  const button = (label, className, onClick) => {
    const node = el('button', className, label);
    node.type = 'button';
    node.addEventListener('click', onClick);
    return node;
  };
  const showGate = (...nodes) => gate.replaceChildren(...nodes);

  async function api(path, init = {}) {
    const response = await fetch(path, { credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(15000), ...init });
    const data = await response.json().catch(() => ({}));
    return { response, data };
  }

  function loginView() {
    const link = el('a', 'btn btn-fill', '서울대 계정으로 로그인');
    link.href = `/api/auth/google?next=${encodeURIComponent(location.pathname)}`;
    const nodes = [el('p', 'learn-status', '서울대 계정으로 로그인해 주세요.'), link];
    if (loginError) nodes.unshift(el('p', 'learn-error', loginError));
    showGate(...nodes);
  }

  function signedIn(user) {
    // 학교 계정 이름은 "이름 / 학생 / 학과"처럼 와서, 화면에는 첫 부분만 보여줍니다.
    const name = user.name.split(' / ')[0] || user.name;
    const bar = el('div', 'learn-user');
    const logout = button('로그아웃', 'btn btn-ghost', async () => {
      logout.disabled = true;
      try {
        const { response } = await api('/api/session', { method: 'DELETE' });
        if (!response.ok) throw new Error();
        location.replace('/');
      } catch {
        logout.disabled = false;
        bar.append(el('span', 'learn-error', '로그아웃하지 못했어요. 다시 시도해 주세요.'));
      }
    });
    bar.append(el('span', 'learn-status', `${name}님`), el('span', 'hint', user.email));
    if (user.operator) bar.append(el('span', 'hint', '운영진'));
    bar.append(logout);
    showGate(bar);
    if (!content) return;
    content.hidden = false;
    if (content.dataset.lesson) initLesson(Number(content.dataset.lesson));
    else initList();
  }

  async function check(started) {
    let result = {};
    try { result = await api('/api/me'); } catch { /* 연결 실패: 서버가 깨어나는 중일 수 있어요. */ }
    const { response, data } = result;
    if (response?.ok && data?.user) return signedIn(data.user);
    if (response?.status === 401) return loginView();
    if (data?.error === 'LEARN_NOT_CONFIGURED') return showGate(el('p', 'learn-status', '수업 서버를 준비하고 있어요. 운영진이 설정을 마치면 열려요.'));
    if (Date.now() - started < 60000) {
      showGate(el('p', 'learn-status', '서버를 깨우는 중이에요. 최대 1분 정도 걸려요…'));
      setTimeout(() => check(started), 5000);
      return;
    }
    showGate(el('p', 'learn-error', '수업 서버에 연결하지 못했어요.'), button('다시 시도', 'btn btn-ghost', () => check(Date.now())));
  }

  // 회차 번호 → 완료한 단계 id 모음
  async function loadProgress() {
    const { response, data } = await api('/api/progress');
    if (!response.ok) throw new Error();
    const done = new Map();
    for (const row of data.progress ?? []) {
      if (!done.has(row.workshop)) done.set(row.workshop, new Set());
      done.get(row.workshop).add(row.step);
    }
    return done;
  }

  async function initList() {
    let done;
    try { done = await loadProgress(); } catch { return; } // 진도를 못 불러와도 목록은 그대로 씁니다.
    for (const node of content.querySelectorAll('[data-progress-for]')) {
      const count = done.get(Number(node.dataset.progressFor))?.size ?? 0;
      node.textContent = `${count} / ${node.dataset.total} 단계 완료`;
    }
  }

  function initLesson(workshop) {
    const steps = [...content.querySelectorAll('[data-step]')];
    const dots = new Map([...content.querySelectorAll('[data-goto]')].map(dot => [dot.dataset.goto, dot]));
    const frame = content.querySelector('[data-slides]');
    const done = new Set();
    let current = 0;

    const showSlide = slideId => {
      const src = frame.dataset.embedBase + slideId;
      if (slideId && frame.src !== src) frame.src = src;
    };
    function render() {
      steps.forEach((step, i) => {
        const id = step.dataset.step;
        const finished = done.has(id);
        step.hidden = i !== current;
        dots.get(id).classList.toggle('is-done', finished);
        if (i === current) dots.get(id).setAttribute('aria-current', 'step');
        else dots.get(id).removeAttribute('aria-current');
        const toggle = step.querySelector('[data-done]');
        toggle.textContent = finished ? '완료함 · 취소하기' : '이 단계 완료';
        toggle.setAttribute('aria-pressed', String(finished));
      });
    }
    function go(index, { focus = true } = {}) {
      current = Math.max(0, Math.min(steps.length - 1, index));
      const step = steps[current];
      history.replaceState(null, '', `#step-${step.dataset.step}`);
      showSlide(step.dataset.slideId);
      render();
      if (focus) step.querySelector('h2').focus();
    }

    content.addEventListener('click', async event => {
      const target = event.target.closest('[data-goto], [data-prev], [data-next], [data-done]');
      if (!target) return;
      if (target.dataset.goto) return go(steps.findIndex(step => step.dataset.step === target.dataset.goto));
      if (target.hasAttribute('data-prev')) return go(current - 1);
      if (target.hasAttribute('data-next')) return go(current + 1);
      // 완료 표시: 서버에 저장된 뒤에만 화면을 바꿉니다.
      const step = steps[current];
      const id = step.dataset.step;
      const status = step.querySelector('[data-done-status]');
      const marking = !done.has(id);
      target.disabled = true;
      try {
        const { response } = await api(`/api/progress/${workshop}/${id}`, { method: marking ? 'PUT' : 'DELETE' });
        if (!response.ok) throw new Error();
        status.textContent = '';
        if (marking) done.add(id); else done.delete(id);
        if (marking && current < steps.length - 1) go(current + 1);
        else render();
      } catch {
        status.textContent = '저장하지 못했어요. 잠시 후 다시 눌러 주세요.';
      } finally {
        target.disabled = false;
      }
    });
    // 선택지(예: 로그인·지도)를 펼치면 그 기능의 슬라이드로 이동합니다. toggle은 버블링되지 않아 capture로 받습니다.
    content.addEventListener('toggle', event => {
      const option = event.target;
      if (option.open && option.dataset?.slideId) showSlide(option.dataset.slideId);
    }, true);

    const start = steps.findIndex(step => location.hash === `#step-${step.dataset.step}`);
    go(start >= 0 ? start : 0, { focus: false });
    loadProgress()
      .then(map => { for (const id of map.get(workshop) ?? []) done.add(id); render(); })
      .catch(() => { /* 진도를 못 불러와도 단계는 볼 수 있어요. */ });
  }

  check(Date.now());
})();
```

- [ ] **Step 2: 문법·빌드 확인**

Run: `node --check portal/src/learn.js && npm run test:portal && npm run build:portal`
Expected: 문법 오류 없음, 테스트 실패 0, 빌드 성공. `portal/dist/learn/01/index.html`에 `data-embed-base`, `lesson-step` 4개, `data-learn-content data-lesson="1" hidden`이 있다.

- [ ] **Step 3: Commit**

```bash
git add portal/src/learn.js
git commit -m "Open lessons after login with step navigation, slides and saved progress"
```

---

### Task 8: 포털 문서

**Files:**
- Modify: `portal/README.md`

- [ ] **Step 1: "수업 듣기" 절에 내용 추가**

`portal/README.md`의 `## 수업 듣기 (/learn/)와 수업 서버` 절 끝(비밀값 안내 문단 다음)에 추가:

```markdown
### 수업 화면 만들기·고치기

- `/learn/`은 열린 수업 목록과 내 진도, `/learn/<회차>/`는 학생용 슬라이드와 단계를 나란히 보여줍니다. 둘 다 로그인을 확인한 뒤에 내용이 열립니다(`src/learn.js`).
- 수업 화면은 **자료가 열렸고 학생용 슬라이드(`kind: 'slides'`)와 미션이 있는 회차**에만 만들어집니다. 공개 시각(`materialsOpenAt`) 전에는 페이지 자체가 없습니다.
- 단계 내용은 `content/workshops.mjs`의 `missions`를 그대로 씁니다. 각 미션에 시작 슬라이드를 적습니다:
  - `slide`: 학생용 슬라이드 번호(1부터, 사람이 확인하는 용도)
  - `slideId`: Google Slides 페이지 ID. 슬라이드를 연 주소 끝의 `#slide=id.<페이지 ID>`에서 `<페이지 ID>` 부분입니다.
  - 기능 선택지(`options`)에도 같은 값을 넣으면, 학생이 그 선택지를 펼칠 때 해당 슬라이드로 넘어갑니다.
- 단계를 바꾸거나 회차 공개 시각을 바꾸면 수업 서버의 `WORKSHOP_OPEN_AT`(Render 설정, `render.yaml`)도 같은 시각으로 맞춥니다. 서버는 열린 회차의 진도만 저장합니다.
```

- [ ] **Step 2: Commit**

```bash
git add portal/README.md
git commit -m "Document how lesson pages and slides are configured"
```

---

### Task 9: 배포와 실제 확인 (에이전트 + 사용자)

- [ ] **Step 1: 테스트·push**

```bash
npm run test:learn && npm run test:portal
git push
```
Expected: 실패 0, push 성공. Render가 `render.yaml` 변경을 반영하고 자동 배포한다(수 분).

- [ ] **Step 2: Render 반영 확인 (에이전트)**

```bash
curl -s -m 70 https://snu-learn-server.onrender.com/api/health
curl -s -m 70 -o /dev/null -w "%{http_code}\n" https://snu-student-collective.pages.dev/api/progress
```
Expected: `{"ok":true,"configured":true}`, 그리고 `401`(진도 경로가 생김. 404면 아직 이전 버전 → 몇 분 뒤 다시). `configured:false`면 `WORKSHOP_OPEN_AT` 형식 문제일 수 있으니 사용자에게 Render → Environment에서 값 확인을 요청한다. Blueprint 자동 동기화가 꺼져 있으면 사용자가 Render 대시보드에서 `WORKSHOP_OPEN_AT`를 직접 추가한다.

- [ ] **Step 3: 포털 배포 (에이전트)**

```bash
npm run deploy:portal
curl -s https://snu-student-collective.pages.dev/learn/01/ | grep -c 'class="lesson-step"'
curl -s -o /dev/null -w "%{http_code}\n" https://snu-student-collective.pages.dev/learn/02/
```
Expected: 배포 완료, `4`, `404`(WS2는 11/2 18:00 전).

- [ ] **Step 4: 실제 확인 (사용자)**

사용자에게 요청:
1. `/learn/` → 로그인 상태에서 "Workshop 01" 카드에 "0 / 4 단계 완료", "Workshop 02" 카드에 "11/2 (월) 18:00에 열려요".
2. 카드 클릭 → 왼쪽 슬라이드가 1번 슬라이드, 오른쪽 1단계. "다음 →"으로 2단계 → 슬라이드가 4번으로 바뀜.
3. "이 단계 완료" → 점이 채워지고 다음 단계로 이동. 새로고침해도 완료 표시 유지. "완료함 · 취소하기"로 취소.
4. 4단계에서 "로그인 — Google 계정" 선택지를 펼치면 슬라이드가 15번으로 이동.
5. `/learn/`로 돌아가 진도 숫자가 맞는지. 폰에서는 슬라이드가 위, 단계가 아래.

실제 확인 전에는 "완료"라고 보고하지 않는다. 확인 후 `learn-server/README.md`의 `## 확인 기록`에 한 줄 추가하고 commit·push.
