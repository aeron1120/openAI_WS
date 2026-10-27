// 워크숍 회차별 콘텐츠. 상태 값의 의미는 portal/README.md의 '상태 값' 표를 보세요.
// - event.status: 'done'(진행 완료) | 'scheduled'(일정 확정) | 'tbd'·'planning'(준비 중)
//   start·end가 있으면 시각에 맞춰 자동으로 바뀝니다: 끝난 뒤 '진행 완료'.
// - recruitment.open이 true이고 url이 있을 때만 '신청하기' 버튼이 나타납니다.
// - materials: 'open'(자료 열림) | 'planning'(자료 준비 중). 'planning'이면 미션·자료 영역을 그리지 않습니다.
// - materialsOpenAt: 이 시각 전에는 미션·슬라이드·예제를 숨기고 '○월 ○일 ○시에 열려요'를 보여줍니다.
//   배포된 사이트가 요청마다 현재 시각을 확인하므로, 이 시각에 다시 배포하지 않아도 자동으로 열립니다.
// - exampleDirs: 자료가 열릴 때 /examples/ 아래에 함께 공개할 저장소 폴더.
// - 확정되지 않은 값은 null로 둡니다. 임의의 주소나 '#'을 넣지 마세요.
// - missions[].slide / slideId: 수업 화면에서 이 단계가 시작되는 학생용 슬라이드 번호(1부터)와 Google Slides 페이지 ID.

const repo = 'https://github.com/aeron1120/openAI_WS';
const file = path => `${repo}/blob/main/${path}`;
const folder = path => `${repo}/tree/main/${path}`;

