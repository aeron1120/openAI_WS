import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, createSign } from 'node:crypto';
import { ADMIN, ORIGIN, PROD_ENV, setup } from './helpers.mjs';
import { cleanData, emptyData } from '../server/content.mjs';
import { rich } from '../server/format.mjs';
import { checkUpload } from '../server/media.mjs';
import { createLegacyStatus } from '../server/legacy-snu.mjs';
import { eventState, recruitState } from '../server/states.mjs';
import { verifyIdToken, GoogleError } from '../server/google.mjs';
import { loadConfig } from '../server/config.mjs';

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)]);

// ---------- 설정·인증 ----------
test('운영 모드는 필수 비밀값이 없으면 시작하지 않고, 로컬 모드는 localhost에서만 켜진다', () => {
  assert.equal(loadConfig(PROD_ENV).ok, true);
  assert.equal(loadConfig({ ...PROD_ENV, GOOGLE_CLIENT_SECRET: '' }).ok, false);
  assert.equal(loadConfig({ CMS_MODE: 'local', PUBLIC_ORIGIN: 'https://sc.example', ADMIN_EMAILS: ADMIN }).ok, false);
  assert.equal(loadConfig({ CMS_MODE: 'local', PUBLIC_ORIGIN: 'http://localhost:5180', ADMIN_EMAILS: ADMIN }).ok, true);
});

test('관리 화면·API·미리보기는 로그인 없이 열리지 않는다', async () => {
  const t = await setup();
  const page = await t.get('/manage/');
  assert.equal(page.status, 302);
  assert.match(page.headers.get('location'), /^\/manage\/login\/\?next=/);
  assert.equal((await t.get('/manage/preview/')).status, 302);
  const api = await t.app(new Request(`${ORIGIN}/api/manage/items`, { method: 'POST', headers: { origin: ORIGIN, 'content-type': 'application/json' }, body: '{}' }));
  assert.equal(api.status, 401);
});

test('Google 로그인 콜백 주소는 등록한 리디렉션 URI(끝의 / 포함)와 같다', async () => {
  const t = await setup();
  const response = await t.get('/manage/auth/google/?next=/manage/');
  const location = new URL(response.headers.get('location'));
  assert.equal(location.searchParams.get('redirect_uri'), `${ORIGIN}/manage/auth/callback/`);
  assert.equal(location.searchParams.get('login_hint'), ADMIN);
});

test('운영 모드에서는 개발용 로그인이 없다', async () => {
  const t = await setup();
  const response = await t.app(new Request(`${ORIGIN}/manage/auth/dev/`, { method: 'POST', headers: { origin: ORIGIN } }));
  assert.equal(response.status, 404);
  assert.equal(response.headers.get('set-cookie'), null);
});

test('쓰기 요청은 같은 출처와 CSRF 토큰이 있어야 한다', async () => {
  const t = await setup();
  const body = { name: '가', slug: 'ga', termName: '학기' };
  assert.equal((await t.json('POST', '/api/manage/campuses', body, { headers: { origin: 'https://evil.example' } })).status, 403);
  assert.equal((await t.json('POST', '/api/manage/campuses', body, { headers: { 'x-cms-csrf': 'wrong' } })).status, 403);
  assert.equal((await t.json('POST', '/api/manage/campuses', body)).status, 201);
});

