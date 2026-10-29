import { workshop2 } from './workshop2.mjs';
// 워크숍 회차별 콘텐츠. 상태 값의 의미는 portal/README.md의 '상태 값' 표를 보세요.
// - event.status: 'done'(진행 완료) | 'scheduled'(일정 확정) | 'tbd'·'planning'(준비 중)
//   start·end가 있으면 시각에 맞춰 자동으로 바뀝니다: 끝난 뒤 '진행 완료'.
// - recruitment.open이 true이고 url이 있을 때만 '신청하기' 버튼이 나타납니다.
// - materials: 'open'(자료 열림) | 'planning'(자료 준비 중). 'planning'이면 미션·자료 영역을 그리지 않습니다.
// - materialsOpenAt: 이 시각 전에는 미션·슬라이드·예제를 숨기고 '○월 ○일 ○시에 열려요'를 보여줍니다.
//   배포된 사이트가 요청마다 현재 시각을 확인하므로, 이 시각에 다시 배포하지 않아도 자동으로 열립니다.
// - exampleDirs: 자료가 열릴 때 /examples/ 아래에 함께 공개할 저장소 폴더.
// - event.mapQuery: 홈의 지도에서 찾을 장소 이름(예: '서울대학교 56동'). Google 지도에서 맞는 건물이 나오는지 확인하고 적으세요. 없으면 지도를 그리지 않습니다.
// - event.mapImage: (선택) 네이버 지도에서 장소를 찍은 16:10 그림(public/images/place/). 있으면 홈에 이 그림을 보여 주고 누르면 네이버 지도가 열립니다.
// - 확정되지 않은 값은 null로 둡니다. 임의의 주소나 '#'을 넣지 마세요.
// - missions[].slideId: 이 단계의 강의가 시작되는 학생용 슬라이드 페이지 ID(Google Slides).
// - missions[].taskSlides: 이 과제의 슬라이드 페이지 ID 목록(과제 페이지). 수업 화면의 '과제' 보기에서 이 페이지만 보여줍니다.
//   없으면 slideId 한 장만 보여줍니다. 선택지(options)에도 따로 적을 수 있어요. 페이지 ID는 portal/slides/manifest.json에서 찾으세요.
// - hintSlides: 힌트 1·2·3 순서대로 '관련 실습 페이지 보기'가 열 과제 페이지 ID. taskSlides 안의 ID만 쓸 수 있고, 버튼이 필요 없는 힌트는 뒤에서 빼면 됩니다.
//   과제 페이지의 '글로 읽기' 내용은 content/practice-pages.mjs에 있습니다.
// - walkthrough: { title, steps: [{ image?, box?, text, note?, blank? }] } 힌트 상자의 '화면으로 따라 하기'. 실제 화면 캡처에서 box(%) 자리를 강조합니다.
//   그림이 없는 단계는 blank 문구(없으면 '로그인한 뒤의 화면이에요')를 대신 보여줍니다.
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
    prepare: [
      '노트북과 충전기',
      'Codex를 쓸 수 있는 ChatGPT 계정',
      '만들고 싶은 서비스 한 문장',
      'Node.js 20 이상 (서버로 실행할 때만)'
    ],
    preview: null,
    video: null,
    resources: [
      { label: '기초 틀 받기', kind: 'starter', audience: 'student', url: repo, checked: '2026-10-27', note: 'GitHub → Code → Download ZIP' },
      { label: '시작 안내', kind: 'guide', audience: 'student', url: file('guides/START-HERE.md'), checked: '2026-10-27' },
      { label: '기능별 안내', kind: 'guide', audience: 'student', url: file('guides/README.md'), checked: '2026-10-27', note: '로그인 · 지도 · 날씨' },
      { label: '운영진 예제 ‘틈’', kind: 'demo', audience: 'student', url: 'https://openai-ws-workshop1.a01085519047.workers.dev/versions/', checked: '2026-10-27', note: '발표용 예제 · 로그인·지도 확인 중' },
      { label: '실습 슬라이드', kind: 'slides', audience: 'student', url: 'https://docs.google.com/presentation/d/1pUcnsVa0Ab_z_ZxbVnO6cCHCIcTYVVvz10C9Tt52xuU/edit?usp=sharing', checked: '2026-10-27', note: '실습 부분만' }
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
        hintSlides: ['ws1_task_20261029_open_1', 'ws1_task_20261029_open_2'],
        title: '기초 틀 받고 화면 열기',
        todo: `[GitHub 저장소](${repo})에서 Code → Download ZIP을 누르고 압축을 모두 풉니다. starter 폴더 안의 index.html을 브라우저로 엽니다.`,
        expected: '“이곳에 나의 아이디어를 담아보세요.” 제목과 로그인·지도·날씨·나만의 기능 박스가 보여요. 설치와 API 키는 아직 필요 없어요.',
        verify: ['박스마다 “아직 연결 전” 표시가 보인다.', '“Codex에 이렇게 요청해보세요”를 펼치면 요청문이 나온다.'],
        stuck: ['ZIP 파일 안에서 바로 열면 스타일이 빠질 수 있어요. 압축을 모두 푼 뒤 다시 여세요.', '글자만 보이면 코드 편집기가 아니라 브라우저로 열었는지 확인하세요.'],
        walkthrough: {
          title: '기초 틀 받아서 열기',
          steps: [
            { image: '/images/walk/starter/01-github-code.webp', box: [64.46, 32.13, 8.98, 5], text: `[GitHub 저장소](${repo})를 열고 파일 목록 위의 초록색 Code 버튼을 눌러요.`, note: 'GitHub에 로그인하지 않아도 돼요.' },
            { image: '/images/walk/starter/02-github-zip.webp', box: [42.19, 66.5, 30.63, 5], text: '메뉴 맨 아래 Download ZIP을 눌러요. 다운로드 폴더에 openAI_WS-main.zip이 저장돼요.' },
            { image: '/images/walk/starter/03-unzip.webp', box: [28.28, 35.25, 25.47, 5.25], text: '다운로드 폴더에서 ZIP 파일을 오른쪽 클릭하고 모두 압축 풀기...를 누른 뒤, 열린 창에서 압축 풀기를 눌러요.', note: 'Mac은 ZIP 파일을 두 번 클릭하면 같은 이름의 폴더가 생겨요. 그림은 Windows 11 탐색기를 따라 그린 예시예요.' },
            { image: '/images/walk/starter/04-root.webp', box: [17.19, 49.5, 82.03, 5], text: '새로 생긴 openAI_WS-main 폴더에서 starter 폴더를 두 번 클릭해요.', note: '안에 openAI_WS-main 폴더가 한 번 더 있으면 그 안으로 들어가요. README.md·package.json이 함께 보이는 곳이 맞는 위치예요.' },
            { image: '/images/walk/starter/05-starter.webp', box: [17.19, 25.5, 82.03, 5], text: 'index.html을 두 번 클릭해요.', note: '확장자가 안 보이면 브라우저 아이콘이 붙은 index 파일을 골라요. 메모장이 열리면 오른쪽 클릭 → 연결 프로그램 → Chrome 또는 Edge를 골라요.' },
            { image: '/images/walk/starter/06-open-file.webp', box: [6.88, 31.62, 57.03, 17.25], text: '브라우저에 “이곳에 나의 아이디어를 담아보세요.”와 기능 박스가 보이면 성공이에요.' }
          ]
        },
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
        hintSlides: ['ws1_task_20261029_local_1', 'ws1_task_20261029_local_1'],
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
        walkthrough: {
          title: 'Codex 앱에서 폴더 열고 실행하기',
          steps: [
            { image: '/images/walk/codex/01-chatgpt-home.webp', box: [3.5, 7.9, 8.8, 5], text: 'ChatGPT 앱을 열고 왼쪽 위의 ChatGPT ∨를 눌러요.', note: 'VS Code를 쓴다면 아래 힌트 2·3을 보세요.' },
            { image: '/images/walk/codex/02-switch-codex.webp', box: [16.4, 61.8, 58, 18], text: '메뉴에서 Codex를 골라요.' },
            { image: '/images/walk/codex/03-codex-home.webp', box: [35, 80, 9.6, 4.6], text: '“무엇을 만들까요?” 화면이 나오면 입력칸 위의 프로젝트 선택을 눌러요.' },
            { image: '/images/walk/codex/04-project-settings.webp', box: [31.51, 15.25, 34.23, 4.68], text: '프로젝트 설정 창이 열리면 프로젝트 이름에 openAI_WS-main을 적어요.', note: '이름은 알아보기 쉽게 바꿔도 돼요.' },
            { image: '/images/walk/codex/04-project-settings.webp', box: [31.51, 70.47, 34.23, 11.25], text: '소스 폴더의 폴더 추가를 누르고, 압축을 푼 openAI_WS-main 폴더를 고르면 목록에 이렇게 생겨요.', note: 'starter 폴더가 아니라 그 바로 위 폴더예요. 안에 README.md·package.json·starter가 함께 보여야 해요.' },
            { image: '/images/walk/codex/04-project-settings.webp', box: [61.1, 86.17, 5.03, 4.85], text: '저장을 눌러요.' },
            { image: '/images/walk/codex/03-codex-home.webp', box: [34.2, 84.4, 51.6, 11.6], text: '입력칸 위 프로젝트 자리에 openAI_WS-main이 보이면, 이 단계의 요청문을 붙여 넣고 보내요.', note: 'Codex가 명령 실행 허락을 물으면 내용을 읽고 허용해요.' },
            { image: '/images/walk/codex/05-localhost.webp', box: [8.91, 5.19, 85, 5], text: 'Codex가 서버를 켠 뒤 알려준 주소 http://localhost:5173/starter/ 를 브라우저 주소창에 입력해요. 과제 1과 같은 화면이 나오면 성공이에요.', note: '서버를 끌 때는 서버가 실행 중인 터미널에서 Ctrl+C를 눌러요.' }
          ]
        },
        hints: [
          `“저장소 전체 폴더”는 README.md·package.json·starter가 함께 보이는 openAI_WS-main 폴더예요. starter 폴더만 열면 Codex가 실행 방법을 찾지 못해요. 서버를 켜려면 [Node.js](https://nodejs.org/ko/download) 20 이상이 필요해요.`,
          'Codex 앱: ChatGPT 앱 왼쪽 위 ChatGPT ∨ → Codex → 입력칸 위 프로젝트 선택 → openAI_WS-main 선택 → 요청문 보내기. VS Code: File → Open Folder → openAI_WS-main 선택 → 왼쪽 Extensions에서 OpenAI가 배포한 Codex 확장 설치·로그인 → Codex 아이콘 클릭. 아이콘이 안 보이면 명령 팔레트(Windows Ctrl+Shift+P, Mac ⌘+Shift+P)에서 Codex: Open Codex Sidebar를 실행해요.',
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
        hintSlides: ['ws1_task_20261029_change_1', 'ws1_task_20261029_change_2'],
        title: '작은 변화 하나 만들기',
        todo: `내 서비스의 [이름과 소개 문구](${file('starter/index.html')})를 바꿔 달라고 요청합니다. 예시 문장은 내 아이디어로 바꿔도 좋아요.`,
        prompt: `starter의 사이트 이름을 ‘나의 캠퍼스’로 바꾸고,
소개 문구를 ‘학교생활에 필요한 정보를 한곳에 모으는 서비스’로 바꿔줘.
다른 기능 박스는 그대로 두고, 바뀐 파일과 확인 방법을 짧게 알려줘.`,
        expected: '새로고침하면 사이트 이름과 소개 문구가 바뀌어 있어요.',
        verify: ['바꾸려던 문구만 바뀌고 다른 박스는 그대로다.', '브라우저 창을 좁혀도 글자가 잘리지 않는다.'],
        stuck: ['바꿨는데 화면이 그대로면 파일 저장 후 새로고침했는지, 운영진 예제가 아니라 내 localhost 화면을 보고 있는지 확인하세요.'],
        walkthrough: {
          title: '문구 바꾸고 화면에서 확인하기',
          steps: [
            { image: '/images/walk/codex/03-codex-home.webp', box: [34.2, 84.4, 51.6, 11.6], text: '과제 2에서 쓰던 Codex 대화 입력칸에 이 단계의 요청문을 붙여 넣고 보내요. ‘나의 캠퍼스’와 소개 문장은 내 아이디어로 바꿔도 돼요.', note: '새 대화여도 같은 openAI_WS-main 프로젝트면 괜찮아요.' },
            { image: '/images/walk/change/01-changed.webp', box: [6.88, 12.38, 17.5, 7.12], text: 'Codex가 수정을 마치면 localhost 화면을 새로고침(Windows Ctrl+R, Mac ⌘+R)해요. 왼쪽 위 사이트 이름과 탭 제목이 바뀌었는지 봐요.', note: '그림은 요청문 예시대로 바꾼 모습이에요.' },
            { image: '/images/walk/change/01-changed.webp', box: [6.88, 48.38, 57.03, 9.25], text: '큰 제목 아래 소개 문구도 바뀌었는지 봐요. 로그인·지도·날씨 박스는 그대로여야 해요.' },
            { image: '/images/walk/change/02-narrow.webp', box: [33.28, 4.5, 33.44, 91], text: '브라우저 창 가장자리를 끌어 휴대폰 너비만큼 좁혀도 글자가 겹치거나 잘리지 않는지 확인해요.' }
          ]
        },
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
        hintSlides: ['ws1_task_20261029_choose', 'ws1_task_20261029_choose'],
        title: '내 서비스에 필요한 기능 하나 연결하기',
        todo: `[로그인](${file('guides/LOGIN.md')})·[지도](${file('guides/MAP.md')})·[날씨](${file('guides/WEATHER.md')}) 중 내 서비스에 필요한 것 하나만 고릅니다. 각 기능은 외부 서비스의 계정·키 설정이 필요하므로, Codex가 먼저 준비 항목을 설명하게 하세요.`,
        options: [
          {
            label: '날씨 — 기상청 단기예보',
            slideId: 'h2ea000745df279bf_2_126',
            taskSlides: ['ws1_task_20261029_weather_1', 'ws1_task_20261029_weather_2', 'ws1_task_20261029_weather_3'],
            hintSlides: ['ws1_task_20261029_weather_1', 'ws1_task_20261029_weather_1'],
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
                { image: '/images/walk/kma/02-search.webp', box: [32.24, 30.31, 35.18, 9.08], text: '로그인한 첫 화면 가운데 검색창에 기상청 단기예보 서비스를 입력하고 ↑ 버튼을 눌러요.' },
                { image: '/images/walk/kma/03-result.webp', box: [24.3, 26.2, 15.2, 4], text: '검색 결과 맨 위의 ‘기상청 단기예보 조회서비스’를 눌러요. 바로 아래 ‘(기상청API허브 연계)’는 다른 키라서 고르지 않아요.' },
                { image: '/images/walk/kma/04-apply.webp', box: [25.1, 60.09, 5.95, 4.28], text: '서비스 페이지에서 활용신청을 눌러요.' },
                { text: '신청 화면에서 활용 목적을 적고 신청을 눌러요. 예) 워크숍 실습', note: '이 서비스는 자동승인이라 신청하면 바로 승인돼요.', blank: '📝 신청서 화면은 글로 안내해요' },
                { image: '/images/walk/kma/05-mypage.webp', box: [83.29, 1.93, 6.13, 3.04], text: '오른쪽 위 마이페이지를 누르면 활용신청 현황이 나와요.' },
                { image: '/images/walk/kma/05-mypage.webp', box: [25.71, 83.29, 64.23, 16.3], text: '목록에서 [승인] 기상청_단기예보 조회서비스를 눌러요.' },
                { image: '/images/walk/kma/06-key.webp', box: [22.78, 83.99, 46.77, 4.1], text: '서비스 정보의 일반 인증키를 복사해요. 키는 Codex 대화창에 붙여 넣지 말고, 다음 과제 페이지에서 안내받은 설정 파일에 직접 넣어요.', note: '그림의 키는 가렸어요. 승인 직후에는 키가 바로 동작하지 않을 수 있어요.' }
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
            hintSlides: ['ws1_task_20261029_login_1', 'ws1_task_20261029_login_1'],
            needs: 'Google 앱 등록과 [클라이언트 ID](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid), 로그인 결과를 확인할 서버',
            prompt: `starter의 로그인 영역에 Google 로그인 기능을 구현해줘.
로그인하면 이름과 프로필 사진을 보여주고,
새로고침해도 로그인 상태가 유지되게 해줘. 로그아웃도 추가해줘.
기존 docs/AUTH.md를 참고하고, 필요한 서버와 Google 설정을 설명해줘.
내가 직접 설정해야 할 항목과 순서를 먼저 알려줘.
실제 로그인 확인 없이 완료됐다고 표시하지 마.`,
            guide: file('guides/LOGIN.md'),
            walkthrough: {
              title: 'Google 로그인 클라이언트 ID 만들기',
              steps: [
                { image: '/images/walk/login/01-console.webp', box: [13.56, 8.36, 9.39, 3.78], text: '[Google Cloud Console](https://console.cloud.google.com/)에 내 Google 계정으로 로그인하고, 위쪽 프로젝트 버튼에서 새 프로젝트를 만들어 골라요.', note: '그림의 openai-ws1 자리에 내 프로젝트 이름이 보여요.' },
                { image: '/images/walk/login/01-console.webp', box: [29.28, 8.36, 49.37, 3.78], text: '위쪽 검색창에 auth를 입력해요.' },
                { image: '/images/walk/login/02-search.webp', box: [10.41, 16.37, 25.65, 5.14], text: '검색 결과 맨 위의 Google Auth Platform을 눌러요.' },
                { image: '/images/walk/login/03-clients.webp', box: [0.21, 30.31, 17.57, 4], text: '처음이라면 시작하기에서 앱 이름·지원 이메일을 넣고 대상은 외부를 골라요. 그다음 왼쪽 대상 메뉴의 테스트 사용자에 로그인해 볼 내 Gmail을 추가해요.' },
                { image: '/images/walk/login/03-clients.webp', box: [29.58, 17.42, 10.83, 3.72], text: '왼쪽 클라이언트 메뉴에서 + 클라이언트 만들기를 눌러요.' },
                { image: '/images/walk/login/04-create-client.webp', box: [20.52, 23.7, 36.01, 4.8], text: '애플리케이션 유형은 웹 애플리케이션을 고르고, 이름은 알아보기 쉽게 적어요.' },
                { image: '/images/walk/login/04-create-client.webp', box: [20.31, 51.84, 17.79, 12.73], text: '승인된 JavaScript 원본의 + URI 추가를 눌러 http://localhost:5173 을 넣고, 한 번 더 눌러 http://localhost 도 넣어요.', note: '/starter/나 마지막 /는 붙이지 않아요. 리디렉션 URI는 Codex가 필요하다고 할 때만 넣어요.' },
                { text: '맨 아래 만들기를 누르면 …apps.googleusercontent.com으로 끝나는 클라이언트 ID가 나와요. Codex가 알려준 설정 위치에 직접 넣어요.', note: '클라이언트 보안 비밀번호가 함께 나오면 대화창이나 공개 파일에 붙이지 말고 비공개 설정 파일에만 넣어요.', blank: '🔑 클라이언트 ID가 적힌 창이 열려요' }
              ]
            },
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
            hintSlides: ['ws1_task_20261029_map_1', 'ws1_task_20261029_map_1'],
            needs: '결제 없이 받는 [지도 데모 키](https://developers.google.com/maps/demo-key?hl=ko). 개인 Gmail 계정이 필요하고, 하루 한도를 넘으면 다음 날까지 멈출 뿐 요금은 나오지 않아요.',
            prompt: `starter의 지도·위치정보 영역에 Google 지도를 구현해줘.
서울대학교 정문 위치에 마커를 표시하고,
마커를 누르면 장소 이름이 보이게 해줘.
지도 키는 결제 없이 받은 지도 데모 키, Map ID는 DEMO_MAP_ID를 쓸 거야.
docs/MAPS.md를 참고해 키를 넣을 위치와 확인 방법을 안내해줘.
좌표는 확인한 실제 위치를 사용해줘.`,
            guide: file('guides/MAP.md'),
            walkthrough: {
              title: '결제 없이 지도 데모 키 받기',
              steps: [
                { image: '/images/walk/map/01-demo.webp', box: [67.02, 51.73, 12.24, 6], text: '[지도 데모 키 페이지](https://developers.google.com/maps/demo-key?hl=ko)를 열고 데모 키 가져오기를 눌러요.', note: '결제 정보 없이 받는 무료 테스트용 키예요. 하루 사용량을 넘으면 다음 날까지 멈출 뿐 요금은 나오지 않아요.' },
                { image: '/images/walk/map/02-login.webp', box: [51.4, 34.6, 30.6, 7.5], text: '개인 Gmail 계정으로 로그인해요.', note: '학교·회사에서 받은 Google Workspace 계정으로는 데모 키를 받을 수 없어요.' },
                { text: '지도 데모 키 약관을 읽고 동의하면 키가 바로 보여요. 키를 복사해요.', note: '키를 다시 찾는 방법이 적힌 메일도 와요. 나중에는 Google Cloud 콘솔에서 찾을 수 있어요.', blank: '🔑 약관에 동의하면 키가 보여요' },
                { image: '/images/walk/codex/03-codex-home.webp', box: [34.2, 84.4, 51.6, 11.6], text: '지도 요청문을 Codex에 보내요. 키는 Codex가 알려준 비공개 설정 파일에 직접 넣어요.', note: '키는 대화창에 붙이지 않아요. Map ID는 테스트용 DEMO_MAP_ID를 써요.' },
                { text: '서버를 다시 켜고 새로고침해 서울대학교 정문에 마커가 보이는지, 마커를 누르면 장소 이름이 나오는지 확인해요.', note: '회색 화면이나 오류가 나오면 개발자 도구(Windows F12, Mac ⌥⌘I)의 Console 오류 문구를 키는 가린 채 Codex에 보여줘요.', blank: '🗺️ 내 화면에서 지도와 마커를 확인해요' }
              ]
            },
            hints: [
              `지도에는 Maps JavaScript API를 쓸 브라우저용 지도 키가 필요해요. 실습은 결제 정보 없이 받는 [지도 데모 키](https://developers.google.com/maps/demo-key?hl=ko)로 해요. 하루 한도를 넘으면 다음 날까지 멈출 뿐 요금은 나오지 않아요. 키를 넣는 곳은 [지도 설정 문서](${file('docs/MAPS.md')})에 있어요.`,
              '[지도 데모 키 페이지](https://developers.google.com/maps/demo-key?hl=ko) → 데모 키 가져오기 → 개인 Gmail로 로그인 → 약관 동의 → 화면에 나온 키 복사. 학교·회사에서 받은 Google Workspace 계정으로는 받을 수 없어요. 키를 다시 찾을 때는 함께 온 안내 메일을 보거나 Google Cloud 콘솔에서 찾아요.',
              `1. [지도 데모 키 페이지](https://developers.google.com/maps/demo-key?hl=ko)를 열고 데모 키 가져오기를 누릅니다.
2. 개인 Gmail 계정으로 로그인합니다. 예) ○○○@gmail.com
3. 지도 데모 키 약관을 읽고 동의하면 키가 바로 보여요. 키를 복사합니다.
4. 지도 요청문을 Codex에 보내고, 내가 설정할 항목을 확인합니다.
5. Codex가 알려준 비공개 설정 파일에 키를 직접 붙여 넣고 저장합니다. 키는 대화창에 붙이지 않아요.
6. 서버를 Ctrl+C로 끄고 다시 켠 뒤 새로고침합니다.
7. 지도, 마커 위치, 마커를 눌렀을 때 나오는 이름을 확인합니다.
8. 회색 화면이나 오류가 나오면 개발자 도구(Windows F12, Mac ⌥⌘I)의 Console 오류 문구를 키는 가린 채 Codex에 보여주세요.`
            ]
          }
        ],
        expected: '예시 숫자나 가짜 계정이 아니라 실제 서비스의 응답이 화면에 보여요. 처음 받은 기초 틀에는 연결이 없으니, 키와 설정을 마친 뒤에만 결과가 나와요.',
        verify: ['실제 응답을 받았는지 확인한다 — 날씨는 요청한 지역·날짜·시간, 로그인은 내 계정 이름, 지도는 의도한 위치의 마커.', '실패했을 때 실패 상태가 보인다.'],
        stuck: ['인증키·비밀번호는 AI 대화, 공개 HTML/JavaScript, GitHub에 넣지 마세요. Codex가 안내한 로컬 설정 파일에 직접 입력합니다.', '로그인·지도는 지금 접속한 주소가 외부 서비스에 등록한 주소와 같은지 확인하세요.'],
        hints: [
          `처음 받은 기초 틀에는 서버 기능이 없어요. 그래서 어떤 기능이든 외부 서비스에서 키 만들기 → Codex가 서버와 화면 코드 추가 → 키를 내 컴퓨터의 비공개 설정 파일에 직접 입력 → 실제 응답 확인 순서로 진행돼요. 지도는 결제 없이 지도 데모 키로 시작할 수 있지만 개인 Gmail 계정이 필요하다는 점도 고를 때 참고하세요.`,
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
    share: '실제 연결 1개 + 내가 바꾼 문구·배치 1개'
  },
  workshop2,
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
