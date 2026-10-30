// 관리 화면에서 편집하는 콘텐츠 종류와 필드. 같은 정의로 서버 검증과 관리 화면 폼을 만듭니다.
// 시각은 서버에 UTC(ISO)로 저장하고, 화면에는 Asia/Seoul로 보여줍니다.
import { HttpError } from './http.mjs';

export const CAMPUS_STATUS = {
  draft: '초안 (목록에 안 보임)',
  active: '운영 중',
  preparing: '준비 중',
  paused: '잠시 쉬는 중',
  archived: '보관 (목록에 안 보임)'
};
// 공개 목록과 학교 주소에 나오는 상태. draft·archived는 게시본이 있어도 보이지 않습니다.
export const LISTED_STATUS = new Set(['active', 'preparing', 'paused']);

export const EVENT_TYPES = { workshop: 'Workshop', studio: 'Studio Session', showcase: 'Showcase', event: '행사' };

const f = (name, type, label, extra = {}) => ({ name, type, label, ...extra });

export const KINDS = {
  campus: {
    label: '학교',
    fields: [
      f('name', 'text', '학교 이름', { required: true, max: 60 }),
      f('slug', 'slug', '주소 이름 (영문 소문자·숫자·-)', { required: true, hint: '/campuses/<주소 이름>/ — 공개한 뒤에는 바꾸지 마세요.' }),
      f('shortName', 'text', '짧은 이름 (예: SNU)', { max: 20 }),
      f('intro', 'textarea', '짧은 소개', { max: 400 }),
      f('status', 'select', '운영 상태', { options: CAMPUS_STATUS, required: true }),
      f('externalUrl', 'url', '학교 사이트 주소 (있으면 학교 공간 대신 이 사이트로 바로 연결)', { hint: '이미 학교 사이트가 있으면 적어 주세요(예: 기존 SNU 포털). 이 학교의 일정·공지는 그 사이트에서 관리하고, 여기서는 학교 목록에만 보여요.' }),
      f('currentTermId', 'ref', '현재 학기', { refKind: 'term', sameCampus: true }),
      f('photoMediaId', 'media', '대표 사진'),
      f('photoAlt', 'text', '사진 설명 (무엇이 보이는지)', { max: 200 }),
      f('applyUrl', 'url', '참여 신청 링크', { hint: '없으면 비워 두세요. 빈 링크의 버튼은 나타나지 않아요.' }),
      f('communityUrl', 'url', '커뮤니티(오픈채팅 등) 링크'),
      f('contactUrl', 'url', '운영 문의 링크 (https:// 또는 mailto:)', { mailto: true }),
      f('leadNote', 'textarea', '운영·담당 안내', { max: 400, hint: '예: Campus Leads가 운영해요. 개인 연락처는 적지 마세요.' }),
      f('firstTimeNote', 'textarea', '처음 참여하는 학생 안내', { max: 1000 }),
      f('learningMode', 'select', '학습실 연결', { options: { none: '학습실 없음 (자료 보기만)', legacy_external: '기존 학습실로 연결' }, required: true }),
      f('learnUrl', 'url', '학습실 주소 (수업 듣기)'),
      f('adminUrl', 'url', '질문·진도 운영 화면 주소'),
      f('fixture', 'bool', '시험용 학교 (로컬·미리보기 전용, 실제 게시 안 됨)')
    ]
  },
  term: {
    label: '학기',
    fields: [
      f('name', 'text', '학기 이름 (예: 2026년 2학기)', { required: true, max: 40 }),
      f('startsOn', 'date', '시작일'),
      f('endsOn', 'date', '종료일')
    ]
  },
  event: {
    label: '일정·워크숍',
    fields: [
      f('termId', 'ref', '학기', { refKind: 'term', sameCampus: true, required: true }),
      f('type', 'select', '유형', { options: EVENT_TYPES, required: true }),
      f('title', 'text', '제목', { required: true, max: 80 }),
      f('order', 'number', '로드맵 순서 (작을수록 앞)', { min: 0, max: 999 }),
      f('summary', 'textarea', '한두 문장 설명', { max: 400 }),
      f('goal', 'text', '목표 결과물', { max: 120 }),
      f('body', 'rich', '자세한 안내', { max: 4000 }),
      f('audience', 'text', '참가 대상', { max: 120 }),
      f('openToOthers', 'bool', '다른 학교 학생도 참가 가능 (통합 행사 목록에 표시)'),
      f('status', 'select', '일정 상태', { options: { scheduled: '일정 확정', tbd: '일정 준비 중', cancelled: '취소' }, required: true }),
      f('start', 'datetime', '시작'),
      f('end', 'datetime', '종료'),
      f('place', 'text', '장소', { max: 120 }),
      f('onlineUrl', 'url', '온라인 주소'),
      f('applyUrl', 'url', '신청 링크'),
      f('applyOpensAt', 'datetime', '신청 시작 (비우면 바로)'),
      f('applyClosesAt', 'datetime', '신청 마감 (비우면 행사 시작까지)'),
      f('prepare', 'list', '준비물 (한 줄에 하나)', { max: 12 }),
      f('materials', 'materials', '연결한 자료'),
      f('legacyWorkshop', 'number', 'SNU 기존 학습실 회차 번호 (SNU만)', { min: 1, max: 20, hint: '자료 열림 여부를 기존 학습 서버에서 읽어 와요. 다른 학교는 비워 두세요.' }),
      f('visible', 'bool', '공개 페이지에 표시')
    ]
  },
  notice: {
    label: '공지',
    fields: [
      f('termId', 'ref', '학기', { refKind: 'term', sameCampus: true }),
      f('title', 'text', '제목', { required: true, max: 80 }),
      f('body', 'rich', '본문', { required: true, max: 4000 }),
      f('pinned', 'bool', '맨 위에 고정'),
      f('postedAt', 'datetime', '공지 날짜 (비우면 처음 게시한 날)'),
      f('visible', 'bool', '공개 페이지에 표시')
    ]
  },
  project: {
    label: '프로젝트',
    fields: [
      f('termId', 'ref', '학기', { refKind: 'term', sameCampus: true }),
      f('title', 'text', '제목', { required: true, max: 80 }),
      f('kind', 'select', '구분', { options: { student: '학생 결과물', operator: '운영진 예제' }, required: true }),
      f('summary', 'textarea', '한 줄 설명 (어떤 문제를 푸는지)', { max: 300 }),
      f('body', 'rich', '자세한 설명', { max: 4000 }),
      f('mediaId', 'media', '대표 이미지'),
      f('alt', 'text', '이미지 설명', { max: 200 }),
      f('demoUrl', 'url', '데모 주소'),
      f('maker', 'text', '제작자 표기 (공개 동의한 경우만)', { max: 80 }),
      f('consentConfirmed', 'bool', '제작자에게 공개 동의를 받았어요 (학생 결과물은 필수)'),
      f('consentNote', 'text', '동의 기록 (언제·어떻게, 공개 안 됨)', { max: 200, private: true }),
      f('visible', 'bool', '공개 페이지에 표시'),
      f('featured', 'bool', '통합 메인 추천 후보')
    ]
  },
  material: {
    label: '공통 자료',
    global: true,
    fields: [
      f('title', 'text', '자료 이름', { required: true, max: 80 }),
      f('type', 'select', '유형', { options: { slides: '슬라이드', guide: '안내 문서', file: '파일', link: '외부 링크', note: '글' }, required: true }),
      f('description', 'textarea', '설명', { max: 400 })
    ]
  },
  // 자료 버전: 만든 뒤에는 내용을 바꾸지 않습니다. 공개 시각(publicAt)만 지나기 전까지 바꿀 수 있어요.
  material_version: {
    label: '자료 버전',
    global: true,
    fields: [
      f('materialId', 'ref', '자료', { refKind: 'material', required: true, locked: true }),
      f('version', 'text', '버전 이름 (예: 2026-2 v1)', { required: true, max: 40, locked: true }),
      f('body', 'rich', '내용 (글)', { max: 8000, locked: true }),
      f('url', 'url', '외부 링크', { locked: true, hint: '이미 누구나 열 수 있는 링크는 예약 공개로 숨겨지지 않아요.' }),
      f('mediaId', 'media', '파일 (PDF·이미지)', { locked: true, pdf: true }),
      f('publicAt', 'datetime', '자료 전체 공개 시각', { required: true, hint: '이 시각 전에는 본문·파일을 누구도 받을 수 없어요. 지나면 모든 학교에 공개된 자료예요.' })
    ]
  },
  home: {
    label: '통합 메인',
    global: true,
    fields: [
      f('heroEyebrow', 'text', 'Hero 작은 제목', { max: 60 }),
      f('heroTitle', 'textarea', 'Hero 큰 문구', { required: true, max: 80 }),
      f('heroLead', 'textarea', 'Hero 설명', { max: 200 }),
      f('heroMediaId', 'media', 'Hero 이미지 (실제 활동 사진, 비우면 그래픽)'),
      f('heroAlt', 'text', 'Hero 이미지 설명', { max: 200 }),
      f('programIntro', 'textarea', '프로그램 소개', { max: 400 }),
      f('learnText', 'textarea', '배우기 (Workshop) 설명', { max: 300 }),
      f('makeText', 'textarea', '만들기 (Studio) 설명', { max: 300 }),
      f('shareText', 'textarea', '공유하기 (Showcase) 설명', { max: 300 }),
      f('featuredCampuses', 'refs', '추천 학교 (순서대로)', { refKind: 'campus' }),
      f('featuredEvents', 'refs', '추천 행사 (순서대로)', { refKind: 'event' }),
      f('featuredProjects', 'refs', '추천 프로젝트 (순서대로)', { refKind: 'project' }),
      f('aboutBody', 'rich', '소개 페이지 본문', { max: 4000 }),
      f('contactUrl', 'url', '운영 문의 링크', { mailto: true }),
      f('openCampusUrl', 'url', '학교 개설 문의 링크', { mailto: true })
    ]
  }
};

