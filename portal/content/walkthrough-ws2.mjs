// 2026-11-03 GitHub·Cloudflare 실제 화면. 계정 영역은 제외한 16:10 이미지입니다.
// 캡처 속 운영진 저장소 대신 각자의 실습 저장소에서 따라 합니다.
const image = name => `/images/walk/ws2/${name}.jpg`;
const shot = (name, box, text, note = '') => ({ image: image(name), ...(box ? { box } : {}), text, note });
const own = '화면은 운영진 계정의 위치 예시입니다. 내 계정·내 실습 저장소를 선택하세요.';

export const ws2Walkthroughs = {
  'publish-site': {
    title: 'ZIP 준비 → Pages 직접 업로드 → 공개 주소 확인',
    steps: [
      { image: '/images/examples/ws2-starter.jpg', text: '[기본 예제 ZIP](/downloads/workshop2-site.zip)을 내려받아 모두 압축을 풉니다. index.html을 열면 이 SNU 실습 화면이 나옵니다. collective.html은 Student Collective 화면입니다.', note: '기본 예제는 HTML·CSS·JS 사이트라 빌드가 필요 없습니다. Vite 프로젝트는 npm run build로 만든 dist를 배포합니다.' },
      shot('01-pages-entry', [53, 66, 14, 6], '[Cloudflare](https://dash.cloudflare.com/)에서 Workers & Pages → Create application을 누릅니다. 새 생성 화면 아래의 Continue to Pages를 선택합니다.', 'Upload your static files는 Workers 경로입니다. 이번 수업에서는 Pages로 이동합니다.'),
      shot('02-pages-method', [17, 49, 64, 19], 'Drag and drop your files 행의 Get started를 누릅니다.', 'GitHub 연결은 과제 3에서 새 프로젝트로 진행합니다.'),
      shot('03-project-name', [5, 22, 88, 12], '프로젝트 이름을 collective-manual처럼 정하고 Create project를 누릅니다. 이름이 이미 사용 중이면 내 이름이나 숫자를 덧붙이세요.'),
      shot('03-project-name', [4, 42, 90, 26], '이름을 만든 다음 Upload your project assets에 ZIP 또는 배포 폴더를 올립니다. 업로드된 목록에 index.html이 바로 보이는지 확인하고 Deploy site를 누릅니다.', '이 화면은 이름을 만들기 전입니다. Create project를 누르면 아래 업로드 영역과 배포 버튼이 활성화됩니다. assets 폴더도 함께 올립니다.'),
      { image: '/images/examples/ws2-starter.jpg', text: '배포가 끝나면 표시된 *.pages.dev 주소를 복사해 시크릿 창이나 휴대폰에서 엽니다. 이미지·신청 버튼·수업 자료·Student Collective 이동·새로고침을 확인합니다.', note: '주소가 열렸다는 것과 모든 기능이 작동한다는 것은 별개입니다. 공개 URL과 확인 결과를 기록하세요.' }
    ]
  },
  'save-source': {
    title: '내 저장소 만들기 → 원본 올리기 → 첫 commit',
    steps: [
      shot('05-new-repo', [18, 7, 64, 13], '[GitHub 새 저장소](https://github.com/new)를 엽니다. Owner가 내 계정인지 확인하고 Repository name에 collective-demo를 입력합니다.', own),
      shot('05-new-repo', [18, 44, 64, 31], '공개 범위를 정하고 Add README를 켭니다. 혼자 실습하면 Private, 원본을 공개하려면 Public을 선택한 뒤 화면 아래 Create repository를 누릅니다.', '계정이나 저장소 이름을 캡처와 똑같이 따라 적을 필요는 없습니다.'),
      shot('06-add-file', [52, 10, 18, 15], '새 저장소의 Code 화면에서 Add file → Upload files를 누릅니다.', own),
      shot('07-upload-commit', [5, 5, 92, 36], '압축을 푼 폴더 안의 원본 파일과 assets 폴더를 올립니다. 기본 예제는 index.html·collective.html·styles.css·app.js·assets를 포함합니다.', 'Vite는 dist만 올리지 말고 package.json과 src 등 원본을 올립니다. .env·비밀 키·node_modules·dist는 제외합니다.'),
      shot('07-upload-commit', [7, 47, 90, 12], 'Commit summary에 “초기 사이트 원본 추가”를 씁니다. 처음 원본을 저장하는 단계이므로 main을 선택하고 Commit changes를 누릅니다.', '웹 업로드에서는 .gitignore가 선택한 파일을 자동으로 제외하지 않습니다. 업로드 목록을 직접 확인하세요.'),
      shot('06-add-file', [3, 19, 68, 12], '저장소 첫 위치에 index.html이 보이는지 확인합니다. 파일 목록 위 첫 commit 메시지를 열어 올라간 파일을 확인하고 저장소·commit 링크를 기록합니다.', '캡처는 운영진 저장소입니다. 내 저장소에는 운영 코드가 아니라 ZIP의 실습 파일이 보여야 합니다.')
    ]
  },
  'connect-cloudflare': {
    title: 'Git 저장소 연결 → 빌드 설정 → Production',
    steps: [
      shot('01-pages-entry', [53, 66, 14, 6], 'Workers & Pages → Create application → Continue to Pages로 돌아옵니다. 이번에는 GitHub와 연결할 새 Pages 프로젝트를 만듭니다.', '직접 업로드 프로젝트를 Git 연동 방식으로 바꾸는 것이 아닙니다. 새 프로젝트에는 새 주소가 생깁니다.'),
      shot('02-pages-method', [17, 30, 64, 18], 'Import an existing Git repository 행의 Get started를 누릅니다. GitHub 계정을 연결하고 과제 2에서 만든 내 저장소를 선택한 뒤 Begin setup을 누릅니다.', '저장소가 없다면 Cloudflare Pages 앱에 해당 저장소 접근을 허용했는지 확인합니다.'),
      shot('08-project-branch', [3, 22, 65, 28], '프로젝트 이름을 collective-demo처럼 정하고 Production branch를 main으로 선택합니다.', '캡처의 openAI_WS는 운영진 저장소입니다. 여러분은 원본을 올린 본인 저장소를 연결하세요.'),
      shot('08-build-settings', [2, 14, 36, 42], '기본 예제는 Framework preset: None, Build command: 공란, Build output directory: / 로 설정합니다. Root directory는 기본값을 유지합니다.', 'Build command가 필수로 표시되면 exit 0을 씁니다. Vite는 프로젝트에 맞는 프레임워크 / npm run build / dist입니다.'),
      shot('08-build-settings', [75, 82, 15, 9], '설정을 확인하고 Save and Deploy를 누릅니다. 실패하면 View build log에서 첫 오류와 원본 위치·출력 폴더를 확인합니다.'),
      shot('09-deployments', [3, 2, 90, 28], 'Deployments에서 Production · main · 성공 표시를 확인합니다. Source의 commit이 GitHub 최신 commit과 같은지 비교하고 Domains의 정식 URL을 엽니다.', '과제 1의 직접 업로드 주소와 다릅니다. 이후에는 이번 Git 연동 프로젝트의 정식 URL을 사용합니다.')
    ]
  },
  'test-preview': {
    title: 'try-v99 → 버튼 문구 수정 → Preview → PR',
    steps: [
      shot('10-create-branch', [2, 16, 26, 23], '저장소 Code 화면의 main branch 메뉴를 엽니다. try-v99를 입력하고 Create branch try-v99 from main을 누릅니다.', 'main에서 시작했는지, 새 branch를 만든 뒤 표시가 try-v99로 바뀌었는지 확인합니다.'),
      { image: '/images/examples/ws2-starter.jpg', text: 'try-v99에서 index.html을 열고 연필(Edit this file)을 누릅니다. “Workshop 2 신청하기”를 “Workshop 2 참여하기”로 바꿉니다. href의 신청 링크는 유지합니다.', note: '버튼을 찾기 어려우면 페이지 검색으로 “Workshop 2 신청하기”를 찾으세요. 이미지나 레이아웃을 바꾸는 과제가 아닙니다.' },
      shot('07-upload-commit', [7, 47, 90, 37], '수정 화면의 Commit changes를 누르고 메시지에 “Workshop 2 신청 버튼 문구 수정”을 적습니다. 저장 대상이 try-v99인지 확인하고 commit합니다.', '캡처는 첫 업로드 화면의 commit 위치 예시입니다. 이번에는 main이 아니라 try-v99에 저장해야 합니다.'),
      shot('09-deployments', [2, 34, 92, 24], 'Cloudflare의 같은 Git 연동 프로젝트 → Deployments에서 try-v99 배포를 찾습니다. Environment가 Preview이고 배포가 성공하면 그 행의 배포 URL을 엽니다.', '캡처는 Production 목록의 위치 예시입니다. 내 목록에서는 try-v99 · Preview 행을 선택하세요.'),
      { image: '/images/examples/ws2-complete.png', text: 'Production과 Preview를 나란히 엽니다. Production은 “신청하기”, Preview는 “참여하기”인지 확인합니다. 두 버튼이 같은 신청 페이지로 가는지도 확인하세요.', note: '이 화면은 변경 후 비교본입니다. 과제 4에서는 버튼 문구만 바꿉니다. 학교 카드의 수업 자료 버튼은 선택 실습입니다.' },
      shot('12-compare', [3, 10, 28, 9], 'GitHub → Pull requests → New pull request를 엽니다. base는 main, compare는 try-v99로 바꿉니다. Files changed에서 버튼 글자만 바뀌었는지 확인합니다.', '캡처는 비교 branch를 고르기 전입니다. base와 compare가 모두 main이면 PR을 만들 수 없습니다.'),
      shot('12-compare', [84, 20, 14, 7], 'Create pull request를 누르고 제목·Preview URL·확인한 동작·남은 문제를 적어 PR을 만듭니다. 이번 과제에서는 아직 Merge하지 않습니다.', 'Preview URL은 시험 주소, Production URL은 정식 주소입니다. 두 주소를 구분해 기록하세요.')
    ]
  },
  'release-recover': {
    title: 'Merge → Rollback → Revert → 원본과 화면 확인',
    steps: [
      shot('12-compare', null, '열어 둔 PR에서 Files changed와 Preview 결과를 마지막으로 확인합니다. Merge pull request → Confirm merge를 누릅니다.', '캡처는 변경 비교 화면입니다. 실제 Merge 버튼은 열린 PR 아래쪽에 있으며, 확인을 마친 내 연습용 PR에서 진행합니다.'),
      shot('09-deployments', [3, 2, 90, 28], 'Cloudflare에서 main의 새 Production 배포가 성공할 때까지 기다립니다. 같은 정식 URL을 새로고침해 “Workshop 2 참여하기”가 보이는지 확인합니다.'),
      shot('13-rollback', [78, 51, 18, 11], '복구 연습: All deployments에서 문구 변경 전의 성공한 Production 행의 … → Rollback to this deployment를 선택하고 확인합니다.', '내 연습용 프로젝트에서만 진행합니다. 캡처의 날짜·commit을 따라 고르지 말고 내 변경 직전의 성공한 Production을 고르세요.'),
      { image: '/images/examples/ws2-starter.jpg', text: '정식 URL을 새로고침해 “Workshop 2 신청하기”로 돌아왔는지 확인합니다. GitHub main의 index.html도 열어 보세요. Rollback만 하면 main의 문구는 아직 “참여하기”입니다.', note: 'Rollback은 배포 화면을 먼저 복구합니다. 원본까지 되돌리려면 다음 Revert 단계가 필요합니다.' },
      shot('14-revert', [64, 57, 5, 8], 'GitHub → Pull requests → Closed에서 방금 Merge한 내 PR을 엽니다. merged commit 줄 오른쪽 Revert를 누르고 되돌림 PR을 만듭니다.', '버튼이 없거나 충돌하면 main에서 새 branch를 만들고 문구를 “신청하기”로 수정한 뒤 되돌림 PR을 만듭니다.'),
      shot('14-revert', [18, 5, 44, 20], '되돌림 PR의 Preview에서 “신청하기”와 링크를 확인한 뒤 Merge합니다. PR에 Cloudflare 봇이 남긴 Preview URL이 있으면 그 링크로 확인할 수도 있습니다.', '캡처는 운영진의 과거 PR입니다. 본인이 만든 되돌림 PR의 Preview와 변경 내용을 확인하세요.'),
      shot('09-deployments', [3, 2, 90, 28], '마지막 main 배포가 성공하면 Production과 GitHub 원본이 모두 “신청하기”인지 확인합니다. 정식 URL·저장소·PR·Preview·확인 결과를 기록하면 완료입니다.', '선택 실습: collective.html의 서울대 카드에 수업 자료 버튼을 추가한 뒤 같은 branch → Preview → PR 흐름으로 반영해 보세요.')
    ]
  }
};