export const workshops = [
  {
    number: 1,
    slug: '01',
    title: '틈, 화면에서 서비스로',
    shortTitle: '화면에서 서비스로',
    color: 'green',
    highlights: ['기초 틀을 내 컴퓨터에서 실행', 'Codex로 문구·배치 바꾸기', '로그인·지도·날씨 중 하나 연결'],
    message: '내 아이디어가 실제로 움직인다',
    outcome: '첫 기능이 작동하는 웹앱',
    summary: '기초 틀을 열고, Codex와 함께 내 서비스에 필요한 기능 하나를 연결해요.',
    doing: 'Codex로 기초 틀을 실행하고, 필요한 기능 하나를 실제 서비스에 연결해요.',
    event: {
      status: 'done',
      start: '2026-10-26T18:00:00+09:00',
      end: '2026-10-26T19:00:00+09:00',
      place: '서울대학교 관악캠퍼스 56동(자연과학관10) 105호'
    },
    recruitment: { open: false, url: null },
    materials: 'open',
    duration: '60분',
    audience: '전공 무관 · 코딩 경험 없어도 OK',
    joinNote: '워크숍에 오지 못했어도 이 페이지만으로 따라 할 수 있어요.',
    prepare: [
      '노트북과 충전기',
      'Codex를 쓸 수 있는 ChatGPT 계정',
      '만들고 싶은 서비스 한 문장',
      'Node.js 20 이상 (서버로 실행할 때만)'
    ],
    preview: {
      image: '/images/examples/ws1-starter.png',
      alt: '기초 틀 화면. 로그인, 지도·위치정보, 날씨 박스가 “아직 연결 전” 상태로 비어 있다.',
      caption: '내가 직접 고치는 기초 틀. 기능 자리만 비어 있어요.'
    },
    video: null,
    resources: [
      { label: '기초 틀 받기', kind: 'starter', audience: 'student', url: repo, checked: '2026-10-27', note: 'GitHub → Code → Download ZIP' },
      { label: '시작 안내', kind: 'guide', audience: 'student', url: file('guides/START-HERE.md'), checked: '2026-10-27' },
      { label: '기능별 안내', kind: 'guide', audience: 'student', url: file('guides/README.md'), checked: '2026-10-27', note: '로그인 · 지도 · 날씨' },
      { label: '운영진 예제 ‘틈’', kind: 'demo', audience: 'student', url: 'https://openai-ws-workshop1.a01085519047.workers.dev/versions/', checked: '2026-10-27', note: '발표용 예제예요. 열어도 내 프로젝트가 생기지는 않아요. 2026-10-26 기록 기준으로 로그인·지도는 아직 확인 중이에요.' },
      { label: '실습 슬라이드', kind: 'slides', audience: 'student', url: 'https://docs.google.com/presentation/d/1pUcnsVa0Ab_z_ZxbVnO6cCHCIcTYVVvz10C9Tt52xuU/edit?usp=sharing', checked: '2026-10-27', note: '발표본에서 실습 부분만 모았어요' }
    ],
    checks: [
      '압축 푼 폴더에 starter 폴더가 보인다',
      'starter/index.html이 브라우저에서 열린다',
      'Codex에 로그인되어 있다'
    ],
    missions: [
      {
        id: 'open-starter',
        slide: 1, slideId: 'h2ea000745df279bf_2_24',
        title: '기초 틀 받고 화면 열기',
        todo: 'GitHub 저장소에서 Code → Download ZIP을 누르고 압축을 모두 풉니다. starter 폴더 안의 index.html을 브라우저로 엽니다.',
        expected: '“이곳에 나의 아이디어를 담아보세요.” 제목과 로그인·지도·날씨·나만의 기능 박스가 보여요. 설치와 API 키는 아직 필요 없어요.',
        verify: ['박스마다 “아직 연결 전” 표시가 보인다.', '“Codex에 이렇게 요청해보세요”를 펼치면 요청문이 나온다.'],
        stuck: ['ZIP 파일 안에서 바로 열면 스타일이 빠질 수 있어요. 압축을 모두 푼 뒤 다시 여세요.', '글자만 보이면 코드 편집기가 아니라 브라우저로 열었는지 확인하세요.']
      },
      {
        id: 'run-local',
        slide: 4, slideId: 'h2ea000745df279bf_2_62',
        title: 'Codex에게 내 컴퓨터에서 실행해 달라고 하기',
        todo: 'Codex 데스크톱 또는 VS Code에서 압축을 푼 저장소 전체 폴더를 열고, 아래 요청문을 붙여 넣습니다.',
        prompt: `이 저장소에서 Workshop 1 기초 틀을 실습하려고 해.
README.md와 starter/README.md를 읽고 starter 화면을 로컬에서 실행해줘.
Node.js가 있는지 먼저 확인하고, 없다면 설치 방법을 안내해줘.
화면을 확인할 주소와 서버를 종료하는 방법도 알려줘.
아직 로그인·지도·날씨 기능을 구현하지는 마.`,
        expected: 'Codex가 npm run dev로 서버를 켜고 http://localhost:5173/starter/ 주소를 알려줘요. npm install은 필요 없어요.',
        verify: ['브라우저에서 http://localhost:5173/starter/ 를 열면 1단계와 같은 화면이 보인다.', '서버를 끌 때는 서버가 실행 중인 터미널에서 Ctrl+C를 누른다.'],
        stuck: ['Windows에서 npm.ps1 실행이 막히면 같은 폴더에서 npm.cmd run dev를 사용하세요.', '“5173이 이미 사용 중”이면 먼저 켜 둔 실습 서버를 Ctrl+C로 끄세요. 모르는 프로그램은 끄지 말고 Codex에 다른 포트를 요청하세요.', 'package.json을 찾을 수 없다고 나오면 starter 안이 아니라 README.md가 있는 저장소 폴더를 열었는지 확인하세요.']
      },
      {
        id: 'first-change',
        slide: 4, slideId: 'h2ea000745df279bf_2_62',
        title: '작은 변화 하나 만들기',
        todo: '내 서비스의 이름과 소개 문구를 바꿔 달라고 요청합니다. 예시 문장은 내 아이디어로 바꿔도 좋아요.',
        prompt: `starter의 사이트 이름을 ‘나의 캠퍼스’로 바꾸고,
소개 문구를 ‘학교생활에 필요한 정보를 한곳에 모으는 서비스’로 바꿔줘.
다른 기능 박스는 그대로 두고, 바뀐 파일과 확인 방법을 짧게 알려줘.`,
        expected: '새로고침하면 사이트 이름과 소개 문구가 바뀌어 있어요.',
        verify: ['바꾸려던 문구만 바뀌고 다른 박스는 그대로다.', '브라우저 창을 좁혀도 글자가 잘리지 않는다.'],
        stuck: ['바꿨는데 화면이 그대로면 파일 저장 후 새로고침했는지, 운영진 예제가 아니라 내 localhost 화면을 보고 있는지 확인하세요.']
      },
      {
        id: 'connect-feature',
        slide: 9, slideId: 'h2ea000745df279bf_2_126',
        title: '내 서비스에 필요한 기능 하나 연결하기',
        todo: '로그인·지도·날씨 중 내 서비스에 필요한 것 하나만 고릅니다. 각 기능은 외부 서비스의 계정·키 설정이 필요하므로, Codex가 먼저 준비 항목을 설명하게 하세요.',
        options: [
          {
            label: '날씨 — 기상청 단기예보',
            slide: 9, slideId: 'h2ea000745df279bf_2_126',
            needs: '공공데이터포털 기상청 단기예보 이용 신청과 본인 인증키',
            prompt: `starter의 날씨 영역에 기상청 단기예보 API를 연결해줘.
관악구 대학동의 내일 오후 6시 기온과 강수확률을 보여줘.
docs/WEATHER.md와 기존 서버 예제를 참고해 필요한 서버 기능을 추가해줘.
인증키는 서버의 KMA_SERVICE_KEY로 관리하고, 내가 직접 입력할 위치를 안내해줘.
로딩·조회 실패·예보 없음 상태와 재시도를 넣어줘.
실제 API 응답과 화면에 표시된 날짜·시간·값을 비교하는 방법도 알려줘.`,
            guide: file('guides/WEATHER.md')
          },
          {
            label: '로그인 — Google 계정',
            slide: 15, slideId: 'h2ea000745df279bf_2_267',
            needs: 'Google 앱 등록과 클라이언트 ID, 로그인 결과를 확인할 서버',
            prompt: `starter의 로그인 영역에 Google 로그인 기능을 구현해줘.
로그인하면 이름과 프로필 사진을 보여주고,
새로고침해도 로그인 상태가 유지되게 해줘. 로그아웃도 추가해줘.
기존 docs/AUTH.md를 참고하고, 필요한 서버와 Google 설정을 설명해줘.
내가 직접 설정해야 할 항목과 순서를 먼저 알려줘.
실제 로그인 확인 없이 완료됐다고 표시하지 마.`,
            guide: file('guides/LOGIN.md')
          },
          {
            label: '지도 — Google Maps',
            slide: 21, slideId: 'h2ea000745df279bf_2_421',
            needs: 'Google Maps JavaScript API 사용 설정과 지도 키. 결제 계정 설정과 사용량에 따른 비용을 먼저 확인하세요.',
            prompt: `starter의 지도·위치정보 영역에 Google 지도를 구현해줘.
서울대학교 정문 위치에 마커를 표시하고,
마커를 누르면 장소 이름이 보이게 해줘.
docs/MAPS.md를 참고해서 필요한 API 설정과 비용 발생 가능성을 먼저 설명해줘.
좌표는 확인한 실제 위치를 사용하고, 설정할 항목과 확인 방법을 안내해줘.`,
            guide: file('guides/MAP.md')
          }
        ],
        expected: '예시 숫자나 가짜 계정이 아니라 실제 서비스의 응답이 화면에 보여요. 처음 받은 기초 틀에는 연결이 없으니, 키와 설정을 마친 뒤에만 결과가 나와요.',
        verify: ['실제 응답을 받았는지 확인한다 — 날씨는 요청한 지역·날짜·시간, 로그인은 내 계정 이름, 지도는 의도한 위치의 마커.', '실패했을 때 실패 상태가 보인다.'],
        stuck: ['인증키·비밀번호는 AI 대화, 공개 HTML/JavaScript, GitHub에 넣지 마세요. Codex가 안내한 로컬 설정 파일에 직접 입력합니다.', '로그인·지도는 지금 접속한 주소가 외부 서비스에 등록한 주소와 같은지 확인하세요.']
      }
    ],
    apply: {
      title: '내 아이디어로 바꾸기',
      body: '박스 배치와 역할은 출발점일 뿐이에요. 필요 없는 박스는 지우고, 남길 기능의 역할을 내 서비스에 맞게 바꿔보세요. 한 번에 하나씩 요청해야 문제가 생긴 곳을 찾기 쉬워요.',
      prompt: `내 서비스는 [누구]가 [어떤 일]을 하는 웹사이트야.
starter의 [박스 이름]에 [필요한 기능]을 구현해줘.
사용자가 [행동]하면 [결과]가 보이게 해줘.
필요한 계정이나 API 설정이 있으면 먼저 알려줘.
구현한 뒤 내가 직접 동작을 확인하는 방법도 알려줘.`
    },
    help: {
      prompt: `내가 한 일: [어떤 요청과 설정을 했는지]
기대한 결과: [어떤 화면이나 동작을 기대했는지]
실제 결과: [무엇이 보이는지]
오류 문구: [화면이나 터미널의 오류]

원인을 먼저 확인하고, 필요한 부분만 고쳐줘.
다시 확인할 방법도 알려줘.`,
      guide: file('guides/TROUBLESHOOTING.md')
    },
    share: '완료 목표는 “내 서비스에 필요한 실제 연결 하나 + 내가 바꾼 문구나 배치 하나”예요. 완성하지 못했어도 괜찮아요. 현재 화면과 막힌 부분을 Studio Session에 가져오세요.'
  },
  {
    number: 2,
    slug: '02',
    title: '고치고, 기록하고, 공개하기',
    shortTitle: '고치고 기록하고 공개하기',
    color: 'blue',
    highlights: ['Codex로 기능 하나 추가', 'Git·GitHub로 변경 기록', 'Cloudflare로 친구에게 공개'],
    message: '기능을 넣고 기록하고, 친구가 쓸 수 있게 공개한다',
    outcome: '기록하고 공개까지 한 내 서비스',
    summary: '기능 하나를 Codex로 추가하고, Git·GitHub로 기록한 뒤 Cloudflare로 친구가 쓸 수 있게 공개해요.',
    doing: '기능을 직접 추가해 확인하고, Git·GitHub로 기록·되돌리기를 익힌 뒤 Cloudflare로 배포해요.',
    event: { status: 'scheduled', start: '2026-11-02T18:00:00+09:00', end: '2026-11-02T19:00:00+09:00', place: '서울대학교 관악캠퍼스 56동(자연과학관10) 105호' },
    recruitment: { open: true, url: 'https://luma.com/54mgt7n8' }, // 행사가 시작되면 자동으로 닫혀요.
    materials: 'open',
    materialsOpenAt: '2026-11-02T18:00:00+09:00',
    exampleDirs: ['workshop2/starter', 'workshop2/complete'],
    duration: '60분 예정',
    audience: '전공 무관 · Workshop 1 안 들어도 OK',
    joinNote: 'Workshop 1에 오지 않았어도 참여할 수 있어요. ‘시작 전 확인’만 미리 끝내 오세요.',
    prepare: [
      '노트북과 충전기',
      'ChatGPT(Codex) 계정, GitHub 계정, Cloudflare 계정(무료)',
      'VS Code · Git · Node.js 20 이상',
      '원본 저장소를 Fork → Clone해서 실행해 오기'
    ],
    preview: {
      image: '/images/examples/ws2-complete.png',
      alt: '모임 카드 세 개에 각각 즐겨찾기 버튼이 있는 Workshop 2 완성본 화면.',
      caption: '완성본 예제. 새로고침하면 즐겨찾기가 초기화돼요.'
    },
    video: null,
    resources: [
      { label: '완성본 예제', kind: 'demo', audience: 'student', url: '/examples/workshop2/complete/', checked: '2026-10-27', note: '설치 없이 바로 열려요' },
      { label: '시작본 예제', kind: 'demo', audience: 'student', url: '/examples/workshop2/starter/', checked: '2026-10-27' },
      { label: '실습 소스 (GitHub)', kind: 'starter', audience: 'student', url: folder('workshop2'), checked: '2026-10-27', note: 'Fork · Clone해서 수정해요' },
      { label: '참가자 준비 안내', kind: 'guide', audience: 'student', url: file('docs/PARTICIPANT.md'), checked: '2026-10-27' },
      { label: '5분 복구 연습', kind: 'guide', audience: 'student', url: file('docs/RECOVERY.md'), checked: '2026-10-27' },
      { label: '실습 슬라이드', kind: 'slides', audience: 'student', url: 'https://docs.google.com/presentation/d/1N_guFeYU5IbLcgVMR8LI8MYdEZup9dK0gm32qI8W4kE/edit?usp=sharing', checked: '2026-10-27', note: '발표본에서 실습 부분만 모았어요' }
    ],
    checks: [
      'node · npm · git --version이 모두 나온다 (Node 20 이상)',
      'git remote -v의 origin이 내 Fork다',
      'npm run dev 후 localhost:5173/workshop2/starter/ 에 카드 3개가 보인다',
      'git config user.name · user.email이 설정되어 있다'
    ],
    // checks와 같은 순서. 페이지의 '도움말'을 누르면 한 항목씩 강조하며 보여줘요.
    checkHelp: [
      {
        title: '프로그램 3개가 설치됐는지 확인',
        why: '실습 앱을 내 컴퓨터에서 실행하고(Node.js·npm), 바꾼 내용을 기록하는(Git) 데 필요한 프로그램이에요.',
        steps: [
          '터미널을 열어요. Windows는 시작 메뉴에서 “PowerShell” 검색, Mac은 ⌘+Space → “터미널”. VS Code에서는 메뉴 Terminal → New Terminal.',
          '아래 명령을 한 줄씩 입력하고 Enter를 눌러요.'
        ],
        command: 'node --version\nnpm --version\ngit --version',
        expect: 'v20.11.1, 10.2.4, git version 2.45.1처럼 숫자가 세 줄 나오면 돼요. node는 v20 이상이어야 해요.',
        fixes: [
          '“인식되지 않습니다”, “command not found”가 나오면 설치가 안 된 거예요. 아래 링크에서 설치한 뒤 터미널을 껐다가 다시 열어요.',
          'Node.js는 LTS 버전을 받으면 npm도 함께 설치돼요.',
          'Mac에서 git을 입력했을 때 개발자 도구 설치 창이 뜨면 “설치”를 눌러요.',
          'Windows에서 npm만 “스크립트를 실행할 수 없습니다” 오류가 나면 npm 대신 npm.cmd를 입력해요. (예: npm.cmd --version)'
        ],
        links: [
          { label: 'Node.js 설치', url: 'https://nodejs.org/ko/download' },
          { label: 'Git 설치', url: 'https://git-scm.com/downloads' },
          { label: 'VS Code 설치', url: 'https://code.visualstudio.com/' }
        ]
      },
      {
        title: 'Fork해서 내 컴퓨터로 가져오기',
        why: '원본 저장소를 내 GitHub 계정으로 복사(Fork)해야, 내가 바꾼 내용을 내 저장소에 기록할 수 있어요.',
        steps: [
          'GitHub에 로그인하고 아래 ‘원본 저장소’를 열어요.',
          '오른쪽 위 Fork → Create fork. 주소가 github.com/내아이디/openAI_WS로 바뀌면 성공이에요.',
          '내 Fork 페이지에서 초록색 Code 버튼 → HTTPS 주소를 복사해요.',
          'VS Code 첫 화면에서 Clone Git Repository → 주소 붙여 넣기 → 저장할 폴더 고르기 → 열기.',
          '가져온 폴더가 열린 VS Code에서 터미널을 열고 아래 명령을 입력해요.'
        ],
        command: 'git remote -v',
        expect: 'origin 줄에 https://github.com/내아이디/openAI_WS.git처럼 내 GitHub 아이디가 보이면 돼요.',
        fixes: [
          '내 아이디 대신 aeron1120이 보이면 원본을 그대로 가져온 거예요. Fork부터 하고, 내 Fork 주소로 다시 Clone해요.',
          '“not a git repository”가 나오면 가져온 폴더 밖에서 터미널을 연 거예요. VS Code에서 그 폴더를 열고 다시 시도해요.'
        ],
        links: [{ label: '원본 저장소', url: 'https://github.com/aeron1120/openAI_WS' }]
      },
      {
        title: '실습 화면 띄워 보기',
        why: '워크숍 당일 바로 시작할 수 있게, 실습 앱이 내 컴퓨터에서 열리는지 미리 확인해요.',
        steps: [
          '가져온 openAI_WS 폴더가 열린 VS Code에서 터미널을 열어요.',
          '아래 명령을 입력해요. 따로 설치할 것은 없어요.',
          '브라우저 주소창에 localhost:5173/workshop2/starter/ 를 입력해 열어요.'
        ],
        command: 'npm run dev',
        expect: '모임 카드 3개가 보이면 돼요. 확인이 끝나면 터미널에서 Ctrl+C를 눌러 서버를 꺼요.',
        fixes: [
          'Windows에서 “스크립트를 실행할 수 없습니다”가 나오면 npm.cmd run dev를 입력해요.',
          '“Missing script: dev”가 나오면 폴더 위치가 달라요. package.json이 있는 openAI_WS 폴더에서 실행해요.',
          '포트가 사용 중이라는 오류가 나오면 이미 켜 둔 서버가 있어요. 그 터미널에서 Ctrl+C를 누른 뒤 다시 실행해요.'
        ]
      },
      {
        title: 'Git에 내 이름 등록하기',
        why: '기록(commit)에 누가 바꿨는지 남기려면 이름과 이메일이 필요해요.',
        steps: ['가져온 폴더 안 터미널에서 아래 명령을 입력해요.'],
        command: 'git config user.name\ngit config user.email',
        expect: '이름과 이메일이 한 줄씩 나오면 돼요.',
        fixes: ['아무것도 나오지 않으면 아래 명령으로 설정해요. 따옴표 안을 내 정보로 바꿔서 입력해요.'],
        extra: { label: '설정하기 (따옴표 안을 바꿔서)', text: 'git config user.name "내 이름"\ngit config user.email "GitHub에 쓰는 이메일"' },
        tip: '이메일을 공개하고 싶지 않다면 GitHub의 noreply 주소를 써도 돼요.',
        links: [{ label: 'GitHub 커밋 이메일 안내', url: 'https://docs.github.com/ko/account-and-profile/setting-up-and-managing-your-personal-account-on-github/managing-email-preferences/setting-your-commit-email-address' }]
      }
    ],
    missions: [
      {
        id: 'compare',
        slide: 1, slideId: 'ws2_activity_20261019_01',
        title: '완성본 먼저 눌러보기',
        todo: '위 ‘완성본 예제’에서 카드 두 개를 선택한 뒤 하나만 해제하고, 새로고침해 봅니다.',
        expected: '카드마다 따로 선택·해제되고, 새로고침하면 모두 초기화돼요. 이번 실습의 즐겨찾기는 저장되지 않는 게 정상이에요.',
        verify: ['두 카드를 선택하면 둘 다 선택 상태다.', '하나를 해제해도 다른 하나는 그대로다.'],
        stuck: []
      },
      {
        id: 'add-favorite',
        slide: 7, slideId: 'ws2_activity_20261019_07',
        title: 'Codex에게 즐겨찾기 추가 요청하기',
        todo: '내 Fork를 연 VS Code에서 Codex에 아래 요청문을 붙여 넣습니다. 수정은 starter 폴더에서만 진행하고, complete는 비교용으로만 봅니다.',
        prompt: `workshop2/starter/의 모임 카드에 즐겨찾기 버튼을 추가해줘.
클릭하면 선택되고, 다시 누르면 해제해줘.
카드별로 독립적으로 동작하게 해줘.
새로고침하면 초기화해. DB와 localStorage는 쓰지 마.
기존 모임 정보와 레이아웃은 유지해줘.
수정할 파일과 확인 방법을 알려줘.`,
        expected: 'Codex가 workshop2/starter의 파일을 수정하고, 바뀐 파일과 확인 방법을 알려줘요.',
        verify: ['카드 A 선택 → 선택 표시가 보인다.', '카드 B 선택 → A와 B 모두 선택 상태다.', '카드 A 다시 클릭 → A만 해제되고 B는 유지된다.', '새로고침 → 둘 다 초기화된다.', '카드 제목·시간·장소가 그대로이고 브라우저 오류가 없다.'],
        stuck: ['화면이 바뀌지 않으면 http://localhost:5173/workshop2/starter/ (내 로컬 화면)를 보고 있는지 확인하세요.']
      },
      {
        id: 'record',
        slide: 14, slideId: 'ws2_activity_20261019_14',
        title: '변경을 기록하고 GitHub에 올리기',
        todo: 'VS Code Source Control에서 바뀐 파일을 열어 비교하고, 이번 기능의 파일만 Stage해서 Commit한 뒤 Push합니다. 터미널을 쓴다면 git status로 실제 파일명을 먼저 확인하세요.',
        commands: `git status
git add workshop2/starter/app.js
git commit -m "Add favorites to meetup cards"
git push`,
        expected: '내 GitHub Fork의 같은 브랜치에서 방금 쓴 commit 메시지와 바뀐 파일이 보여요.',
        verify: ['HTML/CSS도 바꿨다면 그 파일도 함께 추가했다.', '원본 운영진 저장소가 아니라 내 Fork에 올렸다.'],
        stuck: ['Push 인증이 실패하면 로그인 계정, origin 주소, 브랜치를 확인하세요. 강제 Push는 하지 않습니다.', '인터넷이 안 되면 로컬 commit과 화면까지 남기고, 온라인 확인은 Studio Session에서 마무리하세요.']
      },
      {
        id: 'recover',
        slide: 17, slideId: 'ws2_activity_20261019_17',
        title: '5분 복구 연습 — 실수를 되돌리기',
        todo: '저장소 루트에서 연습용 저장소를 만들고, 일부러 망가뜨린 마지막 commit을 되돌립니다. 이 연습은 원본 GitHub에 올라가지 않는 별도 폴더에서만 진행해요.',
        commands: `node scripts/prepare-recovery.mjs
cd workshop2/recovery-practice
git status
git log --oneline -2
git revert --no-edit HEAD
git log --oneline -3`,
        expected: 'http://localhost:5173/workshop2/recovery-practice/ 에서 눌리지 않던 즐겨찾기 버튼이 새로고침 후 다시 작동해요. 과거 commit 두 개는 남고 Revert commit이 하나 추가돼요.',
        verify: ['되돌리기 전 최신 commit 메시지가 practice: accidentally disable favorites 였다.', 'git log에 새 Revert commit이 보인다.'],
        stuck: ['충돌이 나면 멈추고 도움을 요청하세요. git reset --hard나 강제 Push로 해결하지 않습니다.', '이미 연습 폴더가 있으면 준비 스크립트가 덮어쓰지 않고 멈춰요. 다시 하려면 새 Clone에서 준비하세요.']
      }
    ],
    apply: {
      title: '내 프로젝트에 같은 흐름 적용하기',
      body: 'Workshop 1에서 만든 내 프로젝트가 있다면, 작은 기능 하나를 같은 순서로 추가해 보세요: 요청 → 바뀐 파일 확인 → 직접 눌러 검증 → commit → push.',
      prompt: `내 프로젝트에 [작은 기능 하나]를 추가하고 싶어.
먼저 README를 읽고 어떤 파일을 바꿔야 하는지 알려줘.
기존 화면과 기능은 유지하고, 이 기능에 필요한 부분만 수정해줘.
수정한 뒤 내가 직접 눌러서 확인할 순서를 알려줘.`
    },
    help: null,
    share: '30초 공유 틀: “[이유] 때문에 [기능]을 바꿨고, [행동]을 해서 [결과]를 확인했습니다.” 변경 전후 화면과 commit, 내 저장소 주소를 함께 보여주세요.'
  },
  {
    number: 3,
    slug: '03',
    title: '주제 준비 중',
    shortTitle: '주제 준비 중',
    color: 'purple',
    highlights: [],
    message: null,
    outcome: null,
    summary: '새 기획에 맞춰 주제를 정하고 있어요. 확정되면 이곳에서 안내해요.',
    doing: null,
    event: { status: 'planning', start: null, end: null, place: null },
    recruitment: { open: false, url: null },
    materials: 'planning',
    duration: null,
    audience: null,
    joinNote: null,
    prepare: [],
    preview: null,
    video: null,
    resources: [],
    checks: [],
    missions: [],
    apply: null,
    help: null,
    share: null
  },
  {
    number: 4,
    slug: '04',
    title: '주제 준비 중',
    shortTitle: '주제 준비 중',
    color: 'orange',
    highlights: [],
    message: null,
    outcome: null,
    summary: '새 기획에 맞춰 주제를 정하고 있어요. 확정되면 이곳에서 안내해요.',
    doing: null,
    event: { status: 'planning', start: null, end: null, place: null },
    recruitment: { open: false, url: null },
    materials: 'planning',
    duration: null,
    audience: null,
    joinNote: null,
    prepare: [],
    preview: null,
    video: null,
    resources: [],
    checks: [],
    missions: [],
    apply: null,
    help: null,
    share: null
  }
];
