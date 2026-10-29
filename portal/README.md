# 학생 참여 포털 · OpenAI Student Collective | SNU

학기 로드맵, 회차별 실습 가이드, Studio Session, Showcase, 운영·협력 안내를 모은 정적 사이트입니다.

- 공개 주소: https://snu-student-collective.pages.dev/
- 배포: Cloudflare Pages 프로젝트 `snu-student-collective` (직접 업로드, Git 연결 없음)
- 외부 패키지 없음. Node.js 20 이상만 있으면 됩니다. `npm install`이 필요하지 않습니다.
- 글꼴은 Pretendard를 jsDelivr에서 불러오고, 불러오지 못하면 기기 기본 글꼴로 보입니다.

화면은 짧게 유지합니다. 홈 카드에는 제목·한 줄 설명·체크 3개·버튼만 두고, 자세한 설명은 회차 페이지의 접히는 미션 안에 넣습니다.

이 폴더는 **운영진이 관리하는 안내 사이트**입니다. 학생이 고치는 기초 틀은 `../starter/`, 기존 워크숍 예제는 `../workshop1/`, `../workshop2/`입니다. 포털 빌드와 배포는 기존 Workshop Worker(`openai-ws-workshop1`)나 다른 Pages 프로젝트를 건드리지 않습니다.

## 실행·검사·배포

저장소 루트에서 실행합니다.

