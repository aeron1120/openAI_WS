# 수업·질문 API 서버 (Render)

포털(`portal/`)의 `/learn/`·`/admin/` 화면이 쓰는 API 서버입니다. 학생 브라우저는 포털 주소의 `/api/*`로 요청하고, 포털의 Cloudflare Pages 함수가 이 서버로 그대로 전달합니다(같은 주소라 Safari·iOS에서도 로그인 쿠키가 유지됨).

- 외부 패키지 없음. Node.js 20 이상.
- 서울대 `@snu.ac.kr` Google 계정만 로그인됩니다. 서버가 ID 토큰의 `hd`와 이메일을 직접 확인합니다.
- 데이터: Supabase(Postgres + Storage). 모든 테이블 RLS 켬, 정책 없음 → 서비스 키를 쓰는 이 서버만 접근.
- 설계: `docs/superpowers/specs/2026-10-27-snu-learn-system-design.md`
- 로그인은 `PUBLIC_ORIGIN` 주소에서만 됩니다. Cloudflare 미리보기 주소(`<hash>.snu-student-collective.pages.dev`)나 다른 도메인에서는 `?error=expired`로 끝납니다.
- 로그아웃은 이 브라우저의 쿠키만 지웁니다. 모든 세션을 한 번에 끊으려면 `SESSION_SECRET`을 바꿉니다.

## 파일

| 파일 | 역할 |
| --- | --- |
| `server.mjs` | Render 진입점 (node:http → app) |
| `app.mjs` | API 경로와 로그인 흐름 |
| `config.mjs` | 환경값 읽기·검사 |
| `google.mjs` | Google 로그인 주소, 코드 교환, ID 토큰 검증, SNU 확인 |
| `session.mjs` | 서명 쿠키 |
| `http.mjs` | 응답·쿠키·Origin 확인 도우미 |
| `supabase.mjs` | Supabase REST 클라이언트 |
| `progress.mjs` | 진도 API (단계 완료 표시) |
| `questions.mjs` | 학생 질문 API, 운영진 API와 함께 쓰는 입력 확인·첨부 붙이기·화면용 모양 |
| `admin.mjs` | 운영진 API (질문 목록·답변·상태, 단계별 완료 수) |
| `uploads.mjs` | 이미지 올리기, 메시지에 안 붙은 오래된 이미지 정리(하루 1번) |
| `storage.mjs` | Supabase Storage (비공개 버킷 `question-images`, 10분짜리 서명 주소) |
| `images.mjs` | 파일 앞부분으로 PNG·JPEG·WebP 확인 |
| `limits.mjs` | 학생별 시간당 횟수 제한 (서버 메모리) |
| `notify.mjs` | 운영진 메일 알림 (Resend) |
| `ai.mjs` | AI 답변 연결부 (지금은 꺼짐) |
| `schema.sql` | Supabase 테이블·RLS·Storage 버킷 (한 번 실행) |

## 명령 (저장소 루트에서)

| 하려는 일 | 명령 |
| --- | --- |
| 테스트 | `npm run test:learn` |
| 로컬 실행 (상태 확인용) | `npm run dev:learn` → http://localhost:8787/api/health |

## 환경값 (Render → Environment)

| 이름 | 내용 |
| --- | --- |
| `PUBLIC_ORIGIN` | `https://snu-student-collective.pages.dev` (끝에 / 없음) |
| `PROXY_SECRET` | 포털 Pages 비밀값과 같은 값 (32자 이상) |
| `SESSION_SECRET` | 쿠키 서명용 (Blueprint가 자동 생성) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google Cloud OAuth 클라이언트(웹) |
| `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` | Supabase Project URL, secret 키(`sb_secret_…`) |
| `OPERATOR_EMAILS` | 운영진 @snu.ac.kr 메일, 쉼표로 구분 |
| `WORKSHOP_OPEN_AT` | 회차별 공개 시각 JSON. 예: `{"1":"2026-10-26T18:00:00+09:00"}`. 포털 `workshops.mjs`의 공개 시각과 같게. 없는 회차는 닫힘 |
| `RESEND_API_KEY` | 선택. Resend API 키. 없으면 메일을 보내지 않음(질문은 그대로 저장) |
| `NOTIFY_EMAIL` | 새 질문 알림을 받을 운영진 메일 1곳. Resend를 도메인 없이 쓰면 Resend 가입 메일만 가능 |
| `AI_PROVIDER` | 지금은 `none`만 (AI 답변 꺼짐) |

비밀값은 저장소·대화·공개 파일에 넣지 않습니다. 빠진 값이 있으면 서버 로그에 이름만 나오고 `/api/health`가 `configured: false`를 돌려줍니다.

## 처음 준비 순서

