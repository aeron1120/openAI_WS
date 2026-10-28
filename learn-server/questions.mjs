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
    // 이미지 하나의 주소를 못 만들어도 대화 전체는 보여줍니다(url: null).
    images: await Promise.all((m.attachments ?? []).map(async a => ({ id: a.id, url: await storage.signedUrl(a.path).catch(() => null) })))
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
    // 첫 메시지를 못 저장하면 질문만 남지 않도록 지웁니다(지우기 실패는 무시).
    try {
      await postMessage({ db, questionId, author: 'student', input, nowMs });
    } catch (error) {
      await db.deleteQuestion(questionId).catch(() => {});
      throw error;
    }
    // AI가 켜져 있으면 먼저 답합니다(지금은 꺼져 있어 항상 운영진에게 갑니다).
    const aiText = await ai.answer({ question: input.body, workshop, step });
    if (aiText) {
      await db.addMessage({ questionId, author: 'ai', body: aiText, now: iso(nowMs) });
      await db.updateQuestion(questionId, { status: 'ai_answered', updated_at: iso(nowMs) });
      return json({ question: { id: questionId, status: 'ai_answered' } }, 201);
    }
    // 메일은 기다리지 않습니다(실패해도 notify가 로그만 남김).
    notifier.questionWaiting({ questionId, workshop, step, email: session.email, body: input.body, followUp: false });
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
    if (data.status === 'escalated') notifier.questionWaiting({ questionId: row.id, workshop: row.workshop, step: row.step_id, email: session.email, body: summary(row).preview, followUp: true });
    return json({ question: { id: row.id, status: data.status } });
  }

  if (request.method !== 'POST') throw methodNotAllowed();
  sameOrigin(request, config.publicOrigin);
  const input = messageInput(await readJson(request));
  if (!limiter.messages(session.sid, nowMs)) throw new HttpError(429, 'TOO_MANY', '메시지는 1시간에 30개까지 보낼 수 있어요. 잠시 후 다시 보내 주세요.');
  await usableAttachments({ db, input, uploaderId: session.sid, nowMs });
  await postMessage({ db, questionId: row.id, author: 'student', input, nowMs });
  await db.updateQuestion(row.id, { status: 'escalated', updated_at: iso(nowMs) });
  // 이미 답변 대기 중인 질문에 덧붙인 경우에는 메일을 다시 보내지 않습니다.
  if (row.status !== 'escalated') notifier.questionWaiting({ questionId: row.id, workshop: row.workshop, step: row.step_id, email: session.email, body: input.body, followUp: true });
  return json({ question: { id: row.id, status: 'escalated' } }, 201);
}
