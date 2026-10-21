# openAI_WS

서울대학교 Workshop 02 — **내 앱을 고치고 기록하기 (Fix & Track)** 실습 자료.

현재 저장소는 비공개입니다. 참가자 배포 전에 접근 권한 또는 공개 여부를 확정하세요.

일시·장소·협력단체는 미정입니다. 이 저장소의 모임 이름·시간·장소는 모두 가상 예시입니다.

## 시작하기

1. Node.js 20 이상, Git, VS Code와 사용할 Codex 환경을 미리 준비합니다.
2. 이 저장소를 **본인 계정으로 Fork**한 뒤, 본인 Fork를 Clone합니다. 다운로드 ZIP도 화면 실습은 가능하지만 Git 이력과 remote는 포함되지 않습니다.
3. 복제한 `openAI_WS` 폴더를 VS Code에서 열고 터미널에서 실행합니다.

```sh
npm run dev
```

`http://localhost:5173`을 열어 시작본 또는 완성본을 선택합니다. 외부 패키지가 없으므로 `npm install`은 필요하지 않습니다. 서버는 실행한 컴퓨터에서만 접속됩니다. 변경 후 브라우저를 새로고침하세요. 중지는 `Ctrl+C`입니다.

## 자료 구성

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

- [Codex IDE extension](https://learn.chatgpt.com/docs/codex/ide)
- [Git revert 공식 설명](https://git-scm.com/docs/git-revert)

Workshop 1의 캠퍼스 모임 플래너 흐름을 이어가는 독립 예제입니다. 실제 로그인·API 키·외부 데이터 연결은 포함하지 않습니다.
