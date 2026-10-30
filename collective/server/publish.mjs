// 초안 → 게시본 스냅샷. 게시 전 검증, 이전 게시본과의 차이 요약, 미리보기가 모두 이 함수를 씁니다.
// 스냅샷에는 공개 화면에 필요한 값만 담습니다(동의 기록 같은 비공개 필드는 빼요).
// 자료 본문·파일은 스냅샷에 넣지 않습니다. 공개 화면은 자료 버전의 전체 공개 시각을 요청 때마다 확인한 뒤에만 보여줍니다.
import { KINDS } from './content.mjs';

export const campusScope = campusId => `campus:${campusId}`;
export const GLOBAL_SCOPE = 'global';

const publicFields = kind => KINDS[kind].fields.filter(field => !field.private).map(field => field.name);
const pick = (item, kind) => ({ id: item.id, ...Object.fromEntries(publicFields(kind).map(name => [name, item.data[name] ?? null])) });
const byOrder = (a, b) => (a.order ?? 999) - (b.order ?? 999) || String(a.start ?? '9').localeCompare(String(b.start ?? '9')) || a.title.localeCompare(b.title);

// 학교 하나의 초안을 모아 검증하고 스냅샷을 만듭니다. problems가 비어 있어야 게시할 수 있어요.
export async function buildCampusRelease(store, campusId, { mode }) {
  const problems = [];
  const campusItem = await store.getItem(campusId);
  if (!campusItem || campusItem.kind !== 'campus') return { problems: ['학교를 찾을 수 없어요.'] };
  const items = await store.listItems({ campusId });
  const of = kind => items.filter(item => item.kind === kind);
  const versions = new Map((await store.listItems({ kind: 'material_version' })).map(item => [item.id, item]));
  const materials = new Map((await store.listItems({ kind: 'material' })).map(item => [item.id, item]));
  const media = new Set();
  const label = `${campusItem.data.name}`;

  const campus = pick(campusItem, 'campus');
  if (campus.fixture && mode !== 'local') problems.push(`${label}: 시험용 학교는 실제 사이트에 게시할 수 없어요.`);
  const terms = of('term').map(item => pick(item, 'term'));
  const termIds = new Set(terms.map(term => term.id));
  if (campus.currentTermId && !termIds.has(campus.currentTermId)) problems.push(`${label}: 현재 학기를 다시 골라 주세요.`);
  if (campus.photoMediaId) media.add(campus.photoMediaId);

  const materialMeta = {};
  const events = of('event').filter(item => item.data.visible).map(item => pick(item, 'event'));
  for (const event of events) {
    if (!termIds.has(event.termId)) problems.push(`${label} · ${event.title}: 학기를 다시 골라 주세요.`);
    event.materials = event.materials.map(link => {
      const version = versions.get(link.versionId);
      if (!version) {
        problems.push(`${label} · ${event.title}: 연결한 자료 버전을 찾을 수 없어요.`);
        return link;
      }
      // 학교 화면 노출 시점은 자료 전체 공개 시점보다 빠를 수 없습니다. 비워 두면 전체 공개와 함께 노출해요.
      const exposeAt = link.exposeAt ?? version.data.publicAt;
      if (Date.parse(exposeAt) < Date.parse(version.data.publicAt)) problems.push(`${label} · ${event.title}: 학교 화면 노출 시점이 자료 전체 공개 시점보다 빨라요.`);
      const material = materials.get(version.data.materialId);
      materialMeta[version.id] = { materialId: version.data.materialId, title: material?.data.title ?? '자료', type: material?.data.type ?? 'guide', version: version.data.version };
      return { ...link, exposeAt };
    });
  }
  if (campus.learningMode !== 'legacy_external' && events.some(event => event.legacyWorkshop)) problems.push(`${label}: 기존 학습실 회차 번호는 학습실을 연결한 학교만 쓸 수 있어요.`);

  const notices = of('notice').filter(item => item.data.visible).map(item => ({ ...pick(item, 'notice'), postedAt: item.data.postedAt ?? item.createdAt }));
  const projects = of('project').filter(item => item.data.visible).map(item => pick(item, 'project'));
  for (const project of projects) {
    if (project.kind === 'student' && !project.consentConfirmed) problems.push(`${label} · ${project.title}: 공개 동의를 확인해야 게시할 수 있어요.`);
    if (project.mediaId) media.add(project.mediaId);
  }
  for (const id of media) if (!(await store.getMediaInfo(id))) problems.push(`${label}: 올린 파일 ${id}을 찾을 수 없어요.`);

  const snapshot = {
    campus, terms,
    events: events.sort(byOrder),
    notices: notices.sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.postedAt.localeCompare(a.postedAt)),
    projects,
    materialMeta,
    media: [...media]
  };
  const itemRevisions = Object.fromEntries([campusItem, ...items].map(item => [item.id, item.revision]));
  return { problems, snapshot, itemRevisions };
}

export async function buildGlobalRelease(store) {
  const home = await store.getItem('home');
  if (!home) return { problems: ['통합 메인 내용을 먼저 저장해 주세요.'] };
  const snapshot = { home: pick(home, 'home'), media: home.data.heroMediaId ? [home.data.heroMediaId] : [] };
  const problems = [];
  if (home.data.heroMediaId && !(await store.getMediaInfo(home.data.heroMediaId))) problems.push('통합 메인: Hero 이미지를 찾을 수 없어요.');
  return { problems, snapshot, itemRevisions: { home: home.revision } };
}

// 이전 게시본과 비교한 짧은 요약: 무엇이 추가·변경·숨김 되는지, 주소·상태가 바뀌는지.
export function diffSnapshots(before, after) {
  const lines = [];
  if (!before) return { lines: ['처음 게시해요.'], firstPublish: true };
  if (after.campus) {
    if (before.campus?.slug !== after.campus.slug) lines.push(`주소가 /campuses/${before.campus?.slug}/ → /campuses/${after.campus.slug}/ 로 바뀌어요. 예전 주소는 열리지 않아요.`);
    if (before.campus?.status !== after.campus.status) lines.push(`운영 상태: ${before.campus?.status} → ${after.campus.status}`);
    const changed = JSON.stringify(before.campus) !== JSON.stringify(after.campus);
    if (changed && !lines.length) lines.push('학교 소개·링크가 바뀌어요.');
    for (const [key, name] of [['events', '일정'], ['notices', '공지'], ['projects', '프로젝트'], ['terms', '학기']]) {
      const old = new Map((before[key] ?? []).map(item => [item.id, JSON.stringify(item)]));
      const next = new Map((after[key] ?? []).map(item => [item.id, item]));
      const added = [...next.values()].filter(item => !old.has(item.id));
      const removed = [...old.keys()].filter(id => !next.has(id));
      const edited = [...next.values()].filter(item => old.has(item.id) && old.get(item.id) !== JSON.stringify(item));
      const title = item => item.title ?? item.name;
      if (added.length) lines.push(`${name} 추가: ${added.map(title).join(', ')}`);
      if (edited.length) lines.push(`${name} 수정: ${edited.map(title).join(', ')}`);
      if (removed.length) lines.push(`${name} ${removed.length}개가 공개 화면에서 빠져요.`);
    }
  } else if (JSON.stringify(before) !== JSON.stringify(after)) {
    lines.push('통합 메인 문구·추천 항목이 바뀌어요.');
  }
  return { lines: lines.length ? lines : ['바뀐 내용이 없어요.'], unchanged: !lines.length };
}
