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
| `GET /api/health` | 상태 확인 (프록시 없이도 응답) |
| `GET /api/auth/google?next=/learn/…` → `GET /api/auth/google/callback` | SNU 로그인 |
| `GET /api/me`, `DELETE /api/session` | 내 정보, 로그아웃 |
| `GET /api/progress` | 내 완료 단계 전체 `{ progress: [{ workshop, step, completedAt }] }` |
| `PUT` / `DELETE /api/progress/<회차>/<단계 id>` | 단계 완료 / 취소 (열린 회차만, 포털 Origin 필요) |

## 확인 기록

- 2026-10-28: 서비스 `https://snu-learn-server.onrender.com`. 직접 접속 403, 포털 경유 `/api/health` `configured: true`, 로그인 전 `/api/me` 401, 로그인 시작 시 Google로 이동 확인. 운영진 SNU 계정으로 실제 로그인 → 이름·이메일·운영진 표시 확인.
