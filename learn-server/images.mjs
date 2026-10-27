// 첨부 이미지: 파일 앞부분 바이트로 실제 형식을 확인합니다(Content-Type 헤더만 믿지 않음). SVG·GIF는 받지 않습니다.
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const EXTENSIONS = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };

const starts = (bytes, values, offset = 0) => values.every((value, i) => bytes[offset + i] === value);
const ascii = text => [...text].map(char => char.charCodeAt(0));

export function imageType(bytes) {
  if (starts(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  if (starts(bytes, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (starts(bytes, ascii('RIFF')) && starts(bytes, ascii('WEBP'), 8)) return 'image/webp';
  return null;
}
