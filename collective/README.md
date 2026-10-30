# Student Collective 통합 사이트 · 중앙 관리

여러 학교가 같은 틀로 쓰는 통합 사이트(`/`, `/campuses/<학교>/` …)와, 운영자 한 명이 모든 학교의 소개·일정·공지·자료·프로젝트를 고치고 게시하는 중앙 관리(`/manage/`)입니다.

- 기존 SNU 포털(`../portal/`)과 학습 서버(`../learn-server/`)는 **건드리지 않습니다.** SNU의 로그인·학습실·진도·질문·첨부·자료 공개 시각은 기존 주소에서 그대로 운영되고, 새 사이트는 그곳으로 연결만 합니다.
- 외부 패키지 없음. Node.js 20 이상. `npm install`이 필요하지 않습니다.
- 명세: `STUDENT_COLLECTIVE_INTEGRATED_SYSTEM_CODEX_HANDOFF.md`(사용자 제공). 아래 ‘결정 기록’에 사용자 확정 사항과 구현자 판단을 나눠 적었습니다.

## 실행·검사 (저장소 루트에서)

| 하려는 일 | 명령 |
| --- | --- |
| 처음 한 번: 환경 파일 만들기 | `collective/.env.example`을 `collective/.env`로 복사하고 `ADMIN_EMAILS`를 채움 |
| SNU 공개 콘텐츠 가져오기 | `npm run import:snu` |
| 로컬 시험용 두 번째 학교 만들기 | `npm run seed:fixture` (로컬 모드에서만) |
| 로컬 실행 | `npm run dev:collective` → http://localhost:5180/ · 관리 http://localhost:5180/manage/ |
| 자동 검사 | `npm run test:collective` |
| 화면 너비별 가로 넘침 확인 (Edge/Chrome 필요, 서버 실행 중) | `node collective/scripts/check-layout.mjs <저장 폴더> http://localhost:5180/ …` |

로컬 모드(`CMS_MODE=local`)는 `collective/.data/`(Git에 안 올라감)에 저장해 서버를 다시 켜도 내용이 남습니다. 로그인은 localhost에서만 열리는 ‘로컬 로그인’ 버튼을 씁니다. 운영 배포(Cloudflare)는 항상 운영 모드로 시작하므로 이 버튼과 파일 저장이 켜지지 않습니다.

## 폴더

| 파일 | 역할 |
| --- | --- |
| `server/app.mjs` | 모든 경로: 공개 페이지, 관리 화면, 관리 API, 로그인 |
| `server/content.mjs` | 콘텐츠 종류(학교·학기·일정·공지·프로젝트·자료·자료 버전·통합 메인)와 필드·검증. 관리 폼도 이 정의로 그림 |
| `server/publish.mjs` | 초안 → 게시본 스냅샷, 게시 전 검증, 변경 요약 |
| `server/states.mjs` | 행사 상태·신청 가능·자료 공개 판정(서로 독립, 서버 시각 기준) |
| `server/legacy-snu.mjs` | 기존 SNU `/api/health`에서 회차 열림 상태만 읽는 어댑터(짧은 타임아웃·회로 차단) |
| `server/google.mjs`, `session.mjs`, `http.mjs` | 관리자 Google 로그인(허용 메일만), 서명 쿠키, 응답·보안 헤더 |
| `server/media.mjs` | 업로드 실제 형식 확인(PNG·JPEG·WebP 10MB, PDF 25MB) |
| `server/store/local.mjs` · `supabase.mjs` | 저장소: 로컬 파일 / Supabase. 같은 규칙(revision 충돌, 게시 원자성, 재시도 중복 방지) |
| `server/views/` | 공개 화면(`public.mjs`, `parts.mjs`, `layout.mjs`)과 관리 화면(`manage.mjs`) |
| `public/assets/` | `site.css`·`site.js`(공개 화면, 스크롤 등장), `manage.css`·`manage.js`(관리 화면 저장·게시) |
| `functions/[[path]].js` | Cloudflare Pages 함수 진입점 |
| `schema.sql` | Supabase 테이블(`cms_` 접두어)·게시 함수·비공개 버킷 |
| `scripts/` | 로컬 서버, SNU 가져오기, 시험용 학교, 화면 너비 확인 |
| `tests/` | 권한·초안 비공개·게시 원자성·중복 방지·충돌·복원·예약 자료·XSS·파일 접근·SNU 연결 검사 |