| 하려는 일 | 명령 |
| --- | --- |
| 미리보기 (빌드 후 http://localhost:5174/) | `npm run dev:portal` |
| 특정 시각의 화면 미리보기 (PowerShell) | `$env:PORTAL_NOW='2026-11-02T18:00:00+09:00'; npm.cmd run dev:portal` |
| 빌드만 (`portal/dist/`) | `npm run build:portal` |
| 자동 검사 | `npm run test:portal` |
| 외부 링크를 로그아웃 상태로 확인 | `npm run check:portal-links` |
| 공유 이미지(`public/og.png`) 다시 만들기 | `npm run og:portal` (Edge 또는 Chrome 필요) |
| 배포 | `npm run deploy:portal` |

Windows PowerShell에서 `npm.ps1` 실행이 막히면 `npm.cmd run dev:portal`처럼 실행합니다. 콘텐츠를 고친 뒤 미리보기 서버를 다시 시작하세요.

배포 전 한 번 `npx --yes wrangler@4.152.0 login`으로 Cloudflare에 로그인합니다. `deploy:portal`은 검사 → 빌드 → `portal/dist` 업로드 순서로 진행합니다. 프로젝트는 이미 만들어져 있으므로 `--force` 같은 추가 옵션은 필요 없습니다.

## 내용 고치기

본문과 일정·링크는 **`content/` 폴더에서만** 고칩니다. 같은 값이 여러 페이지(홈, 로드맵, 워크숍 목록, 상세)에 자동으로 반영됩니다. Workshop 2 본문은 `content/workshop2.mjs`에서 관리하고 `workshops.mjs`가 불러옵니다.

| 바꾸려는 것 | 파일 · 위치 |
| --- | --- |
| 오픈채팅·협력 문의 링크, 운영진, 공개 주소 | `content/site.mjs`의 `links`, `operators`, `url` |
| 홈 카드의 짧은 제목·체크 3개·색 | `content/workshops.mjs`의 `shortTitle`, `highlights`, `color` (`green`/`blue`/`purple`/`orange`) |
| 회차 일정·장소·모집 상태 | `content/workshops.mjs`의 `event`, `recruitment` |
| 회차 자료 링크 | `content/workshops.mjs`의 `resources` |
| 단계별 미션·요청문 | `content/workshops.mjs`의 `missions` |
| 쇼츠 영상 | `content/workshops.mjs`의 `video` |
| Studio Session 일정 | `content/program.mjs`의 `studio.sessions`, `studio.event` |
| Showcase 일정·안내 | `content/program.mjs`의 `showcase` |
| 학생 프로젝트 카드 | `content/program.mjs`의 `projects` |
| 화면 디자인 | `src/styles.css` · 페이지 구조는 `src/pages.mjs` |

### 상태 값

행사 상태와 자료 상태는 따로 관리합니다. “행사는 끝났지만 자료는 열림”을 그대로 표현할 수 있습니다. 화면에는 ‘미정’ 대신 ‘준비 중’이라고 표시합니다.

| 필드 | 값 | 화면 표시 |
| --- | --- | --- |
| `event.status` | `done` / `scheduled` / `tbd`·`planning` | 진행 완료 / 날짜(예: 11/2 (월) 18:00) / 준비 중 |
| `event.start`, `event.end` | 시각(`+09:00`) | 있으면 상태가 시각에 맞춰 자동으로 바뀜: 시작 전 날짜 → 진행 중 → 진행 완료 |
| `recruitment` | `{ open: true, url: 'https://...' }` | ‘모집 중’ 표시와 ‘신청하기’ 버튼. 홈의 주 버튼도 신청으로 바뀜 |
| `materials` | `open` / `planning` | 자료 열림 / 준비 중. `planning`이면 미션·자료 영역을 그리지 않고 주제·상태만 보여줌 |
| `materialsOpenAt` | 시각(`+09:00`) | 이 시각 전에는 미션·슬라이드·예제를 숨기고 준비물만 보여줌. 시각이 되면 자동 공개 |

### 시간에 맞춰 자동으로 열리는 방식

빌드할 때 화면이 바뀌는 시각(`materialsOpenAt`, 행사 시작·종료)마다 페이지 묶음을 `dist/_v/0/`, `dist/_v/1/` …로 따로 만듭니다. 배포된 사이트에서는 `functions/_middleware.js`(Cloudflare Pages 함수)가 요청마다 현재 시각을 보고 맞는 묶음을 보여줍니다. 그래서 공개 시각에 다시 배포할 필요가 없습니다.

- `/_v/…` 경로는 직접 열 수 없어 404가 나옵니다. 아직 열리지 않은 회차의 미션·슬라이드 주소·예제는 공개 시각 전에는 받을 수 없습니다.
- 단, 원본 GitHub 저장소와 Google Slides 자체는 링크를 아는 사람이면 이 사이트와 상관없이 열 수 있습니다. 완전히 막으려면 그쪽 공유 설정을 따로 바꾸세요.
- 함수에 문제가 생기면 루트(`dist/`)의 빌드 시각 기준 화면을 보여줍니다. 공개 시각이 지난 뒤 다시 배포하면 루트도 최신 상태가 됩니다.
- 함수는 페이지 요청에만 실행되고, CSS·이미지 같은 공용 파일은 바로 내려갑니다(`dist/_routes.json`).

### 자주 하는 수정 예시

**다음 회차 일정이 확정됐을 때** (`content/workshops.mjs`, Workshop 2):

```js
event: { status: 'scheduled', start: '2026-11-16T18:00:00+09:00', end: '2026-11-16T19:00:00+09:00', place: '서울대학교 관악캠퍼스 ○○동 ○○○호' },
```

시각에는 반드시 `+09:00`을 붙입니다. 화면에는 “2026년 11월 16일 (월) 18:00–19:00 (한국 시간)”처럼 절대 날짜로 표시됩니다. 위 날짜와 장소는 형식 예시입니다.

**신청을 받기 시작할 때:** 그 회차용으로 새로 만든 폼 주소만 넣습니다. 지난 회차의 폼을 재사용하지 않습니다.

```js
recruitment: { open: true, url: 'https://forms.gle/새-폼-주소' },
```

모집이 끝나면 `open: false`로 바꿉니다. `event.end`가 있으면 행사가 끝난 뒤 ‘진행 완료’로 자동 표시됩니다.

**자료를 행사 시작에 맞춰 열 때:** `materials: 'open'`과 함께 `materialsOpenAt`에 시작 시각을 넣습니다. 그 회차의 예제 화면을 함께 공개하려면 `exampleDirs`에 저장소 폴더를 적습니다. 그 회차와 관련된 운영진 예제 카드에는 `workshop: 번호`를 붙이면 같은 시각에 공개됩니다.

```js
materials: 'open',
materialsOpenAt: '2026-11-02T18:00:00+09:00',
exampleDirs: ['workshop2/starter', 'workshop2/complete'],
```

**오픈채팅 주소가 생겼을 때** (`content/site.mjs`): `openChat: 'https://open.kakao.com/o/...'`. 값이 `null`이면 버튼이 나타나지 않습니다.

**쇼츠 영상 추가:** 영상 파일과 포스터 이미지를 `public/videos/`에 넣고 해당 회차에 다음처럼 적습니다. 사용자가 재생하기 전에는 영상을 내려받지 않고(`preload="none"`), 소리 자동 재생은 없습니다. 영상이 없으면 `video: null`로 두면 스크린샷이 대신 보입니다.

```js
video: { ready: true, src: '/videos/ws2.mp4', poster: '/videos/ws2.jpg', captions: '/videos/ws2.vtt', description: '영상과 같은 내용을 담은 짧은 설명' },
```

**학생 프로젝트 공개:** 제작자가 공개에 동의한 경우에만 `projects`에 `kind: 'student'`, `published: true`로 추가합니다. 이름은 공개 동의를 받은 경우에만 `maker`에 적습니다. 학생 프로젝트가 생기면 홈과 Showcase의 ‘준비 중’ 안내가 자동으로 프로젝트 카드로 바뀝니다.

### 지켜야 할 것

- 없는 링크는 `null`로 둡니다. `'#'`, `http://`, 다른 회차의 주소를 넣으면 빌드가 멈추고 이유를 알려줍니다.
- 확인되지 않은 참가 인원·후기·혜택·협력기관을 적지 않습니다. 운영진 예제와 학생 결과물을 구분합니다.
- 슬라이드는 학생용만 연결합니다(`kind: 'slides'`, `audience: 'student'`). 학생용은 발표본을 복사해 체크인·체크아웃 QR, 소개·조 만들기, 마무리 슬라이드를 빼고 실습 부분만 남긴 것으로, Drive `05_학생배포자료`에 있습니다. 공유 설정은 ‘링크가 있는 모든 사용자 · 뷰어’로 둡니다. 발표본 주소는 넣지 않습니다. 슬라이드 링크가 학생용(`kind: 'slides'`, `audience: 'student'`)이 아니면 빌드가 멈춥니다.
- 링크를 추가했다면 `npm run check:portal-links`로 로그아웃 상태 접근을 확인합니다.

## 파일 구조

```text
portal/
├─ content/           ← 일정·상태·링크·본문 (주로 여기만 수정)
│  ├─ site.mjs        ← 프로그램 정보, 운영진, 오픈채팅·문의 링크
│  ├─ workshops.mjs   ← 4개 회차, 자료, 미션
│  ├─ program.mjs     ← Studio Session, Showcase, 프로젝트, 협력 방식
│  └─ en.mjs          ← 영어 페이지(/en/) 사전: 한국어 글 조각 → 영어
├─ src/
│  ├─ pages.mjs       ← 페이지별 화면 구성
│  ├─ layout.mjs      ← 공통 머리말·메뉴·바닥글·공유 메타데이터, 학습실 상단 바(learnLayout)
│  ├─ render.mjs      ← 상태 표시, 링크 검사, 요청문 복사 블록 등 공통 조각
│  ├─ schedule.mjs    ← 시각에 따른 행사·자료 상태 계산
│  ├─ calendar.mjs    ← 홈 '다음 워크숍'의 달력, 캘린더 추가(Google·.ics), 지도 링크
│  ├─ i18n.mjs        ← 한국어 페이지를 en.mjs 사전으로 영어 페이지로 바꾸기(날짜 규칙, /en/ 링크)
│  ├─ styles.css      ← 디자인
│  ├─ main.js         ← 요청문 복사, 스크롤 떠오르기·버튼 물결, 다음 워크숍 D-day (영어 페이지면 버튼 글도 영어)
│  └─ home.js         ← 홈 배너의 돌아가는 지구 (끌어서 돌리기, 한 바퀴 돌리면 수업 듣기로)
├─ public/            ← 그대로 복사되는 파일 (이미지, og.png, favicon, _headers)
├─ scripts/
│  ├─ build.mjs       ← 콘텐츠 검사 후 dist/ 생성 (WS2 예제 화면도 복사)
│  ├─ serve.mjs       ← 로컬 미리보기 서버
│  ├─ check-links.mjs ← 외부 링크 확인
│  ├─ screenshot.mjs  ← 예제 화면·공유 이미지 캡처 (운영진용)
│  ├─ og-image.html   ← 공유 이미지 원본
│  ├─ earth-mask.mjs  ← 지구에 쓰는 육지 지도(earth-mask.png) 만들기 (운영진용)
│  ├─ slides-snapshot.mjs ← 학생용 슬라이드를 한 장씩 이미지로 받기 (운영진용)
│  └─ refresh-practice.py ← 과제 페이지의 '글로 읽기' 내용 갱신 (운영진용)
├─ slides/            ← 수업 화면용 슬라이드 이미지와 목록(manifest.json). 자료가 열린 회차만 사이트에 복사
├─ tests/             ← 상태별 버튼 노출, 내부 링크, 누락 처리 검사
├─ functions/
│  └─ _middleware.js  ← 요청 시각에 맞는 페이지 묶음을 보여주는 Pages 함수
└─ wrangler.jsonc     ← 포털 전용 Pages 설정
```

홈의 **다음 워크숍**은 진행 중이거나 날짜가 정해진 첫 회차를 달력과 지도로 보여줍니다. 지도는 회차의 `event.mapQuery`(예: `'서울대학교 56동'`)로 찾으니, Google 지도에서 맞는 건물이 나오는지 확인하고 적으세요. 값이 없으면 지도 없이 장소 글만 보입니다. `event.mapImage`(네이버 지도에서 장소를 찍은 16:10 그림, `public/images/place/`)가 있으면 그 그림을 보여 주고 누르면 네이버 지도가 열립니다.

### 영어 페이지 (/en/)

포털 페이지(홈·로드맵·워크숍·Studio·Showcase·운영)는 빌드할 때 `/en/<주소>`에 영어 페이지도 만들어집니다. 로고 옆 `EN` / `한국어` 버튼이 같은 페이지의 다른 언어로 이어 줍니다. 수업 듣기(`/learn/`)와 슬라이드·요청문은 한국어 그대로이고, 영어 페이지의 링크 글에 `(Korean)`을 붙입니다.

- 영어는 `content/en.mjs` 사전에서 찾습니다. 한국어 글을 바꾸면 그 조각은 영어 페이지에서 한국어로 남고, 빌드가 `영어 페이지에 번역 안 된 글 N개`라고 알려 줍니다. 테스트도 실패합니다.
- 목록 보기: `PORTAL_I18N=list npm run build:portal` (PowerShell: `$env:PORTAL_I18N='list'; npm run build:portal`). 나온 글을 그대로 키로 적고 영어를 넣으세요.
- 날짜(`2026년 11월 2일 (월)`, `11/2 (월)`)는 자동으로 바뀝니다. `A · B`처럼 이어진 글은 조각별로 찾습니다. 날짜가 정해진 회차마다 `/workshops/<번호>/event.ics` 캘린더 파일이 함께 만들어집니다.

홈 배너의 지구는 배너 그림 속 지구 자리(가로 49.8%, 세로 50.65%, 지름 43.3%)를 덮어 그립니다. 배너 그림을 바꾸면 `src/home.js`와 `src/styles.css`의 `.globe` 위치를 새 그림에 맞추세요.

`public/images/examples/`의 화면은 2026-10-27에 실제 예제를 캡처한 것입니다. 예제가 바뀌면 `node portal/scripts/screenshot.mjs <주소> portal/public/images/examples/<파일>.png 1280,800`으로 다시 캡처합니다.

## 수업 듣기 (/learn/)와 수업 서버

`/learn/`은 서울대 `@snu.ac.kr` 계정으로 로그인하는 수업 화면입니다. 로그인·진도·질문은 Render의 수업 서버(`../learn-server/`)가 처리하고, 이 포털은 화면과 전달만 맡습니다.

**수업 화면의 슬라이드**는 Google 슬라이드를 한 장씩 받은 이미지(`slides/`)로 보여줍니다. 처음에는 지금 단계의 과제 페이지만(`이 과제만`) 넘겨 보고, `강의 전체`를 누르면 모든 슬라이드를 순서대로 봅니다.

1. 슬라이드를 고쳤다면 `node portal/scripts/slides-snapshot.mjs`로 이미지를 다시 받습니다. 슬라이드는 '링크가 있는 모든 사용자 · 뷰어'로 공유되어 있어야 합니다.
2. 과제 페이지를 단계에 연결하려면 `content/workshops.mjs`의 미션(또는 선택지)에 `taskSlides: ['페이지 ID', …]`를 적습니다. 페이지 ID는 `slides/manifest.json`에서 찾습니다. 없으면 `slideId` 한 장만 보여줍니다.
3. 빌드는 `slideId`·`taskSlides`가 받은 슬라이드에 없으면 멈추고 알려줍니다. 이미지는 자료가 열린 회차만 사이트에 복사되므로 미리 받아 두어도 공개 시각 전에는 보이지 않습니다.

**힌트의 '화면으로 따라 하기'**는 미션이나 선택지에 `walkthrough`를 적으면 힌트 상자 맨 위에 나타납니다. 누르면 실제 화면 캡처 위에서 누를 곳만 밝게 강조하며 한 단계씩 넘기고, 휴대폰에서는 강조한 곳을 확대해 보여줍니다.

```js
walkthrough: {
  title: '기상청 인증키 받기',
  steps: [
    { image: '/images/walk/kma/01-login.webp', box: [81.34, 8.81, 8.24, 6.5], text: '오른쪽 위 로그인을 눌러요.' },
    { text: '로그인한 뒤의 화면은 그림 없이 글로만 안내해요.', note: '덧붙일 말' }
  ]
}
```

- `box`는 캡처 그림 기준 [왼쪽, 위, 너비, 높이] (%)입니다. 캡처는 1280×800(16:10)으로 찍어 `public/images/walk/`에 둡니다.
- 캡처에 이름·이메일·인증키가 보이면 안 됩니다. 로그인한 뒤의 화면은 가리고 찍거나 글 단계로 둡니다. 앱 화면(예: Codex)은 왼쪽 대화 목록·프로젝트 이름·계정 아이콘을 덮은 뒤 넣습니다.
- 그림 없는 단계는 그림 자리에 `blank` 문구를 보여줍니다(예: `blank: '📁 내 컴퓨터의 폴더 선택 창이 열려요'`). 없으면 '로그인한 뒤의 화면이에요'가 나옵니다.
- 그림 파일이 없거나 상자가 그림 밖이면 빌드가 멈추고 알려줍니다.

- 브라우저는 포털 주소의 `/api/*`로 요청하고, `functions/_middleware.js`가 Render로 그대로 전달합니다. 이때 `x-proxy-secret` 헤더를 붙여 포털을 거친 요청만 Render가 받게 합니다.
- Pages 비밀값 두 개가 필요합니다. 없으면 `/api/*`는 503(`LEARN_NOT_CONFIGURED`)을 돌려주고 화면은 "준비하고 있어요"를 보여줍니다.

```bash
npx --yes wrangler@4.152.0 pages secret put LEARN_API_ORIGIN --project-name snu-student-collective
npx --yes wrangler@4.152.0 pages secret put PROXY_SECRET --project-name snu-student-collective
```

`LEARN_API_ORIGIN`은 Render 서비스 주소(예: `https://snu-learn-server.onrender.com`, 끝에 / 없음), `PROXY_SECRET`은 Render 환경값과 같은 32자 이상 값입니다. 비밀값을 넣거나 바꾼 뒤에는 `npm run deploy:portal`로 다시 배포해야 적용됩니다.

### 수업 화면 만들기·고치기

- `/learn/`·`/learn/<회차>/`·`/learn/questions/`·`/admin/`은 포털 메뉴 없이 **학습실 화면**(얇은 상단 바: ← 포털 · SNU 학습실 · 수업 · 내 질문 · 이름/로그아웃)을 씁니다. `scripts/build.mjs`의 경로에 `layout: 'learn'`을 붙이면 이 화면이 됩니다(`src/layout.mjs`의 `learnLayout`).
- 로그인 전에는 가운데 로그인 카드만 보이고, 로그인을 확인하면(`src/learn.js`) 카드를 숨기고 내용을 엽니다.
- `/learn/`은 회차별 진도 막대·단계 목록·"이어서 하기"(처음으로 안 끝낸 단계), `/learn/<회차>/`는 왼쪽 단계 목록과 오른쪽 슬라이드·지금 단계를 보여줍니다. 휴대폰(900px 이하)에서는 단계 목록이 슬라이드 위의 접는 칸이 됩니다.
- 로그인 뒤 화면을 서버 없이 보려면 `npm run dev:portal`로 띄운 뒤 주소 끝에 `?preview`를 붙입니다(예: `http://localhost:5174/learn/01/?preview`). 가짜 이름·진도로 보여주며, `localhost`에서만 동작합니다.
- 수업 화면은 **자료가 열렸고 학생용 슬라이드(`kind: 'slides'`)와 미션이 있는 회차**에만 만들어집니다. 공개 시각(`materialsOpenAt`) 전에는 페이지 자체가 없습니다.
- 단계 내용은 `content/workshops.mjs`의 `missions`를 그대로 씁니다. 각 미션에 슬라이드를 적습니다:
  - `slideId`: 이 단계 강의가 시작되는 Google Slides 페이지 ID. 슬라이드를 연 주소 끝의 `#slide=id.<페이지 ID>`에서 `<페이지 ID>` 부분입니다.
  - `taskSlides`·`hintSlides`: 과제 페이지와 힌트 연결(아래 '과제 페이지·글로 읽기·힌트 연결').
  - 기능 선택지(`options`)에도 같은 값을 넣으면, 학생이 그 선택지를 펼칠 때 해당 슬라이드로 넘어갑니다.
- 단계를 바꾸거나 회차 공개 시각을 바꾸면 수업 서버의 `WORKSHOP_OPEN_AT`(Render 설정, `render.yaml`)도 같은 시각으로 맞춥니다. 서버는 열린 회차의 진도만 저장합니다.

### 과제 페이지·글로 읽기·힌트 연결

Workshop 1은 기존 강의 페이지 사이에 과제 페이지 17장을 넣었습니다(기존 페이지 ID는 그대로). 1번 2장, 2번 3장, 3번 2장, 4번 공통 1장과 기능별 3장이며, 각 과제의 `taskSlides`에 연결되어 있습니다. 날씨·로그인·지도 중 하나를 펼치면 그 기능의 3장만 보입니다.

Workshop 2도 기존 48장과 페이지 ID를 유지하고 과제 19장을 추가했습니다. 첫 배포 4장 → GitHub 원본 보관 3장 → Cloudflare Git 연동 3장 → Preview 시험 4장 → 정식 반영·복구 5장입니다. 각 과제의 `taskSlides`와 `hintSlides`로 연결합니다. 공개 시각은 기존대로 2026년 11월 2일 18:00입니다.

- **글로 읽기**: 과제 페이지를 띄우면 슬라이드 아래에 '이 페이지 글로 읽기'가 생깁니다. 내용은 `content/practice-pages.mjs`에 있습니다(페이지 ID별 제목·본문).
- Workshop 2의 글은 `content/practice-pages-ws2.mjs`에 있습니다. 이미지 67장은 같은 원본의 PDF에서 WebP로 내보내 `slides/`에 저장했습니다. 이후에는 아래 snapshot 명령으로 SVG·PNG로 다시 받아도 같은 뷰어에서 표시됩니다.
- 기본 예제 ZIP은 `public/downloads/workshop2-site.zip`입니다. `workshop2/starter/`의 HTML·CSS·JS 세 파일만 담았으며, `/downloads/*`는 공개 정적 파일입니다.
- **힌트에서 슬라이드로**: 미션·선택지의 `hintSlides: ['페이지 ID', …]`는 힌트 1·2·3 순서대로 '관련 실습 페이지 보기' 버튼이 열 페이지입니다. 같은 과제의 `taskSlides` 안에서만 고를 수 있고, 버튼이 필요 없는 힌트는 뒤에서 빼면 됩니다. 이 버튼은 수업 화면에만 나옵니다.
- 사이트의 슬라이드와 글은 **받아 둔 시점의 자료**입니다. Google Slides를 고쳐도 자동으로 바뀌지 않습니다.

슬라이드를 고친 뒤에는 이미지와 글을 함께 다시 받습니다. 글은 Google Slides `get_presentation` 전체 JSON에서 꺼내며, 페이지 ID로 찾기 때문에 앞쪽에 강의 페이지가 추가되어도 엉뚱한 장을 가져오지 않습니다. 운영진용 도구이며 사이트 실행에는 필요 없습니다.

```text
node portal/scripts/slides-snapshot.mjs
python portal/scripts/refresh-practice.py --presentation workshop1.json
python portal/scripts/refresh-practice.py --workshop 2 --presentation workshop2.json
npm run test:portal
npm run deploy:portal
```

새 과제 페이지를 추가하면 `practice-pages.mjs`의 페이지 항목과 `workshops.mjs`의 `taskSlides`·`hintSlides`도 추가합니다. 과제 자료에는 학생 개인정보나 비밀 키를 넣지 않습니다.

### 질문하기와 운영진 화면

- 수업 화면의 단계마다 **막혔어요 · 질문하기**가 있습니다. 진행 방식(예제 그대로/내 아이디어로), 질문 내용(2000자), 오류 문구, 오류 화면 이미지를 보낼 수 있습니다.
- 이미지는 3장까지, 장당 5MB, PNG·JPEG·WebP만 됩니다. 파일 선택, 끌어다 놓기, 캡처 후 붙여넣기(Ctrl+V)를 지원합니다. 이미지는 Supabase의 비공개 공간에 저장되고, 질문한 학생과 운영진에게만 10분짜리 주소로 보입니다.
- `/learn/questions/`(내 질문): 내 질문 목록과 대화, 추가 질문, "해결됐어요". 검색에는 나오지 않습니다(`sitemap.xml` 제외, `robots.txt` Disallow).
- `/admin/`(운영진): 수업 서버의 `OPERATOR_EMAILS`에 있는 계정만 쓸 수 있습니다. 질문 목록(답변 대기 먼저 보기, 회차 거르기), 답변(4000자, 이미지 가능), 상태 바꾸기, 단계별 완료 학생 수. 운영진 계정으로 로그인하면 학습실 상단 바에 '운영진' 링크가 보이고, 새 질문 알림 메일의 링크(`/admin/?q=<질문 id>`)로도 들어옵니다.
- 화면 스크립트: `src/learn.js`(로그인·공통 기능 `window.Learn`·수업 목록·수업 화면), `src/questions.js`(질문 칸·대화·이미지 올리기, 학생·운영진 공용), `src/admin.js`(운영진 화면). 페이지마다 필요한 것만 순서대로 불러옵니다(`scripts/build.mjs`의 `script`).
- 새 질문 메일은 수업 서버에 `RESEND_API_KEY`와 `NOTIFY_EMAIL`이 있을 때만 갑니다. 없어도 질문은 저장되고 `/admin/`에서 볼 수 있습니다.

## 워크숍 2 예제 화면

자료가 열린 시점의 페이지 묶음에만 `../workshop2/starter`와 `../workshop2/complete`의 `index.html`·`app.js`·`styles.css`를 `/examples/workshop2/`로 복사합니다(Workshop 2는 2026-11-02 18:00부터). 기존 Workshop 2 공개 Worker(`openai-ws`)는 2026-10-27 확인 시 삭제된 상태여서, 포털이 이 예제의 공개 위치를 맡습니다.