1. **Supabase**: 새 프로젝트(Region: Northeast Asia (Seoul)) → SQL Editor에 `schema.sql` 붙여 넣고 Run → Project Settings → API Keys에서 Project URL과 secret 키 확인.
2. **Google Cloud**: APIs & Services → OAuth consent screen(User type External, 게시 상태 **In production**. Testing이면 테스트 사용자만 로그인됨) → Credentials → Create OAuth client ID → Web application → Authorized redirect URIs에 `https://snu-student-collective.pages.dev/api/auth/google/callback` → 클라이언트 ID·비밀번호 확인.
3. **Render**: New → Blueprint → 이 GitHub 저장소 선택 → `render.yaml` 확인 → `sync: false` 값 입력 → 배포. 서비스 주소(`https://snu-learn-server.onrender.com` 등) 확인.
4. **Cloudflare Pages 비밀값**: `LEARN_API_ORIGIN`(Render 서비스 주소)과 `PROXY_SECRET`(Render와 같은 값)을 넣고 포털을 다시 배포. 자세한 명령은 `portal/README.md`.

무료 요금제는 15분간 요청이 없으면 잠들고 첫 요청에 30초~1분이 걸립니다. 화면은 "서버를 깨우는 중"을 보여주며 자동으로 다시 시도합니다. 워크숍 전에 한 번 열어 두세요.

## API

| 요청 | 하는 일 |
| --- | --- |
| `GET /api/health` | 상태 확인 (프록시 없이도 응답). `mail`은 메일 설정(키·받는 주소) 유무 |
| `GET /api/auth/google?next=/learn/…` → `GET /api/auth/google/callback` | SNU 로그인 |
| `GET /api/me`, `DELETE /api/session` | 내 정보, 로그아웃 |
| `GET /api/progress` | 내 완료 단계 전체 `{ progress: [{ workshop, step, completedAt }] }` |
| `PUT` / `DELETE /api/progress/<회차>/<단계 id>` | 단계 완료 / 취소 (열린 회차만, 포털 Origin 필요) |
| `POST /api/uploads` (본문: 이미지 바이트, `Content-Type: image/png·jpeg·webp`) | 이미지 1장 올리기 → `{ attachment: { id } }`. 5MB 이하, 1시간 30장 |
| `GET` / `POST /api/questions` | 내 질문 목록 / 질문하기 `{ workshop, step, mode?, body, errorText?, attachmentIds? }` (1시간 10개) |
| `GET /api/questions/<id>`, `POST …/messages`, `PATCH` `{ status }` | 내 질문 대화(이미지는 10분짜리 주소), 추가 질문, 해결 처리 |
| `GET /api/admin/questions?status=&workshop=`, `GET /api/admin/questions/<id>` | (운영진) 질문 목록·상세 |
| `POST /api/admin/questions/<id>/messages`, `PATCH /api/admin/questions/<id>` | (운영진) 답변(최대 4000자, 이미지 가능), 상태 변경 |
| `GET /api/admin/progress` | (운영진) 회차·단계별 완료 학생 수 |
| `POST /api/admin/notify-test` | (운영진) 알림 메일 시험 발송 `{ ok }` 또는 `{ ok: false, reason }` (포털 Origin 필요) |

### 알림 메일이 안 올 때

- 운영진 화면(`/admin/`) 위쪽의 "알림 메일 시험 보내기"를 누르면 성공 여부와 실패 이유가 나옵니다. `/api/health`의 `mail`이 `false`면 `RESEND_API_KEY`나 `NOTIFY_EMAIL`이 비어 있는 것입니다.
- Resend 시험용 보내는 주소(`onboarding@resend.dev`)는 Resend 계정에 가입한 본인 이메일로만 보낼 수 있습니다. `NOTIFY_EMAIL`을 그 주소로 맞추세요(다른 주소는 403).
- 도착했는데 안 보이면 스팸함을 확인하세요.

## 확인 기록

- 2026-10-28: 서비스 `https://snu-learn-server.onrender.com`. 직접 접속 403, 포털 경유 `/api/health` `configured: true`, 로그인 전 `/api/me` 401, 로그인 시작 시 Google로 이동 확인. 운영진 SNU 계정으로 실제 로그인 → 이름·이메일·운영진 표시 확인.
- 2026-10-28: 2·3단계 배포. Render 새 버전(`/api/health` `openWorkshops: [1]`), 포털 `/learn/`·`/learn/01/`·`/learn/questions/`·`/admin/` 배포. 사용자 브라우저 확인: 단계 완료 저장·새로고침 유지, 단계별 슬라이드 이동, 이미지 붙인 질문, 운영진 답변(이미지 포함), 학생 화면 답변 확인·해결 처리, Supabase Storage 저장 모두 정상.
- 2026-10-28: 정리 작업(빈 질문 삭제, 첨부 동시 사용 방지, 횟수 제한 메모리 정리, 상태 확인에 배포 커밋 표시) 배포. `/api/health`에 `commit` 확인.