## 사용 안내 (관리 화면)

모든 수정은 **초안 저장 → 게시** 두 단계입니다. 초안을 저장해도 공개 사이트는 바뀌지 않고, 게시해야 다음 요청부터 반영됩니다. 위쪽 ‘미리보기’는 초안을 공개 화면 모양으로 보여줍니다(관리자만, 검색 제외).

- **학교 추가**: 학교 관리 → 학교 추가. 이름·주소 이름(slug)·첫 학기를 넣고, 필요하면 다른 학교의 일정 틀을 불러옵니다(날짜·장소·신청 링크·연락처는 복사하지 않음). 새 학교는 ‘초안’ 상태라 공개되지 않습니다. 학교 정보에서 운영 상태를 ‘운영 중’ 또는 ‘준비 중’으로 바꾸고 링크를 채운 뒤 게시하세요.
- **일정 수정**: 학교 → 일정·워크숍에서 항목을 열어 고치고 ‘초안 저장’ → ‘게시 준비’. 행사 날짜는 참석 안내용이며, SNU 학습 자료가 열리는 시각과는 별개입니다(그건 학습 서버의 `WORKSHOP_OPEN_AT`).
- **자료 공개**: 자료 관리 → 공통 자료 추가 → 새 버전(내용·링크·파일 + **자료 전체 공개 시각**). 학교 일정에서 ‘자료 연결 추가’로 버전을 고르고, 필요하면 그 학교 화면에 소개할 시점을 정합니다(전체 공개보다 빠를 수 없음). 새 버전을 만들어도 기존 학교 일정은 바뀌지 않습니다. 각 학교에서 새 버전을 골라 게시해야 바뀝니다.
- **프로젝트 게시**: 학교 → 프로젝트 추가. 학생 결과물은 ‘공개 동의를 받았어요’를 체크해야 공개할 수 있습니다. ‘통합 메인 추천 후보’를 켜면 통합 메인 프로젝트 섹션 후보가 됩니다.
- **통합 메인**: Hero 문구·이미지, 세 활동 설명, 추천 학교·행사·프로젝트 순서. 숨기거나 보관된 추천 항목은 자동으로 빠집니다.
- **이전 공개본 복원**: 변경 기록 → 게시 이력에서 ‘이 게시본으로 복원’. 새 게시 번호로 남고 초안·파일은 그대로입니다.
- **숨기기·보관**: 일정·공지·프로젝트는 ‘공개 페이지에 표시’를 끄고 게시. 학교는 운영 상태 ‘보관’으로 게시. 영구 삭제는 없습니다.
- 두 탭에서 같은 항목을 고치면 나중에 저장한 쪽에 충돌 안내가 나오고 입력은 그대로 남습니다. 게시 버튼을 다시 눌러도 같은 요청이면 두 번 게시되지 않습니다.

## 운영 배포 준비 (사용자가 할 일)

