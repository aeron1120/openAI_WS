# 기존 발표용 예제 참고하기

이 저장소의 `starter/`는 새로 제공하는 **기능 연결 전 기초 틀**입니다. `workshop1/`는 발표에서 사용한 **캠퍼스 모임 앱**입니다. 화면 구조가 다르므로 필요한 기능의 동작과 구현을 참고하세요.

## 단계별 예제

| 단계 | 내용 | 화면 |
| --- | --- | --- |
| v0 | 캠퍼스 모임 앱의 기본 화면 | [열기](https://v0-openai-ws-workshop1.a01085519047.workers.dev/) |
| v1 | 기상청 기온·강수확률 연결 | [열기](https://v1-openai-ws-workshop1.a01085519047.workers.dev/) |
| v2 | Google 로그인·세션 추가 | [열기](https://v2-openai-ws-workshop1.a01085519047.workers.dev/) |
| v3 | 지도·장소 선택 코드 추가 | [열기](https://v3-openai-ws-workshop1.a01085519047.workers.dev/) |

**이 표의 단계는 기능 추가 순서입니다. 모든 공개 화면의 실연결이 완료됐다는 뜻은 아닙니다.** 기존 [배포 기록](../docs/WORKSHOP1-DEPLOYMENTS.md) 기준으로 날씨 실제 응답은 확인됐고, 로그인은 실제 계정으로 전 과정을 확인하는 점검이 남아 있으며, 지도는 키 설정과 실제 표시 확인이 남아 있습니다. 내 컴퓨터에서 실행할 때도 본인의 설정이 필요합니다.

## 코드 찾기

| 기능 | 화면에서 처리하는 부분 | 서버에서 처리하는 부분 | 설정 |
| --- | --- | --- | --- |
| 로그인 | `workshop1/auth.mjs` | `server/auth.mjs` | [AUTH](../docs/AUTH.md) |
| 지도 | `workshop1/maps.mjs` | `server/maps.mjs` | [MAPS](../docs/MAPS.md) |
| 날씨 | `workshop1/weather.mjs` | `server/weather.mjs` | [WEATHER](../docs/WEATHER.md) |

Codex에 이렇게 요청할 수 있습니다.

> 내 starter의 날씨 구현과 workshop1/weather.mjs, server/weather.mjs를 비교해줘. 현재 막힌 이유를 설명하고, 내 화면 구조를 유지하면서 필요한 부분만 반영해줘.

기존 모임 앱 전체 실행은 저장소 루트에서 `npm run dev:workshop1`을 사용합니다. 이 경로는 추가 도구 다운로드와 서비스 설정이 필요할 수 있습니다. **기초 틀을 여는 명령은 `npm run dev`**입니다.

[실습 안내로](README.md)
