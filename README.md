# openAI_WS

## Workshop 01 — 틈, 화면에서 서비스로

**[발표용 버전 모아보기](https://openai-ws-workshop1.a01085519047.workers.dev/versions/)**

| 순서 | 추가되는 기능 | 시연 |
| --- | --- | --- |
| v0 | 모임 기본 화면 | [열기](https://v0-openai-ws-workshop1.a01085519047.workers.dev/) |
| v1 | 기상청 기온·강수확률 | [열기](https://v1-openai-ws-workshop1.a01085519047.workers.dev/) |
| v2 | Google 로그인·세션 | [열기](https://v2-openai-ws-workshop1.a01085519047.workers.dev/) |
| v3 | Google 지도·장소 선택 | [열기](https://v3-openai-ws-workshop1.a01085519047.workers.dev/) |

지도는 Google Maps 키 설정 후 실제 지도가 표시됩니다. [배포 기록과 검증 상태](docs/WORKSHOP1-DEPLOYMENTS.md), [날씨 설정](docs/WEATHER.md), [로그인 설정](docs/AUTH.md), [지도 설정](docs/MAPS.md).

로컬: `npm run dev:workshop1` · 자동 검사: `npm run test:workshop1` · 배포 파일: `npm run build:workshop1`.

## Workshop 02 — Fix & Track

서울대학교 Workshop 02 — **내 앱을 고치고 기록하기 (Fix & Track)** 실습 자료.

**[웹에서 바로 실행하기](https://openai-ws.a01085519047.workers.dev/)** — 설치나 GitHub 로그인 없이 시작본과 완성본을 열 수 있습니다.

- [시작본](https://openai-ws.a01085519047.workers.dev/workshop2/starter/)
- [완성본](https://openai-ws.a01085519047.workers.dev/workshop2/complete/)

Cloudflare의 공개 예제와 GitHub 소스 저장소의 접근 권한은 별개입니다. 현재 소스 저장소는 비공개이며, Fork·Clone 실습 전에 참가자 접근 권한 또는 공개 여부를 확정하세요.

일시·장소·협력단체는 미정입니다. 이 저장소의 모임 이름·시간·장소는 모두 가상 예시입니다.

## 직접 코드를 수정하기

위 공개 링크는 시연과 비교용입니다. 본인 코드의 변경은 본인 실행 환경에서 확인하며, 운영진의 공개 사이트에 자동 반영되지 않습니다.

1. Node.js 20 이상, Git, VS Code와 사용할 Codex 환경을 미리 준비합니다.
2. 이 저장소를 **본인 계정으로 Fork**한 뒤, 본인 Fork를 Clone합니다. 다운로드 ZIP도 화면 실습은 가능하지만 Git 이력과 remote는 포함되지 않습니다.
3. 복제한 `openAI_WS` 폴더를 VS Code에서 열고 터미널에서 실행합니다.

```sh
npm run dev
```

`http://localhost:5173`을 열어 시작본 또는 완성본을 선택합니다. 외부 패키지가 없으므로 `npm install`은 필요하지 않습니다. 서버는 실행한 컴퓨터에서만 접속됩니다. 변경 후 브라우저를 새로고침하세요. 중지는 `Ctrl+C`입니다.

## 자료 구성

- [Workshop 2 Google Slides](https://docs.google.com/presentation/d/1rUCvsJvfaKOH13tPIRh-ZlsAGvh3S_zWljE84p_BakQ/edit)
- [한·영 brief Google Docs](https://docs.google.com/document/d/1qw9G5jIdp7gbnz9r6KrBX2BeBnK-RHl6AfTuNgbPF2E/edit)
- [슬라이드 PDF](materials/Workshop02_Slides.pdf) · [brief PDF](materials/Workshop02_Brief.pdf)

슬라이드 PDF는 2026-10-24 Cloudflare 링크 반영본이며, brief PDF는 2026-10-21 기준 검토본입니다. 행사 정보 확정 후 원본 문서와 PDF를 함께 갱신하세요. Google 문서의 접근 권한은 GitHub와 별개입니다.

| 경로 | 용도 |
| --- | --- |
| `workshop2/starter/` | 참가자가 수정할 시작본 |
| `workshop2/complete/` | 선택·해제 기능이 있는 완성본 |
| `docs/PARTICIPANT.md` | 사전 준비부터 commit·push까지 |
| `docs/RECOVERY.md` | 독립된 연습 저장소에서 revert |
| `docs/FACILITATOR.md` | 60분 운영 순서와 대체 진행 |
| `docs/BRIEF_KR.md`, `docs/BRIEF_EN.md` | 제출용 brief 초안 |

## 오늘의 완료 기준

- 카드 A의 즐겨찾기를 선택하고 다시 누르면 해제된다.
- 카드 B의 선택 상태는 카드 A를 눌러도 유지된다.
- 모임 정보와 기존 화면이 유지된다.
- 새로고침하면 선택이 초기화된다. 이번 실습에서는 DB·브라우저 저장소를 사용하지 않는다.
- 변경을 commit하고, 본인 GitHub Fork에서 같은 commit을 확인한다.
- 별도 연습 저장소에서 revert 후 버튼과 이력 복구를 확인한다.

## 참고

- [Cloudflare 배포 및 갱신 안내](docs/DEPLOYMENT.md)

- [Codex IDE extension](https://learn.chatgpt.com/docs/codex/ide)
- [Git revert 공식 설명](https://git-scm.com/docs/git-revert)

Workshop 1의 캠퍼스 모임 플래너 흐름을 이어가는 독립 예제입니다. 실제 로그인·API 키·외부 데이터 연결은 포함하지 않습니다.