2026-10-30 아래 순서로 운영 연결을 마쳤습니다(<https://student-collective.pages.dev>). 주소를 옮기거나 다시 만들 때 같은 순서를 따릅니다.

1. **Supabase (기존 프로젝트)**: SQL Editor에 `collective/schema.sql`을 붙여 넣고 Run(추가만 하고 기존 테이블은 건드리지 않음). Project Settings → API Keys에서 **CMS 전용 secret 키를 새로 만듭니다**(학습 서버 키와 따로 끊을 수 있게).
2. **Google Cloud**: 기존 프로젝트에서 OAuth 클라이언트(웹)를 **새로** 만들고 승인된 리디렉션 URI에 `https://<새 주소>/manage/auth/callback/`을 넣습니다. 기존 SNU 학습실 클라이언트는 그대로 둡니다.
3. **Cloudflare Pages 새 프로젝트** `student-collective`: Git 연결 시 Root directory `collective`, Build command 없음, Build output `public`, 변수 `NODE_VERSION=22`. 호환성 플래그 `nodejs_compat`는 `wrangler.jsonc`에 있습니다. Settings → Variables and Secrets에 `.env.example`의 운영 항목(`PUBLIC_ORIGIN`, `ADMIN_EMAILS`, `SESSION_SECRET`, `GOOGLE_CLIENT_ID/SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`)을 넣습니다.
4. 운영 저장소에 SNU 카드 만들기: 내 컴퓨터에서 `collective/.env`를 운영 값(CMS_MODE 없이, `SUPABASE_*`)으로 바꿔 `npm run import:snu`를 한 번 실행하고, 관리 화면에서 확인 후 게시합니다.
5. 확인: `/healthz`가 `configured: true, store: "supabase"`, `/manage/`에서 허용 계정 로그인, SNU·통합 메인 게시 후 공개 화면.

비밀값은 저장소·대화·공개 파일에 넣지 않습니다. 새 주소가 정해지면 `PUBLIC_ORIGIN`과 Google 리디렉션 URI를 함께 바꿉니다.

## SNU 보존과 연결

**그대로 유지(새 사이트가 바꾸지 않음)**: SNU Google 로그인(`@snu.ac.kr` 제한), 학습실 `/learn/*`, 내 질문, 운영진 `/admin/*`, `/api/*`(Render 학습 서버), OAuth 콜백, 진도·질문·답변·첨부 이미지, 회차별 자료 공개 시각(`WORKSHOP_OPEN_AT`과 포털의 시각별 페이지 묶음), 슬라이드·예제·다운로드 자산, 영어 페이지, Recap.

**새 사이트에서의 SNU (2026-10-30 사용자 결정: 기존 틀 그대로)**: SNU는 공통 학교 공간을 쓰지 않고 **기존 포털로 바로 연결**합니다. 학교 정보의 ‘학교 사이트 주소’(`externalUrl`)가 `https://snu-student-collective.pages.dev/`이라, 통합 메인·학교 찾기·학교 바꾸기의 SNU 링크는 그 주소로 가고 `/campuses/snu/…`로 들어와도 그 주소로 넘깁니다(302). `npm run import:snu`는 SNU 학교 카드(이름·소개)와 통합 메인 기본 문구만 만들고, 일정·공지·프로젝트·자료는 **기존 `portal/content/`에서만** 관리합니다(두 곳에서 따로 고치지 않도록). 그래서 기존 포털 주소를 새 주소로 옮기는 전환·리다이렉트는 필요 없습니다.

다른 학교도 이미 자기 사이트가 있으면 같은 칸에 주소를 넣으면 되고, 비워 두면 공통 학교 공간(`/campuses/<학교>/`)을 씁니다. 공통 학교 공간의 ‘기존 학습실 연결’(`learningMode: legacy_external`, 회차별 `/api/health` 상태 표시)은 학교 공간을 쓰면서 외부 학습실을 붙이는 경우를 위해 남겨 두었습니다.

## 결정 기록

**사용자 확정**: 기존 SNU 사이트·기능 유지 / 통합 메인에서 학교 공간으로 이동 / 다른 학교도 공통 틀 / 초기 관리자는 한 명(`ADMIN_EMAILS`) / 깔끔하고 스크롤에 따라 드러나는 통합 메인 / 색은 SNAAC의 어두운 바탕 대신 **SC 로고의 보라·초록·주황** / 배포·DB는 지금 것을 쓰되 문제가 있으면 새로 / **SNU는 기존 포털 틀을 그대로 쓰고, 통합 사이트에서 기존 주소로 바로 연결**(중간 학교 공간 없음).

**구현자 판단**:
- **호스팅: 새 Cloudflare Pages 프로젝트.** Render 무료 시간은 워크스페이스 전체 월 750시간이고 학습 서버 하나가 깨우기 Worker 때문에 약 744시간을 씁니다(2026-10-30 한도 초과로 정지된 적 있음). 같은 워크스페이스에 서비스를 더하면 둘 다 멈출 수 있고, 새 Render 계정은 15분 뒤 잠들어 공개 메인 첫 접속이 느려집니다. 코드는 표준 Request/Response 함수라 Node(로컬)에서도 같게 돌고, 필요하면 Render로 옮길 수 있습니다.
- **DB: 기존 Supabase 프로젝트 + `cms_` 접두어 + CMS 전용 secret 키 + 별도 비공개 버킷.** 새 무료 프로젝트는 7일간 활동이 없으면 일시정지되어 공개 사이트가 멈출 수 있습니다. 대신 용량(DB 500MB·Storage 1GB)을 학습 데이터와 나눠 쓰므로 이미지가 많아지면 확인이 필요합니다. 서비스 키는 권한상 학습 테이블도 읽을 수 있으므로, CMS 코드는 `cms_` 테이블과 `cms-media` 버킷만 다룹니다.
- 게시는 DB 함수 하나(`cms_publish`)가 revision 확인·스냅샷·active 전환·기록을 한 트랜잭션으로 처리하고, `request_id`로 재시도 중복을 막습니다.
- 자료 버전의 전체 공개 시각은 저장 즉시 적용되는 ‘공개 기록’이고(학교 게시와 별개), 지난 뒤에는 바꿀 수 없습니다. 자료 본문·파일은 게시 스냅샷에 넣지 않고 요청 때마다 시각을 확인합니다.
- 모션은 CSS + IntersectionObserver만 사용(새 라이브러리 없음). JS가 없거나 `prefers-reduced-motion`이면 모든 내용이 처음부터 보입니다.

## 확인 기록

- 2026-10-30 로컬: `npm run test:collective` 32개 통과(SNU 바로 연결 포함). SNU 카드·제목이 `https://snu-student-collective.pages.dev/`로 연결되고 `/campuses/snu/`가 그 주소로 302 되는 것 확인.
- 아래 화면·SNU 자료 상태 기록은 SNU를 공통 학교 공간으로 그리던 때의 확인이며, 지금 공통 학교 공간은 시험용 학교로 확인합니다.
- 2026-10-30 로컬(이전): `npm run test:collective` 31개 통과. 기존 `npm test`(40), `test:portal`(49), `test:learn`(70) 통과.
- 2026-10-30 로컬 브라우저(Edge headless): 360·768·1440px에서 통합 메인·학교 찾기·SNU 홈·일정·워크숍 상세·행사·프로젝트·참여 안내·없는 학교 주소 모두 가로 넘침 없음(`check-layout.mjs`). 관리 화면에서 로컬 로그인 → 일정 저장(저장됨 표시·미저장 표시 해제) → 오래된 revision 저장 시 충돌 안내 → 잘못된 링크 저장 시 칸 오류·포커스 → 게시 요약 확인 → 게시 → 공개 화면 반영 확인.
- 2026-10-30 실제 SNU `/api/health` 응답으로 Workshop 1 ‘자료 열림’, Workshop 2 ‘아직 공개 전’ 표시 확인(로컬 서버에서 실제 출처 호출).
- 2026-10-30 운영: `/healthz`가 `configured: true, store: "supabase"`, 허용 계정 Google 로그인, SNU·통합 메인 게시, SNU 카드가 기존 포털로 연결·`/campuses/snu/` 302 확인.
- 아직 운영에서 확인하지 않은 것: 사진 올리기(`cms-media` 버킷), 이전 게시본 복원, 새 학교 추가부터 게시까지, 실제 기기 성능 측정.
