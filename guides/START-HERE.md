# 처음부터 시작하기

**이미 `http://localhost:5173/starter/`에서 화면이 보인다면 [기능 실습](README.md)으로 바로 넘어가세요.**

## 1. 기초 틀 받기

1. [GitHub 저장소](https://github.com/aeron1120/openAI_WS)를 엽니다.
2. 초록색 **Code → Download ZIP**을 누릅니다.
3. 받은 ZIP의 **압축을 모두 풉니다.** ZIP 안에서 파일만 열면 스타일이나 코드가 연결되지 않을 수 있습니다.
4. `README.md`, `package.json`, `starter` 폴더가 함께 보이는 곳을 찾습니다. 보통 폴더 이름은 `openAI_WS-main`입니다.

Git을 이미 쓰는 학생은 본인 계정으로 Fork 후 Clone해도 됩니다. 이번 첫 실습에는 Git 설치나 명령어가 필수가 아닙니다.

## 2. 먼저 화면 확인하기

`starter/index.html`을 브라우저로 열어보세요. 로그인, 지도·위치정보, 날씨, 나만의 기능 공간이 보이면 준비된 파일을 제대로 받은 것입니다. 여기까지는 Node.js와 API 키 없이 가능합니다.

## 3. 사용할 도구 하나 선택하기

### A. Codex 데스크톱

1. 사용하는 Codex 데스크톱 앱에서 로그인합니다.
2. 로컬 프로젝트를 추가하고, **1단계에서 찾은 저장소 전체 폴더**를 선택합니다. 앱 버전에 따라 `프로젝트 추가`, `폴더 열기`, 프로젝트 메뉴의 `폴더 추가` 등으로 표시될 수 있습니다.
3. 새 대화를 시작하고 아래 첫 요청문을 입력합니다.

### B. VS Code + Codex

1. VS Code에서 **File → Open Folder**로 저장소 전체 폴더를 엽니다.
2. 확장(Extensions)에서 **OpenAI가 배포한 Codex 확장**을 설치하고 로그인합니다.
3. Codex 아이콘을 엽니다. 보이지 않으면 명령 팔레트에서 `Codex: Open Codex Sidebar`를 실행합니다.
4. 아래 첫 요청문을 입력합니다.

둘 중 한 경로만 선택하면 됩니다. 이후 기능 실습은 같습니다.

## 4. 첫 요청: 내 컴퓨터에서 실행하기

```text
이 저장소에서 Workshop 1 기초 틀을 실습하려고 해.
README.md와 starter/README.md를 읽고 starter 화면을 로컬에서 실행해줘.
Node.js가 있는지 먼저 확인하고, 없다면 설치 방법을 안내해줘.
화면을 확인할 주소와 서버를 종료하는 방법도 알려줘.
아직 로그인·지도·날씨 기능을 구현하지는 마.
```

이 저장소의 로컬 서버에는 **Node.js 20 이상**이 필요합니다. 없다면 [Node.js 공식 사이트](https://nodejs.org/)에서 LTS를 설치하고 Codex나 VS Code를 다시 엽니다. 화면만 수정·확인할 때는 앞의 직접 열기 방식도 사용할 수 있습니다.

직접 실행하려면 저장소 폴더의 터미널에서:

```sh
node --version
npm run dev
```

`http://localhost:5173/starter/`를 여세요. 서버는 켜둔 상태로 작업하고, 코드를 바꾼 다음 브라우저를 새로고침합니다. 종료는 서버가 실행 중인 터미널에서 `Ctrl+C`입니다. 최초 상태에는 `npm install`이 필요하지 않습니다.

## 5. 작은 변화 하나 만들어보기

```text
starter의 사이트 이름을 ‘나의 캠퍼스’로 바꾸고,
소개 문구를 ‘학교생활에 필요한 정보를 한곳에 모으는 서비스’로 바꿔줘.
다른 기능 박스는 그대로 두고, 바뀐 파일과 확인 방법을 짧게 알려줘.
```

새로고침해서 문구가 달라졌는지 확인하세요. 확인했다면 [내 아이디어로 바꾸기](CUSTOMIZE.md)나 [기능 하나 구현하기](README.md)로 넘어갑니다.

### 어떤 폴더를 열었는지 헷갈린다면

Codex에 “지금 작업 폴더에서 `starter/index.html`과 `package.json`이 보이는지 확인해줘”라고 요청하세요. 수정한 로컬 화면은 운영진의 공유 예제 사이트에 자동으로 반영되지 않습니다.

공식 안내: [로컬 프로젝트](https://learn.chatgpt.com/docs/projects) · [Codex IDE 확장](https://learn.chatgpt.com/docs/codex/ide)
