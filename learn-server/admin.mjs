// 운영진 API: 질문 목록·상세·답변·상태 변경, 단계별 완료 학생 수. OPERATOR_EMAILS에 있는 계정만 씁니다.
import { HttpError, json, readJson, sameOrigin } from './http.mjs';
import { UUID, messageInput, postMessage, questionView, summary, usableAttachments } from './questions.mjs';

const STATUSES = ['ai_answered', 'escalated', 'answered', 'resolved'];
const OPERATOR_SETS = ['escalated', 'answered', 'resolved'];
const PATH = /^\/api\/admin\/questions\/([^/]+)(\/messages)?$/;
const bad = message => new HttpError(400, 'INVALID_REQUEST', message);
const methodNotAllowed = () => new HttpError(405, 'METHOD_NOT_ALLOWED', '지원하지 않는 요청입니다.');
const iso = ms => new Date(ms).toISOString();

export async function handleAdmin({ request, url, session, config, db, storage, notifier, nowMs }) {
  if (!config.operators.has(session.email)) throw new HttpError(403, 'OPERATOR_ONLY', '운영진만 쓸 수 있어요.');

  // 알림 메일 시험: 보낸 결과나 실패 이유를 그대로 돌려줍니다.
  if (url.pathname === '/api/admin/notify-test') {
    if (request.method !== 'POST') throw methodNotAllowed();
    sameOrigin(request, config.publicOrigin);
    return json(await notifier.test());
  }

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
    if (workshop !== null && (!Number.isInteger(workshop) || workshop < 1)) throw bad('회차 값을 확인해 주세요.');
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
  await postMessage({ db, questionId: row.id, author: 'operator', operatorEmail: session.email, uploaderId: session.sid, input, nowMs });
  await db.updateQuestion(row.id, { status: 'answered', updated_at: iso(nowMs) });
  return json({ question: { id: row.id, status: 'answered' } }, 201);
}
