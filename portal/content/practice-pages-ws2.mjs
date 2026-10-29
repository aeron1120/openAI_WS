// 과제 페이지의 '이 페이지 글로 읽기' 내용(Google Slides 원본의 글). 갱신 방법: portal/README.md
export const ws2Practice = {
  "deploy_1": {
    "id": "ws2_task_20261029_deploy_1",
    "number": 19,
    "title": "과제 1. 내 사이트 파일 준비하기",
    "text": "목표: 내 컴퓨터 밖에서도 열리는 주소 만들기\n1\n지난번 만든 사이트에서 ZIP 받기\n@Sites 결과의 다운로드 메뉴에서 소스 ZIP 받기\n메뉴가 안 보이면 같은 대화에서 “사이트 소스를 ZIP으로 줘”라고 요청\n2\nZIP 압축을 풀고 파일 확인\nWindows: 우클릭 → 모두 압축 풀기 / Mac: 두 번 클릭\nindex.html 또는 package.json이 있는 폴더 찾기\n내 사이트가 없다면 아래 기본 예제로 시작해도 됩니다.\n기본 예제 ZIP 받기  ·  압축을 풀면 HTML·CSS·JS 세 파일"
  },
  "deploy_2": {
    "id": "ws2_task_20261029_deploy_2",
    "number": 20,
    "title": "과제 1. 무엇을 올려야 할까?",
    "text": "내 폴더가 어느 쪽인지 확인하고 하나만 따라가기\nHTML·CSS·JS만 있다면\nindex.html이 바로 보이는 폴더 사용\nCSS·JS·이미지도 함께 포함\n별도 빌드 없이 다음 장으로\nVite / React 프로젝트라면\npackage.json이 있는 폴더를\nCodex에서 열고 아래처럼 요청\n완성된 dist 폴더를 업로드\n“이 프로젝트를 Cloudflare Pages에 올리려고 해. 빌드 방법을 확인하고\n실행해줘. 실제로 업로드할 폴더와 서버가 필요한 기능을 알려줘.”\n원본 폴더는 그대로 보관. package.json이 있어도 Vite가 아니면 빌드 방법부터 확인!"
  },
  "deploy_3": {
    "id": "ws2_task_20261029_deploy_3",
    "number": 21,
    "title": "과제 1. Cloudflare에 올리기",
    "text": "1\nCloudflare에 로그인하고 Pages 선택\nWorkers & Pages → Create application → Pages\nDrag and drop 또는 Upload assets 선택\n2\n프로젝트 이름을 적고 배포 파일 넣기\n내가 알아볼 이름 입력 → 앞 장에서 고른 폴더 또는 그 ZIP 업로드\nHTML 사이트: index.html 폴더 / Vite: 빌드한 dist\n3\nDeploy 누르고 완료 기다리기\n배포가 성공하면 화면의 *.pages.dev 주소를 복사\n이후 수정은 이 프로젝트의 Create a new deployment에서 올립니다.\nCloudflare 열기"
  },
  "deploy_4": {
    "id": "ws2_task_20261029_deploy_4",
    "number": 22,
    "title": "과제 1. 주소만 생기면 끝일까?",
    "text": "1\n공개 주소에서 화면 확인\n시크릿 창이나 휴대폰으로 *.pages.dev 열기\n제목·이미지·이동 버튼을 확인하고 새로고침\n2\n외부 기능은 따로 눌러 보기\n로그인·날씨·지도도 각각 실행. localhost 서버는 함께 배포되지 않음\n실패하면 서버 주소·허용 도메인·키 설정을 점검할 항목으로 기록\n404 → index.html 위치 확인  /  이미지 없음 → 파일·경로 확인\n빈 화면 → 빌드 결과를 올렸는지 확인\n남길 것  ·  공개 URL + 작동한 것 + 아직 안 되는 것"
  },
  "repo_1": {
    "id": "ws2_task_20261029_repo_1",
    "number": 31,
    "title": "과제 2. GitHub 저장소 만들기",
    "text": "목표: 다음에 고칠 수 있도록 원본을 보관하기\n1\nGitHub에서 새 저장소 만들기\n로그인 → 오른쪽 위 + → New repository\n이름 예: campus-site / 내 계정 아래에 만드는지 확인\n2\n공개 범위와 첫 파일 선택\n수업 공유용이면 Public. 비공개 작업이면 Private\nAdd a README 선택 → Create repository\n완료 기준  ·  github.com/내아이디/campus-site가 열린다\nGitHub 열기"
  },
  "repo_2": {
    "id": "ws2_task_20261029_repo_2",
    "number": 32,
    "title": "과제 2. 배포 파일 말고 원본 올리기",
    "text": "올릴 것\nHTML 사이트: HTML·CSS·JS·이미지\nVite: src·public·package.json\n설정 파일·lock 파일·.gitignore\n빼야 할 것\nnode_modules · dist · .git\n.env · 비밀 키 · 비밀번호\n개인정보가 들어 있는 파일\n1\nAdd file → Upload files\n원본 폴더 안의 필요한 파일·폴더를 선택해서 끌어놓기\n목록을 직접 확인. .gitignore가 웹 업로드 선택을 대신해 주지는 않음\n저장소 첫 화면에 index.html 또는 package.json이 바로 보이도록 올립니다."
  },
  "repo_3": {
    "id": "ws2_task_20261029_repo_3",
    "number": 33,
    "title": "과제 2. 첫 commit 확인하기",
    "text": "1\n변경 이유 한 줄을 적고 저장\n메시지 예: 사이트 초안 올리기\n처음 만든 내 저장소의 main에 Commit changes\n2\n파일 목록과 최근 기록 열기\n폴더가 한 겹 더 들어가지 않았는지 확인\n파일 목록 위의 commit 메시지를 누르고 변경 파일 확인\ncommit은 이 시점의 기록\n나중에 비교할 수 있는 변경 단위\n이름을 붙인 폴더 복사와는 다름\n남길 것\n저장소 URL + 첫 commit 링크\n다음 과제에서는 이 저장소를 연결"
  },
  "connect_1": {
    "id": "ws2_task_20261029_connect_1",
    "number": 38,
    "title": "과제 3. GitHub와 Cloudflare 연결",
    "text": "목표: 파일을 다시 끌어놓지 않고 배포하기\n과제 1의 직접 업로드 프로젝트는 Git 연동으로 바꿀 수 없습니다.\n이번에는 GitHub와 연결한 Pages 프로젝트를 새로 만듭니다.\n1\n새 Pages 프로젝트에서 Connect to Git\nCloudflare → Workers & Pages → Create application → Pages\nConnect to Git → GitHub 연결\n방금 만든 내 저장소 선택 → Install & Authorize → Begin setup\n저장소가 안 보이면 GitHub 앱의 접근 허용 목록부터 확인"
  },
  "connect_2": {
    "id": "ws2_task_20261029_connect_2",
    "number": 39,
    "title": "과제 3. 빌드 설정 맞추기",
    "text": "Production branch는 main. 내 원본 종류에 맞춰 입력\nHTML·CSS·JS 사이트\nFramework preset: None\nBuild command: 비워 두기\nBuild output directory: /\nVite / React 사이트\nFramework preset: 실제 프로젝트 선택\nBuild command: npm run build\nBuild output directory: dist\n원본이 저장소 첫 화면에 있다면 Root directory는 기본값 그대로.\n하위 폴더에 있다면 그 폴더를 Root로 지정 → Save and Deploy"
  },
  "connect_3": {
    "id": "ws2_task_20261029_connect_3",
    "number": 40,
    "title": "과제 3. 이제 이 주소가 정식 주소",
    "text": "1\nDeployments에서 결과 확인\nStatus: Success / Environment: Production / Branch: main\n표시된 commit이 GitHub의 최신 commit과 같은지 비교\n2\n새 프로젝트의 *.pages.dev 열기\n과제 1의 직접 업로드 주소와 다릅니다. 새 주소를 기록\n첫 화면·이미지·새로고침이 정상인지 다시 확인\n빌드 실패 → View build log에서 첫 오류 확인\npackage.json 위치 · 빌드 명령 · 결과 폴더 순서로 점검\n남길 것  ·  Git 연동 프로젝트의 Production URL + commit"
  },
  "preview_1": {
    "id": "ws2_task_20261029_preview_1",
    "number": 49,
    "title": "과제 4. main 옆에 작업 가지 만들기",
    "text": "목표: 정식 사이트는 두고, 바꾼 내용을 따로 확인하기\n1\nGitHub의 main 메뉴 열기\n저장소 파일 목록 왼쪽 위 main 클릭 → try-v99 입력\nCreate branch: try-v99 from main 선택\n2\n현재 branch가 try-v99인지 확인\n파일을 고치기 전에 branch 이름부터 보기\n이 과제에서는 main을 직접 수정하지 않습니다.\nmain = 지금 운영 중  /  try-v99 = 이번에 바꿔 볼 곳"
  },
  "preview_2": {
    "id": "ws2_task_20261029_preview_2",
    "number": 50,
    "title": "과제 4. 문구 하나 바꾸고 commit",
    "text": "1\n눈에 띄는 제목 한 줄 찾기\ntry-v99에서 index.html 열기 → 연필(Edit)\nVite라면 src 안에서 화면의 제목이 있는 파일 열기\n2\n문구만 바꾸고 변경 내용 확인\n기본 예제: “오늘, 같이 뭐 할까?” → “이번 주, 같이 뭐 할까?”\n태그·코드 구조는 그대로 두고 바뀐 줄 확인\n3\ntry-v99에 commit 저장\nCommit changes → 메시지: 첫 화면 제목 수정\n현재 branch try-v99에 저장 → Cloudflare 배포 완료 기다리기"
  },
  "preview_3": {
    "id": "ws2_task_20261029_preview_3",
    "number": 51,
    "title": "과제 4. 두 주소 나란히 열기",
    "text": "Cloudflare → Deployments → try-v99의 Preview 주소 복사\nProduction · main\n과제 3에서 기록한 정식 URL\n제목이 이전 문구로 남아 있는가?\n새로고침해도 그대로인가?\nPreview · try-v99\n이번 commit의 시험 URL\n바꾼 제목이 보이는가?\n이미지·버튼도 정상인가?\nPreview도 주소를 알면 접근할 수 있습니다. 비밀 자료는 넣지 않기.\n실패하면 try-v99에서 수정 → commit → 새 Preview로 다시 확인"
  },
  "preview_4": {
    "id": "ws2_task_20261029_preview_4",
    "number": 52,
    "title": "과제 4. 확인 결과와 함께 PR 열기",
    "text": "1\nPull requests → New pull request\nbase: main / compare: try-v99 → 바뀐 줄 확인\nCreate pull request. 아직 Merge는 누르지 않기\nPR 본문에 남길 내용\n바꾼 것: 첫 화면 제목 한 줄\nPreview URL: [실제로 확인한 주소]\n확인: 새 제목·이미지·버튼·새로고침 정상\nProduction 확인: 아직 이전 제목\n남은 문제: 없음 / [실제 남은 문제]"
  },
  "release_1": {
    "id": "ws2_task_20261029_release_1",
    "number": 58,
    "title": "과제 5. 확인한 변경을 정식 반영",
    "text": "목표: 확인한 버전을 main에 합치고 결과까지 확인하기\n1\nPR에서 마지막으로 확인\nbase main / compare try-v99, Files changed의 바뀐 줄 확인\nPreview에서 문제가 없으면 Merge pull request → Confirm merge\n2\nProduction 배포 완료 기다리기\nCloudflare Deployments에서 main의 새 배포 확인\nSuccess가 되면 과제 3의 정식 URL을 열기\n정식 주소는 그대로, 제목은 새 문구로 바뀌면 성공"
  },
  "release_2": {
    "id": "ws2_task_20261029_release_2",
    "number": 59,
    "title": "과제 5. 복구도 연습해 보기",
    "text": "방금 바꾼 제목만 되돌려 봅니다. 연습용 사이트에서 진행\n1. Rollback\nCloudflare의 배포 결과를 이전으로\n접속하는 사람이 보는 화면 복구\n2. Revert\nGitHub 원본에도 되돌림 기록 추가\n다음 배포에서 문제가 다시 나오지 않게\nRollback만 하면 main의 코드는 그대로 남습니다.\n다음 두 장에서 “화면 복구 → 원본 수정”을 순서대로 해 봅니다."
  },
  "release_3": {
    "id": "ws2_task_20261029_release_3",
    "number": 60,
    "title": "과제 5. 이전 배포로 먼저 복구",
    "text": "1\n정상 동작했던 Production 선택\nCloudflare 프로젝트 → Deployments → All deployments\n제목을 바꾸기 전의 성공한 Production 배포 찾기\n2\nRollback 실행\n해당 배포의 … → Rollback to this deployment → 확인\nPreview 배포는 Rollback 대상이 아닙니다.\n3\n정식 URL을 새로고침\n제목이 이전 문구로 돌아왔는지 확인\nGitHub main의 제목은 아직 새 문구인 것도 비교"
  },
  "release_4": {
    "id": "ws2_task_20261029_release_4",
    "number": 61,
    "title": "과제 5. 원본에도 되돌림 남기기",
    "text": "1\n방금 합친 GitHub PR 다시 열기\nPull requests → Closed → 제목을 바꿨던 PR\nRevert → 새로 열린 되돌림 PR의 바뀐 줄 확인\n2\n되돌림 PR도 Preview에서 확인\n되돌림 branch의 배포 완료 기다리기 → Preview 열기\n이전 제목과 화면 동작 확인 → 되돌림 PR Merge\nRevert가 안 되면? main에서 새 branch를 만들고 제목을 원래대로 수정.\ncommit → PR → Preview 확인 → Merge 순서로 진행합니다.\nmain 원본과 최신 Production에 같은 이전 제목이 보이면 끝"
  },
  "release_5": {
    "id": "ws2_task_20261029_release_5",
    "number": 62,
    "title": "과제 5. 다음 프로젝트에 남길 기록",
    "text": "내 프로젝트 기록\n정식 사이트: [Git 연동 프로젝트의 Production URL]\n원본 저장소: [내 GitHub URL]\n변경 기록: [PR 링크] / 확인한 Preview: [URL]\n직접 확인한 것: [제목·이미지·버튼·새로고침]\n복구 확인: [Rollback 후 화면 / Revert 후 main과 화면]\n다음 기능도 같은 순서로\nbranch → 작은 수정 → commit → Preview 확인 → PR → Merge\n문제가 생기면: Production 복구 → 원인 수정 → 다시 확인"
  }
};
