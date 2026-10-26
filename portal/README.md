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

본문과 일정·링크는 **`content/` 폴더에서만** 고칩니다. 같은 값이 여러 페이지(홈, 로드맵, 워크숍 목록, 상세)에 자동으로 반영됩니다.

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
- 발표 슬라이드는 `audience: 'presenter'`로 넣어 ‘발표 자료’로 따로 표시합니다. 학생용 슬라이드가 실제로 준비되면 `audience: 'student'`로 추가합니다.
- 링크를 추가했다면 `npm run check:portal-links`로 로그아웃 상태 접근을 확인합니다.

## 파일 구조

```text
portal/
├─ content/           ← 일정·상태·링크·본문 (주로 여기만 수정)
│  ├─ site.mjs        ← 프로그램 정보, 운영진, 오픈채팅·문의 링크
│  ├─ workshops.mjs   ← 4개 회차, 자료, 미션
│  └─ program.mjs     ← Studio Session, Showcase, 프로젝트, 협력 방식
├─ src/
│  ├─ pages.mjs       ← 페이지별 화면 구성
│  ├─ layout.mjs      ← 공통 머리말·메뉴·바닥글·공유 메타데이터
│  ├─ render.mjs      ← 상태 표시, 링크 검사, 요청문 복사 블록 등 공통 조각
│  ├─ schedule.mjs    ← 시각에 따른 행사·자료 상태 계산
│  ├─ styles.css      ← 디자인
│  └─ main.js         ← 요청문 복사 (클립보드 실패 시 글 선택 + 안내)
├─ public/            ← 그대로 복사되는 파일 (이미지, og.png, favicon, _headers)
├─ scripts/
│  ├─ build.mjs       ← 콘텐츠 검사 후 dist/ 생성 (WS2 예제 화면도 복사)
│  ├─ serve.mjs       ← 로컬 미리보기 서버
│  ├─ check-links.mjs ← 외부 링크 확인
│  ├─ screenshot.mjs  ← 예제 화면·공유 이미지 캡처 (운영진용)
│  └─ og-image.html   ← 공유 이미지 원본
├─ tests/             ← 상태별 버튼 노출, 내부 링크, 누락 처리 검사
├─ functions/
│  └─ _middleware.js  ← 요청 시각에 맞는 페이지 묶음을 보여주는 Pages 함수
└─ wrangler.jsonc     ← 포털 전용 Pages 설정
```

`public/images/examples/`의 화면은 2026-10-27에 실제 예제를 캡처한 것입니다. 예제가 바뀌면 `node portal/scripts/screenshot.mjs <주소> portal/public/images/examples/<파일>.png 1280,800`으로 다시 캡처합니다.

## 워크숍 2 예제 화면

자료가 열린 시점의 페이지 묶음에만 `../workshop2/starter`와 `../workshop2/complete`의 `index.html`·`app.js`·`styles.css`를 `/examples/workshop2/`로 복사합니다(Workshop 2는 2026-11-02 18:00부터). 기존 Workshop 2 공개 Worker(`openai-ws`)는 2026-10-27 확인 시 삭제된 상태여서, 포털이 이 예제의 공개 위치를 맡습니다.
