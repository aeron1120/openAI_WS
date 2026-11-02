// 2026-11-03: 학생용 원본 슬라이드의 실제 순서와 본문.
export const ws2Practice = {
  "deploy_1": {
    "id": "ws2_task_20261029_deploy_1",
    "number": 25,
    "title": "과제 1. 내 사이트 파일 준비하기",
    "text": "PART A. 첫 공개 배포  ·  1/4\n과제 1. 내 사이트 파일 준비하기\nWorkshop 2  |  과제 1 열기 ↗\n25\n목표: 내 컴퓨터 밖에서도 열리는 주소 만들기\n1\n내 원본 또는 공유받은 예시 원본의 사본 준비\n사이트를 만든 대화나 저장소에서 실제 소스 받기\n공개 URL만으로 원본 ZIP이 제공되는 것은 아닙니다.\n2\nZIP 압축을 풀고 파일 확인\nWindows: 우클릭 → 모두 압축 풀기 / Mac: 두 번 클릭\nindex.html 또는 package.json이 있는 폴더 찾기\n수업 시연: SNU·Student Collective / 실습: 내 사본과 내 배포 URL\nSNU 예시 사이트 둘러보기\n"
  },
  "deploy_2": {
    "id": "ws2_task_20261029_deploy_2",
    "number": 26,
    "title": "과제 1. 무엇을 올려야 할까?",
    "text": "PART A. 첫 공개 배포  ·  2/4\n과제 1. 무엇을 올려야 할까?\nWorkshop 2  |  과제 1 열기 ↗\n26\n내 폴더가 어느 쪽인지 확인하고 하나만 따라가기\nHTML·CSS·JS만 있다면\nindex.html이 바로 보이는 폴더 사용\nCSS·JS·이미지도 함께 포함\n별도 빌드 없이 다음 장으로\nVite / React 프로젝트라면\npackage.json이 있는 폴더를\nCodex에서 열고 아래처럼 요청\n완성된 dist 폴더를 업로드\n“이 프로젝트를 Cloudflare Pages에 올리려고 해. 빌드 방법을 확인하고\n실행해줘. 실제로 업로드할 폴더와 서버가 필요한 기능을 알려줘.”\n원본 폴더는 그대로 보관. package.json이 있어도 Vite가 아니면 빌드 방법부터 확인!\n"
  },
  "deploy_3": {
    "id": "ws2_task_20261029_deploy_3",
    "number": 27,
    "title": "과제 1. Cloudflare에 올리기",
    "text": "PART A. 첫 공개 배포  ·  3/4\n과제 1. Cloudflare에 올리기\nWorkshop 2  |  과제 1 열기 ↗\n27\n1\nCloudflare에 로그인하고 Pages 선택\nWorkers & Pages → Create application → Pages\nDrag and drop 또는 Upload assets 선택\n2\n프로젝트 이름을 적고 배포 파일 넣기\n내가 알아볼 이름 입력 → 앞 장에서 고른 폴더 또는 그 ZIP 업로드\nHTML 사이트: index.html 폴더 / Vite: 빌드한 dist\n3\nDeploy 누르고 완료 기다리기\n배포가 성공하면 화면의 *.pages.dev 주소를 복사\n이후 수정은 이 프로젝트의 Create a new deployment에서 올립니다.\nCloudflare 열기\n"
  },
  "deploy_4": {
    "id": "ws2_task_20261029_deploy_4",
    "number": 28,
    "title": "과제 1. 주소만 생기면 끝일까?",
    "text": "PART A. 첫 공개 배포  ·  4/4\n과제 1. 주소만 생기면 끝일까?\nWorkshop 2  |  과제 1 열기 ↗\n28\n1\n공개 주소에서 화면 확인\n시크릿 창이나 휴대폰으로 *.pages.dev 열기\n제목·이미지·이동 버튼을 확인하고 새로고침\n2\n신청·자료·학교 링크 눌러 보기\nSNU 신청·수업 자료 링크를 각각 열어 보기\nStudent Collective에서 SNU 홈페이지로 이동하는지 확인\n404 → index.html 위치 확인  /  이미지 없음 → 파일·경로 확인\n빈 화면 → 빌드 결과를 올렸는지 확인\n남길 것  ·  공개 URL + 작동한 것 + 아직 안 되는 것\n"
  },
  "repo_1": {
    "id": "ws2_task_20261029_repo_1",
    "number": 37,
    "title": "과제 2. GitHub 저장소 만들기",
    "text": "PART B. 원본과 변경 기록  ·  1/3\n과제 2. GitHub 저장소 만들기\nWorkshop 2  |  과제 2 열기 ↗\n37\n목표: 다음에 고칠 수 있도록 원본을 보관하기\n1\nGitHub에서 새 저장소 만들기\n로그인 → 오른쪽 위 + → New repository\n이름 예: collective-demo / 내 계정 아래에 만드는지 확인\n2\n공개 범위와 첫 파일 선택\n기본은 Private. 수업 공유가 필요하면 Public 선택\nAdd a README 선택 → Create repository\n완료 기준  ·  github.com/내아이디/collective-demo가 열린다\nGitHub 열기\n"
  },
  "repo_2": {
    "id": "ws2_task_20261029_repo_2",
    "number": 38,
    "title": "과제 2. 배포 파일 말고 원본 올리기",
    "text": "PART B. 원본과 변경 기록  ·  2/3\n과제 2. 배포 파일 말고 원본 올리기\nWorkshop 2  |  과제 2 열기 ↗\n38\n올릴 것\nHTML 사이트: HTML·CSS·JS·이미지\nVite: src·public·package.json\n설정 파일·lock 파일·.gitignore\n빼야 할 것\nnode_modules · dist · .git\n.env · 비밀 키 · 비밀번호\n개인정보가 들어 있는 파일\n1\nAdd file → Upload files\n원본 폴더 안의 필요한 파일·폴더를 선택해서 끌어놓기\n목록을 직접 확인. .gitignore가 웹 업로드 선택을 대신해 주지는 않음\n저장소 첫 화면에 index.html 또는 package.json이 바로 보이도록 올립니다.\n"
  },
  "repo_3": {
    "id": "ws2_task_20261029_repo_3",
    "number": 39,
    "title": "과제 2. 첫 commit 확인하기",
    "text": "PART B. 원본과 변경 기록  ·  3/3\n과제 2. 첫 commit 확인하기\nWorkshop 2  |  과제 2 열기 ↗\n39\n1\n변경 이유 한 줄을 적고 저장\n메시지 예: 초기 사이트 원본 추가\n처음 만든 내 저장소의 main에 Commit changes\n2\n파일 목록과 최근 기록 열기\n폴더가 한 겹 더 들어가지 않았는지 확인\n파일 목록 위의 commit 메시지를 누르고 변경 파일 확인\ncommit은 이 시점의 기록\n나중에 비교할 수 있는 변경 단위\n이름을 붙인 폴더 복사와는 다름\n남길 것\n저장소 URL + 첫 commit 링크\n다음 과제에서는 이 저장소를 연결\n"
  },
  "connect_1": {
    "id": "ws2_task_20261029_connect_1",
    "number": 44,
    "title": "과제 3. GitHub와 Cloudflare 연결",
    "text": "PART C. commit하면 자동 배포  ·  1/3\n과제 3. GitHub와 Cloudflare 연결\nWorkshop 2  |  과제 3 열기 ↗\n44\n목표: 파일을 다시 끌어놓지 않고 배포하기\n과제 1의 직접 업로드 프로젝트는 Git 연동으로 바꿀 수 없습니다.\n이번에는 GitHub와 연결한 Pages 프로젝트를 새로 만듭니다.\n1\n새 Pages 프로젝트에서 Connect to Git\nCloudflare → Workers & Pages → Create application → Pages\nConnect to Git → GitHub 연결\n방금 만든 내 저장소 선택 → Install & Authorize → Begin setup\n저장소가 안 보이면 GitHub 앱의 접근 허용 목록부터 확인\n"
  },
  "connect_2": {
    "id": "ws2_task_20261029_connect_2",
    "number": 45,
    "title": "과제 3. 빌드 설정 맞추기",
    "text": "PART C. commit하면 자동 배포  ·  2/3\n과제 3. 빌드 설정 맞추기\nWorkshop 2  |  과제 3 열기 ↗\n45\nProduction branch는 main. 내 원본 종류에 맞춰 입력\nHTML·CSS·JS 사이트\nFramework preset: None\nBuild command: 비움 (필수이면 exit 0)\nBuild output directory: /\nVite / React 사이트\nFramework preset: 실제 프로젝트 선택\nBuild command: npm run build\nBuild output directory: dist\n원본이 저장소 첫 화면에 있다면 Root directory는 기본값 그대로.\n하위 폴더에 있다면 그 폴더를 Root로 지정 → Save and Deploy\n"
  },
  "connect_3": {
    "id": "ws2_task_20261029_connect_3",
    "number": 46,
    "title": "과제 3. 이제 이 주소가 정식 주소",
    "text": "PART C. commit하면 자동 배포  ·  3/3\n과제 3. 이제 이 주소가 정식 주소\nWorkshop 2  |  과제 3 열기 ↗\n46\n1\nDeployments에서 결과 확인\nStatus: Success / Environment: Production / Branch: main\n표시된 commit이 GitHub의 최신 commit과 같은지 비교\n2\n새 프로젝트의 *.pages.dev 열기\n과제 1의 직접 업로드 주소와 다릅니다. 새 주소를 기록\n첫 화면·이미지·신청 링크·새로고침을 다시 확인\n빌드 실패 → View build log에서 첫 오류 확인\npackage.json 위치 · 빌드 명령 · 결과 폴더 순서로 점검\n남길 것  ·  Git 연동 프로젝트의 Production URL + commit\n"
  },
  "preview_1": {
    "id": "ws2_task_20261029_preview_1",
    "number": 55,
    "title": "과제 4. main 옆에 작업 가지 만들기",
    "text": "PART D. 정식 사이트와 분리해서 시험  ·  1/4\n과제 4. main 옆에 작업 가지 만들기\nWorkshop 2  |  과제 4 열기 ↗\n55\n목표: 정식 사이트는 두고, 바꾼 내용을 따로 확인하기\n1\nGitHub의 main 메뉴 열기\n저장소 파일 목록 왼쪽 위 main 클릭 → try-v99 입력\nCreate branch: try-v99 from main 선택\n2\n현재 branch가 try-v99인지 확인\n파일을 고치기 전에 branch 이름부터 보기\n이 과제에서는 main을 직접 수정하지 않습니다.\nmain = 지금 운영 중  /  try-v99 = 이번에 바꿔 볼 곳\n"
  },
  "preview_2": {
    "id": "ws2_task_20261029_preview_2",
    "number": 56,
    "title": "과제 4. 문구 하나 바꾸고 commit",
    "text": "PART D. 정식 사이트와 분리해서 시험  ·  2/4\n과제 4. 문구 하나 바꾸고 commit\nWorkshop 2  |  과제 4 열기 ↗\n56\n1\nSNU 사이트의 신청 버튼 찾기\ntry-v99에서 신청 버튼이 들어 있는 파일 열기 → Edit\nHTML은 index.html, Vite는 해당 src 파일 확인\n2\n문구만 바꾸고 변경 내용 확인\n“Workshop 2 신청하기” → “Workshop 2 참여하기”\n신청 주소와 코드 구조는 유지하고 바뀐 줄 확인\n3\ntry-v99에 commit 저장\nCommit changes → 메시지: Workshop 2 신청 버튼 문구 수정\n현재 branch try-v99에 저장 → 새 Preview 배포 완료 기다리기\n"
  },
  "preview_3": {
    "id": "ws2_task_20261029_preview_3",
    "number": 57,
    "title": "과제 4. 두 주소 나란히 열기",
    "text": "PART D. 정식 사이트와 분리해서 시험  ·  3/4\n과제 4. 두 주소 나란히 열기\nWorkshop 2  |  과제 4 열기 ↗\n57\nDeployments → try-v99 → Preview URL 복사\nProduction · main\n과제 3에서 기록한 정식 URL\n‘신청하기’ 문구가 남아 있는가?\n새로고침해도 그대로인가?\nPreview · try-v99\n이번 commit의 시험 URL\n‘참여하기’ 문구가 보이는가?\n같은 신청 페이지로 연결되는가?\nPreview도 주소를 알면 접근할 수 있습니다. 비밀 자료는 넣지 않기.\n실패하면 try-v99에서 수정 → commit → 새 Preview로 다시 확인\n"
  },
  "preview_4": {
    "id": "ws2_task_20261029_preview_4",
    "number": 58,
    "title": "과제 4. 확인 결과와 함께 PR 열기",
    "text": "PART D. 정식 사이트와 분리해서 시험  ·  4/4\n과제 4. 확인 결과와 함께 PR 열기\nWorkshop 2  |  과제 4 열기 ↗\n58\n1\nPull requests → New pull request\nbase: main / compare: try-v99 → 바뀐 줄 확인\nCreate pull request. 아직 Merge는 누르지 않기\nPR 본문에 남길 내용\n바꾼 것: Workshop 2 신청하기 → Workshop 2 참여하기\nPreview URL: [실제로 확인한 주소]\n확인: 새 문구·동일한 신청 링크·새로고침 정상\nProduction 확인: 아직 신청하기 문구\n남은 문제: 없음 / [실제 남은 문제]\n"
  },
  "release_1": {
    "id": "ws2_task_20261029_release_1",
    "number": 64,
    "title": "과제 5. 확인한 변경을 정식 반영",
    "text": "PART E. 반영과 복구  ·  1/5\n과제 5. 확인한 변경을 정식 반영\nWorkshop 2  |  과제 5 열기 ↗\n64\n목표: 확인한 버전을 main에 합치고 결과까지 확인하기\n1\nPR에서 마지막으로 확인\nbase main / compare try-v99, Files changed의 바뀐 줄 확인\nPreview에서 문제가 없으면 Merge pull request → Confirm merge\n2\nProduction 배포 완료 기다리기\nCloudflare Deployments에서 main의 새 배포 확인\nSuccess가 되면 과제 3의 정식 URL을 열기\n정식 URL은 그대로 · ‘참여하기’ 문구와 기존 신청 링크 모두 확인\n"
  },
  "release_2": {
    "id": "ws2_task_20261029_release_2",
    "number": 65,
    "title": "과제 5. 복구도 연습해 보기",
    "text": "PART E. 반영과 복구  ·  2/5\n과제 5. 복구도 연습해 보기\nWorkshop 2  |  과제 5 열기 ↗\n65\n방금 바꾼 버튼 문구만 되돌려 봅니다. 연습용 사이트에서 진행\n1. Rollback\nCloudflare의 배포 결과를 이전으로\n접속하는 사람이 보는 화면 복구\n2. Revert\nGitHub 원본에도 되돌림 기록 추가\n다음 배포에서 문제가 다시 나오지 않게\nRollback만 하면 main의 코드는 그대로 남습니다.\n다음 두 장에서 “화면 복구 → 원본 수정”을 순서대로 해 봅니다.\n"
  },
  "release_3": {
    "id": "ws2_task_20261029_release_3",
    "number": 66,
    "title": "과제 5. 이전 배포로 먼저 복구",
    "text": "PART E. 반영과 복구  ·  3/5\n과제 5. 이전 배포로 먼저 복구\nWorkshop 2  |  과제 5 열기 ↗\n66\n1\n정상 동작했던 Production 선택\nCloudflare 프로젝트 → Deployments → All deployments\n버튼 문구를 바꾸기 전의 성공한 Production 배포 찾기\n2\nRollback 실행\n해당 배포의 … → Rollback to this deployment → 확인\nPreview 배포는 Rollback 대상이 아닙니다.\n3\n정식 URL을 새로고침\n버튼이 ‘Workshop 2 신청하기’로 돌아왔는지 확인\nGitHub main에는 아직 ‘참여하기’ 문구가 남아 있는지 비교\n"
  },
  "release_4": {
    "id": "ws2_task_20261029_release_4",
    "number": 67,
    "title": "과제 5. 원본에도 되돌림 남기기",
    "text": "PART E. 반영과 복구  ·  4/5\n과제 5. 원본에도 되돌림 남기기\nWorkshop 2  |  과제 5 열기 ↗\n67\n1\n방금 합친 GitHub PR 다시 열기\nPull requests → Closed → 버튼 문구를 바꿨던 PR\nRevert → 새로 열린 되돌림 PR의 바뀐 줄 확인\n2\n되돌림 PR도 Preview에서 확인\n되돌림 branch의 배포 완료 기다리기 → Preview 열기\n‘Workshop 2 신청하기’ 문구·기능 확인 → 되돌림 PR Merge\nRevert가 안 되면? main에서 새 branch를 만들고 문구를 원래대로 수정.\ncommit → PR → Preview 확인 → Merge 순서로 진행합니다.\nmain과 새 Production 모두 ‘Workshop 2 신청하기’이면 완료\n"
  },
  "release_5": {
    "id": "ws2_task_20261029_release_5",
    "number": 68,
    "title": "과제 5. 다음 프로젝트에 남길 기록",
    "text": "PART E. 반영과 복구  ·  5/5\n과제 5. 다음 프로젝트에 남길 기록\nWorkshop 2  |  과제 5 열기 ↗\n68\n내 프로젝트 기록\n정식 사이트: [Git 연동 프로젝트의 Production URL]\n원본 저장소: [GitHub URL] / 정상 버전: [commit ID]\n변경 기록: [작업 branch·PR] / 확인한 Preview: [URL]\n직접 확인: [문구·신청 링크·새로고침] / 남은 문제: [내용]\n복구: [Rollback 후 화면 / Revert 후 main·새 Production]\n다음 기능도 같은 순서로\nbranch → 작은 수정 → commit → Preview 확인 → PR → Merge\n문제가 생기면: Production 복구 → 원인 수정 → 다시 확인\n"
  }
};