test('Google 로그인은 허용 목록의 확인된 메일만 통과한다', async () => {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'k1', alg: 'RS256', use: 'sig' };
  const fetchImpl = async () => new Response(JSON.stringify({ keys: [jwk] }), { headers: { 'cache-control': 'max-age=60' } });
  const nowMs = Date.parse('2026-10-30T00:00:00Z');
  const token = claims => {
    const b64 = value => Buffer.from(JSON.stringify(value)).toString('base64url');
    const body = `${b64({ alg: 'RS256', kid: 'k1' })}.${b64({ iss: 'https://accounts.google.com', aud: 'client', sub: '1', nonce: 'n', iat: nowMs / 1000, exp: nowMs / 1000 + 600, email_verified: true, ...claims })}`;
    return `${body}.${createSign('RSA-SHA256').update(body).sign(privateKey).toString('base64url')}`;
  };
  const options = { clientId: 'client', nonce: 'n', admins: new Set([ADMIN]), fetchImpl, nowMs };
  assert.equal((await verifyIdToken(token({ email: ADMIN }), options)).email, ADMIN);
  await assert.rejects(verifyIdToken(token({ email: 'other@snu.ac.kr' }), options), error => error instanceof GoogleError && error.reason === 'not_admin');
  await assert.rejects(verifyIdToken(token({ email: ADMIN, email_verified: false }), options), error => error.reason === 'not_admin');
  await assert.rejects(verifyIdToken(token({ email: ADMIN, aud: 'other' }), options), error => error.reason === 'failed');
});

test('허용 목록에서 빠진 계정의 세션은 바로 막힌다', async () => {
  const t = await setup({ env: { ADMIN_EMAILS: 'someone-else@example.com' } });
  assert.equal((await t.get('/manage/', { admin: true })).status, 302);
});

