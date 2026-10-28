// 수업 시스템 API. 포털(Cloudflare Pages)이 /api/*를 x-proxy-secret 헤더와 함께 전달합니다.
// 1단계: 상태 확인, SNU Google 로그인, 내 정보, 로그아웃.
import { randomBytes, randomUUID } from 'node:crypto';
import { loadConfig } from './config.mjs';
import { HttpError, json, readCookie, redirect, safeEqual, sameOrigin, setCookie } from './http.mjs';
import { sign, verify } from './session.mjs';
import { authUrl, exchangeCode, verifyIdToken, GoogleError } from './google.mjs';
import { supabaseClient } from './supabase.mjs';
import { handleProgress } from './progress.mjs';
import { storageClient } from './storage.mjs';
import { createNotifier } from './notify.mjs';
import { createAi } from './ai.mjs';
import { createLimiter } from './limits.mjs';
import { handleQuestions } from './questions.mjs';
import { handleAdmin } from './admin.mjs';
import { cleanupAttachments, handleUpload } from './uploads.mjs';

const SESSION_COOKIE = '__Host-learn_session';
const OAUTH_COOKIE = '__Host-learn_oauth';
const SESSION_SECONDS = 14 * 24 * 60 * 60;
const OAUTH_SECONDS = 10 * 60;
// 로그인 후 돌아갈 곳: /learn/… 또는 /admin/… 폴더 주소만
const NEXT_PATH = /^\/(?:learn|admin)\/(?:[A-Za-z0-9_-]+\/)*$/;

