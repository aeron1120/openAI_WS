# Workshop 02 참가자 안내

## 행사 전: 이 화면까지 열어오기

노트북·충전기, 로그인 가능한 ChatGPT/Codex와 GitHub 계정을 준비합니다. VS Code, Git, Node.js 20 이상을 설치하고 Codex에서 이 폴더를 읽고 수정할 수 있는지 미리 확인합니다. 계정별 사용 가능 여부는 사전에 확인합니다.

GitHub에서 원본 저장소를 본인 계정으로 Fork하고, 본인 Fork 페이지의 Code → HTTPS 주소를 복사합니다. VS Code의 Clone Repository에 그 주소를 붙여 넣고 복제한 폴더를 엽니다. `git remote -v`의 origin이 본인 Fork인지 확인합니다.

```sh
node --version
npm --version
git --version
npm run dev
```

브라우저에서 `http://localhost:5173/workshop2/starter/`를 엽니다. 모임 카드 3개가 보이면 실행 준비 완료입니다. Windows에서 npm.ps1 실행 정책 오류가 나면 `npm.cmd run dev`를 사용합니다. 전역 실행 정책은 바꾸지 않습니다.

Git 작성자 이름·이메일이 없다면 이 저장소 안에서 `git config user.name "본인 이름"`, `git config user.email "본인 GitHub 이메일"`로 설정합니다. 이메일 비공개를 원하면 GitHub가 제공하는 본인의 noreply 주소를 사용하세요. 꺾쇠나 예시 문구를 실제 값으로 바꿉니다.

## Codex에게 요청하기

```text
workshop2/starter/의 모임 카드에 즐겨찾기 버튼을 추가해줘.
클릭하면 선택되고, 다시 누르면 해제해줘.
카드별로 독립적으로 동작하게 해줘.
새로고침하면 초기화해. DB와 localStorage는 쓰지 마.
기존 모임 정보와 레이아웃은 유지해줘.
수정할 파일과 확인 방법을 알려줘.
```

완성본 폴더는 비교 자료입니다. 수정은 starter 안에서 진행하세요. 본인 프로젝트를 가져왔다면 실행 명령과 수정 파일은 그 프로젝트의 README를 따릅니다.

## 직접 확인하기

1. 카드 A 선택 → 선택 표시 확인.
2. 카드 B 선택 → A와 B 모두 선택 상태인지 확인.
3. 카드 A 다시 클릭 → A만 해제되고 B는 유지되는지 확인.
4. 새로고침 → 둘 다 초기화되는지 확인.
5. 카드 제목·시간·장소가 그대로인지, 브라우저 오류가 생기지 않았는지 확인.

## 변경 기록하기

VS Code Source Control에서 변경 파일을 열어 비교합니다. 이번 기능의 파일만 Stage하고, `모임을 다시 찾기 쉽게 즐겨찾기 추가` 같은 메시지로 Commit합니다. Push 후 본인 GitHub Fork의 동일한 브랜치에서 메시지와 파일을 확인합니다.

터미널로 할 경우 `git status`로 실제 파일명을 확인한 뒤 `git add workshop2/starter/app.js`처럼 필요한 파일만 추가합니다. 실제로 HTML/CSS도 변경했다면 해당 파일도 추가합니다. 이어 `git commit -m "Add favorites to meetup cards"`, `git push`를 실행합니다.

Push 인증이 실패하면 운영진과 로그인·origin·브랜치를 확인합니다. 강제 Push는 하지 않습니다. 인터넷 장애 때는 로컬 commit과 화면까지 남기고, 온라인 확인은 Studio Hour에서 마무리합니다. 이 경우 push 완료로 표시하지 않습니다.

## 30초 공유

“[이유] 때문에 [기능]을 바꿨고, [행동]을 해서 [결과]를 확인했습니다.”

변경 전후 화면과 commit을 보여주고, 본인 저장소 주소를 공유합니다. 원본 운영진 저장소에 직접 push하지 않습니다.