// ---------- 입력 검증·XSS ----------
test('링크는 https·http·사이트 안 주소만, 본문 HTML은 글자로 보인다', () => {
  const base = { ...emptyData('event'), termId: 't', title: '제목', status: 'tbd' };
  assert.throws(() => cleanData('event', { ...base, applyUrl: 'javascript:alert(1)' }), /https/);
  assert.throws(() => cleanData('event', { ...base, applyUrl: '//evil.example' }), /https/);
  assert.equal(cleanData('event', { ...base, applyUrl: '/campuses/snu/' }).applyUrl, '/campuses/snu/');
  const html = rich('<img src=x onerror=alert(1)> [x](javascript:alert(1)) [ok](https://example.com)');
  assert.doesNotMatch(html, /<img|href="javascript/);
  assert.match(html, /&lt;img/);
  assert.match(html, /href="https:\/\/example.com\/"/);
});

test('관리자가 저장한 제목·본문의 스크립트는 공개 화면에서 실행되지 않는다', async () => {
  const t = await setup();
  const { campusId, termId } = await t.campusWithEvent();
  await t.json('POST', '/api/manage/items', { kind: 'notice', campusId, data: { termId, title: '<script>alert(1)</script>', body: '"><svg onload=alert(1)>', visible: true } });
  await t.publish([`campus:${campusId}`]);
  const page = await t.text('/campuses/gana/notices/');
  assert.doesNotMatch(page, /<script>alert|<svg onload/);
  assert.match(page, /&lt;script&gt;/);
});

test('학생 결과물은 공개 동의 없이 공개로 저장할 수 없다', async () => {
  const t = await setup();
  const { campusId } = await t.campusWithEvent();
  const result = await t.json('POST', '/api/manage/items', { kind: 'project', campusId, data: { title: '학생 작품', kind: 'student', visible: true } });
  assert.equal(result.status, 422);
  assert.equal(result.data.field, 'consentConfirmed');
});

test('브라우저에서 다른 학교 ID의 학기를 골라도 서버가 막는다', async () => {
  const t = await setup();
  const a = await t.campusWithEvent();
  const b = await t.campusWithEvent({ name: '다라대학교', slug: 'dara' });
  const result = await t.json('POST', '/api/manage/items', { kind: 'event', campusId: b.campusId, data: { termId: a.termId, type: 'workshop', title: '섞기', status: 'tbd', visible: true } });
  assert.equal(result.status, 422);
  assert.equal(result.data.field, 'termId');
  assert.equal((await t.json('POST', '/api/manage/campuses', { name: '중복', slug: 'gana', termName: '학기' })).status, 422);
});

// ---------- 초안·게시 ----------
test('초안은 공개 페이지·사이트맵에 나오지 않고, 게시 후 다음 요청에 반영된다', async () => {
  const t = await setup();
  const { campusId } = await t.campusWithEvent();
  assert.equal((await t.get('/campuses/gana/')).status, 404);
  assert.doesNotMatch(await t.text('/sitemap.xml'), /gana/);
  assert.equal((await t.get('/manage/preview/campuses/gana/', { admin: true })).status, 200);
  const { result } = await t.publish([`campus:${campusId}`]);
  assert.equal(result.status, 200);
  assert.equal((await t.get('/campuses/gana/')).status, 200);
  assert.match(await t.text('/sitemap.xml'), /\/campuses\/gana\//);
  // 학교 페이지와 통합 목록이 같은 게시본을 씁니다.
  assert.match(await t.text('/campuses/gana/program/'), /첫 워크숍/);
  assert.match(await t.text('/events/'), /첫 워크숍/);
  assert.match(await t.text('/'), /가나대학교/);
});

test('게시 뒤 초안을 고쳐도 공개본은 그대로다', async () => {
  const t = await setup();
  const { campusId, eventId } = await t.campusWithEvent();
  await t.publish([`campus:${campusId}`]);
  const item = await t.store.getItem(eventId);
  await t.json('PUT', `/api/manage/items/${eventId}`, { data: { ...item.data, title: '바뀐 제목' }, expectedRevision: item.revision });
  assert.match(await t.text('/campuses/gana/program/'), /첫 워크숍/);
  assert.doesNotMatch(await t.text('/campuses/gana/program/'), /바뀐 제목/);
  assert.match(await (await t.get('/manage/preview/campuses/gana/program/', { admin: true })).text(), /바뀐 제목/);
});

test('두 탭에서 같은 판을 고치면 나중 저장은 충돌로 막힌다', async () => {
  const t = await setup();
  const { eventId } = await t.campusWithEvent();
  const item = await t.store.getItem(eventId);
  const first = await t.json('PUT', `/api/manage/items/${eventId}`, { data: { ...item.data, title: '탭 1' }, expectedRevision: item.revision });
  const second = await t.json('PUT', `/api/manage/items/${eventId}`, { data: { ...item.data, title: '탭 2' }, expectedRevision: item.revision });
  assert.equal(first.status, 200);
  assert.equal(second.status, 409);
  assert.equal(second.data.error, 'CONFLICT');
  assert.equal(second.data.current.data.title, '탭 1');
  assert.equal((await t.store.getItem(eventId)).data.title, '탭 1');
});

test('같은 게시 요청을 다시 보내도 한 번만 게시된다', async () => {
  const t = await setup();
  const { campusId } = await t.campusWithEvent();
  const { result, requestId, revisions } = await t.publish([`campus:${campusId}`]);
  const again = await t.json('POST', '/api/manage/publish', { requestId, scopes: [`campus:${campusId}`], revisions });
  assert.equal(again.status, 200);
  assert.equal(again.data.duplicate, true);
  assert.equal(again.data.releases[0].id, result.data.releases[0].id);
  assert.equal((await t.store.listReleases()).length, 1);
});

test('여러 학교 게시는 하나라도 문제가 있으면 아무것도 반영하지 않는다', async () => {
  const t = await setup();
  const a = await t.campusWithEvent();
  const b = await t.campusWithEvent({ name: '다라대학교', slug: 'dara' });
  // b에 동의 없는 학생 작품을 몰래 넣어 검증 실패를 만듭니다(저장소에 직접).
  await t.store.createItem({ id: 'bad-project', kind: 'project', campusId: b.campusId, data: { ...emptyData('project'), title: '동의 없음', kind: 'student', visible: true }, actor: 'x', now: new Date().toISOString() });
  const { result } = await t.publish([`campus:${a.campusId}`, `campus:${b.campusId}`]);
  assert.equal(result.status, 422);
  assert.equal(result.data.error, 'PUBLISH_BLOCKED');
  assert.equal((await t.store.listReleases()).length, 0);
  assert.equal((await t.get('/campuses/gana/')).status, 404);
});

test('게시 내용을 확인한 뒤 초안이 바뀌면 게시를 멈춘다', async () => {
  const t = await setup();
  const { campusId, eventId } = await t.campusWithEvent();
  const plan = await t.json('POST', '/api/manage/publish/plan', { scopes: [`campus:${campusId}`] });
  const item = await t.store.getItem(eventId);
  await t.json('PUT', `/api/manage/items/${eventId}`, { data: { ...item.data, title: '확인 뒤 수정' }, expectedRevision: item.revision });
  const result = await t.json('POST', '/api/manage/publish', { requestId: 'req-plan-changed', scopes: [`campus:${campusId}`], revisions: { [`campus:${campusId}`]: plan.data.plan[0].itemRevisions } });
  assert.equal(result.status, 409);
  assert.equal((await t.store.listReleases()).length, 0);
});

test('저장소가 게시 직전 충돌을 알리면 전부 취소된다', async () => {
  const t = await setup();
  const a = await t.campusWithEvent();
  const b = await t.campusWithEvent({ name: '다라대학교', slug: 'dara' });
  const entries = [
    { scope: `campus:${a.campusId}`, snapshot: {}, itemRevisions: { [a.campusId]: 2 } },
    { scope: `campus:${b.campusId}`, snapshot: {}, itemRevisions: { [b.campusId]: 99 } }
  ];
  await assert.rejects(t.store.publish({ requestId: 'r-atomic', actor: ADMIN, entries, now: new Date().toISOString() }));
  assert.equal((await t.store.listReleases()).length, 0);
  assert.equal((await t.store.activeReleases()).length, 0);
});

test('이전 게시본 복원은 새 게시 번호로 남고 초안은 그대로다', async () => {
  const t = await setup();
  const { campusId, eventId } = await t.campusWithEvent();
  const first = await t.publish([`campus:${campusId}`]);
  const item = await t.store.getItem(eventId);
  await t.json('PUT', `/api/manage/items/${eventId}`, { data: { ...item.data, title: '두 번째 제목' }, expectedRevision: item.revision });
  await t.publish([`campus:${campusId}`]);
  assert.match(await t.text('/campuses/gana/program/'), /두 번째 제목/);
  const restored = await t.json('POST', '/api/manage/restore', { requestId: 'req-restore-1', releaseId: first.result.data.releases[0].id });
  assert.equal(restored.status, 200);
  assert.equal(restored.data.releases[0].number, 3);
  assert.equal(restored.data.releases[0].kind, 'restore');
  assert.match(await t.text('/campuses/gana/program/'), /첫 워크숍/);
  assert.equal((await t.store.getItem(eventId)).data.title, '두 번째 제목');
});

test('숨김·보관·추천 해제가 실제 노출에 반영된다', async () => {
  const t = await setup();
  const { campusId, eventId } = await t.campusWithEvent();
  await t.json('POST', '/api/manage/items', { kind: 'home', data: { ...emptyData('home'), heroTitle: '메인', featuredEvents: [eventId], featuredCampuses: [campusId] } });
  await t.publish(['global', `campus:${campusId}`]);
  assert.match(await t.text('/'), /첫 워크숍/);
  const item = await t.store.getItem(eventId);
  await t.json('PUT', `/api/manage/items/${eventId}`, { data: { ...item.data, visible: false }, expectedRevision: item.revision });
  await t.publish([`campus:${campusId}`]);
  // 통합 메인은 다시 게시하지 않아도 숨긴 행사를 추천에서 뺍니다.
  assert.doesNotMatch(await t.text('/'), /첫 워크숍/);
  assert.equal((await t.get(`/campuses/gana/workshops/${eventId}/`)).status, 404);
  const campus = await t.store.getItem(campusId);
  await t.json('PUT', `/api/manage/items/${campusId}`, { data: { ...campus.data, status: 'archived' }, expectedRevision: campus.revision });
  await t.publish([`campus:${campusId}`]);
  assert.equal((await t.get('/campuses/gana/')).status, 404);
  assert.doesNotMatch(await t.text('/campuses/'), /가나대학교/);
  assert.ok(await t.store.getItem(eventId), '보관해도 콘텐츠는 남는다');
});

test('초안 상태 학교를 게시하려 하면 목록에 안 보인다고 미리 알려준다', async () => {
  const t = await setup();
  const created = await t.json('POST', '/api/manage/campuses', { name: '서울대학교', slug: 'snu', termName: '학기' });
  const plan = await t.json('POST', '/api/manage/publish/plan', { scopes: [`campus:${created.data.id}`] });
  assert.match(plan.data.plan[0].notes.join(), /공개 목록과 학교 주소에 나오지 않아요/);
  assert.equal(plan.data.plan[0].problems.length, 0, '막지는 않는다');
});

test('시험용 학교는 운영 모드에서 게시할 수 없다', async () => {
  const t = await setup();
  const created = await t.json('POST', '/api/manage/campuses', { name: '시험', slug: 'test', termName: '학기', fixture: true });
  const { plan, result } = await t.publish([`campus:${created.data.id}`]);
  assert.match(plan.data.plan[0].problems.join(), /시험용/);
  assert.equal(result.status, 422);
});

test('학교 추가의 기본 구성은 날짜·장소·신청 링크·학습 연결을 복사하지 않는다', async () => {
  const t = await setup();
  const { campusId } = await t.campusWithEvent({ event: { place: '본관', applyUrl: 'https://apply.example/a', legacyWorkshop: null } });
  const created = await t.json('POST', '/api/manage/campuses', { name: '새학교', slug: 'new-school', termName: '학기', templateCampusId: campusId });
  const events = await t.store.listItems({ kind: 'event', campusId: created.data.id });
  assert.equal(events.length, 1);
  assert.equal(events[0].data.title, '첫 워크숍');
  assert.equal(events[0].data.start, null);
  assert.equal(events[0].data.place, null);
  assert.equal(events[0].data.applyUrl, null);
  assert.equal(events[0].data.status, 'tbd');
  const campus = await t.store.getItem(created.data.id);
  assert.equal(campus.data.status, 'draft');
  assert.equal(campus.data.communityUrl, null);
});

// ---------- 일정·신청·자료 상태 ----------
test('행사 상태와 신청 가능 여부는 따로 계산되고, 끝난 행사는 신청이 닫힌다', () => {
  const event = { status: 'scheduled', start: '2026-11-02T09:00:00Z', end: '2026-11-02T10:00:00Z', applyUrl: 'https://apply.example' };
  assert.equal(eventState(event, Date.parse('2026-11-01T00:00:00Z')), 'upcoming');
  assert.equal(recruitState(event, Date.parse('2026-11-01T00:00:00Z')), 'open');
  assert.equal(eventState(event, Date.parse('2026-11-02T09:30:00Z')), 'ongoing');
  assert.equal(recruitState(event, Date.parse('2026-11-02T09:30:00Z')), 'closed');
  assert.equal(recruitState({ ...event, status: 'cancelled' }, Date.parse('2026-11-01T00:00:00Z')), 'closed');
  assert.equal(recruitState({ ...event, applyOpensAt: '2026-11-01T12:00:00Z' }, Date.parse('2026-11-01T00:00:00Z')), 'soon');
  assert.equal(recruitState({ ...event, applyUrl: null }, Date.parse('2026-11-01T00:00:00Z')), 'none');
});

async function materialSetup() {
  const t = await setup();
  const material = await t.json('POST', '/api/manage/items', { kind: 'material', data: { title: '공통 안내', type: 'guide' } });
  const version = await t.json('POST', '/api/manage/items', { kind: 'material_version', data: { materialId: material.data.item.id, version: 'v1', body: '비밀 예약 본문 XYZ', publicAt: '2026-11-05T09:00:00Z' } });
  return { t, versionId: version.data.item.id };
}

test('예약 자료는 전체 공개 시각 전에 직접 주소·학교 화면·사이트맵 어디에서도 본문을 받을 수 없다', async () => {
  const { t, versionId } = await materialSetup();
  const { campusId } = await t.campusWithEvent({ event: { materials: [{ versionId, exposeAt: null, note: '' }] } });
  await t.publish([`campus:${campusId}`]);
  const direct = await t.get(`/materials/${versionId}/`);
  assert.equal(direct.status, 404);
  assert.doesNotMatch(await direct.text(), /XYZ/);
  for (const path of ['/', '/campuses/gana/', '/campuses/gana/program/', '/events/', '/sitemap.xml']) assert.doesNotMatch(await t.text(path), /XYZ/);
  assert.match(await t.text('/campuses/gana/program/'), /공개 예정/);
  t.clock.now = Date.parse('2026-11-05T09:00:01Z');
  assert.equal((await t.get(`/materials/${versionId}/`)).status, 200);
  assert.match(await t.text(`/materials/${versionId}/`), /XYZ/);
  assert.match(await t.text('/campuses/gana/program/'), /자료 열림/);
});

test('학교 화면 노출 시점은 자료 전체 공개보다 빠를 수 없고, A에서 공개된 자료는 B 일정과 무관하게 공개 자료다', async () => {
  const { t, versionId } = await materialSetup();
  const early = await t.campusWithEvent({ event: { materials: [{ versionId, exposeAt: '2026-11-01T00:00:00Z', note: '' }] } });
  assert.equal(early.event.status, 422);
  const a = await t.campusWithEvent({ name: 'A대학교', slug: 'a-school', event: { materials: [{ versionId, exposeAt: null, note: '' }] } });
  const b = await t.campusWithEvent({ name: 'B대학교', slug: 'b-school', event: { materials: [{ versionId, exposeAt: '2026-11-20T00:00:00Z', note: '' }] } });
  await t.publish([`campus:${a.campusId}`, `campus:${b.campusId}`]);
  t.clock.now = Date.parse('2026-11-06T00:00:00Z');
  assert.match(await t.text('/campuses/a-school/program/'), /자료 열림/);
  // B 학교 화면에는 아직 소개하지 않지만, 자료 자체는 공개 자료라 직접 주소로 열립니다.
  assert.match(await t.text('/campuses/b-school/program/'), /11월 20일.*공개 예정/);
  assert.equal((await t.get(`/materials/${versionId}/`)).status, 200);
  t.clock.now = Date.parse('2026-11-20T00:00:01Z');
  assert.match(await t.text('/campuses/b-school/program/'), /자료 열림/);
});

test('이미 전체 공개된 자료 버전의 공개 시각과 내용은 바꿀 수 없다', async () => {
  const { t, versionId } = await materialSetup();
  t.clock.now = Date.parse('2026-11-06T00:00:00Z');
  const item = await t.store.getItem(versionId);
  const moved = await t.json('PUT', `/api/manage/items/${versionId}`, { data: { ...item.data, publicAt: '2026-12-01T00:00:00Z' }, expectedRevision: item.revision });
  assert.equal(moved.status, 422);
  const edited = await t.json('PUT', `/api/manage/items/${versionId}`, { data: { ...item.data, body: '바꿔치기' }, expectedRevision: item.revision });
  assert.equal(edited.status, 200);
  assert.equal((await t.store.getItem(versionId)).data.body, '비밀 예약 본문 XYZ');
});

// ---------- 파일 ----------
test('파일은 실제 형식을 확인하고, 게시 전 파일은 관리자만 볼 수 있다', async () => {
  assert.ok(checkUpload(Buffer.from('<svg onload=alert(1)></svg>'), 'image/svg+xml').error);
  assert.ok(checkUpload(PNG, 'image/jpeg').error);
  assert.ok(checkUpload(Buffer.concat([PNG, Buffer.alloc(10 * 1024 * 1024)]), 'image/png').error);
  const t = await setup();
  const upload = await t.json('POST', '/api/manage/media', undefined, { raw: PNG, headers: { 'content-type': 'image/png', 'x-filename': 'a.png' } });
  assert.equal(upload.status, 201);
  const mediaId = upload.data.media.id;
  assert.equal((await t.get(`/media/${mediaId}`)).status, 404);
  assert.equal((await t.get(`/media/${mediaId}`, { admin: true })).status, 200);
  const { campusId } = await t.campusWithEvent();
  await t.json('POST', '/api/manage/items', { kind: 'project', campusId, data: { title: '예제', kind: 'operator', mediaId, visible: true } });
  await t.publish([`campus:${campusId}`]);
  const open = await t.get(`/media/${mediaId}`);
  assert.equal(open.status, 200);
  assert.equal(open.headers.get('content-type'), 'image/png');
  const bad = await t.json('POST', '/api/manage/media', undefined, { raw: Buffer.from('<html></html>'), headers: { 'content-type': 'text/html' } });
  assert.equal(bad.status, 415);
});

// ---------- 공개 화면 상태 ----------
test('공개된 학교가 없거나 없는 학교 주소면 정직하게 안내한다', async () => {
  const t = await setup();
  const home = await t.text('/');
  assert.match(home, /공개된 학교 공간을 준비하고 있어요/);
  assert.match(home, /공개 동의를 받은 결과물이 생기면/);
  const missing = await t.get('/campuses/nowhere/');
  assert.equal(missing.status, 404);
  assert.match(await missing.text(), /찾는 학교 공간이 없어요/);
  // 공개된 학교가 하나도 없어도, 검색했으면 검색 결과가 없다고 알려줍니다.
  const searched = await t.text('/campuses/?q=없는학교');
  assert.match(searched, /‘없는학교’에 맞는 학교가 없어요/);
  assert.doesNotMatch(searched, /data-search-empty hidden/);
});

test('준비 중 학교는 상태를 화면에 표시한다', async () => {
  const t = await setup();
  const { campusId } = await t.campusWithEvent();
  const campus = await t.store.getItem(campusId);
  await t.json('PUT', `/api/manage/items/${campusId}`, { data: { ...campus.data, status: 'preparing' }, expectedRevision: campus.revision });
  await t.publish([`campus:${campusId}`]);
  assert.match(await t.text('/campuses/gana/'), /준비 중인 학교예요/);
});

test('공개 응답은 캐시하지 않고 보안 헤더가 붙는다', async () => {
  const t = await setup();
  const response = await t.get('/');
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.match(response.headers.get('content-security-policy'), /script-src 'self'/);
  assert.equal(response.headers.get('x-frame-options'), 'DENY');
});

test('학교 추가에서 링크를 영문 짧은 이름 칸에 넣으면 막고, 학교 사이트 주소 칸은 받는다', async () => {
  const t = await setup();
  const wrong = await t.json('POST', '/api/manage/campuses', { name: '서울대학교', slug: 'https://snu-student-collective.pages.dev', termName: '학기' });
  assert.equal(wrong.status, 422);
  assert.equal(wrong.data.field, 'slug');
  const right = await t.json('POST', '/api/manage/campuses', { name: '서울대학교', slug: 'snu', termName: '학기', externalUrl: 'https://snu-student-collective.pages.dev/' });
  assert.equal(right.status, 201);
  assert.equal((await t.store.getItem(right.data.id)).data.externalUrl, 'https://snu-student-collective.pages.dev/');
});

test('학교 사이트 주소가 있는 학교는 카드·학교 주소가 그 사이트로 바로 연결된다', async () => {
  const t = await setup();
  const created = await t.json('POST', '/api/manage/campuses', { name: '서울대학교', slug: 'snu', termName: '학기' });
  const campus = await t.store.getItem(created.data.id);
  const bad = await t.json('PUT', `/api/manage/items/${campus.id}`, { data: { ...campus.data, externalUrl: '/somewhere/' }, expectedRevision: campus.revision });
  assert.equal(bad.data.field, 'externalUrl');
  await t.json('PUT', `/api/manage/items/${campus.id}`, { data: { ...campus.data, status: 'active', externalUrl: 'https://snu-student-collective.pages.dev/' }, expectedRevision: campus.revision });
  await t.publish([`campus:${campus.id}`]);
  const list = await t.text('/campuses/');
  assert.match(list, /href="https:\/\/snu-student-collective\.pages\.dev\/"[^>]*>학교 사이트로/);
  assert.doesNotMatch(list, /href="\/campuses\/snu\/"/);
  const direct = await t.get('/campuses/snu/program/');
  assert.equal(direct.status, 302);
  assert.equal(direct.headers.get('location'), 'https://snu-student-collective.pages.dev/');
  assert.doesNotMatch(await t.text('/sitemap.xml'), /campuses\/snu/);
});

// ---------- SNU 학습실 연결 ----------
test('SNU 학습실 회차 상태는 응답이 정상일 때만 열림으로 표시한다', async () => {
  const health = body => async () => new Response(JSON.stringify(body));
  assert.equal(await createLegacyStatus({ origin: 'https://legacy.example', fetchImpl: health({ configured: true, openWorkshops: [1] }) })(1), 'open');
  assert.equal(await createLegacyStatus({ origin: 'https://legacy.example', fetchImpl: health({ configured: true, openWorkshops: [1] }) })(2), 'closed');
  assert.equal(await createLegacyStatus({ origin: 'https://legacy.example', fetchImpl: health({ configured: false, openWorkshops: [1] }) })(1), 'checking');
  assert.equal(await createLegacyStatus({ origin: 'https://legacy.example', fetchImpl: async () => { throw new Error('down'); } })(1), 'checking');
  let calls = 0;
  const status = createLegacyStatus({ origin: 'https://legacy.example', fetchImpl: async () => { calls++; throw new Error('down'); } });
  await status(1, 0);
  await status(1, 1000);
  assert.equal(calls, 1, '실패 뒤 1분 동안은 다시 묻지 않는다');
});

test('SNU 학교는 기존 학습실로 연결하고, 상태를 알 수 없으면 확인 중으로 둔다', async () => {
  const t = await setup({ legacy: async number => number === 1 ? 'open' : 'checking' });
  const created = await t.json('POST', '/api/manage/campuses', { name: '서울대학교', slug: 'snu', termName: '학기' });
  const campus = await t.store.getItem(created.data.id);
  await t.json('PUT', `/api/manage/items/${campus.id}`, { data: { ...campus.data, status: 'active', learningMode: 'legacy_external', learnUrl: 'https://legacy.example/learn/' }, expectedRevision: campus.revision });
  for (const number of [1, 2]) await t.json('POST', '/api/manage/items', { kind: 'event', campusId: campus.id, data: { termId: campus.data.currentTermId, type: 'workshop', title: `W${number}`, status: 'tbd', legacyWorkshop: number, visible: true } });
  await t.publish([`campus:${campus.id}`]);
  const page = await t.text('/campuses/snu/program/');
  assert.match(page, /href="https:\/\/legacy.example\/learn\/"[^>]*>학습실에서 보기/);
  assert.match(page, /자료 상태 확인 중/);
  assert.match(await t.text('/campuses/snu/'), /수업 듣기/);
});
