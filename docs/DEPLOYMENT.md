# Cloudflare 배포

2026-10-24에 Cloudflare Workers Static Assets로 공개 배포했습니다.

- 서비스: https://openai-ws.a01085519047.workers.dev/
- 시작본: https://openai-ws.a01085519047.workers.dev/workshop2/starter/
- 완성본: https://openai-ws.a01085519047.workers.dev/workshop2/complete/
- Worker 이름: `openai-ws`
- 배포 버전: `9cceae8f-40e2-45dc-b829-714c233cf702`

웹 예제는 로그인 없이 열립니다. 사이트를 보기 위해 개인 컴퓨터에서 서버를 켜둘 필요가 없습니다. 데이터는 브라우저 화면에서만 유지되며 새로고침하면 초기화됩니다.

## 배포 갱신

프로젝트 루트에서 Cloudflare에 로그인한 후 실행합니다.

```sh
npx --yes wrangler@4.152.0 login
npm run deploy
```

`npm run build`는 루트 안내와 starter/complete의 HTML·CSS·JS, 404 페이지만 `dist/`에 복사합니다. Wrangler는 이 폴더만 배포합니다. 문서·PDF·Git 이력·인증 정보·recovery-practice는 포함되지 않습니다.

`npm run deploy`는 운영진의 공개 예제를 갱신하는 명령입니다. 참가자가 자신의 코드를 수정하거나 GitHub에 push하는 것만으로 이 사이트가 바뀌지는 않습니다. 참가자별 배포는 각자의 Cloudflare 계정과 별도 Worker 이름을 사용해야 합니다.

GitHub 저장소의 공개 여부는 변경하지 않았습니다. 소스를 Fork·Clone하려면 별도 접근 권한이 필요합니다.

공식 문서: [Cloudflare Static Assets](https://developers.cloudflare.com/workers/static-assets/).
