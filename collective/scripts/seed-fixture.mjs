// 로컬 시험용 두 번째 학교. 학교 공간이 소스 복사 없이 데이터만으로 추가되는지 확인할 때 씁니다.
//   node collective/scripts/seed-fixture.mjs   (CMS_MODE=local에서만 실행)
// fixture: true로 만들어 운영 사이트에는 게시할 수 없습니다. 이름에도 '시험용'을 붙여 실제 학교로 오해하지 않게 합니다.
import { cleanData, emptyData } from '../server/content.mjs';
import { loadEnv, storeFromEnv } from './env.mjs';

const env = loadEnv();
if (env.CMS_MODE !== 'local') {
  console.error('시험용 학교는 로컬 모드(CMS_MODE=local)에서만 만들 수 있어요.');
  process.exit(1);
}
const store = await storeFromEnv(env);
const actor = 'seed-fixture';
const now = new Date();
const iso = days => new Date(now.getTime() + days * 86400000).toISOString();
const put = async (id, kind, campusId, data) => {
  if (await store.getItem(id)) return console.log(`건너뜀: ${id}`);
  await store.createItem({ id, kind, campusId, data: cleanData(kind, { ...emptyData(kind), ...data }), actor, now: now.toISOString() });
  console.log(`만듦: ${id}`);
};

await put('fixture-guide', 'material', null, { title: '시작 안내 (시험용)', type: 'guide', description: '공통 자료 버전 흐름을 시험하는 자료예요.' });
await put('fixture-guide-v1', 'material_version', null, { materialId: 'fixture-guide', version: 'v1 (공개됨)', body: '이미 전체 공개된 시험용 자료예요.\n\n- 첫 단계\n- 둘째 단계', publicAt: iso(-7) });
await put('fixture-guide-v2', 'material_version', null, { materialId: 'fixture-guide', version: 'v2 (예약)', body: '아직 전체 공개되지 않은 예약 자료 본문이에요. 공개 시각 전에는 보이면 안 돼요.', publicAt: iso(3) });

await put('fixture-campus', 'campus', 'fixture-campus', { name: '시험용 대학교', slug: 'test-campus', shortName: '시험용', intro: '공통 학교 틀을 확인하는 로컬 전용 시험 학교예요.', status: 'active', fixture: true, learningMode: 'none', contactUrl: 'mailto:test@example.com' });
await put('fixture-term', 'term', 'fixture-campus', { name: '시험 학기', startsOn: iso(-30).slice(0, 10), endsOn: iso(60).slice(0, 10) });
const campus = await store.getItem('fixture-campus');
if (!campus.data.currentTermId) await store.updateItem({ id: campus.id, data: { ...campus.data, currentTermId: 'fixture-term' }, expectedRevision: campus.revision, actor, now: now.toISOString() });
await put('fixture-ws-1', 'event', 'fixture-campus', { termId: 'fixture-term', type: 'workshop', order: 10, title: '시험 워크숍 1', summary: '지난 워크숍. 자료는 열려 있고 신청은 마감.', status: 'scheduled', start: iso(-3), end: iso(-3 + 1 / 24), place: '시험관 101호', applyUrl: 'https://example.com/apply', materials: [{ versionId: 'fixture-guide-v1', exposeAt: null, note: '' }], visible: true });
await put('fixture-ws-2', 'event', 'fixture-campus', { termId: 'fixture-term', type: 'workshop', order: 20, title: '시험 워크숍 2', summary: '다가오는 워크숍. 신청 열림, 자료는 예약.', status: 'scheduled', start: iso(5), end: iso(5 + 1 / 24), place: '시험관 102호', openToOthers: true, applyUrl: 'https://example.com/apply', prepare: ['노트북', '충전기'], materials: [{ versionId: 'fixture-guide-v2', exposeAt: null, note: '' }], visible: true });
await put('fixture-notice', 'notice', 'fixture-campus', { termId: 'fixture-term', title: '시험 공지', body: '공지 본문이에요. **굵게**와 [링크](https://example.com)를 시험해요.\n\n<script>alert(1)</script>는 글자로 보여야 해요.', pinned: true, visible: true });
console.log('관리 화면에서 시험용 대학교를 게시하면(로컬 모드만 허용) 공개 화면에서 확인할 수 있어요.');
