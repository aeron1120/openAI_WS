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
  try {
    await db.createAttachment({ id, uploaderId: session.sid, path, mime, size: bytes.length, now: new Date(nowMs).toISOString() });
  } catch (error) {
    // 기록을 못 남기면 정리 대상에서도 빠지므로, 방금 올린 파일을 바로 지웁니다.
    await storage.remove([path]).catch(() => {});
    throw error;
  }
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