export const CAMPUS_KINDS = ['term', 'event', 'notice', 'project'];

const invalid = (field, message) => new HttpError(422, 'INVALID', message, { field });
const SLUG = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;
const RESERVED_SLUGS = new Set(['new', 'manage', 'api', 'assets', 'media', 'search']);

// 링크: https:// · http:// · 사이트 안 주소(/로 시작). mailto:는 문의 링크에만.
export function cleanUrl(value, { mailto = false } = {}) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string' || value.length > 500) return undefined;
  const text = value.trim();
  if (/^\/(?!\/)[^\s]*$/.test(text)) return text;
  try {
    const url = new URL(text);
    if (url.protocol === 'https:' || url.protocol === 'http:') return url.toString();
    if (mailto && url.protocol === 'mailto:' && /^mailto:[^@\s]+@[^@\s]+$/.test(text)) return text;
  } catch {}
  return undefined;
}

function cleanText(value, max, multiline) {
  if (value === null || value === undefined) return '';
  if (typeof value !== 'string') return undefined;
  let text = value.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '');
  text = multiline ? text.trim() : text.replace(/\s+/g, ' ').trim();
  return text.length > max ? undefined : text;
}

export function cleanDatetime(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string' || !/([+-]\d\d:\d\d|Z)$/.test(value)) return undefined;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? undefined : new Date(ms).toISOString();
}

