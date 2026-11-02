import { ws2Practice } from './practice-pages-ws2.mjs';
import { ws2Walkthroughs } from './walkthrough-ws2.mjs';

const repo = 'https://github.com/aeron1120/openAI_WS';
const practice = (...keys) => ({
  slide: ws2Practice[keys[0]].number,
  slideId: ws2Practice[keys[0]].id,
  taskSlides: keys.map(key => ws2Practice[key].id),
  hintSlides: keys.map(key => ws2Practice[key].id)
});

export const workshop2 = {
  number: 2, slug: '02', color: 'violet',
  title: '고치고, 기록하고, 공개하기',
  shortTitle: '고치고 기록하고 공개하기',
  highlights: ['내 사이트를 공개 주소로 배포', 'GitHub에 원본과 변경 기록', 'Preview에서 확인한 뒤 정식 반영'],
  message: '공개한 사이트를 계속 고쳐 나가는 방법',
  outcome: '공개 주소와 변경 기록이 있는 내 사이트',
  summary: '사이트 공개 → GitHub에 원본 보관 → 시험 주소에서 확인한 변경만 반영',
  doing: '첫 배포부터 GitHub 연동, Preview 확인, 정식 반영과 복구까지 한 번씩 해 봅니다.',
  event: { status: 'scheduled', start: '2026-11-02T18:00:00+09:00', end: '2026-11-02T19:00:00+09:00', place: '서울대학교 관악캠퍼스 56동(자연과학관10) 105호', mapQuery: '서울대학교 56동', mapImage: '/images/place/ws-56dong-naver.jpg' },
  recruitment: { open: true, url: 'https://luma.com/54mgt7n8' },
  materials: 'open', materialsOpenAt: '2026-11-02T18:00:00+09:00',
  exampleDirs: ['workshop2/starter', 'workshop2/complete'],
  duration: '60분', audience: '전공 무관 · Workshop 1 안 들어도 OK',
  prepare: ['노트북과 충전기', 'GitHub · Cloudflare 계정', '지난번 만든 사이트의 원본 ZIP (없으면 기본 예제)', 'Codex 계정 · 빌드에 필요한 Node.js는 내 프로젝트에 맞춰 준비'],
  preview: { image: '/images/examples/ws2-complete.png', alt: '배포와 변경 연습에 사용할 SNU Workshop 2 신청 버튼과 수업 자료가 있는 실습 예제 화면.', caption: '수업 슬라이드와 같은 SNU·Student Collective 사본으로 실습해요.' },
  video: null,
  resources: [
    { label: '기본 예제 ZIP 받기', kind: 'starter', audience: 'student', url: '/downloads/workshop2-site.zip', checked: '2026-11-03', note: 'SNU·Student Collective 두 화면 · 빌드 없이 실행' },
    { label: '변경 후 비교용 ZIP', kind: 'starter', audience: 'student', url: '/downloads/workshop2-complete.zip', checked: '2026-11-03', note: '참여하기 문구 + 학교 카드의 수업 자료 버튼' },
    { label: '기본 예제 화면', kind: 'demo', audience: 'student', url: '/examples/workshop2/starter/', checked: '2026-11-03' },
    { label: '전체 실습 안내', kind: 'guide', audience: 'student', url: `${repo}/blob/main/guides/WORKSHOP2.md`, checked: '2026-11-03' },
    { label: '실습 슬라이드', kind: 'slides', audience: 'student', url: 'https://docs.google.com/presentation/d/1N_guFeYU5IbLcgVMR8LI8MYdEZup9dK0gm32qI8W4kE/edit?usp=sharing', checked: '2026-11-03', note: '최신 학생용 74장 · 과제 19장 포함' }
  ],
  checks: ['GitHub와 Cloudflare에 로그인할 수 있다', '사이트 ZIP의 압축을 풀고 원본 파일을 찾았다', 'HTML 사이트인지, 빌드가 필요한 프로젝트인지 확인했다'],
  checkHelp: [
    { title: '계정 두 개 준비하기', why: 'GitHub에는 원본과 기록을, Cloudflare에는 배포한 사이트를 둡니다.', steps: ['GitHub에 가입하거나 로그인합니다.', 'Cloudflare에 가입하거나 로그인하고 이메일 확인을 마칩니다.'], expect: '두 사이트의 내 계정 화면이 열리면 됩니다.', fixes: ['이 수업의 기본 흐름은 브라우저에서 진행합니다. Git과 VS Code를 미리 설치하지 않아도 됩니다.'], links: [{ label: 'GitHub', url: 'https://github.com/' }, { label: 'Cloudflare', url: 'https://dash.cloudflare.com/' }] },
    { title: '내 사이트 또는 기본 예제 준비하기', why: '스크린샷이 아니라 실제 사이트 파일이 필요합니다.', steps: ['내 사이트를 만든 대화나 저장소에서 원본 ZIP을 내려받고 압축을 풉니다.', '내 사이트가 없으면 아래 기본 예제 ZIP을 받아 압축을 풉니다.'], expect: 'index.html 또는 package.json이 있는 폴더를 찾았습니다.', fixes: ['ZIP 안의 파일을 바로 열지 말고 먼저 모두 압축을 푸세요.', '운영진 저장소 전체를 배포하지 않습니다. 기본 예제에는 index.html·collective.html·CSS·JS·assets와 안내 파일이 들어 있어요.'], links: [{ label: '기본 예제 ZIP', url: '/downloads/workshop2-site.zip' }] },
    { title: '배포할 폴더 확인하기', why: '원본을 그대로 올리는 사이트와 빌드 결과를 올리는 사이트가 있습니다.', steps: ['HTML·CSS·JS만 있으면 index.html이 바로 보이는 폴더를 사용합니다.', 'Vite/React 등은 Codex에 빌드 방법과 배포할 결과 폴더를 확인해 달라고 요청합니다.'], expect: '내가 올릴 폴더와 보관할 원본 폴더를 구분할 수 있습니다.', fixes: ['기본 예제는 빌드 없이 배포할 수 있습니다.', 'package.json이 있다고 모두 Vite는 아닙니다. 프로젝트 안내와 실제 빌드 결과를 확인하세요.'], links: [{ label: '빌드 설정 공식 안내', url: 'https://developers.cloudflare.com/pages/configuration/build-configuration/' }] }
  ],
  missions: [
    {
      id: 'publish-site', walkthrough: ws2Walkthroughs['publish-site'], ...practice('deploy_1', 'deploy_2', 'deploy_3', 'deploy_4'),
      hintSlides: ['deploy_2', 'deploy_3', 'deploy_4'].map(key => ws2Practice[key].id),
      title: '내 사이트를 처음 공개하기',
      todo: '사이트 ZIP을 풀고 배포할 폴더를 고릅니다. Cloudflare Pages의 직접 업로드로 올린 뒤, 생긴 공개 주소를 다른 창에서 열어 보세요. 내 사이트가 없으면 [기본 예제 ZIP](/downloads/workshop2-site.zip)을 사용합니다. ZIP의 첫 화면은 SNU, collective.html은 Student Collective 예제입니다. [시작 화면](/examples/workshop2/starter/)을 미리 볼 수 있어요.',
      prompt: '이 프로젝트를 Cloudflare Pages에 배포하려고 해. 원본 파일과 배포할 파일을 구분해줘. 빌드가 필요하면 프로젝트에 맞는 방법으로 실행하고 업로드할 폴더를 알려줘. 서버가 따로 필요한 기능도 짚어줘. 비밀 키가 배포 파일에 들어가지는 않는지도 확인해줘.',
      expected: '*.pages.dev 주소에서 내 사이트의 첫 화면이 열립니다. 서버나 외부 설정이 필요한 기능은 따로 확인해 기록합니다.',
      verify: ['시크릿 창이나 휴대폰에서 공개 URL을 열었다.', '제목·이미지·버튼·새로고침을 확인했다.', '공개 URL과 작동한 기능, 아직 안 되는 기능을 적었다.'],
      stuck: ['404면 index.html이 올린 폴더의 첫 위치에 있는지 확인하세요. Vite는 원본이 아니라 빌드 결과 dist를 올립니다.', 'localhost에서 켰던 서버가 함께 배포되는 것은 아닙니다. API 기능이 실패하면 서버 주소·허용 도메인·키 설정을 점검하세요.'],
      hints: [
        '기본 ZIP은 그대로 올릴 수 있습니다. HTML 사이트는 그대로, Vite는 빌드한 dist를 올립니다. 다른 프로젝트라면 Codex에 실제 빌드 방법과 결과 폴더부터 확인해 달라고 하세요.',
        'Cloudflare → Workers & Pages → Create application → Continue to Pages → Drag and drop your files 아래 Get started. 이름 입력 → Create project → 배포 폴더 또는 ZIP 업로드 → Deploy site. 새 생성 화면의 Upload your static files는 Workers 경로이므로, 아래 Continue to Pages를 먼저 선택합니다.',
        '주소를 새 창에서 열고 직접 눌러 봅니다. 첫 화면이 열려도 API 연결까지 성공한 것은 아니므로 기능별 결과를 따로 적으세요.'
      ]
    },
    {
      id: 'save-source', walkthrough: ws2Walkthroughs['save-source'], ...practice('repo_1', 'repo_2', 'repo_3'),
      title: 'GitHub에 원본과 첫 기록 남기기',
      todo: '내 GitHub 계정에 새 저장소를 만들고 사이트 원본을 올립니다. 나중에 수정할 파일이 필요하므로 Vite의 dist만 올리면 안 됩니다.',
      expected: '내 저장소 첫 화면에 원본 파일이 보이고, “초기 사이트 원본 추가” commit을 열어 변경 파일을 볼 수 있습니다.',
      verify: ['저장소 URL에 내 계정 이름이 있다.', 'index.html 또는 package.json이 저장소 첫 위치에 있다.', '.env·비밀 키·node_modules·dist를 제외하고 필요한 원본을 올렸다.', '저장소 URL과 첫 commit 링크를 기록했다.'],
      stuck: ['.gitignore가 웹 화면에서 선택한 파일을 자동으로 걸러 주지는 않습니다. 업로드 목록을 직접 확인하세요.', '100개가 넘는 파일이나 큰 파일 때문에 웹 업로드가 막히면 Codex에 Git을 통한 업로드를 요청하세요. 비밀 파일과 생성 폴더는 먼저 제외합니다.'],
      hints: [
        'GitHub 오른쪽 위 + → New repository. 내 계정과 저장소 이름을 확인하고 공개 범위를 선택합니다. Add a README → Create repository.',
        'Add file → Upload files. 원본 폴더 안의 파일과 하위 폴더를 올립니다. 폴더 전체를 한 겹 더 감싸서 올리지 마세요.',
        '메시지에 “초기 사이트 원본 추가”를 쓰고 main에 Commit changes. 파일 목록 위의 commit 메시지를 눌러 실제로 올라간 파일을 확인합니다.'
      ]
    },
    {
      id: 'connect-cloudflare', walkthrough: ws2Walkthroughs['connect-cloudflare'], ...practice('connect_1', 'connect_2', 'connect_3'),
      title: 'GitHub commit이 자동 배포되게 연결하기',
      todo: 'Cloudflare에서 GitHub 저장소와 연결한 Pages 프로젝트를 새로 만듭니다. main을 Production branch로 정하고, 내 원본 종류에 맞는 빌드 설정을 입력합니다.',
      expected: 'main의 commit으로 Production 배포가 성공하고, 새 프로젝트의 공개 URL에서 사이트가 열립니다.',
      verify: ['GitHub에 만든 내 저장소를 연결했다.', 'Production branch가 main이다.', '배포에 표시된 commit과 GitHub 최신 commit이 같다.', '새 Production URL을 기록했다.'],
      stuck: ['직접 업로드 프로젝트는 Git 연동 방식으로 바꿀 수 없습니다. 새 프로젝트를 만들면 주소도 새로 생깁니다.', '빌드가 실패하면 View build log의 첫 오류를 읽고 원본 위치·명령·출력 폴더를 확인하세요.'],
      hints: [
        '새 Pages 프로젝트 → Import an existing Git repository 아래 Get started → GitHub 연결. 내 저장소가 보이지 않으면 GitHub 앱의 접근 허용 목록에 추가합니다.',
        'HTML 사이트: Framework None, Build command 공란(필수이면 exit 0), output /. Vite: 실제 프레임워크, npm run build, output dist. 원본이 하위 폴더에 있을 때만 Root directory를 바꿉니다.',
        'Deployments에서 Success·Production·main과 commit을 확인합니다. 과제 1 주소 대신 이번 Git 연동 프로젝트의 URL을 기록하세요.'
      ]
    },
    {
      id: 'test-preview', walkthrough: ws2Walkthroughs['test-preview'], ...practice('preview_1', 'preview_2', 'preview_3', 'preview_4'),
      hintSlides: ['preview_2', 'preview_3', 'preview_4'].map(key => ws2Practice[key].id),
      title: '정식 사이트는 두고 Preview에서 시험하기',
      todo: 'main에서 try-v99 branch를 만들고 index.html의 ‘Workshop 2 신청하기’를 ‘Workshop 2 참여하기’로 바꿉니다. 신청 링크 주소는 유지합니다. commit 후 Preview와 Production을 나란히 확인하고, 결과를 적은 Pull request를 엽니다.',
      expected: 'Production은 이전 버튼 문구, Preview는 바꾼 버튼 문구를 보여 줍니다. PR은 열어 두고 아직 Merge하지 않습니다.',
      verify: ['try-v99에서 문구만 바꾸고 commit했다.', 'Production은 그대로이고 Preview만 바뀌었다.', 'Preview에서 이미지·버튼·새로고침도 확인했다.', 'base main / compare try-v99 PR에 Preview URL과 확인 결과를 적었다.'],
      stuck: ['Preview가 안 보이면 Cloudflare 배포 목록에서 branch 이름과 상태를 먼저 확인하세요.', 'Preview도 기본적으로 공개 주소입니다. 시험 중이어도 비밀 키나 개인정보를 넣지 마세요.'],
      hints: [
        '현재 branch가 try-v99인지 먼저 확인하세요. 기본 예제는 index.html의 “Workshop 2 신청하기”를 “Workshop 2 참여하기”로 바꿉니다. 연필 → 문구만 수정(신청 주소 유지) → Commit changes에서 try-v99에 저장합니다.',
        'Cloudflare Deployments에서 try-v99 배포의 Preview URL을 복사합니다. 과제 3의 정식 주소와 두 창으로 열어 버튼 문구와 같은 신청 링크로 이동하는지를 비교하세요.',
        'Pull requests → New pull request → base main / compare try-v99. 바뀐 줄을 확인하고 Preview 주소·직접 확인한 동작·남은 문제를 적어 PR을 만듭니다.'
      ]
    },
    {
      id: 'release-recover', walkthrough: ws2Walkthroughs['release-recover'], ...practice('release_1', 'release_2', 'release_3', 'release_4', 'release_5'),
      hintSlides: ['release_1', 'release_3', 'release_4'].map(key => ws2Practice[key].id),
      title: '정식으로 반영하고 복구까지 해 보기',
      todo: '확인한 PR을 Merge하고 정식 주소에서 바뀐 버튼 문구를 확인합니다. 이어서 연습용 사이트에서 그 버튼 문구 변경만 Rollback과 Revert로 되돌려 봅니다.',
      expected: '같은 정식 URL에서 새 버튼 문구를 확인했습니다. 복구 연습 뒤에는 main 원본과 최신 Production이 모두 이전 버튼 문구로 돌아옵니다.',
      verify: ['Merge 후 main의 Production 배포가 성공했고 같은 정식 주소에 새 버튼 문구가 보였다.', '이전 Production으로 Rollback한 뒤 화면이 먼저 돌아왔다.', 'Revert PR을 Preview에서 확인하고 Merge했다.', '최신 Production과 main 원본이 같은 내용이다.', '정식 URL·저장소·PR·Preview·확인 결과를 기록했다.'],
      stuck: ['Rollback은 성공한 Production 배포를 대상으로 합니다. Preview 배포를 선택하지 마세요.', 'Revert 버튼이 없거나 충돌하면 main에서 새 branch를 만들고 버튼 문구를 원래대로 수정한 뒤, PR → Preview 확인 → Merge로 되돌립니다.'],
      hints: [
        'PR의 Files changed를 마지막으로 읽고 Merge pull request → Confirm merge. Cloudflare main 배포가 Success가 되면 정식 URL을 새로고침합니다.',
        'Cloudflare → Deployments → All deployments. 버튼 문구 변경 전 성공한 Production의 … → Rollback to this deployment. 정식 URL과 main 원본을 비교합니다.',
        'GitHub → Pull requests → Closed → 방금 Merge한 PR → Revert. 되돌림 PR의 Preview를 확인하고 Merge합니다. 새 Production도 확인하세요. Rollback만 하면 main 원본은 그대로이므로 이 단계까지 마칩니다.'
      ]
    }
  ],
  apply: {
    title: '선택 실습 · 학교 카드에 수업 자료 버튼 추가',
    body: 'Student Collective 예제의 서울대 카드에 수업 자료 버튼을 추가해 보세요. 기존 SNU 홈페이지 이동과 모바일 배치를 유지하고 Preview에서 직접 확인합니다.',
    prompt: '새 작업 branch에서 collective.html의 서울대 카드에 ‘수업 자료’ 버튼을 추가해줘. 누르면 https://snu-student-collective.pages.dev/learn/02/ 를 새 탭으로 열어줘. 기존 SNU 홈페이지 링크와 모바일 레이아웃은 유지해줘. 수정한 파일과 확인할 항목을 알려줘.'
  },
  help: { prompt: '현재 과제: [1~5]\n작업 위치: [Cloudflare 프로젝트 / GitHub 저장소와 branch]\n기대한 결과: [어떤 화면이나 동작]\n실제 결과: [오류 문구와 상태]\n비밀값을 제외한 설정과 오류를 보고 원인을 찾아줘. 다시 확인할 순서도 알려줘.', guide: `${repo}/blob/main/guides/WORKSHOP2.md` },
  share: '정식 URL · 원본 저장소 · PR · 확인한 Preview'
};