export function createApp({ env, fetchImpl = fetch, now = Date.now, random = () => randomBytes(24).toString('base64url'), newId = randomUUID, db: givenDb, storage: givenStorage, notifier: givenNotifier, ai: givenAi }) {
  const config = loadConfig(env);
  const db = givenDb ?? (config.ok ? supabaseClient({ ...config.supabase, fetchImpl }) : null);
  const storage = givenStorage ?? (config.ok ? storageClient({ ...config.supabase, fetchImpl }) : null);
  const notifier = givenNotifier ?? createNotifier({ ...config.notify, publicOrigin: config.publicOrigin, fetchImpl });
  const ai = givenAi ?? createAi({ provider: config.aiProvider });
  const callbackUrl = `${config.publicOrigin}/api/auth/google/callback`;
  const HOUR = 60 * 60 * 1000;
  const limiter = {
    questions: createLimiter({ limit: 10, windowMs: HOUR }),
    messages: createLimiter({ limit: 30, windowMs: HOUR }),
    uploads: createLimiter({ limit: 30, windowMs: HOUR })
  };

  function currentSession(request, seconds) {
    return verify(readCookie(request, SESSION_COOKIE), config.sessionSecret, 'session', seconds);
  }

  function requireSession(request, seconds) {
    const session = currentSession(request, seconds);
    if (!session) throw new HttpError(401, 'LOGIN_REQUIRED', '서울대 계정으로 로그인해 주세요.');
    return session;
  }

  function startLogin(url, seconds) {
    const requested = url.searchParams.get('next') ?? '';
    const next = NEXT_PATH.test(requested) ? requested : '/learn/';
    const state = random();
    const nonce = random();
    const cookie = sign({ kind: 'oauth', state, nonce, next, exp: seconds + OAUTH_SECONDS }, config.sessionSecret);
    return redirect(authUrl({ clientId: config.google.clientId, redirectUri: callbackUrl, state, nonce }), [setCookie(OAUTH_COOKIE, cookie, OAUTH_SECONDS)]);
  }

  async function finishLogin(request, url, seconds) {
    const fail = reason => redirect(`${config.publicOrigin}/learn/?error=${reason}`, [setCookie(OAUTH_COOKIE, '', 0)]);
    const oauth = verify(readCookie(request, OAUTH_COOKIE), config.sessionSecret, 'oauth', seconds);
    if (!oauth) return fail('expired');
    // state를 먼저 확인해야 바깥 링크로 로그인을 취소시킬 수 없습니다.
    if (!safeEqual(url.searchParams.get('state') ?? '', oauth.state)) return fail('failed');
    if (url.searchParams.has('error')) return fail(url.searchParams.get('error') === 'access_denied' ? 'cancelled' : 'failed');
    const code = url.searchParams.get('code');
    if (!code) return fail('failed');
    let identity;
    try {
      const token = await exchangeCode({ code, clientId: config.google.clientId, clientSecret: config.google.clientSecret, redirectUri: callbackUrl, fetchImpl });
      identity = await verifyIdToken(token, { clientId: config.google.clientId, nonce: oauth.nonce, fetchImpl, nowMs: now() });
    } catch (error) {
      return fail(error instanceof GoogleError ? error.reason : 'failed');
    }
    let student;
    try {
      student = await db.upsertStudent({ googleSub: identity.sub, email: identity.email, name: identity.name, now: new Date(now()).toISOString() });
    } catch (error) {
      console.error('learn-server: student upsert failed', error.message);
      return fail('failed');
    }
    const session = sign({ kind: 'session', sid: student.id, email: identity.email, name: identity.name, exp: seconds + SESSION_SECONDS }, config.sessionSecret);
    return redirect(config.publicOrigin + oauth.next, [setCookie(SESSION_COOKIE, session, SESSION_SECONDS), setCookie(OAUTH_COOKIE, '', 0)]);
  }

  async function handle(request) {
    const url = new URL(request.url);
    const seconds = Math.floor(now() / 1000);
    try {
      if (url.pathname === '/api/health') {
        // 열린 회차 번호도 알려줘서, 로그인 없이 WORKSHOP_OPEN_AT 반영 여부를 확인할 수 있게 합니다.
        const openWorkshops = [...config.workshopOpenAt].filter(([, at]) => now() >= at).map(([number]) => number).sort((a, b) => a - b);
        // Render가 넣어 주는 배포 커밋 앞 7자리. 새 버전이 올라갔는지 밖에서 확인할 때 씁니다.
        const commit = typeof env.RENDER_GIT_COMMIT === 'string' ? env.RENDER_GIT_COMMIT.slice(0, 7) : null;
        return json({ ok: true, configured: config.ok, openWorkshops, commit });
      }
      if (!config.ok) throw new HttpError(503, 'LEARN_NOT_CONFIGURED', '수업 서버를 준비하고 있어요.');
      if (!safeEqual(request.headers.get('x-proxy-secret') ?? '', config.proxySecret)) throw new HttpError(403, 'DIRECT_ACCESS', '포털 주소로 접속해 주세요.');
      if (url.pathname === '/api/progress' || url.pathname.startsWith('/api/progress/')) {
        return await handleProgress({ request, url, session: requireSession(request, seconds), config, db, nowMs: now() });
      }
      if (url.pathname === '/api/uploads') {
        return await handleUpload({ request, session: requireSession(request, seconds), config, db, storage, limiter, nowMs: now(), newId });
      }
      if (url.pathname === '/api/questions' || url.pathname.startsWith('/api/questions/')) {
        return await handleQuestions({ request, url, session: requireSession(request, seconds), config, db, storage, notifier, ai, limiter, nowMs: now() });
      }
      if (url.pathname.startsWith('/api/admin/')) {
        return await handleAdmin({ request, url, session: requireSession(request, seconds), config, db, storage, nowMs: now() });
      }
      switch (`${request.method} ${url.pathname}`) {
        case 'GET /api/auth/google':
          return startLogin(url, seconds);
        case 'GET /api/auth/google/callback':
          return await finishLogin(request, url, seconds);
        case 'GET /api/me': {
          const session = requireSession(request, seconds);
          return json({ user: { email: session.email, name: session.name, operator: config.operators.has(session.email) } });
        }
        case 'DELETE /api/session':
          sameOrigin(request, config.publicOrigin);
          return json({ user: null }, 200, [setCookie(SESSION_COOKIE, '', 0)]);
        default:
          throw new HttpError(404, 'NOT_FOUND', '찾을 수 없는 요청입니다.');
      }
    } catch (error) {
      if (error instanceof HttpError) return json({ error: error.code, message: error.message }, error.status);
      console.error('learn-server: unexpected error', error?.message);
      return json({ error: 'SERVER_ERROR', message: '잠시 후 다시 시도해 주세요.' }, 500);
    }
  }
  handle.cleanup = () => cleanupAttachments({ db, storage, nowMs: now() });
  return handle;
}
