# SNU 수업·질문 시스템 설계

작성: 2026-10-27 · 상태: 사용자 승인, 구현 계획 전

## 목표

학생이 학생용 슬라이드를 보면서 워크숍 단계를 따라 하고, 예제 그대로든 자기 아이디어로든 실습하다 막히면 그 단계에서 바로 질문할 수 있게 한다. 서울대 학생만 쓰도록 `@snu.ac.kr` Google 계정 로그인으로 막는다. 참고: Elice 강의 화면(자료 + 실습 + 질문), SNU ECE 공지방 로그인(Render 서버가 Google 로그인 처리, `@snu.ac.kr`만 허용).

## 범위

포함

- `@snu.ac.kr` Google 로그인 (수업·운영진 영역에만)
- 수업 화면: 학생용 슬라이드 + 단계 나란히, 단계 완료 진도 저장
- 질문하기: 단계별 질문, 오류 화면 이미지 첨부, 운영진 답변, 추가 질문, 해결 처리
- 운영진 페이지: 질문 목록·답변, 단계별 진도 현황
- 새 질문 운영진 메일 알림
- AI 답변을 나중에 끼울 수 있는 연결부 (처음에는 꺼둠)

제외 (이번 버전에서 만들지 않음)

- AI 답변 실제 연결 (서비스 미정. `AI_PROVIDER=none`)
- 학생에게 가는 메일, 공개 Q&A 게시판, 관리자 승인 단계
- 기존 공개 포털 페이지의 로그인 (홈·로드맵·워크숍 안내·Luma 신청은 그대로 공개)

## 구조

```text
학생 브라우저 (주소는 snu-student-collective.pages.dev 하나)
  ▼
Cloudflare Pages (포털, 기존 프로젝트)
  ├─ 기존 공개 페이지 — 변경 없음
  ├─ /learn/        수업 화면 (정적 HTML + JS)
  ├─ /admin/        운영진 페이지 (정적 HTML + JS)
  └─ /api/*  ─ Pages Function이 그대로 전달 ─▶ Render 웹 서비스 (Node.js, 무료 요금제)
                                               ├─ Google 로그인·세션
                                               ├─ 진도·질문·메시지 API
                                               ├─ AI 연결부 (none)
                                               └─ 메일 알림 (Resend HTTP API)
                                                     ▼
                                               Supabase Postgres + Storage(비공개 버킷, 첨부 이미지)
```

결정과 이유

- 같은 주소 전달(프록시): 쿠키가 포털 주소에 저장되어 Safari·iOS의 제3자 쿠키 차단을 피한다. 기존 `functions/_middleware.js`는 `/api/*`를 Render로 넘기고, 나머지는 지금처럼 시각별 페이지 묶음을 보여준다.
- 프록시 비밀값: Pages Function이 요청마다 `x-proxy-secret` 헤더를 붙이고, Render는 이 값이 맞지 않으면 403으로 거부한다. Render 주소로 직접 오는 요청을 막는다. Pages에는 `LEARN_API_ORIGIN`(Render 주소)과 `PROXY_SECRET`을 비밀 환경값으로 둔다.
- 코드 위치: 서버는 이 저장소 `learn-server/`, Render는 이 폴더만 배포(Root Directory). 수업·운영진 화면은 `portal/` 빌드에 추가.
- 외부 패키지 없음: Node 20 기본 기능(`node:http`, `fetch`, `crypto`)만 사용. Supabase는 REST(PostgREST)로 서비스 키를 써서 호출.
- 무료 서버 잠듦: 첫 응답이 늦으면 화면에 "서버를 깨우는 중이에요 (최대 1분)"를 보이고 자동 재시도. 워크숍 전 운영진이 한 번 열어 깨운다.

## 로그인

흐름 (Authorization Code)

