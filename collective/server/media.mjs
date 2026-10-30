// 업로드 파일 확인: 브라우저가 알려준 형식이 아니라 파일 앞부분(매직 바이트)으로 실제 형식을 확인합니다.
// 이미지 10MB, PDF 25MB까지. SVG·HTML 등 스크립트를 담을 수 있는 형식은 받지 않습니다.
import { createHash } from 'node:crypto';

export const LIMITS = { image: 10 * 1024 * 1024, pdf: 25 * 1024 * 1024 };
export const MAX_UPLOAD = LIMITS.pdf;

export function sniff(bytes) {
  const b = bytes;
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return 'image/png';
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.length >= 12 && b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WEBP') return 'image/webp';
  if (b.length >= 5 && b.toString('latin1', 0, 5) === '%PDF-') return 'application/pdf';
  return null;
}

// 문제 없으면 { mime, size, sha256 }, 아니면 { error }
export function checkUpload(bytes, declared) {
  const mime = sniff(bytes);
  if (!mime) return { error: 'PNG·JPEG·WebP 이미지나 PDF만 올릴 수 있어요.' };
  if (declared && declared !== mime) return { error: '파일 형식과 확장자가 맞지 않아요.' };
  const limit = mime === 'application/pdf' ? LIMITS.pdf : LIMITS.image;
  if (bytes.length > limit) return { error: mime === 'application/pdf' ? 'PDF는 25MB까지 올릴 수 있어요.' : '이미지는 10MB까지 올릴 수 있어요.' };
  return { mime, size: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
}

export function cleanFilename(name) {
  return String(name ?? '').replace(/[\u0000-\u001f\u007f/\\]/g, '').trim().slice(0, 120);
}
