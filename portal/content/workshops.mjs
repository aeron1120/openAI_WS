// 워크숍 회차별 콘텐츠. 상태 값의 의미는 portal/README.md의 '상태 값' 표를 보세요.
// - event.status: 'done'(진행 완료) | 'scheduled'(일정 확정) | 'tbd'·'planning'(준비 중)
//   start·end가 있으면 시각에 맞춰 자동으로 바뀝니다: 끝난 뒤 '진행 완료'.
// - recruitment.open이 true이고 url이 있을 때만 '신청하기' 버튼이 나타납니다.
// - materials: 'open'(자료 열림) | 'planning'(자료 준비 중). 'planning'이면 미션·자료 영역을 그리지 않습니다.
// - materialsOpenAt: 이 시각 전에는 미션·슬라이드·예제를 숨기고 '○월 ○일 ○시에 열려요'를 보여줍니다.
//   배포된 사이트가 요청마다 현재 시각을 확인하므로, 이 시각에 다시 배포하지 않아도 자동으로 열립니다.
// - exampleDirs: 자료가 열릴 때 /examples/ 아래에 함께 공개할 저장소 폴더.
// - event.mapQuery: 홈의 지도에서 찾을 장소 이름(예: '서울대학교 56동'). Google 지도에서 맞는 건물이 나오는지 확인하고 적으세요. 없으면 지도를 그리지 않습니다.
// - 확정되지 않은 값은 null로 둡니다. 임의의 주소나 '#'을 넣지 마세요.
// - missions[].slideId: 이 단계의 강의가 시작되는 학생용 슬라이드 페이지 ID(Google Slides).
// - missions[].taskSlides: 이 과제의 슬라이드 페이지 ID 목록(과제 페이지). 수업 화면의 '과제' 보기에서 이 페이지만 보여줍니다.
//   없으면 slideId 한 장만 보여줍니다. 선택지(options)에도 따로 적을 수 있어요. 페이지 ID는 portal/slides/manifest.json에서 찾으세요.
// - walkthrough: { title, steps: [{ image?, box?, text, note? }] } 힌트 상자의 '화면으로 따라 하기'. 실제 화면 캡처에서 box(%) 자리를 강조합니다.
//   캡처에 개인정보·인증키가 보이면 안 됩니다. 이미지는 public/images/walk/에 둡니다.

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
      place: '서울대학교 관악캠퍼스 56동(자연과학관10) 105호',
      mapQuery: '서울대학교 56동'
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
        slideId: 'h2ea000745df279bf_2_24',
        taskSlides: ['ws1_task_20261029_open_1', 'ws1_task_20261029_open_2'],
        title: '기초 틀 받고 화면 열기',
        todo: `[GitHub 저장소](${repo})에서 Code → Download ZIP을 누르고 압축을 모두 풉니다. starter 폴더 안의 index.html을 브라우저로 엽니다.`,
        expected: '“이곳에 나의 아이디어를 담아보세요.” 제목과 로그인·지도·날씨·나만의 기능 박스가 보여요. 설치와 API 키는 아직 필요 없어요.',
        verify: ['박스마다 “아직 연결 전” 표시가 보인다.', '“Codex에 이렇게 요청해보세요”를 펼치면 요청문이 나온다.'],
        stuck: ['ZIP 파일 안에서 바로 열면 스타일이 빠질 수 있어요. 압축을 모두 푼 뒤 다시 여세요.', '글자만 보이면 코드 편집기가 아니라 브라우저로 열었는지 확인하세요.'],
        hints: [
          '초록색 Code 버튼은 저장소 첫 화면의 파일 목록 바로 위, 오른쪽에 있어요. GitHub에 로그인하지 않아도 받을 수 있어요. 압축을 풀면 보통 openAI_WS-main 폴더가 생기고, 그 안에 README.md·package.json·starter가 함께 있어요.',
          '압축 풀기: Windows는 ZIP 파일을 오른쪽 클릭 → 모두 압축 풀기, Mac은 ZIP 파일을 더블클릭해요. 그다음 openAI_WS-main → starter → index.html을 더블클릭하면 기본 브라우저로 열려요. 메모장이나 코드 편집기가 열리면 index.html 파일을 Chrome 같은 브라우저 창으로 끌어다 놓으세요.',
          `1. [GitHub 저장소](${repo})를 엽니다.
2. 파일 목록 위 초록색 Code 버튼 → 맨 아래 Download ZIP을 누릅니다.
3. 다운로드 폴더에서 openAI_WS-main.zip을 찾습니다.
4. Windows는 오른쪽 클릭 → 모두 압축 풀기 → 압축 풀기를 누릅니다. Mac은 더블클릭하면 같은 이름의 폴더가 생겨요.
5. 새로 생긴 openAI_WS-main 폴더(ZIP 파일이 아닌 폴더)를 열고 starter 폴더로 들어갑니다.
6. index.html을 더블클릭합니다. 파일 확장자가 안 보이면 브라우저 아이콘이 붙은 index 파일을 고르세요.
7. 브라우저 탭에 “이곳에 나의 아이디어를 담아보세요.”와 기능 박스 네 개가 보이면 성공이에요.`
        ]
      },
      {
        id: 'run-local',
        slideId: 'h2ea000745df279bf_2_62',
        taskSlides: ['ws1_task_20261029_local_1', 'ws1_task_20261029_local_2', 'ws1_task_20261029_local_3'],
        title: 'Codex에게 내 컴퓨터에서 실행해 달라고 하기',
        todo: `[Codex 데스크톱 또는 VS Code](${file('guides/START-HERE.md')})에서 압축을 푼 저장소 전체 폴더를 열고, 아래 요청문을 붙여 넣습니다.`,
        prompt: `이 저장소에서 Workshop 1 기초 틀을 실습하려고 해.
README.md와 starter/README.md를 읽고 starter 화면을 로컬에서 실행해줘.
Node.js가 있는지 먼저 확인하고, 없다면 설치 방법을 안내해줘.
화면을 확인할 주소와 서버를 종료하는 방법도 알려줘.
아직 로그인·지도·날씨 기능을 구현하지는 마.`,
        expected: 'Codex가 npm run dev로 서버를 켜고 http://localhost:5173/starter/ 주소를 알려줘요. npm install은 필요 없어요.',
        verify: ['브라우저에서 http://localhost:5173/starter/ 를 열면 1단계와 같은 화면이 보인다.', '서버를 끌 때는 서버가 실행 중인 터미널에서 Ctrl+C를 누른다.'],
        stuck: ['Windows에서 npm.ps1 실행이 막히면 같은 폴더에서 npm.cmd run dev를 사용하세요.', '“5173이 이미 사용 중”이면 먼저 켜 둔 실습 서버를 Ctrl+C로 끄세요. 모르는 프로그램은 끄지 말고 Codex에 다른 포트를 요청하세요.', 'package.json을 찾을 수 없다고 나오면 starter 안이 아니라 README.md가 있는 저장소 폴더를 열었는지 확인하세요.'],
        hints: [
          `“저장소 전체 폴더”는 README.md·package.json·starter가 함께 보이는 openAI_WS-main 폴더예요. starter 폴더만 열면 Codex가 실행 방법을 찾지 못해요. 서버를 켜려면 [Node.js](https://nodejs.org/ko/download) 20 이상이 필요해요.`,
          'Codex 데스크톱: 로그인 → 프로젝트 추가(앱 버전에 따라 폴더 열기·폴더 추가) → openAI_WS-main 선택 → 새 대화. VS Code: File → Open Folder → openAI_WS-main 선택 → 왼쪽 Extensions에서 OpenAI가 배포한 Codex 확장 설치·로그인 → Codex 아이콘 클릭. 아이콘이 안 보이면 명령 팔레트(Windows Ctrl+Shift+P, Mac ⌘+Shift+P)에서 Codex: Open Codex Sidebar를 실행해요.',
          `1. [VS Code](https://code.visualstudio.com/)를 설치하고 엽니다.
2. 메뉴 File → Open Folder에서 openAI_WS-main 폴더를 고릅니다. “이 폴더의 작성자를 신뢰하나요?” 창이 나오면 신뢰한다고 누릅니다.
3. 왼쪽 막대의 Extensions 아이콘(Windows Ctrl+Shift+X, Mac ⌘+Shift+X)을 누르고 “Codex”를 검색해 OpenAI가 배포한 확장을 설치한 뒤 ChatGPT 계정으로 로그인합니다.
4. Codex 창 입력칸에 이 단계의 요청문을 붙여 넣고 Enter를 누릅니다.
5. Codex가 명령 실행 허락을 물으면 내용을 읽고 허용합니다.
6. Node.js가 없다고 하면 [Node.js](https://nodejs.org/ko/download)에서 LTS를 설치하고 VS Code를 껐다 켠 뒤 다시 요청합니다.
7. 브라우저 주소창에 http://localhost:5173/starter/ 를 입력합니다.
8. 끝낼 때는 서버가 실행 중인 터미널을 클릭하고 Ctrl+C를 누릅니다. Mac도 Ctrl+C예요.`
        ]
      },
      {
        id: 'first-change',
        slideId: 'h2ea000745df279bf_2_62',
        taskSlides: ['ws1_task_20261029_change_1', 'ws1_task_20261029_change_2'],
        title: '작은 변화 하나 만들기',
        todo: `내 서비스의 [이름과 소개 문구](${file('starter/index.html')})를 바꿔 달라고 요청합니다. 예시 문장은 내 아이디어로 바꿔도 좋아요.`,
        prompt: `starter의 사이트 이름을 ‘나의 캠퍼스’로 바꾸고,
소개 문구를 ‘학교생활에 필요한 정보를 한곳에 모으는 서비스’로 바꿔줘.
다른 기능 박스는 그대로 두고, 바뀐 파일과 확인 방법을 짧게 알려줘.`,
        expected: '새로고침하면 사이트 이름과 소개 문구가 바뀌어 있어요.',
        verify: ['바꾸려던 문구만 바뀌고 다른 박스는 그대로다.', '브라우저 창을 좁혀도 글자가 잘리지 않는다.'],
        stuck: ['바꿨는데 화면이 그대로면 파일 저장 후 새로고침했는지, 운영진 예제가 아니라 내 localhost 화면을 보고 있는지 확인하세요.'],
        hints: [
          `사이트 이름은 화면 왼쪽 위 “내 아이디어”와 브라우저 탭 제목이고, 소개 문구는 큰 제목 아래 문장이에요. 모두 [starter/index.html](${file('starter/index.html')})에 있어요. 요청문의 ‘나의 캠퍼스’와 소개 문장만 내 아이디어로 바꿔 보내도 돼요.`,
          'Codex가 고친 파일은 바로 저장돼요. 브라우저에서 새로고침(Windows Ctrl+R 또는 F5, Mac ⌘+R)만 하면 돼요. VS Code 왼쪽 파일 목록에서 starter/index.html을 열면 바뀐 줄을 직접 볼 수 있어요. 글자 잘림은 브라우저 창 가장자리를 끌어 휴대폰 너비만큼 좁혀서 확인해요.',
          `1. 앞 단계에서 쓰던 Codex 대화로 돌아갑니다.
2. 이 단계의 요청문을 복사해 ‘나의 캠퍼스’와 소개 문장을 내 아이디어로 고칩니다.
3. Codex에 붙여 넣고 Enter를 누릅니다. 파일 수정 허락을 물으면 허용합니다.
4. Codex 답변에서 바뀐 파일 이름(보통 starter/index.html)을 확인합니다.
5. http://localhost:5173/starter/ 탭을 새로고침합니다.
6. 이름과 소개 문구만 바뀌고 로그인·지도·날씨 박스는 그대로인지 봅니다.
7. 창을 좁혀 글자가 잘리지 않는지 확인합니다.
8. 마음에 들지 않으면 “방금 바꾼 문구를 원래대로 돌려줘”라고 요청해도 돼요.`
        ]
      },
      {
        id: 'connect-feature',
        slideId: 'h2ea000745df279bf_2_126',
        taskSlides: ['ws1_task_20261029_choose'],
        title: '내 서비스에 필요한 기능 하나 연결하기',
        todo: `[로그인](${file('guides/LOGIN.md')})·[지도](${file('guides/MAP.md')})·[날씨](${file('guides/WEATHER.md')}) 중 내 서비스에 필요한 것 하나만 고릅니다. 각 기능은 외부 서비스의 계정·키 설정이 필요하므로, Codex가 먼저 준비 항목을 설명하게 하세요.`,
        options: [
          {
            label: '날씨 — 기상청 단기예보',
            slideId: 'h2ea000745df279bf_2_126',
            taskSlides: ['ws1_task_20261029_weather_1', 'ws1_task_20261029_weather_2', 'ws1_task_20261029_weather_3'],
            needs: '[공공데이터포털 기상청 단기예보](https://www.data.go.kr/data/15084084/openapi.do) 이용 신청과 본인 인증키',
            prompt: `starter의 날씨 영역에 기상청 단기예보 API를 연결해줘.
관악구 대학동의 내일 오후 6시 기온과 강수확률을 보여줘.
docs/WEATHER.md와 기존 서버 예제를 참고해 필요한 서버 기능을 추가해줘.
인증키는 서버의 KMA_SERVICE_KEY로 관리하고, 내가 직접 입력할 위치를 안내해줘.
로딩·조회 실패·예보 없음 상태와 재시도를 넣어줘.
실제 API 응답과 화면에 표시된 날짜·시간·값을 비교하는 방법도 알려줘.`,
            guide: file('guides/WEATHER.md'),
            // 화면 따라 하기: box는 캡처 이미지 기준 [왼쪽, 위, 너비, 높이](%)입니다. 그림이 없는 단계는 글로만 보여요.
            walkthrough: {
              title: '기상청 인증키 받기',
              steps: [
                { image: '/images/walk/kma/01-login.webp', box: [81.34, 8.81, 8.24, 6.5], text: '[공공데이터포털](https://www.data.go.kr/)에 들어가 오른쪽 위 로그인을 눌러요. 계정이 없으면 옆의 회원가입부터 해요.' },
                { image: '/images/walk/kma/02-search.webp', box: [18.32, 46.25, 50.94, 7.5], text: '검색창에 기상청_단기예보를 입력하고 Enter를 눌러요. 첫 화면의 큰 검색창에 입력해도 돼요.' },
                { image: '/images/walk/kma/03-result.webp', box: [13.09, 28.31, 19.96, 5.06], text: '오픈API 목록 맨 위의 ‘기상청_단기예보 조회서비스’를 눌러요. 아래쪽 ‘(기상청API허브 연계)’는 다른 키라서 고르지 않아요.' },
                { image: '/images/walk/kma/04-apply.webp', box: [14.67, 27, 10.06, 7.5], text: '서비스 페이지에서 활용신청을 눌러요.' },
                { text: '신청 화면에서 활용 목적을 적고 신청을 눌러요. 예) 워크숍 실습', note: '로그인한 뒤의 화면이라 캡처 대신 글로 안내해요.' },
                { text: '마이페이지 → 데이터활용 → Open API → 활용신청 현황에서 이 서비스를 열고 일반 인증키(Decoding)를 복사해요. 키는 Codex 대화창에 붙여 넣지 말고, 다음 과제 페이지에서 안내받은 설정 파일에 직접 넣어요.', note: '승인 직후에는 키가 바로 동작하지 않을 수 있어요. 메뉴 이름은 사이트 개편에 따라 조금 다를 수 있어요.' }
              ]
            },
            hints: [
              '필요한 것은 공공데이터포털의 ‘기상청_단기예보 조회서비스’ 인증키예요. 기상청 API허브의 키와는 다른 키라서, 꼭 [공공데이터포털 서비스 페이지](https://www.data.go.kr/data/15084084/openapi.do)에서 받으세요.',
              '서비스 페이지에서 활용신청 → 활용 목적 입력 → 신청을 누릅니다. 그다음 마이페이지 → 데이터활용 → Open API → 활용신청 현황에서 이 서비스를 누르면 일반 인증키가 보여요. Decoding 값을 쓰는 걸 권장해요. 메뉴 이름은 사이트 개편에 따라 조금 다를 수 있고, 승인 직후에는 키가 바로 동작하지 않을 수 있어요.',
              `1. [공공데이터포털](https://www.data.go.kr/)에 회원가입하고 로그인합니다.
2. [기상청_단기예보 조회서비스](https://www.data.go.kr/data/15084084/openapi.do) 페이지에서 활용신청을 누르고, 활용 목적을 적어 신청합니다. 예) 워크숍 실습
3. 마이페이지 → 데이터활용 → Open API → 활용신청 현황에서 신청한 서비스를 엽니다.
4. 일반 인증키(Decoding)를 복사합니다. 이 키는 Codex 채팅창에 붙여 넣지 않아요.
5. 날씨 요청문을 Codex에 보내고, 내가 설정할 항목을 확인합니다.
6. Codex가 알려준 로컬 설정 파일을 VS Code에서 열어 KMA_SERVICE_KEY 자리에 키를 붙여 넣고 저장합니다.
7. 서버를 Ctrl+C로 끄고 다시 켠 뒤 화면을 새로고침합니다.
8. Codex가 알려준 방법으로 실제 API 응답의 날짜·시간·값과 화면을 비교합니다.`
            ]
          },
          {
            label: '로그인 — Google 계정',
            slideId: 'h2ea000745df279bf_2_267',
            taskSlides: ['ws1_task_20261029_login_1', 'ws1_task_20261029_login_2', 'ws1_task_20261029_login_3'],
            needs: 'Google 앱 등록과 [클라이언트 ID](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid), 로그인 결과를 확인할 서버',
            prompt: `starter의 로그인 영역에 Google 로그인 기능을 구현해줘.
로그인하면 이름과 프로필 사진을 보여주고,
새로고침해도 로그인 상태가 유지되게 해줘. 로그아웃도 추가해줘.
기존 docs/AUTH.md를 참고하고, 필요한 서버와 Google 설정을 설명해줘.
내가 직접 설정해야 할 항목과 순서를 먼저 알려줘.
실제 로그인 확인 없이 완료됐다고 표시하지 마.`,
            guide: file('guides/LOGIN.md'),
            hints: [
              `Google 로그인에는 Google Cloud에서 만든 ‘OAuth 클라이언트 ID(웹 애플리케이션)’가 필요해요. Google이 돌려준 로그인 결과를 확인할 서버도 필요해서 Codex가 서버 기능을 함께 추가해요. 기존 예제의 설정은 [로그인 설정 문서](${file('docs/AUTH.md')})에 있어요.`,
              '[Google Cloud Console](https://console.cloud.google.com/) → 프로젝트 만들기 → Google Auth Platform → 동의 화면(대상은 외부, 테스트 사용자에 내 계정 추가) → Clients → 클라이언트 만들기 → 웹 애플리케이션. 승인된 JavaScript 원본에는 지금 접속한 주소의 앞부분만 경로와 마지막 / 없이 넣어요. 예) http://localhost:5173',
              `1. [Google Cloud Console](https://console.cloud.google.com/)에 내 Google 계정으로 로그인합니다.
2. 위쪽 프로젝트 선택 → 새 프로젝트를 만들고 그 프로젝트를 고릅니다.
3. 위쪽 검색창에 Google Auth Platform을 입력해 엽니다. 시작하기를 눌러 앱 이름과 이메일을 넣고, 대상은 외부를 고릅니다.
4. 대상(Audience) 메뉴의 테스트 사용자에 로그인해 볼 내 Gmail을 추가합니다.
5. 클라이언트(Clients) → 클라이언트 만들기 → 애플리케이션 유형은 웹 애플리케이션을 고릅니다.
6. 승인된 JavaScript 원본에 http://localhost:5173 과 http://localhost 를 추가하고 만들기를 누릅니다.
7. …apps.googleusercontent.com으로 끝나는 클라이언트 ID를 복사해 Codex가 알려준 설정 위치에 넣습니다.
8. 서버를 다시 켜고 내 계정으로 로그인 → 새로고침 → 로그아웃까지 직접 확인합니다.`
            ]
          },
          {
            label: '지도 — Google Maps',
            slideId: 'h2ea000745df279bf_2_421',
            taskSlides: ['ws1_task_20261029_map_1', 'ws1_task_20261029_map_2', 'ws1_task_20261029_map_3'],
            needs: '[Google Maps JavaScript API](https://developers.google.com/maps/documentation/javascript/load-maps-js-api) 사용 설정과 지도 키. 결제 계정 설정과 사용량에 따른 비용을 먼저 확인하세요.',
            prompt: `starter의 지도·위치정보 영역에 Google 지도를 구현해줘.
서울대학교 정문 위치에 마커를 표시하고,
마커를 누르면 장소 이름이 보이게 해줘.
docs/MAPS.md를 참고해서 필요한 API 설정과 비용 발생 가능성을 먼저 설명해줘.
좌표는 확인한 실제 위치를 사용하고, 설정할 항목과 확인 방법을 안내해줘.`,
            guide: file('guides/MAP.md'),
            hints: [
              `지도에는 Google Cloud 프로젝트, 결제 계정, Maps JavaScript API 사용 설정, 브라우저용 지도 키가 필요해요. 결제 계정을 연결해야 하고 사용량에 따라 비용이 생길 수 있으니, 시작 전에 [지도 설정 문서](${file('docs/MAPS.md')})를 확인하세요.`,
              '[Google Cloud Console](https://console.cloud.google.com/) → 프로젝트 선택 → 결제 계정 연결 → API 및 서비스 → 라이브러리에서 Maps JavaScript API 사용 → 사용자 인증 정보 → API 키 만들기. 키를 만든 뒤 꼭 제한을 걸어요. 애플리케이션 제한은 웹사이트(HTTP 리퍼러)에 http://localhost:5173/*, API 제한은 Maps JavaScript API만 고릅니다.',
              `1. [Google Cloud Console](https://console.cloud.google.com/)에 로그인하고 새 프로젝트를 만듭니다.
2. 왼쪽 메뉴 결제에서 결제 계정을 연결합니다. 예산 알림도 함께 설정해 두면 좋아요.
3. API 및 서비스 → 라이브러리에서 “Maps JavaScript API”를 검색해 사용을 누릅니다.
4. API 및 서비스 → 사용자 인증 정보 → 사용자 인증 정보 만들기 → API 키를 누릅니다.
5. 만든 키를 열어 웹사이트 제한에 http://localhost:5173/* 를 넣고, API 제한은 Maps JavaScript API만 고른 뒤 저장합니다.
6. 지도 요청문을 Codex에 보내고, Codex가 알려준 로컬 설정 파일에 키를 넣고 저장합니다.
7. 서버를 다시 켜고 지도, 마커 위치, 마커를 눌렀을 때 나오는 이름을 확인합니다.
8. 회색 화면이나 오류가 나오면 개발자 도구(Windows F12, Mac ⌥⌘I)의 Console 오류 문구를 Codex에 보여주세요.`
            ]
          }
        ],
        expected: '예시 숫자나 가짜 계정이 아니라 실제 서비스의 응답이 화면에 보여요. 처음 받은 기초 틀에는 연결이 없으니, 키와 설정을 마친 뒤에만 결과가 나와요.',
        verify: ['실제 응답을 받았는지 확인한다 — 날씨는 요청한 지역·날짜·시간, 로그인은 내 계정 이름, 지도는 의도한 위치의 마커.', '실패했을 때 실패 상태가 보인다.'],
        stuck: ['인증키·비밀번호는 AI 대화, 공개 HTML/JavaScript, GitHub에 넣지 마세요. Codex가 안내한 로컬 설정 파일에 직접 입력합니다.', '로그인·지도는 지금 접속한 주소가 외부 서비스에 등록한 주소와 같은지 확인하세요.'],
        hints: [
          `처음 받은 기초 틀에는 서버 기능이 없어요. 그래서 어떤 기능이든 외부 서비스에서 키 만들기 → Codex가 서버와 화면 코드 추가 → 키를 내 컴퓨터의 비공개 설정 파일에 직접 입력 → 실제 응답 확인 순서로 진행돼요. 지도는 결제 계정 연결이 필요하다는 점도 고를 때 참고하세요.`,
          `키는 대화창에 붙여 넣지 말고, Codex가 알려준 설정 파일을 VS Code에서 열어 직접 입력·저장해요. .env나 .dev.vars처럼 [.gitignore](${file('.gitignore')})에 들어 있어 GitHub에 올라가지 않는 파일인지 Codex에 확인해 달라고 하세요. 설정을 바꾼 뒤에는 서버를 Ctrl+C로 끄고 다시 켜야 새 값이 적용되는 경우가 많아요.`,
          `1. 기능 하나를 펼쳐 ‘먼저 필요한 것’을 읽습니다.
2. ‘자세한 안내’ 링크에서 준비 항목과 동작 확인 순서를 확인합니다.
3. 요청문을 복사해 Codex에 보냅니다. 지역이나 장소는 내 서비스에 맞게 바꿔도 돼요.
4. Codex가 알려준 순서대로 외부 사이트에서 키나 클라이언트 ID를 만듭니다.
5. Codex가 알려준 로컬 설정 파일에 키를 직접 붙여 넣고 저장합니다.
6. 터미널에서 Ctrl+C로 서버를 끄고, Codex가 알려준 명령으로 다시 켭니다.
7. 브라우저를 새로고침해 실제 결과가 나오는지 봅니다.
8. 안 되면 [문제 해결](${file('guides/TROUBLESHOOTING.md')})을 보고, 화면과 터미널의 오류 문구를 키는 가린 채 Codex에 보여주세요.`
        ]
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
    event: { status: 'scheduled', start: '2026-11-02T18:00:00+09:00', end: '2026-11-02T19:00:00+09:00', place: '서울대학교 관악캠퍼스 56동(자연과학관10) 105호', mapQuery: '서울대학교 56동' },
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
        expect: '버전 숫자가 세 줄 나오면 돼요. node는 v20 이상이어야 해요. 예) v20.11.1 / 10.2.4 / git version 2.45.1',
        fixes: [
          '“인식되지 않습니다”, “command not found”가 나오면 설치가 안 된 거예요. 아래 링크에서 설치한 뒤 터미널을 껐다가 다시 열어요.',
          'Node.js는 LTS 버전을 받으면 npm도 함께 설치돼요.',
          'Mac에서 git을 입력했을 때 개발자 도구 설치 창이 뜨면 “설치”를 눌러요.',
          'Windows에서 npm만 “스크립트를 실행할 수 없습니다” 오류가 나면 npm 대신 npm.cmd를 입력해요. 예) npm.cmd --version'
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
        expect: 'origin 줄에 내 GitHub 아이디가 보이면 돼요. 예) https://github.com/내아이디/openAI_WS.git',
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
        slideId: 'ws2_activity_20261019_01',
        title: '완성본 먼저 눌러보기',
        todo: '[완성본 예제](/examples/workshop2/complete/)에서 카드 두 개를 선택한 뒤 하나만 해제하고, 새로고침해 봅니다.',
        expected: '카드마다 따로 선택·해제되고, 새로고침하면 모두 초기화돼요. 이번 실습의 즐겨찾기는 저장되지 않는 게 정상이에요.',
        verify: ['두 카드를 선택하면 둘 다 선택 상태다.', '하나를 해제해도 다른 하나는 그대로다.'],
        stuck: [],
        hints: [
          '카드마다 ☆ 즐겨찾기 버튼이 있어요. 누르면 ★ 선택됨으로 바뀌고, 다시 누르면 ☆ 즐겨찾기로 돌아와요. 설치나 로그인 없이 브라우저만 있으면 돼요.',
          '새로고침은 Windows Ctrl+R 또는 F5, Mac ⌘+R이에요. 새로고침 후 모두 ☆로 돌아오면 정상이에요. 내가 고칠 [시작본 예제](/examples/workshop2/starter/)도 열어 보세요. 시작본에는 아직 즐겨찾기 버튼이 없어요.'
        ]
      },
      {
        id: 'add-favorite',
        slideId: 'ws2_activity_20261019_07',
        title: 'Codex에게 즐겨찾기 추가 요청하기',
        todo: `[내 Fork](${file('docs/PARTICIPANT.md')})를 연 VS Code에서 Codex에 아래 요청문을 붙여 넣습니다. 수정은 starter 폴더에서만 진행하고, [complete](/examples/workshop2/complete/)는 비교용으로만 봅니다.`,
        prompt: `workshop2/starter/의 모임 카드에 즐겨찾기 버튼을 추가해줘.
클릭하면 선택되고, 다시 누르면 해제해줘.
카드별로 독립적으로 동작하게 해줘.
새로고침하면 초기화해. DB와 localStorage는 쓰지 마.
기존 모임 정보와 레이아웃은 유지해줘.
수정할 파일과 확인 방법을 알려줘.`,
        expected: 'Codex가 workshop2/starter의 파일을 수정하고, 바뀐 파일과 확인 방법을 알려줘요.',
        verify: ['카드 A 선택 → 선택 표시가 보인다.', '카드 B 선택 → A와 B 모두 선택 상태다.', '카드 A 다시 클릭 → A만 해제되고 B는 유지된다.', '새로고침 → 둘 다 초기화된다.', '카드 제목·시간·장소가 그대로이고 브라우저 오류가 없다.'],
        stuck: ['화면이 바뀌지 않으면 http://localhost:5173/workshop2/starter/ (내 로컬 화면)를 보고 있는지 확인하세요.'],
        hints: [
          'Fork·Clone을 아직 안 했다면 이 페이지의 ‘시작 전 확인’ 도움말부터 따라 하세요. VS Code에서 연 폴더가 내 Fork를 Clone한 openAI_WS 폴더여야 Codex가 workshop2/starter를 찾을 수 있어요.',
          '보통 workshop2/starter/app.js가 바뀌고, 버튼 모양 때문에 styles.css도 바뀔 수 있어요. npm run dev로 서버를 켠 상태에서 http://localhost:5173/workshop2/starter/ 를 새로고침해 확인해요. 결과가 헷갈리면 [완성본 예제](/examples/workshop2/complete/)와 같은 순서로 눌러 비교해요.',
          `1. VS Code에서 File → Open Folder로 Clone한 openAI_WS 폴더를 엽니다.
2. 메뉴 Terminal → New Terminal을 열고 npm run dev를 입력합니다. Windows에서 스크립트 오류가 나면 npm.cmd run dev를 입력해요.
3. 브라우저에서 http://localhost:5173/workshop2/starter/ 를 열어 카드 3개를 확인합니다.
4. Codex 아이콘을 눌러 대화창을 엽니다. 안 보이면 명령 팔레트(Windows Ctrl+Shift+P, Mac ⌘+Shift+P)에서 Codex: Open Codex Sidebar를 실행해요.
5. 이 단계의 요청문을 그대로 붙여 넣고 Enter를 누릅니다.
6. Codex가 파일 수정 허락을 물으면 workshop2/starter 안의 파일인지 보고 허용합니다.
7. 브라우저를 새로고침하고 이 단계의 ‘확인’ 다섯 가지를 차례로 눌러 봅니다.
8. 다르게 동작하면 무엇이 달랐는지 그대로 Codex에 말하고 고쳐 달라고 합니다.`
        ]
      },
      {
        id: 'record',
        slideId: 'ws2_activity_20261019_14',
        title: '변경을 기록하고 GitHub에 올리기',
        todo: 'VS Code [Source Control](https://code.visualstudio.com/docs/sourcecontrol/overview)에서 바뀐 파일을 열어 비교하고, 이번 기능의 파일만 Stage해서 Commit한 뒤 Push합니다. 터미널을 쓴다면 git status로 실제 파일명을 먼저 확인하세요.',
        commands: `git status
git add workshop2/starter/app.js
git commit -m "Add favorites to meetup cards"
git push`,
        expected: '내 GitHub Fork의 같은 브랜치에서 방금 쓴 commit 메시지와 바뀐 파일이 보여요.',
        verify: ['HTML/CSS도 바꿨다면 그 파일도 함께 추가했다.', '원본 운영진 저장소가 아니라 내 Fork에 올렸다.'],
        stuck: ['Push 인증이 실패하면 로그인 계정, origin 주소, 브랜치를 확인하세요. 강제 Push는 하지 않습니다.', '인터넷이 안 되면 로컬 commit과 화면까지 남기고, 온라인 확인은 Studio Session에서 마무리하세요.'],
        hints: [
          'Source Control은 VS Code 왼쪽 막대의 갈림길 모양 아이콘이에요(Windows Ctrl+Shift+G, Mac ⌃⇧G). 바뀐 파일 이름을 누르면 바꾸기 전과 후를 나란히 비교해 보여줘요. Stage는 이번 기록에 넣을 파일 고르기, Commit은 기록하기, Push는 GitHub에 올리기예요.',
          '파일 이름에 마우스를 올리면 나오는 + 를 눌러 Stage해요. 위쪽 메시지 칸에 무엇을 바꿨는지 쓰고 Commit을 누른 뒤, 나타나는 Sync Changes(또는 … 메뉴 → Push)를 눌러요. “Stage된 변경이 없다”는 창이 뜨면 아직 + 를 누르지 않은 거예요. 취소하고 파일부터 Stage하세요.',
          `1. VS Code 왼쪽 Source Control 아이콘을 누릅니다.
2. Changes 아래 파일을 하나씩 눌러 바뀐 줄을 읽어 봅니다.
3. 이번 기능 파일(workshop2/starter 안의 파일) 옆 + 를 눌러 Staged Changes로 옮깁니다. 다른 파일은 그대로 둡니다.
4. 위쪽 메시지 칸에 바꾼 내용을 한 줄로 씁니다. 예) Add favorites to meetup cards
5. Commit 버튼을 누릅니다.
6. Sync Changes 또는 … → Push를 누릅니다. 처음이면 브라우저에서 GitHub 로그인과 허용을 요청할 수 있어요.
7. github.com/내아이디/openAI_WS 를 열고 파일 목록 위 최근 commit 메시지를 눌러 방금 기록과 바뀐 파일을 확인합니다.
8. 주소에 내 아이디 대신 aeron1120이 보이면 원본이에요. 멈추고 ‘시작 전 확인’의 Fork 단계를 다시 보세요.`
        ]
      },
      {
        id: 'recover',
        slideId: 'ws2_activity_20261019_17',
        title: '5분 복구 연습 — 실수를 되돌리기',
        todo: `저장소 루트에서 [연습용 저장소](${file('docs/RECOVERY.md')})를 만들고, 일부러 망가뜨린 마지막 commit을 되돌립니다. 이 연습은 원본 GitHub에 올라가지 않는 별도 폴더에서만 진행해요.`,
        commands: `node scripts/prepare-recovery.mjs
cd workshop2/recovery-practice
git status
git log --oneline -2
git revert --no-edit HEAD
git log --oneline -3`,
        expected: 'http://localhost:5173/workshop2/recovery-practice/ 에서 눌리지 않던 즐겨찾기 버튼이 새로고침 후 다시 작동해요. 과거 commit 두 개는 남고 Revert commit이 하나 추가돼요.',
        verify: ['되돌리기 전 최신 commit 메시지가 practice: accidentally disable favorites 였다.', 'git log에 새 Revert commit이 보인다.'],
        stuck: ['충돌이 나면 멈추고 도움을 요청하세요. git reset --hard나 강제 Push로 해결하지 않습니다.', '이미 연습 폴더가 있으면 준비 스크립트가 덮어쓰지 않고 멈춰요. 다시 하려면 새 Clone에서 준비하세요.'],
        hints: [
          '“저장소 루트”는 package.json이 있는 openAI_WS 폴더예요. VS Code에서 그 폴더를 열고 터미널을 열면 바로 루트예요. git revert는 마지막 commit을 지우지 않고, 그 변경을 되돌리는 새 commit을 하나 더 만드는 명령이에요. [공식 설명](https://git-scm.com/docs/git-revert)도 있어요.',
          '화면 확인용 서버(npm run dev)는 한 터미널에 켜 두고, 이 단계의 명령은 터미널 패널의 + 로 연 새 터미널에서 입력해요. cd 다음 명령은 모두 recovery-practice 폴더 안에서 실행돼야 해요. Git이 이름·이메일을 요구하면 이 폴더 안에서 git config user.name과 user.email을 설정한 뒤 다시 실행해요.',
          `1. VS Code에서 openAI_WS 폴더를 열고, 터미널에서 npm run dev를 실행해 둡니다.
2. 터미널 패널 오른쪽 위 + 를 눌러 새 터미널을 엽니다.
3. node scripts/prepare-recovery.mjs 를 입력합니다. “Recovery exercise ready”가 나오면 준비 완료예요.
4. 브라우저에서 http://localhost:5173/workshop2/recovery-practice/ 를 열고 즐겨찾기 버튼이 눌리지 않는지 확인합니다.
5. 새 터미널에 cd workshop2/recovery-practice 를 입력합니다.
6. git status 에 nothing to commit이, git log --oneline -2 맨 위에 practice: accidentally disable favorites가 보이는지 확인합니다.
7. git revert --no-edit HEAD 를 입력하고, git log --oneline -3 에 Revert로 시작하는 줄이 생겼는지 봅니다.
8. 브라우저를 새로고침해 버튼이 다시 눌리면 성공이에요. 끝나면 cd ../.. 로 저장소 루트에 돌아옵니다.`
        ]
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