1. `/learn/`이 `GET /api/me` 호출. 401이면 "서울대 계정으로 로그인" 버튼.
2. `GET /api/auth/google?next=…` → 서버가 무작위 `state`·`nonce`를 서명 쿠키(10분)에 저장하고 Google로 이동 (`scope=openid email profile`, `hd=snu.ac.kr`, `prompt=select_account`, `redirect_uri=https://snu-student-collective.pages.dev/api/auth/google/callback`).
3. 콜백: `state` 일치 → 클라이언트 비밀키로 코드 교환 → ID 토큰 서명을 Google JWKS로 검증 → `iss`·`aud`·`exp`·`nonce` 확인 → `email_verified === true`, `hd === 'snu.ac.kr'`, 이메일이 `@snu.ac.kr`로 끝남을 모두 확인.
   - 실패: `/learn/?error=not_snu`(학교 계정 아님) / `cancelled` / `failed`로 이동해 한국어 안내.
   - 성공: `students` upsert(Google `sub` 기준) → 세션 쿠키 → `next`로 이동.
4. `DELETE /api/session` → 쿠키 삭제.

규칙

- `next`는 `/learn/` 또는 `/admin/`으로 시작하는 같은 사이트 경로만. 그 외는 `/learn/`.
- 세션 쿠키 `__Host-learn_session`: `{ sid: 학생 id, exp }`를 `SESSION_SECRET`(32자 이상)으로 HMAC 서명. HttpOnly, Secure, SameSite=Lax, Path=/, 14일.
- 상태를 바꾸는 요청(POST/PATCH/DELETE)은 `Origin`이 포털 주소이고 `Content-Type: application/json`일 때만 처리.
- 운영진: 환경값 `OPERATOR_EMAILS`(운영진 @snu.ac.kr 메일을 쉼표로 구분. 저장소가 공개라 주소는 Render 설정에만 적는다)에 있는 계정만 `/api/admin/*` 사용. 운영진도 같은 SNU 로그인.
- 기존 `server/auth.mjs`의 서명 쿠키·JWKS 검증 방식을 참고하되, ID 토큰 직접 수신(GIS)이 아니라 서버 코드 교환 방식으로 새로 작성.
- 로그인 화면 안내: "이메일·이름과 작성한 질문을 수업 운영에만 사용합니다." 프로필 사진은 저장하지 않음.

## 데이터 (Supabase)

모든 테이블 RLS 켬, 정책 없음 → 서비스 키를 쓰는 Render 서버만 접근.

| 테이블 | 열 |
| --- | --- |
| `students` | `id` uuid PK, `google_sub` unique, `email`, `name`, `created_at`, `last_seen_at` |
| `progress` | `student_id`, `workshop` int, `step_id` text, `completed_at`; PK(`student_id`,`workshop`,`step_id`) |
| `questions` | `id` uuid PK, `student_id`, `workshop`, `step_id`, `mode` (`example`/`own`/null), `status`, `created_at`, `updated_at` |
| `messages` | `id` uuid PK, `question_id`, `author` (`student`/`ai`/`operator`), `operator_email` null, `body`, `error_text` null, `created_at` |
| `attachments` | `id` uuid PK, `uploader_id`(학생 id), `message_id` null(메시지에 붙기 전), `path`, `mime`, `size`, `created_at` |

이미지 파일은 Supabase Storage 비공개 버킷 `question-images`에 `<uploader_id>/<attachment id>.<확장자>`로 저장한다. 공개 주소는 만들지 않는다.

질문 상태: `escalated`(운영진 답변 대기) → `answered`(운영진 답변 옴) → `resolved`(학생이 해결 처리). 학생이 추가 질문을 보내면 다시 `escalated`. AI가 켜지면 첫 상태가 `ai_answered`이고, 학생이 "운영진에게 물어보기"를 누르면 `escalated`.

## 수업 화면

- `/learn/`: 열린 회차 목록, 회차별 진도(완료 단계/전체), 답변 온 질문 수.
- `/learn/<slug>/`: 왼쪽 학생용 슬라이드 임베드, 오른쪽 현재 단계(할 일, 요청문 복사, 확인 목록, 막혔을 때, [막혔어요 · 질문하기], [이 단계 완료]). 상단 단계 점·진행률. 폰에서는 위아래.
- `/learn/questions/`: 내 질문 목록과 대화. 해결됐어요 / 추가 질문.
- 내용 원본: `portal/content/workshops.mjs`의 `missions` 재사용. 각 미션에 `slide`(학생용 슬라이드 번호, 1부터) 추가. 슬라이드 임베드 주소는 학생용 슬라이드 자료(`kind: 'slides'`)의 ID로 만든다.
- 공개 시각: 기존 시각별 페이지 묶음을 그대로 사용. `materials`가 열리지 않은 회차의 `/learn/<slug>/`는 그 시각 전 묶음에 만들지 않는다. 서버도 열리지 않은 회차의 진도·질문 요청을 거부한다(회차별 공개 시각을 서버 설정 `WORKSHOP_OPEN_AT`으로 공유).
- 화면 상태: 로그인 확인 중 / 로그인 필요 / 학교 계정 아님 / 서버 깨우는 중 / 오류(다시 시도).

