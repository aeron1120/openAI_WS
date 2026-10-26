# 내 아이디어로 만드는 웹사이트 · Workshop Kit

**화면의 자리를 보고, Codex에 요청하며 필요한 기능을 하나씩 채워보세요.**

로그인 · 지도/위치정보 · 날씨 · 나만의 기능 공간이 준비되어 있습니다. 필요 없는 박스는 지우고, 위치를 옮기거나 새로운 기능을 추가해도 됩니다. 처음부터 세 기능을 모두 구현할 필요는 없습니다.

## 여기서 시작하세요

| 지금 하려는 일 | 열 곳 |
| --- | --- |
| 처음 참여해서 준비하기 | **[시작 안내](guides/START-HERE.md)** — repo 받기, Codex 데스크톱 / VS Code, 실행 |
| 내 웹사이트 수정하기 | **[starter/](starter/)** — 학생이 직접 바꾸는 기초 틀 |
| 기능 하나 구현하기 | [로그인](guides/LOGIN.md) · [지도·위치정보](guides/MAP.md) · [날씨](guides/WEATHER.md) |
| 내 아이디어에 맞게 바꾸기 | [배치·문구 변경, 삭제, 기능 추가](guides/CUSTOMIZE.md) |
| 막힌 부분 해결하기 | [문제 해결](guides/TROUBLESHOOTING.md) · [발표용 예제 참고](guides/EXAMPLES.md) |

## 가장 빠르게 화면 열기

1. 상단 **Code → Download ZIP**으로 받고, **압축을 모두 풀어주세요.**
2. `starter` 폴더 안의 **`index.html`을 브라우저로 열면** 기초 틀이 보입니다. 설치와 API 키가 필요하지 않습니다.
3. 수정할 때는 받은 **저장소 전체 폴더**를 Codex 데스크톱 또는 VS Code에서 열고 아래처럼 요청하세요.

> 이 저장소의 starter를 수정할 거야. 먼저 기초 틀을 실행해줘. 로그인 박스를 왼쪽으로 옮기고, 사이트 소개를 ‘대학생이 함께 공부할 사람을 찾는 서비스’로 바꿔줘.

로컬 서버로 실행하려면 **Node.js 20 이상**을 준비하고, 저장소 폴더에서 실행합니다.

```sh
npm run dev
```

**http://localhost:5173/starter/** 를 여세요. 외부 패키지가 없어 `npm install`은 필요하지 않습니다. 수정 후 브라우저를 새로고침하고, 서버를 멈추려면 터미널에서 `Ctrl+C`를 누릅니다. 자세한 준비는 [시작 안내](guides/START-HERE.md)를 보세요.

## 기초 틀은 어디까지 준비되어 있나요?

| 영역 | 현재 상태 | 직접 해볼 일 |
| --- | --- | --- |
| 로그인 | 기능 자리와 요청문 | Google 로그인, 사용자 표시, 로그아웃 |
| 지도·위치정보 | 빈 지도 영역과 요청문 | 지도 연결, 장소 마커, 장소 선택 |
| 날씨 | 빈 날씨 영역과 요청문 | 실제 API 데이터 연결 |
| 나만의 기능 | 자유 공간과 요청문 틀 | 내 아이디어에 필요한 기능 추가 |

**실제 로그인·지도·날씨는 아직 연결되어 있지 않습니다.** 숫자나 계정 정보를 가짜로 표시하지 않으며, 초기 화면은 외부 API를 호출하지 않습니다. 요청문 복사와 안내 펼치기만 동작합니다.

## 파일 찾기

```text
openAI_WS/
├─ README.md              ← 지금 읽는 시작점
├─ starter/               ← 내가 수정할 웹사이트
│  ├─ index.html          ← 문구, 기능 박스, 화면 구조
│  ├─ styles.css          ← 배치, 색상, 크기, 모바일 화면
│  └─ app.js              ← 요청문 복사와 앞으로 추가할 동작
├─ guides/                ← 준비, 기능별 요청문, 확인 방법
├─ workshop1/             ← 기존 발표용 모임 앱 예제
├─ workshop2/             ← 기존 Workshop 2 자료
├─ materials/             ← 기존 발표 자료 파일
├─ docs/                  ← 기존 예제 설정·운영 문서
├─ server/                ← 기존 예제의 API·로그인 처리
├─ scripts/               ← 실행·배포 준비 도구
└─ tests/                 ← 운영진용 자동 검사
```

학생은 **`starter/`와 `guides/`부터** 보면 됩니다. 각 폴더의 README에 파일 역할과 다음으로 볼 곳이 적혀 있습니다. `AGENTS.md`는 Codex가 이 구성을 이해하도록 돕는 안내입니다.

## 자료와 버전

- **기초 틀:** [starter](starter/README.md) — 빈 기능 자리에서 직접 구현합니다.
- **기존 발표용 예제:** [Workshop 1 예제 안내](workshop1/README.md) — 모임 앱의 단계별 코드와 시연 링크입니다. 새 기초 틀과 화면 구조는 다릅니다. 지도 등 각 기능의 설정·확인 상태는 안내에서 확인하세요.
- **발표 슬라이드:** [Workshop 1 Google Slides](https://docs.google.com/presentation/d/1OYbhNdlJFerD-LumLyBXP3SUZKata9K1m_avNXCvUvM/edit) — 기존 발표본입니다. 이 저장소의 Codex 시작 안내는 `guides/`를 기준으로 보세요.
- **기존 자료:** [Workshop 2 안내](workshop2/README.md)

집과 studio session에서 같은 자료로 실습할 수 있습니다. 완료 목표는 **내 서비스에 필요한 실제 연결 하나 + 내가 바꾼 문구나 배치 하나**입니다.

## 운영진용 확인

```sh
npm test
npm run build
```

`npm run build`는 기초 틀과 기존 Workshop 2의 공개 화면 파일만 `dist/`에 모읍니다. 기존 Workshop 1 서버 예제는 `npm run test:workshop1`, `npm run build:workshop1`과 [별도 배포 안내](docs/WORKSHOP1-DEPLOYMENTS.md)를 사용합니다.
