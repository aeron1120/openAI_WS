// 테스트 도우미: 메모리 저장소 + 시각을 바꿀 수 있는 app + 관리자 세션 쿠키.
import { createApp } from '../server/app.mjs';
import { createLocalStore } from '../server/store/local.mjs';
import { sign } from '../server/session.mjs';

export const ORIGIN = 'https://sc.example';
export const ADMIN = 'admin@example.com';
const SECRET = 'test-session-secret-0123456789-abcdef';

export const PROD_ENV = {
  PUBLIC_ORIGIN: ORIGIN, SESSION_SECRET: SECRET, ADMIN_EMAILS: ADMIN,
  GOOGLE_CLIENT_ID: 'client', GOOGLE_CLIENT_SECRET: 'secret',
  SUPABASE_URL: 'https://db.example', SUPABASE_SERVICE_KEY: 'sb_secret_test'
};

export async function setup({ env = {}, start = Date.parse('2026-10-30T03:00:00Z'), legacy = async () => 'checking' } = {}) {
  const store = await createLocalStore();
  const clock = { now: start };
  const app = createApp({ env: { ...PROD_ENV, ...env }, store, now: () => clock.now, legacyStatus: legacy });
  const csrf = 'csrf-token-for-tests';
  const cookie = `__Host-cms_session=${sign({ kind: 'admin', email: ADMIN, name: 'Admin', csrf, exp: Math.floor(start / 1000) + 10 * 24 * 3600 }, SECRET)}`;
  const get = (path, { admin = false } = {}) => app(new Request(ORIGIN + path, { headers: admin ? { cookie } : {} }));
  const api = (method, path, body, { headers = {}, raw = null } = {}) => app(new Request(ORIGIN + path, {
    method,
    headers: { cookie, origin: ORIGIN, 'x-cms-csrf': csrf, ...(raw ? {} : { 'content-type': 'application/json' }), ...headers },
    body: raw ?? (body === undefined ? undefined : JSON.stringify(body))
  }));
  const json = async (method, path, body, options) => {
    const response = await api(method, path, body, options);
    return { status: response.status, data: await response.json() };
  };
  // 학교 하나를 만들고 일정 하나를 넣은 뒤 게시까지
  async function campusWithEvent({ name = '가나대학교', slug = 'gana', event = {} } = {}) {
    const created = await json('POST', '/api/manage/campuses', { name, slug, termName: '2026년 2학기' });
    const campusId = created.data.id;
    const campus = (await store.getItem(campusId));
    await json('PUT', `/api/manage/items/${campusId}`, { data: { ...campus.data, status: 'active' }, expectedRevision: campus.revision });
    const ev = await json('POST', '/api/manage/items', { kind: 'event', campusId, data: { termId: campus.data.currentTermId, type: 'workshop', title: '첫 워크숍', status: 'scheduled', start: '2026-11-10T09:00:00Z', end: '2026-11-10T10:00:00Z', visible: true, openToOthers: true, ...event } });
    return { campusId, eventId: ev.data.item?.id, termId: campus.data.currentTermId, event: ev };
  }
  async function publish(scopes, requestId = `req-${Math.random().toString(36).slice(2, 12)}`) {
    const plan = await json('POST', '/api/manage/publish/plan', { scopes });
    const revisions = Object.fromEntries((plan.data.plan ?? []).map(entry => [entry.scope, entry.itemRevisions]));
    return { plan, result: await json('POST', '/api/manage/publish', { requestId, scopes, revisions }), requestId, revisions };
  }
  const text = async path => (await get(path)).text();
  return { app, store, clock, cookie, csrf, get, api, json, text, campusWithEvent, publish };
}