## 질문하기

- 입력: 진행 방식(예제 그대로·내 아이디어로, 선택), 질문 내용(필수, 1–2000자), 오류 문구(선택, 최대 4000자). 회차·단계는 자동.
- 오류 이미지 첨부: 메시지마다 최대 3장, 장당 5MB 이하, PNG·JPEG·WebP만. 파일 선택, 끌어다 놓기, 붙여넣기(Ctrl+V / ⌘+V로 캡처 화면 바로 붙이기) 모두 지원. 보내기 전 미리보기와 개별 삭제.
  - 올리기: 이미지마다 `POST /api/uploads`에 이미지 바이트를 그대로 보낸다(`Content-Type: image/png` 등) → `{ id }`. 메시지를 보낼 때 `attachmentIds`로 묶는다. 서버는 첨부가 보낸 사람 것이고, 아직 메시지에 안 붙었고, 1시간 안에 올린 것인지 확인한다.
  - 서버 검사: 크기 제한, 파일 앞부분 바이트로 실제 형식 확인(`Content-Type`만 믿지 않음). SVG·GIF 등은 거부.
  - 보기: 질문 상세 응답에 첨부마다 10분짜리 Supabase 서명 주소를 담는다. 질문 주인과 운영진만 받는다. 화면에서는 작은 이미지로 보이고 누르면 크게.
  - 안내 문구: "API 키·비밀번호·개인정보가 보이면 가린 뒤 올려 주세요."
  - 운영진 답변에도 같은 방식으로 이미지를 붙일 수 있다.
  - 제한: 학생당 업로드 1시간 30장. 메시지에 붙지 않은 업로드는 하루 뒤 서버가 정리한다(서버 시작 시와 하루 1번).
- 보내기 실패 시 입력 내용을 브라우저에 임시 저장하고, 성공하면 지운다. (이미지는 저장하지 않으므로 다시 붙여야 함을 안내)
- 제한: 학생당 새 질문 1시간 10개, 메시지 1시간 30개. 초과 시 429와 안내.
- 새 질문·추가 질문이 `escalated`가 되면 운영진 메일 1통 (Resend, 받는 주소 `NOTIFY_EMAIL`). 메일 실패는 질문 저장을 막지 않고 서버 로그만 남김.
- AI 연결부: `learn-server/ai.mjs`의 `answer({ question, step })` → 문자열 또는 null. `AI_PROVIDER=none`이면 null을 돌려주고 질문은 바로 `escalated`.

## 운영진 페이지

- `/admin/`: 질문 목록(답변 대기 먼저), 회차·단계·상태 거르기.
- 질문 상세: 학생 이메일·이름, 단계 내용 요약, 대화 전체, 답변 쓰기, 해결 처리.
- 진도 현황: 회차별 단계마다 완료 학생 수.

## API

| 메서드 · 경로 | 누가 | 하는 일 |
| --- | --- | --- |
| `GET /api/health` | 누구나 | 서버 깨우기·상태 확인 |
| `GET /api/auth/google`, `GET /api/auth/google/callback` | 누구나 | 로그인 |
| `GET /api/me`, `DELETE /api/session` | 로그인 | 내 정보(운영진 여부 포함), 로그아웃 |
| `GET /api/progress?workshop=`, `PUT/DELETE /api/progress/:workshop/:step` | 학생 | 진도 조회·완료·취소 |
| `POST /api/uploads` | 로그인 | 이미지 1장 올리기 → 첨부 id |
| `GET/POST /api/questions`, `GET /api/questions/:id` | 학생 | 내 질문 목록·작성·상세(첨부 서명 주소 포함) |
| `POST /api/questions/:id/messages`, `PATCH /api/questions/:id` | 학생 | 추가 질문, 해결·운영진 요청 |
| `GET /api/admin/questions`, `GET /api/admin/questions/:id` | 운영진 | 질문 목록·상세 |
| `POST /api/admin/questions/:id/messages`, `PATCH /api/admin/questions/:id` | 운영진 | 답변, 상태 변경 |
| `GET /api/admin/progress` | 운영진 | 단계별 완료 수 |

