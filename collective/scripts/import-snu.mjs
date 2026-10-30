// SNU를 통합 사이트의 학교 목록에 올립니다: portal/content/site.mjs(읽기 전용)에서 이름·소개만 읽어 학교 카드를 만들어요.
//   node collective/scripts/import-snu.mjs           → collective/.env 기준 저장소(로컬 모드면 .data/ 파일)
// SNU는 기존 포털(https://snu-student-collective.pages.dev/)을 그대로 쓰므로, 카드와 /campuses/snu/는 그 사이트로 바로 연결됩니다.
// 일정·공지·프로젝트·자료는 가져오지 않습니다(기존 포털 content/에서만 관리해 두 곳에서 따로 고치지 않도록).
// 이미 있는 항목(같은 ID)은 덮어쓰지 않고 건너뜁니다. 가져온 뒤에는 관리 화면에서 확인하고 게시하세요(자동 게시 안 함).
import { cleanData, emptyData } from '../server/content.mjs';
import { loadEnv, storeFromEnv } from './env.mjs';

const { site } = await import('../../portal/content/site.mjs');

const env = loadEnv();
const store = await storeFromEnv(env);
const actor = 'import-snu';
const now = new Date().toISOString();
const report = { created: [], skipped: [] };

async function put(id, kind, campusId, data) {
  if (await store.getItem(id)) { report.skipped.push(id); return; }
  await store.createItem({ id, kind, campusId, data: cleanData(kind, { ...emptyData(kind), ...data }), actor, now });
  report.created.push(id);
}

const CAMPUS = 'snu';
await put(CAMPUS, 'campus', CAMPUS, {
  name: '서울대학교', slug: 'snu', shortName: 'SNU',
  intro: site.description, status: 'active',
  externalUrl: `${env.SNU_LEGACY_ORIGIN || site.url}/`,
  learningMode: 'none'
});

await put('home', 'home', null, {
  heroEyebrow: 'OpenAI Student Collective',
  heroTitle: '아이디어가 시작되는 곳,\n우리 캠퍼스.',
  heroLead: '함께 배우고, 직접 만들고, 서로의 결과물을 나눕니다.',
  programIntro: '한 학기 동안 Workshop, Studio Session, Showcase를 오가며 내 아이디어를 실제로 작동하는 서비스로 만들어요.',
  learnText: '함께 모여 ChatGPT·Codex로 내 아이디어의 첫 기능을 만들고, 공개하고, 고치는 방법을 배워요.',
  makeText: '워크숍 뒤에 다시 모여 막힌 곳을 함께 풀고 다음 기능을 이어서 만들어요. 오면 좋지만 필수는 아니에요.',
  shareText: '학기 동안 만든 서비스를 사람들 앞에서 시연하고 소개해요.',
  featuredCampuses: [CAMPUS],
  contactUrl: site.links.contact
});

console.log(`가져오기 끝 (${store.kind}) · 만듦 ${report.created.length}개, 이미 있어 건너뜀 ${report.skipped.length}개`);
if (report.created.length) console.log(`  만듦: ${report.created.join(', ')}`);
if (report.skipped.length) console.log(`  건너뜀: ${report.skipped.join(', ')}`);
console.log('관리 화면(/manage/publish/)에서 SNU와 통합 메인을 확인하고 게시하세요.');