// 저장 요청의 data를 필드 정의에 맞게 정리합니다. 정의에 없는 키는 버립니다.
export function cleanData(kind, input, { existing = null } = {}) {
  const spec = KINDS[kind];
  if (!spec) throw new HttpError(400, 'INVALID_KIND', '알 수 없는 콘텐츠 종류예요.');
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new HttpError(400, 'INVALID_REQUEST', '요청 내용을 확인해 주세요.');
  const out = {};
  for (const field of spec.fields) {
    if (existing && field.locked) {
      out[field.name] = existing[field.name] ?? null;
      continue;
    }
    const raw = input[field.name];
    let value;
    switch (field.type) {
      case 'text': value = cleanText(raw, field.max, false); break;
      case 'textarea': case 'rich': value = cleanText(raw, field.max, true); break;
      case 'slug':
        value = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
        if (value && (!SLUG.test(value) || RESERVED_SLUGS.has(value))) throw invalid(field.name, '주소 이름은 영문 소문자·숫자·-로 2~40자예요.');
        break;
      case 'select':
        value = raw === undefined || raw === null || raw === '' ? null : String(raw);
        if (value !== null && !Object.hasOwn(field.options, value)) throw invalid(field.name, `${field.label} 값을 다시 골라 주세요.`);
        break;
      case 'bool': value = raw === true; break;
      case 'number':
        if (raw === null || raw === undefined || raw === '') { value = null; break; }
        value = Number(raw);
        if (!Number.isInteger(value) || value < field.min || value > field.max) throw invalid(field.name, `${field.label}는 ${field.min}~${field.max} 사이 정수예요.`);
        break;
      case 'url':
        value = cleanUrl(raw, { mailto: field.mailto });
        if (value === undefined) throw invalid(field.name, `${field.label}는 https:// 로 시작하는 주소로 적어 주세요.`);
        break;
      case 'datetime':
        value = cleanDatetime(raw);
        if (value === undefined) throw invalid(field.name, `${field.label} 시각을 다시 확인해 주세요.`);
        break;
      case 'date':
        value = raw === null || raw === undefined || raw === '' ? null : String(raw);
        if (value !== null && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value)))) throw invalid(field.name, `${field.label}을 다시 확인해 주세요.`);
        break;
      case 'ref': case 'media':
        value = raw === null || raw === undefined || raw === '' ? null : String(raw);
        if (value !== null && !/^[\w-]{1,64}$/.test(value)) throw invalid(field.name, `${field.label}을 다시 골라 주세요.`);
        break;
      case 'refs':
        value = Array.isArray(raw) ? [...new Set(raw.map(String))] : [];
        if (value.length > 12 || value.some(id => !/^[\w-]{1,64}$/.test(id))) throw invalid(field.name, `${field.label}을 다시 골라 주세요.`);
        break;
      case 'list':
        value = (Array.isArray(raw) ? raw : []).map(item => cleanText(item, 200, false)).filter(item => item !== '');
        if (value.length > field.max || value.includes(undefined)) throw invalid(field.name, `${field.label}은 한 줄 200자, ${field.max}개까지예요.`);
        break;
      case 'materials':
        value = (Array.isArray(raw) ? raw : []).map(entry => ({
          versionId: typeof entry?.versionId === 'string' && /^[\w-]{1,64}$/.test(entry.versionId) ? entry.versionId : undefined,
          exposeAt: cleanDatetime(entry?.exposeAt),
          note: cleanText(entry?.note, 200, false)
        }));
        if (value.length > 20 || value.some(entry => entry.versionId === undefined || entry.exposeAt === undefined || entry.note === undefined)) throw invalid(field.name, '연결한 자료를 다시 확인해 주세요.');
        break;
      default: throw new Error(`unknown field type ${field.type}`);
    }
    if (value === undefined) throw invalid(field.name, `${field.label}${field.max ? `은 ${field.max}자까지예요` : '을 다시 확인해 주세요'}.`);
    if (field.required && (value === null || value === '' || (Array.isArray(value) && !value.length))) throw invalid(field.name, `${field.label}을 입력해 주세요.`);
    out[field.name] = value;
  }
  // 종류별 관계 검사
  if (kind === 'event') {
    if (out.start && out.end && Date.parse(out.end) < Date.parse(out.start)) throw invalid('end', '종료 시각이 시작보다 빨라요.');
    if (out.applyOpensAt && out.applyClosesAt && Date.parse(out.applyClosesAt) < Date.parse(out.applyOpensAt)) throw invalid('applyClosesAt', '신청 마감이 신청 시작보다 빨라요.');
    if (out.status === 'scheduled' && !out.start) throw invalid('start', '일정 확정이면 시작 시각을 적어 주세요.');
  }
  if (kind === 'term' && out.startsOn && out.endsOn && out.endsOn < out.startsOn) throw invalid('endsOn', '종료일이 시작일보다 빨라요.');
  if (kind === 'project' && out.kind === 'student' && out.visible && !out.consentConfirmed) throw invalid('consentConfirmed', '학생 결과물은 공개 동의를 확인해야 공개할 수 있어요.');
  if (kind === 'campus' && out.learningMode === 'legacy_external' && !out.learnUrl) throw invalid('learnUrl', '기존 학습실로 연결하려면 학습실 주소가 필요해요.');
  if (kind === 'campus' && out.externalUrl && !out.externalUrl.startsWith('https://')) throw invalid('externalUrl', '학교 사이트 주소는 https:// 로 시작하는 전체 주소로 적어 주세요.');
  if (kind === 'material_version' && !out.body && !out.url && !out.mediaId) throw invalid('body', '내용·링크·파일 중 하나는 있어야 해요.');
  return out;
}

// 새 항목의 기본값. 관리 화면의 '새로 만들기'와 학교 기본 구성에 씁니다.
export function emptyData(kind) {
  const base = Object.fromEntries(KINDS[kind].fields.map(field => [field.name, field.type === 'bool' ? false : field.type === 'list' || field.type === 'refs' || field.type === 'materials' ? [] : null]));
  if (kind === 'campus') Object.assign(base, { status: 'draft', learningMode: 'none' });
  if (kind === 'event') Object.assign(base, { type: 'workshop', status: 'tbd', visible: true });
  if (kind === 'notice') Object.assign(base, { visible: true });
  if (kind === 'project') Object.assign(base, { kind: 'student', visible: false });
  if (kind === 'material') Object.assign(base, { type: 'guide' });
  return base;
}