학생은 자기 질문만 조회·수정할 수 있다(남의 질문 id는 404).

## 설정값

Render (비밀): `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SESSION_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `PROXY_SECRET`, `RESEND_API_KEY`, `NOTIFY_EMAIL`, `OPERATOR_EMAILS`, `PUBLIC_ORIGIN`(포털 주소), `AI_PROVIDER`(none), `WORKSHOP_OPEN_AT`(JSON, 예: `{"1":"2026-10-26T18:00:00+09:00","2":"2026-11-02T18:00:00+09:00"}`. 포털 `workshops.mjs`의 공개 시각과 같게 맞추고, 목록에 없는 회차는 닫힘).
Cloudflare Pages (비밀): `LEARN_API_ORIGIN`, `PROXY_SECRET`.
비밀값은 Git·공개 파일에 넣지 않는다. 키를 받기 전에는 로그인·저장이 실제로 되는 척하지 않고 "설정 필요" 상태를 보인다.

## 사람이 준비할 것

1. Render 계정 + GitHub 연결, 웹 서비스 생성(Root Directory `learn-server`).
2. Supabase 프로젝트 생성 후, 제공하는 SQL로 테이블·RLS·비공개 Storage 버킷 `question-images` 생성. Project URL과 service_role 키 전달(대화가 아니라 Render 환경값에 직접 입력).
3. Google Cloud OAuth 클라이언트(웹): 승인된 리디렉션 URI `https://snu-student-collective.pages.dev/api/auth/google/callback`.
4. Resend 가입, API 키 발급. 도메인 없이 쓰면 가입 메일로만 발송되므로 `NOTIFY_EMAIL`은 가입 메일.

## 오류 처리

- Render 잠듦·지연: 프론트가 `/api/health`로 깨우며 최대 60초 재시도, 그 뒤 "다시 시도" 버튼.
- Supabase·Google·Resend 실패: 사용자에게는 짧은 한국어 안내, 서버 로그에는 원인. 비밀값·토큰은 로그에 남기지 않음.
- 설정 누락: 서버 시작 시 필수 값 검사, 빠진 항목 이름만 로그. `/api/health`는 `configured: false`.

## 테스트

- 서버 (`node --test`, 가짜 Google·Supabase·Resend):
  - 로그인: 다른 도메인, `hd` 없음, `email_verified` false, state 불일치, nonce 불일치, 만료 토큰, 잘못된 서명 거부. `next` 외부 주소 무시.
  - 세션: 조작된 쿠키·만료 쿠키 거부, 로그아웃.
  - 프록시 비밀값 없는 요청 403. 다른 Origin의 쓰기 요청 거부.
  - 첨부: 5MB 초과·허용 안 된 형식·형식 위장(PNG라고 보낸 다른 파일) 거부, 남의 첨부·이미 붙은 첨부·1시간 지난 첨부를 메시지에 붙이기 거부, 남의 질문 첨부의 서명 주소를 받을 수 없음, 시간당 30장 제한.
  - 질문: 작성·추가 질문·해결 상태 변화, 남의 질문 404, 운영진 아닌 사람의 `/api/admin` 403, 시간당 제한, 메일 호출과 메일 실패 시에도 저장 성공, 열리지 않은 회차 거부.
- 포털 (`npm run test:portal`): 공개 시각 전 `/learn/02/` 없음, 모든 열린 미션에 `slide` 있음, 기존 공개 페이지 변화 없음, `/api/*`가 Render로 전달되고 프록시 비밀값이 붙음.
- 실제 확인: 운영진 SNU 계정 로그인 → 단계 완료 → 질문 → 메일 수신 → `/admin/` 답변 → 학생 화면 표시. 가짜 테스트 통과만으로 실제 연결 성공이라고 하지 않는다.
