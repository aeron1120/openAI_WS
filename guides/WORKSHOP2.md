# Workshop 2 · 공개한 사이트를 계속 고쳐 나가기

[수업 화면](https://snu-student-collective.pages.dev/learn/02/)에서 과제를 하나씩 선택하면 그 과제에 필요한 실습 페이지만 볼 수 있습니다. 자료는 2026년 11월 2일 18:00에 열립니다. 기존 강의 전체는 [학생용 슬라이드](https://docs.google.com/presentation/d/1N_guFeYU5IbLcgVMR8LI8MYdEZup9dK0gm32qI8W4kE/edit)에서 읽을 수 있습니다.

준비할 것은 노트북, GitHub·Cloudflare 계정, 사이트 원본입니다. 내 사이트가 없으면 [기본 예제 ZIP](https://snu-student-collective.pages.dev/downloads/workshop2-site.zip)을 받고 압축을 풉니다. HTML·CSS·JS 세 파일로 이루어져 있어 설치나 빌드 없이 시작할 수 있습니다. GitHub 웹 화면으로 진행하므로 Git 설치는 필수가 아닙니다.

## 1. 첫 공개 배포

1. @Sites 결과에서 소스 ZIP을 받습니다. 다운로드 메뉴가 없다면 같은 대화에서 소스를 ZIP으로 달라고 요청합니다. ZIP을 모두 풀고 `index.html` 또는 `package.json`이 있는 위치를 찾습니다.
2. HTML 사이트는 `index.html`이 바로 보이는 폴더를 올립니다. Vite는 원본 프로젝트를 빌드한 `dist` 폴더를 올립니다. `package.json`만 보고 Vite라고 단정하지 말고 Codex에 프로젝트 종류·빌드 방법·업로드할 폴더를 확인해 달라고 요청합니다. 원본은 보관합니다.
3. Cloudflare → Workers & Pages → Create application → Pages → Drag and drop(또는 Upload assets). 이름을 정하고 배포 폴더나 ZIP을 올린 뒤 Deploy합니다.
4. 생성된 `*.pages.dev` 주소를 시크릿 창이나 휴대폰에서 엽니다. 제목·이미지·버튼·새로고침을 확인합니다. 공개 URL과 작동한 것, 아직 안 되는 것을 적습니다.

404면 `index.html` 위치를, 빈 화면이면 빌드 결과를 올렸는지 확인합니다. 내 컴퓨터에서 실행하던 서버가 자동으로 함께 올라가는 것은 아닙니다. 로그인·날씨·지도는 서버 주소와 허용 도메인 등을 각각 확인해야 합니다. 이 수업의 첫 배포는 사이트 화면을 공개하는 단계입니다. Pages Functions의 `functions` 폴더는 대시보드 끌어놓기로 컴파일되지 않으므로 서버 기능이 있는 프로젝트는 별도 배포 방법을 확인합니다. [Cloudflare 직접 업로드 안내](https://developers.cloudflare.com/pages/get-started/direct-upload/)

## 2. GitHub에 원본 보관

1. GitHub 오른쪽 위 + → New repository. 내 계정 아래 `campus-site` 같은 이름으로 저장소를 만듭니다. 공개 범위를 고르고 Add a README → Create repository를 누릅니다.
2. Add file → Upload files. 원본 폴더 **안의** 파일과 하위 폴더를 올립니다. 첫 화면에 `index.html` 또는 `package.json`이 보이게 합니다.
3. HTML 사이트는 HTML·CSS·JS·이미지, Vite는 `src`·`public`·`package.json`·설정·lock 파일 등을 올립니다. `node_modules`, `dist`, `.git`, `.env`, 비밀 키, 개인정보는 제외합니다. `.gitignore`가 웹 업로드에서 선택한 파일을 대신 검사해 주지는 않습니다.
4. 메시지에 “사이트 초안 올리기”를 쓰고 처음 만든 내 저장소의 main에 Commit changes합니다. 최근 commit 메시지를 눌러 파일을 확인하고 저장소 URL과 commit 링크를 기록합니다.

웹 업로드는 한 번에 최대 100개, 파일당 25 MiB입니다. 이를 넘는 프로젝트는 Codex에 제외할 파일부터 확인하게 하고 Git으로 업로드합니다. [GitHub 파일 업로드 안내](https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository)

## 3. GitHub와 Cloudflare 연결

직접 업로드 프로젝트를 Git 연동 방식으로 전환할 수는 없습니다. **새 Pages 프로젝트**를 만듭니다. 새 주소도 생기므로 이후에는 이 주소를 정식 URL로 사용합니다.

1. Workers & Pages → Create application → Pages → Connect to Git. GitHub를 연결하고 내 저장소만 접근하도록 선택합니다. Install & Authorize → Begin setup.
2. Production branch는 `main`으로 설정합니다.
3. HTML 사이트: Framework None / Build command 공란 / output `/`. Vite: 실제 프레임워크 / `npm run build` / output `dist`. 원본이 저장소의 하위 폴더에 있을 때만 Root directory를 그 위치로 지정합니다.
4. Save and Deploy 후 Deployments에서 Success, Production, main을 확인합니다. 표시된 commit이 GitHub 최신 commit과 같은지 비교합니다.
5. 새 Production URL을 열고 화면·새로고침을 확인합니다. URL과 commit을 적습니다.

빌드가 실패하면 View build log의 첫 오류부터 확인합니다. 원본 위치 → 명령 → 결과 폴더 순서로 점검하세요. [Git 연동 안내](https://developers.cloudflare.com/pages/get-started/git-integration/), [빌드 설정](https://developers.cloudflare.com/pages/configuration/build-configuration/)

## 4. Preview에서 시험

1. GitHub 파일 목록 위 main 메뉴 → `try-v99` 입력 → Create branch from main. 현재 branch가 `try-v99`인지 확인합니다.
2. 기본 예제는 `index.html`을 열고 연필을 눌러 “오늘, 같이 뭐 할까?”만 “이번 주, 같이 뭐 할까?”로 바꿉니다. Vite는 제목이 있는 `src` 파일을 찾습니다. 코드 구조는 건드리지 않습니다.
3. Commit changes → 메시지 “첫 화면 제목 수정” → 현재 branch `try-v99`에 저장합니다.
4. Cloudflare Deployments에서 `try-v99`의 Preview 배포가 완료되면 URL을 복사합니다. 정식 URL과 나란히 열어 Production은 이전 제목, Preview는 새 제목인지 봅니다. 이미지·버튼·새로고침도 확인합니다.
5. GitHub Pull requests → New pull request. base `main` / compare `try-v99`로 선택합니다. 바뀐 줄을 읽고 PR을 만듭니다. 본문에 바꾼 것·Preview URL·확인한 동작·남은 문제를 적고, 아직 Merge하지 않습니다.

Preview도 기본적으로 공개 주소입니다. 비밀 자료를 넣지 마세요. 실패하면 `try-v99`에서 수정하고 commit한 뒤 새 Preview에서 다시 확인합니다. [Preview 배포 안내](https://developers.cloudflare.com/pages/configuration/preview-deployments/), [GitHub branch·PR 연습](https://docs.github.com/en/get-started/using-github/hello-world)

## 5. 정식 반영과 복구

1. PR의 Files changed와 Preview 확인 결과를 읽고 Merge pull request → Confirm merge를 누릅니다.
2. Cloudflare에서 새 main 배포가 Success인지 확인합니다. **같은 정식 URL**을 새로고침했을 때 새 제목이 보이면 반영 완료입니다.
3. 이제 연습용 사이트에서 제목 변경만 되돌려 봅니다. Cloudflare → Deployments → All deployments에서 제목을 바꾸기 전 성공한 Production 배포의 … → Rollback to this deployment → 확인.
4. 정식 화면이 이전 제목으로 돌아왔는지 봅니다. GitHub main은 아직 새 제목입니다. Rollback은 화면을 빠르게 복구하며 원본 코드를 바꾸지는 않습니다.
5. GitHub Pull requests → Closed → 방금 합친 PR → Revert. 만들어진 되돌림 PR의 변경과 Preview를 확인한 뒤 Merge합니다. Revert가 막히면 main에서 새 branch를 만들고 제목을 원래대로 수정해 같은 PR·Preview·Merge 과정을 거칩니다.
6. 최신 Production과 main이 모두 이전 제목인지 확인합니다. Production URL, 저장소, PR, Preview URL, 직접 확인한 동작과 복구 결과를 함께 기록합니다.

Rollback 대상은 성공한 Production 배포입니다. Preview 배포는 대상이 아닙니다. [Cloudflare Rollback 안내](https://developers.cloudflare.com/pages/configuration/rollbacks/), [GitHub PR Revert 안내](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/reverting-a-pull-request)

다음 기능도 `branch → 작은 수정 → commit → Preview 확인 → PR → Merge`로 진행합니다. 오류가 생기면 먼저 정식 화면을 복구하고, 원인을 고친 뒤 다시 확인합니다.
