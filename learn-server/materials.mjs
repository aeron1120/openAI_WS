// 자료 공개 설정은 DB에 저장합니다. 저장값이 없는 회차만 WORKSHOP_OPEN_AT을 기본값으로 씁니다.
import { HttpError, json, readJson, sameOrigin } from './http.mjs';

const unavailable = () => new HttpError(503, 'MATERIALS_UNAVAILABLE', '자료 공개 설정을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');

export async function materialSettings(config, db, nowMs) {
  let rows;
  try { rows = await db.listMaterialSettings(); } catch { throw unavailable(); }
  const saved = new Map(rows.map(row => [row.workshop, row]));
  return [...config.workshopOpenAt].map(([workshop, at]) => {
    const row = saved.get(workshop);
    const mode = row?.mode ?? 'scheduled';
    const opensAt = row ? row.opens_at : new Date(at).toISOString();
    return {
      workshop, mode, opensAt,
      open: mode === 'open' || (mode === 'scheduled' && nowMs >= Date.parse(opensAt)),
      updatedAt: row?.updated_at ?? null, updatedBy: row?.updated_by ?? null
    };
  }).sort((a, b) => a.workshop - b.workshop);
}

// 공개 응답에는 운영진 이메일·수정 기록을 담지 않습니다.
export const publicMaterials = materials => materials.map(({ workshop, mode, opensAt, open }) => ({ workshop, mode, opensAt, open }));

function validTime(value) {
  if (typeof value !== 'string') return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/.exec(value);
  if (!match || !Number.isFinite(Date.parse(value))) return false;
  const [, year, month, day, hour, minute, second] = match.map(Number);
  return year >= 2000 && month >= 1 && month <= 12 && day >= 1
    && day <= new Date(Date.UTC(year, month, 0)).getUTCDate() && hour < 24 && minute < 60 && second < 60;
}

export async function handleMaterials({ request, url, session, config, db, nowMs }) {
  if (url.pathname === '/api/admin/materials') {
    if (request.method !== 'GET') throw new HttpError(405, 'METHOD_NOT_ALLOWED', '지원하지 않는 요청입니다.');
    return json({ materials: await materialSettings(config, db, nowMs) });
  }
  const match = /^\/api\/admin\/materials\/([1-9]\d?)$/.exec(url.pathname);
  const workshop = Number(match?.[1]);
  if (!match || !config.workshopOpenAt.has(workshop)) throw new HttpError(404, 'NOT_FOUND', '등록되지 않은 회차예요.');
  if (request.method !== 'PUT') throw new HttpError(405, 'METHOD_NOT_ALLOWED', '지원하지 않는 요청입니다.');
  sameOrigin(request, config.publicOrigin);
  const input = await readJson(request);
  if (!['scheduled', 'open', 'closed'].includes(input.mode)) throw new HttpError(400, 'INVALID_REQUEST', '예약 공개, 즉시 공개, 비공개 중에서 골라 주세요.');
  if (input.mode === 'scheduled' && !validTime(input.opensAt)) throw new HttpError(400, 'INVALID_REQUEST', '공개 날짜와 시간을 확인해 주세요. 시간대도 필요해요.');
  const setting = {
    workshop, mode: input.mode, opens_at: input.mode === 'scheduled' ? new Date(input.opensAt).toISOString() : null,
    updated_at: new Date(nowMs).toISOString(), updated_by: session.email
  };
  try { await db.saveMaterialSetting(setting); }
  catch { throw new HttpError(503, 'MATERIALS_UNAVAILABLE', '자료 공개 설정을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.'); }
  return json({ materials: await materialSettings(config, db, nowMs) });
}
