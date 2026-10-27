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
