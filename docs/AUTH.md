# Workshop 1 · v2 Google 로그인

## 연결할 설정

- `GOOGLE_CLIENT_ID`: 이미 만든 Google OAuth **웹 애플리케이션** 클라이언트 ID. 브라우저에 공개되는 식별자이며 비밀 키가 아니다.
- `SESSION_SECRET`: 충분히 긴 무작위 서버 비밀 값(최소 32자). Cloudflare의 해당 Worker 설정 → Variables and Secrets에서 **Secret**으로 저장한다. 저장소, 채팅, 프런트엔드 파일에 넣지 않는다.
- Google Client Secret은 이 ID 토큰 로그인 방식에서 사용하지 않는다.

Google Cloud Console → Google Auth Platform → Clients → 사용 중인 웹 클라이언트의 **Authorized JavaScript origins**에 실제 시연 주소의 origin을 각각 등록한다. 경로와 마지막 `/` 없이 `https://호스트명` 형태로 입력한다. v2와 v3의 고정 시연 주소가 다르면 둘 다 등록해야 한다. 배포 주소는 `WORKSHOP1-DEPLOYMENTS.md`의 검증된 주소를 따른다. 동의 화면은 외부 사용자용으로 설정하고, 테스트 상태라면 시연 계정을 테스트 사용자로 등록한다.

설정은 **v2 배포 전에** 적용한다. Cloudflare 버전 URL은 해당 버전의 코드와 설정을 가리키므로 뒤늦게 설정한 값이 이미 만든 모든 버전에 자동으로 적용된다고 가정하지 않는다. 기존 v2에 설정이 없으면 설정을 반영한 v2를 다시 배포하고 시연 URL 기록을 갱신한다.

## 포함된 동작

1. 게스트 화면에서 공식 Google 로그인 버튼을 누른다.
2. Google에서 계정을 선택한다. 클라이언트는 ID 토큰을 같은 origin의 서버로 보낸다.
3. 서버가 Google 공개 키로 RS256 서명, 발급자, 클라이언트 ID, 만료, 발급 시각과 브라우저별 nonce를 확인한다.
4. 검증된 이름과 프로필 사진을 표시한다. 이름은 텍스트로 넣고 사진은 HTTPS Google 이미지 호스트만 허용한다.
5. 서버가 발급한 서명 쿠키로 새로고침 후 상태를 복원한다. 세션은 8시간 후 만료된다.
6. 로그아웃 시 쿠키를 지우고 Google 자동 계정 선택을 해제한다.

쿠키는 `__Host-` 접두사, `Secure`, `HttpOnly`, `SameSite=Lax`, `Path=/`를 사용한다. 운영 시연은 HTTPS에서 한다. 로그인과 로그아웃은 동일 origin의 POST 요청만 허용한다. 로그인 nonce는 서명된 HttpOnly 쿠키와 Google 토큰의 nonce를 대조하며 10분 후 만료된다. 로그인 완료 시 nonce 쿠키를 삭제한다. 데이터베이스가 없는 워크숍 예제이므로 로그아웃은 해당 브라우저 쿠키를 지우는 방식이며, 별도로 복제된 세션 쿠키까지 서버에서 폐기하는 기능은 없다.

모임 신청을 계정과 연결해서 저장하는 기능은 이 단계의 범위에 포함되지 않는다. 비밀 설정이 없으면 가짜 로그인 대신 준비 중 상태를 표시한다.

## 통합

Worker에서 `/api/auth/`로 시작하는 요청을 `handleAuth(request, env)`로 전달한다. 프런트엔드에서 `await initAuth({ container: document.querySelector('#auth') })`로 초기화한다. 반환 객체는 `refresh()`와 `destroy()`를 제공한다. 모듈이 해당 컨테이너의 자식을 관리한다.

경로: `GET /api/auth/config`, `GET /api/auth/nonce`, `POST /api/auth/google`, `GET /api/auth/session`, `POST /api/auth/logout`.

팝업 방식에서 `Cross-Origin-Opener-Policy: same-origin-allow-popups`를 사용하면 브라우저의 팝업 통신을 유지할 수 있다. CSP를 추가하는 경우 공식 문서에 나온 Google GIS 도메인 허용 목록을 함께 적용해야 한다. 이 모듈은 새로운 전역 CSP 정책을 강제로 설치하지 않는다.

## 확인

자동 확인: `node --test tests/auth.test.mjs`.

실제 계정 확인: v2 주소에서 Google 계정 선택 → 이름·사진 표시 → 새로고침 유지 → 로그아웃 → 게스트 복귀. 같은 순서를 v3 주소에서도 확인한다. 자동 테스트가 통과해도 Google 콘솔 origin 등록과 실제 계정 로그인이 확인됐다는 의미는 아니다.

## 공식 자료

- [서버에서 Google ID 토큰 확인](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token)
- [Google Identity Services JavaScript API](https://developers.google.com/identity/gsi/web/reference/js-reference)
- [웹 클라이언트와 JavaScript origin 설정](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid)
