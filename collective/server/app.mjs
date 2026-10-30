// Student Collective 통합 사이트 + 중앙 관리. 표준 Request → Response 함수라 Cloudflare Pages 함수와 Node(로컬) 모두에서 돌아갑니다.
//   공개 페이지: 게시본(cms_active)만 읽어 서버에서 그립니다.
//   /manage/*: 관리자 화면(허용된 Google 계정만), /manage/preview/*: 초안 미리보기
//   /api/manage/*: 저장·업로드·게시·복원 API (세션 + Origin + CSRF 토큰 확인)
import { randomBytes, randomUUID } from 'node:crypto';
import { loadConfig } from './config.mjs';
import { HttpError, bytes, html, json, readBody, readCookie, readJson, redirect, safeEqual, setCookie } from './http.mjs';
import { sign, verify } from './session.mjs';
import { authUrl, exchangeCode, verifyIdToken, GoogleError } from './google.mjs';
import { CAMPUS_KINDS, KINDS, LISTED_STATUS, cleanData, emptyData } from './content.mjs';
import { buildCampusRelease, buildGlobalRelease, campusScope, diffSnapshots, GLOBAL_SCOPE } from './publish.mjs';
import { createLegacyStatus } from './legacy-snu.mjs';
import { checkUpload, cleanFilename, MAX_UPLOAD } from './media.mjs';
import { isVersionPublic } from './states.mjs';
import { ConflictError } from './store/errors.mjs';
import * as views from './views/public.mjs';
import * as admin from './views/manage.mjs';

const SESSION_COOKIE = '__Host-cms_session';
const OAUTH_COOKIE = '__Host-cms_oauth';
const SESSION_SECONDS = 8 * 60 * 60;
const OAUTH_SECONDS = 10 * 60;
const random = () => randomBytes(24).toString('base64url');
const newId = () => randomUUID();
const ID = /^[\w-]{1,64}$/;

export function createApp({ env, store, fetchImpl = fetch, now = () => Date.now(), legacyStatus = null }) {
  const config = loadConfig(env);
  const legacy = legacyStatus ?? createLegacyStatus({ origin: config.legacyOrigin, fetchImpl });
  const callbackUrl = `${config.publicOrigin}/manage/auth/callback`;
  const iso = () => new Date(now()).toISOString();

  // ---------- 세션 ----------
  function readSession(request) {
    const session = verify(readCookie(request, SESSION_COOKIE), config.sessionSecret, 'admin', Math.floor(now() / 1000));
    // 허용 목록에서 빠진 계정은 쿠키가 남아 있어도 바로 막습니다.
    return session && config.admins.has(session.email) ? session : null;
  }
  function startSession(identity) {
    const session = { kind: 'admin', email: identity.email, name: identity.name, csrf: random(), exp: Math.floor(now() / 1000) + SESSION_SECONDS };
    return setCookie(SESSION_COOKIE, sign(session, config.sessionSecret), SESSION_SECONDS);
  }
  // 쓰기 요청: 같은 출처에서 온 요청 + 화면에 심어 둔 CSRF 토큰이 맞아야 합니다.
  function checkWrite(request, session) {
    if (request.headers.get('origin') !== config.publicOrigin) throw new HttpError(403, 'ORIGIN_REJECTED', '이 사이트의 관리 화면에서 다시 시도해 주세요.');
    if (session && !safeEqual(request.headers.get('x-cms-csrf') ?? '', session.csrf)) throw new HttpError(403, 'CSRF_REJECTED', '화면을 새로고침한 뒤 다시 시도해 주세요.');
  }
  const safeNext = value => typeof value === 'string' && /^\/manage\/[\w\-./?=&%]*$/.test(value) && !value.includes('//') && !value.includes('..') ? value : '/manage/';

  // ---------- 공개 데이터 ----------
  async function siteContext({ preview = false } = {}) {
    let campuses;
    let home;
    if (preview) {
      const items = await store.listItems({ kind: 'campus' });
      campuses = [];
      for (const item of items) {
        const built = await buildCampusRelease(store, item.id, { mode: 'local' });
        if (built.snapshot && built.snapshot.campus.status !== 'archived') campuses.push(built.snapshot);
      }
      home = (await buildGlobalRelease(store)).snapshot?.home ?? null;
    } else {
      const active = await store.activeReleases();
      home = active.find(release => release.scope === GLOBAL_SCOPE)?.snapshot.home ?? null;
      campuses = active.filter(release => release.scope.startsWith('campus:')).map(release => release.snapshot)
        .filter(snapshot => LISTED_STATUS.has(snapshot.campus.status) && (config.mode === 'local' || !snapshot.campus.fixture));
    }
    campuses.sort((a, b) => a.campus.name.localeCompare(b.campus.name, 'ko'));
    const versions = new Map((await store.listItems({ kind: 'material_version' })).map(item => [item.id, item]));
    return { base: preview ? '/manage/preview' : '', preview, now: now(), origin: config.publicOrigin, siteName: config.siteName, home, campuses, versions, legacy: new Map() };
  }

  // 기존 SNU 학습실 회차의 열림 상태를 미리 읽어 둡니다(페이지를 그리는 중에는 기다리지 않도록).
  async function resolveLegacy(ctx, snapshot) {
    await Promise.all(snapshot.events.filter(event => event.legacyWorkshop).map(async event => {
      ctx.legacy.set(event.id, await legacy(event.legacyWorkshop, ctx.now));
    }));
  }

  async function publicMediaIds(ctx) {
    const ids = new Set();
    for (const release of await store.activeReleases()) for (const id of release.snapshot.media ?? []) ids.add(id);
    for (const version of ctx.versions.values()) if (version.data.mediaId && isVersionPublic(version, ctx.now)) ids.add(version.data.mediaId);
    return ids;
  }

  async function renderPublic(request, url, { preview = false, path }) {
    const ctx = await siteContext({ preview });
    const parts = path.split('/').filter(Boolean);
    const notFound = (options) => html(views.notFoundPage(ctx, options), 404, { noindex: true });
    if (parts.length === 0) return html(views.homePage(ctx));
    const [section, slug, sub, id, extra] = parts;
    if (section === 'campuses') {
      if (!slug) return html(views.campusesPage(ctx, url.searchParams.get('q') ?? ''));
      const snapshot = ctx.campuses.find(item => item.campus.slug === slug);
      if (!snapshot) return notFound({ campusMissing: true });
      // 학교 사이트가 따로 있는 학교(예: 기존 SNU 포털)는 공통 학교 공간 대신 그 사이트로 보냅니다.
      if (snapshot.campus.externalUrl) return redirect(snapshot.campus.externalUrl);
      if (extra) return notFound();
      await resolveLegacy(ctx, snapshot);
      if (!sub && !id) return html(views.campusHomePage(ctx, snapshot));
      if (sub === 'program' && !id) return html(views.programPage(ctx, snapshot));
      if (sub === 'projects' && !id) return html(views.campusProjectsPage(ctx, snapshot));
      if (sub === 'join' && !id) return html(views.joinPage(ctx, snapshot));
      if (sub === 'notices' && !id) return html(views.noticesPage(ctx, snapshot));
      if (sub === 'workshops' && id) {
        const event = snapshot.events.find(item => item.id === id);
        return event ? html(views.eventPage(ctx, snapshot, event)) : notFound();
      }
      if (sub === 'notices' && id) {
        const notice = snapshot.notices.find(item => item.id === id);
        return notice ? html(views.noticePage(ctx, snapshot, notice)) : notFound();
      }
      return notFound();
    }
    if (parts.length > 2) return notFound();
    if (section === 'events' && !slug) return html(views.eventsPage(ctx));
    if (section === 'about' && !slug) return html(views.aboutPage(ctx));
    if (section === 'projects' && !slug) return html(views.projectsPage(ctx));
    if (section === 'projects') {
      const found = views.allProjects(ctx).find(entry => entry.project.id === slug);
      return found ? html(views.projectPage(ctx, found.snapshot, found.project)) : notFound();
    }
    // 자료 본문: 자료 전체 공개 시각 전에는 누구도 받을 수 없습니다(미리보기의 관리자만 예외).
    if (section === 'materials' && slug) {
      const version = ctx.versions.get(slug);
      if (!version) return notFound();
      if (!preview && !isVersionPublic(version, ctx.now)) return html(views.scheduledMaterialPage(ctx), 404, { noindex: true });
      const material = await store.getItem(version.data.materialId);
      return html(views.materialPage(ctx, version, material));
    }
    return notFound();
  }

  async function serveMedia(request, id) {
    if (!ID.test(id)) return new Response('Not found', { status: 404 });
    const info = await store.getMediaInfo(id);
    if (!info) return new Response('Not found', { status: 404 });
    const ctx = await siteContext();
    const isPublic = (await publicMediaIds(ctx)).has(id);
    if (!isPublic && !readSession(request)) return new Response('Not found', { status: 404 });
    const body = await store.getMediaBytes(id);
    if (!body) return new Response('Not found', { status: 404 });
    return bytes(body, info.mime, { cache: isPublic ? 'public, max-age=300' : 'private, no-store', filename: info.filename || null });
  }

  async function sitemap() {
    const ctx = await siteContext();
    const paths = ['/', '/campuses/', '/events/', '/projects/', '/about/'];
    for (const snapshot of ctx.campuses) {
      paths.push(...snapshot.projects.map(project => `/projects/${project.id}/`));
      if (snapshot.campus.externalUrl) continue;
      const base = `/campuses/${snapshot.campus.slug}/`;
      paths.push(base, `${base}program/`, `${base}projects/`, `${base}join/`, ...snapshot.events.map(event => `${base}workshops/${event.id}/`), ...snapshot.notices.map(notice => `${base}notices/${notice.id}/`));
    }
    const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map(path => `<url><loc>${config.publicOrigin}${path}</loc></url>`).join('')}</urlset>`;
    return new Response(body, { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'no-store' } });
  }

  // ---------- 로그인 ----------
  async function startGoogle(url) {
    const state = random();
    const nonce = random();
    const next = safeNext(url.searchParams.get('next'));
    const cookie = sign({ kind: 'oauth', state, nonce, next, exp: Math.floor(now() / 1000) + OAUTH_SECONDS }, config.sessionSecret);
    const hint = config.admins.size === 1 ? [...config.admins][0] : undefined;
    return redirect(authUrl({ clientId: config.google.clientId, redirectUri: callbackUrl, state, nonce, loginHint: hint }), [setCookie(OAUTH_COOKIE, cookie, OAUTH_SECONDS)]);
  }

  async function finishGoogle(request, url) {
    const fail = reason => redirect(`/manage/login/?error=${reason}`, [setCookie(OAUTH_COOKIE, '', 0)]);
    const oauth = verify(readCookie(request, OAUTH_COOKIE), config.sessionSecret, 'oauth', Math.floor(now() / 1000));
    if (!oauth) return fail('expired');
    // state를 먼저 확인해야 바깥 링크로 로그인을 끼워 넣을 수 없습니다.
    if (!safeEqual(url.searchParams.get('state') ?? '', oauth.state)) return fail('failed');
    const code = url.searchParams.get('code');
    if (!code) return fail(url.searchParams.get('error') === 'access_denied' ? 'cancelled' : 'failed');
    let identity;
    try {
      const token = await exchangeCode({ code, clientId: config.google.clientId, clientSecret: config.google.clientSecret, redirectUri: callbackUrl, fetchImpl });
      identity = await verifyIdToken(token, { clientId: config.google.clientId, nonce: oauth.nonce, admins: config.admins, fetchImpl, nowMs: now() });
    } catch (error) {
      return fail(error instanceof GoogleError ? error.reason : 'failed');
    }
    await store.addAudit({ actor: identity.email, action: 'login', now: iso() }).catch(() => {});
    return redirect(oauth.next, [startSession(identity), setCookie(OAUTH_COOKIE, '', 0)]);
  }

  // ---------- 관리 API ----------
  async function campusOf(id) {
    const item = await store.getItem(id);
    return item?.kind === 'campus' ? item : null;
  }

  // 다른 항목을 가리키는 값(학기, 자료 버전, 추천 대상)이 실제로 있고 범위가 맞는지 서버에서 확인합니다.
  async function checkRefs(kind, data, campusId) {
    const fail = (field, message) => { throw new HttpError(422, 'INVALID', message, { field }); };
    for (const field of KINDS[kind].fields) {
      const value = data[field.name];
      if (field.type === 'ref' && value) {
        const target = await store.getItem(value);
        if (!target || target.kind !== field.refKind || (field.sameCampus && target.campusId !== campusId)) fail(field.name, `${field.label}을 다시 골라 주세요.`);
      }
      if (field.type === 'refs') {
        for (const id of value) {
          const target = await store.getItem(id);
          if (!target || target.kind !== field.refKind) fail(field.name, `${field.label}에 없는 항목이 있어요.`);
        }
      }
      if (field.type === 'media' && value && !(await store.getMediaInfo(value))) fail(field.name, '올린 파일을 찾을 수 없어요. 다시 올려 주세요.');
      if (field.type === 'materials') {
        for (const link of value) {
          const version = await store.getItem(link.versionId);
          if (!version || version.kind !== 'material_version') fail(field.name, '연결한 자료 버전을 찾을 수 없어요.');
          if (link.exposeAt && Date.parse(link.exposeAt) < Date.parse(version.data.publicAt)) fail(field.name, '학교 화면 노출 시점은 자료 전체 공개 시점보다 빠를 수 없어요.');
        }
      }
    }
    if (kind === 'campus') {
      const others = (await store.listItems({ kind: 'campus' })).filter(item => item.id !== campusId);
      if (others.some(item => item.data.slug === data.slug)) fail('slug', '이미 쓰고 있는 주소 이름이에요.');
    }
  }

  async function createItem(body, session) {
    const kind = String(body.kind ?? '');
    if (!KINDS[kind]) throw new HttpError(400, 'INVALID_KIND', '알 수 없는 콘텐츠 종류예요.');
    let campusId = null;
    let id = newId();
    if (CAMPUS_KINDS.includes(kind)) {
      if (!(await campusOf(String(body.campusId ?? '')))) throw new HttpError(422, 'INVALID', '학교를 다시 골라 주세요.');
      campusId = String(body.campusId);
    } else if (kind === 'campus') {
      campusId = id;
    } else if (kind === 'home') {
      id = 'home';
    }
    const data = cleanData(kind, body.data);
    await checkRefs(kind, data, campusId);
    try {
      const item = await store.createItem({ id, kind, campusId, data, actor: session.email, now: iso() });
      await store.addAudit({ actor: session.email, action: 'create', scope: campusId ? campusScope(campusId) : GLOBAL_SCOPE, target: id, summary: { kind, title: data.title ?? data.name ?? data.version ?? '' }, now: iso() });
      return item;
    } catch (error) {
      if (error instanceof ConflictError) throw new HttpError(409, 'EXISTS', '이미 있는 항목이에요. 화면을 새로고침해 주세요.');
      throw error;
    }
  }

  async function updateItem(id, body, session) {
    const item = await store.getItem(id);
    if (!item) throw new HttpError(404, 'NOT_FOUND', '항목을 찾을 수 없어요.');
    if (!Number.isInteger(body.expectedRevision)) throw new HttpError(400, 'INVALID_REQUEST', '화면을 새로고침한 뒤 다시 저장해 주세요.');
    const locked = item.kind === 'material_version';
    const data = cleanData(item.kind, body.data, { existing: locked ? item.data : null });
    // 한 번 전체 공개된 자료의 공개 시각은 바꾸지 않습니다(이미 받은 사람이 있으므로 비공개처럼 되돌릴 수 없음).
    if (locked && data.publicAt !== item.data.publicAt && Date.parse(item.data.publicAt) <= now()) throw new HttpError(422, 'INVALID', '이미 전체 공개된 자료라 공개 시각을 바꿀 수 없어요. 새 버전을 만들어 주세요.', { field: 'publicAt' });
    await checkRefs(item.kind, data, item.campusId);
    try {
      const saved = await store.updateItem({ id, data, expectedRevision: body.expectedRevision, actor: session.email, now: iso() });
      if (!saved) throw new HttpError(404, 'NOT_FOUND', '항목을 찾을 수 없어요.');
      await store.addAudit({ actor: session.email, action: 'save', scope: item.campusId ? campusScope(item.campusId) : GLOBAL_SCOPE, target: id, summary: { kind: item.kind, title: data.title ?? data.name ?? data.version ?? '', revision: saved.revision }, now: iso() });
      return saved;
    } catch (error) {
      if (error instanceof ConflictError) throw new HttpError(409, 'CONFLICT', '다른 탭이나 화면에서 먼저 저장했어요. 입력한 내용은 그대로 두었어요. 최신 내용을 확인한 뒤 다시 저장해 주세요.', { current: error.detail.current });
      throw error;
    }
  }

  // 학교 추가: 기본 구성(화면·빈 콘텐츠 구조 + 선택한 공통 자료 연결)만 만듭니다.
  // 학생·진도·질문·첨부와 원본 학교의 신청 폼·채팅방·연락처, 날짜·장소·신청 링크는 복사하지 않습니다.
  async function createCampus(body, session) {
    const campusData = cleanData('campus', { ...emptyData('campus'), name: body.name, slug: body.slug, shortName: body.shortName, intro: body.intro, fixture: body.fixture === true, status: 'draft', learningMode: 'none' });
    const termData = cleanData('term', { name: body.termName });
    const campusId = newId();
    await checkRefs('campus', campusData, campusId);
    let template = [];
    if (body.templateCampusId) {
      const source = await campusOf(String(body.templateCampusId));
      if (!source) throw new HttpError(422, 'INVALID', '기본 구성을 가져올 학교를 다시 골라 주세요.', { field: 'templateCampusId' });
      const events = (await store.listItems({ kind: 'event', campusId: source.id })).filter(item => !source.data.currentTermId || item.data.termId === source.data.currentTermId);
      template = events.map(item => ({
        ...emptyData('event'),
        type: item.data.type, title: item.data.title, order: item.data.order, summary: item.data.summary, goal: item.data.goal, body: item.data.body,
        audience: item.data.audience, prepare: item.data.prepare,
        materials: item.data.materials.map(link => ({ versionId: link.versionId, exposeAt: null, note: link.note })),
        status: 'tbd', visible: true
      }));
    }
    const at = iso();
    await store.createItem({ id: campusId, kind: 'campus', campusId, data: campusData, actor: session.email, now: at });
    const term = await store.createItem({ id: newId(), kind: 'term', campusId, data: termData, actor: session.email, now: at });
    await store.updateItem({ id: campusId, data: { ...campusData, currentTermId: term.id }, expectedRevision: 1, actor: session.email, now: at });
    for (const data of template) await store.createItem({ id: newId(), kind: 'event', campusId, data: { ...data, termId: term.id }, actor: session.email, now: at });
    await store.addAudit({ actor: session.email, action: 'create_campus', scope: campusScope(campusId), target: campusId, summary: { name: campusData.name, slug: campusData.slug, templateEvents: template.length }, now: at });
    return { id: campusId };
  }

  async function buildScope(scope) {
    if (scope === GLOBAL_SCOPE) return buildGlobalRelease(store);
    if (scope.startsWith('campus:')) return buildCampusRelease(store, scope.slice(7), { mode: config.mode });
    throw new HttpError(400, 'INVALID_SCOPE', '게시 대상을 다시 골라 주세요.');
  }

  // 게시 계획: 선택한 대상마다 검증 결과와 지금 공개본과의 차이를 돌려줍니다. 아무것도 저장하지 않아요.
  async function publishPlan(scopes) {
    const active = new Map((await store.activeReleases()).map(release => [release.scope, release]));
    const plan = [];
    for (const scope of scopes) {
      const built = await buildScope(scope);
      const current = active.get(scope);
      plan.push({
        scope,
        label: scope === GLOBAL_SCOPE ? '통합 메인' : built.snapshot?.campus.name ?? scope,
        problems: built.problems,
        diff: built.snapshot ? diffSnapshots(current?.snapshot ?? null, built.snapshot) : null,
        currentNumber: current?.number ?? null,
        itemRevisions: built.itemRevisions ?? {}
      });
    }
    return plan;
  }

  function parseScopes(list) {
    if (!Array.isArray(list) || !list.length || list.length > 30) throw new HttpError(400, 'INVALID_SCOPE', '게시할 대상을 하나 이상 골라 주세요.');
    const scopes = [...new Set(list.map(String))];
    if (scopes.some(scope => scope !== GLOBAL_SCOPE && !/^campus:[\w-]{1,64}$/.test(scope))) throw new HttpError(400, 'INVALID_SCOPE', '게시 대상을 다시 골라 주세요.');
    return scopes;
  }

  // 게시: 선택한 대상을 모두 다시 검증하고, 관리자가 확인한 revision과 같을 때만 한 번에 반영합니다(하나라도 실패하면 전부 취소).
  async function publish(body, session) {
    const requestId = String(body.requestId ?? '');
    if (!/^[\w-]{8,80}$/.test(requestId)) throw new HttpError(400, 'INVALID_REQUEST', '화면을 새로고침한 뒤 다시 게시해 주세요.');
    const scopes = parseScopes(body.scopes);
    const reviewed = body.revisions && typeof body.revisions === 'object' ? body.revisions : {};
    const entries = [];
    const problems = [];
    for (const scope of scopes) {
      const built = await buildScope(scope);
      problems.push(...built.problems);
      if (!built.snapshot) continue;
      // 게시는 초안의 revision을 바꾸지 않으므로, 같은 요청을 다시 보내면 여기를 통과하고 store.publish가 처음 결과를 돌려줍니다.
      if (JSON.stringify(sortKeys(built.itemRevisions)) !== JSON.stringify(sortKeys(reviewed[scope] ?? {}))) {
        throw new HttpError(409, 'PLAN_CHANGED', '게시 내용을 확인한 뒤에 바뀐 항목이 있어요. 변경 요약을 다시 확인해 주세요.');
      }
      const active = (await store.activeReleases()).find(release => release.scope === scope);
      entries.push({ scope, snapshot: built.snapshot, itemRevisions: built.itemRevisions, summary: { lines: diffSnapshots(active?.snapshot ?? null, built.snapshot).lines.slice(0, 8), label: scope === GLOBAL_SCOPE ? '통합 메인' : built.snapshot.campus.name } });
    }
    if (problems.length) throw new HttpError(422, 'PUBLISH_BLOCKED', '게시하기 전에 고칠 내용이 있어요.', { problems });
    try {
      return await store.publish({ requestId, actor: session.email, entries, now: iso() });
    } catch (error) {
      if (error instanceof ConflictError) throw new HttpError(409, 'PLAN_CHANGED', '게시 직전에 바뀐 항목이 있어 아무것도 게시하지 않았어요. 변경 요약을 다시 확인해 주세요.');
      throw error;
    }
  }

  // 복원: 이전 게시본을 새 게시 이력으로 다시 게시합니다. 초안과 파일은 지우지 않아요.
  async function restore(body, session) {
    const requestId = String(body.requestId ?? '');
    if (!/^[\w-]{8,80}$/.test(requestId)) throw new HttpError(400, 'INVALID_REQUEST', '화면을 새로고침한 뒤 다시 시도해 주세요.');
    const release = await store.getRelease(String(body.releaseId ?? ''));
    if (!release) throw new HttpError(404, 'NOT_FOUND', '게시본을 찾을 수 없어요.');
    const entry = { scope: release.scope, snapshot: release.snapshot, itemRevisions: {}, kind: 'restore', restoredFrom: release.id, summary: { lines: [`${release.number}번 게시본으로 되돌림`], label: release.summary?.label ?? release.scope } };
    return store.publish({ requestId, actor: session.email, entries: [entry], now: iso() });
  }

  async function uploadMedia(request, session) {
    const body = await readBody(request, MAX_UPLOAD + 1, 'PDF는 25MB, 이미지는 10MB까지 올릴 수 있어요.');
    const declared = (request.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
    const checked = checkUpload(body, declared === 'application/octet-stream' ? null : declared);
    if (checked.error) throw new HttpError(415, 'INVALID_FILE', checked.error);
    const filename = cleanFilename(decodeURIComponent(request.headers.get('x-filename') ?? ''));
    const media = await store.putMedia({ id: newId(), bytes: body, mime: checked.mime, size: checked.size, sha256: checked.sha256, filename, actor: session.email, now: iso() });
    await store.addAudit({ actor: session.email, action: 'upload', target: media.id, summary: { filename, mime: checked.mime, size: checked.size }, now: iso() });
    return media;
  }

  async function handleApi(request, url, session) {
    const parts = url.pathname.split('/').filter(Boolean).slice(2); // api/manage/...
    const method = request.method;
    if (method !== 'GET') checkWrite(request, session);
    const [first, second] = parts;
    if (first === 'items' && !second && method === 'POST') return json({ item: await createItem(await readJson(request), session) }, 201);
    if (first === 'items' && second && ID.test(second) && method === 'GET') {
      const item = await store.getItem(second);
      return item ? json({ item }) : json({ error: 'NOT_FOUND', message: '항목을 찾을 수 없어요.' }, 404);
    }
    if (first === 'items' && second && ID.test(second) && method === 'PUT') return json({ item: await updateItem(second, await readJson(request), session) });
    if (first === 'campuses' && method === 'POST') return json(await createCampus(await readJson(request), session), 201);
    if (first === 'media' && method === 'POST') return json({ media: await uploadMedia(request, session) }, 201);
    if (first === 'publish' && second === 'plan' && method === 'POST') return json({ plan: await publishPlan(parseScopes((await readJson(request)).scopes)) });
    if (first === 'publish' && !second && method === 'POST') return json(await publish(await readJson(request), session));
    if (first === 'restore' && method === 'POST') return json(await restore(await readJson(request), session));
    if (first === 'session' && method === 'GET') return json({ user: { email: session.email, name: session.name } });
    throw new HttpError(404, 'NOT_FOUND', '없는 요청이에요.');
  }

  // ---------- 관리 화면 ----------
  async function handleManage(request, url, session) {
    const path = url.pathname;
    const parts = path.split('/').filter(Boolean).slice(1);
    const page = (body, status = 200) => html(body, status, { noindex: true });
    const actx = { session, mode: config.mode, origin: config.publicOrigin, legacyOrigin: config.legacyOrigin, now: now(), store, path };
    const [section, id, sub] = parts;
    if (!section) return page(await admin.dashboard(actx));
    if (section === 'campuses' && !id) return page(await admin.campusList(actx));
    if (section === 'campuses' && id) {
      const campus = await campusOf(id);
      return campus ? page(await admin.campusDetail(actx, campus)) : page(await admin.notFound(actx), 404);
    }
    if (section === 'items' && id) {
      const item = ID.test(id) ? await store.getItem(id) : null;
      return item ? page(await admin.itemEditor(actx, item)) : page(await admin.notFound(actx), 404);
    }
    if (section === 'new' && id && KINDS[id] && id !== 'campus') {
      const campusId = url.searchParams.get('campus');
      if (CAMPUS_KINDS.includes(id) && !(campusId && await campusOf(campusId))) return page(await admin.notFound(actx), 404);
      if (id === 'home' && await store.getItem('home')) return redirect('/manage/home/');
      const preset = id === 'material_version' && ID.test(url.searchParams.get('material') ?? '') ? { materialId: url.searchParams.get('material') } : {};
      return page(await admin.itemCreator(actx, id, CAMPUS_KINDS.includes(id) ? campusId : null, preset));
    }
    if (section === 'home') {
      const home = await store.getItem('home');
      return home ? page(await admin.itemEditor(actx, home)) : redirect('/manage/new/home/');
    }
    if (section === 'materials') return page(await admin.materials(actx));
    if (section === 'publish') return page(await admin.publishPage(actx, url.searchParams.getAll('scope')));
    if (section === 'history') return page(await admin.history(actx));
    if (section === 'learning') return page(await admin.learning(actx));
    if (section === 'media') return page(await admin.mediaLibrary(actx));
    return page(await admin.notFound(actx), 404);
  }

  return async function handle(request) {
    const url = new URL(request.url);
    const path = url.pathname;
    try {
      if (path === '/healthz') return json({ ok: true, configured: config.ok, mode: config.mode, store: store?.kind ?? null });
      if (!config.ok || !store) {
        if (path.startsWith('/api/')) throw new HttpError(503, 'NOT_CONFIGURED', '서버를 준비하고 있어요.');
        return html(admin.notConfigured(config), 503, { noindex: true });
      }
      if (path === '/robots.txt') return new Response(`User-agent: *\nDisallow: /manage/\nDisallow: /api/\nDisallow: /materials/\nSitemap: ${config.publicOrigin}/sitemap.xml\n`, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
      if (path === '/sitemap.xml') return await sitemap();
      if (path.startsWith('/media/')) return await serveMedia(request, path.slice(7).replace(/\/$/, ''));

      // 관리 API
      if (path.startsWith('/api/manage/')) {
        const session = readSession(request);
        if (!session) throw new HttpError(401, 'LOGIN_REQUIRED', '다시 로그인해 주세요.');
        return await handleApi(request, url, session);
      }
      if (path.startsWith('/api/')) throw new HttpError(404, 'NOT_FOUND', '없는 요청이에요.');

      // 폴더 주소는 / 로 끝나게 맞춥니다.
      const last = path.split('/').pop();
      if (last && !last.includes('.') && (request.method === 'GET' || request.method === 'HEAD')) {
        url.pathname += '/';
        return redirect(url.pathname + url.search, [], 308);
      }

      // 관리자 로그인
      if (path === '/manage/login/' && request.method === 'GET') return html(admin.loginPage(config, url.searchParams.get('error'), safeNext(url.searchParams.get('next'))), 200, { noindex: true });
      if (path === '/manage/auth/google/' && request.method === 'GET') {
        if (config.mode === 'local') return redirect('/manage/login/');
        return await startGoogle(url);
      }
      if (path === '/manage/auth/callback/' && request.method === 'GET') return await finishGoogle(request, url);
      if (path === '/manage/auth/dev/' && request.method === 'POST') {
        // 로컬 모드 + localhost 주소에서만 열리는 개발용 로그인. 운영 모드에서는 404입니다.
        if (config.mode !== 'local' || !['localhost', '127.0.0.1'].includes(url.hostname)) throw new HttpError(404, 'NOT_FOUND', '없는 요청이에요.');
        checkWrite(request, null);
        const email = [...config.admins][0];
        return redirect('/manage/', [startSession({ email, name: `${email} (로컬)` })], 303);
      }
      if (path === '/manage/logout/' && request.method === 'POST') {
        checkWrite(request, null);
        return redirect('/manage/login/?error=logged_out', [setCookie(SESSION_COOKIE, '', 0)], 303);
      }

      if (path === '/manage/' || path.startsWith('/manage/')) {
        if (request.method !== 'GET' && request.method !== 'HEAD') throw new HttpError(405, 'METHOD', '지원하지 않는 요청이에요.');
        const session = readSession(request);
        if (!session) return redirect(`/manage/login/?next=${encodeURIComponent(path + url.search)}`);
        if (path.startsWith('/manage/preview/')) return await renderPublic(request, url, { preview: true, path: path.slice('/manage/preview'.length) });
        return await handleManage(request, url, session);
      }

      if (request.method !== 'GET' && request.method !== 'HEAD') throw new HttpError(405, 'METHOD', '지원하지 않는 요청이에요.');
      return await renderPublic(request, url, { path });
    } catch (error) {
      if (error instanceof HttpError) {
        if (path.startsWith('/api/')) return json({ error: error.code, message: error.message, ...error.extra }, error.status);
        return new Response(error.message, { status: error.status, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } });
      }
      console.error('collective: request failed', path, error?.message);
      if (path.startsWith('/api/')) return json({ error: 'SERVER_ERROR', message: '서버가 잠시 응답하지 못했어요. 입력한 내용은 그대로 있어요. 잠시 후 다시 시도해 주세요.' }, 500);
      return html(admin.serverError(), 500, { noindex: true });
    }
  };
}

function sortKeys(object) {
  return Object.fromEntries(Object.entries(object).sort(([a], [b]) => a.localeCompare(b)));
}
