# Workshop 2 · SNU & Student Collective 예제

2026-11-02 수업 슬라이드에 맞춘 연습용 사본입니다. 운영 중인 실제 사이트의 전체 소스는 아닙니다.

## 1. 열기와 첫 배포
- ZIP을 모두 풀고 index.html을 엽니다. 설치나 빌드가 필요 없습니다.
- Cloudflare Pages 직접 업로드에는 workshop2-site.zip 자체 또는 index.html이 바로 보이는 이 폴더를 올립니다.
- assets 폴더와 collective.html, styles.css, app.js도 함께 올립니다.
- 로그인이나 API 서버가 없는 정적 예제입니다. 수업 자료와 신청 버튼은 실제 외부 페이지로 이동합니다.

## 2. GitHub 원본
이 폴더 안의 파일과 assets를 새 저장소에 올립니다. README와 .gitignore도 포함합니다. ZIP 자체를 업로드하지 않습니다.
첫 commit 메시지: 초기 사이트 원본 추가

## 3. Git 연동 Pages
새 Pages 프로젝트를 만들고 저장소를 연결합니다. 직접 업로드 프로젝트는 전환할 수 없습니다.
Production branch: main / Framework: None / Build command: 비움 (필수이면 exit 0) / Output: / / Root: 기본값

## 4. 슬라이드와 같은 변경
main에서 try-v99를 만듭니다. index.html에서 버튼 글자 “Workshop 2 신청하기”만 “Workshop 2 참여하기”로 바꿉니다.
href=https://luma.com/54mgt7n8 은 유지합니다. commit 후 Preview에는 참여하기, Production에는 신청하기가 보여야 합니다.
PR: base main / compare try-v99. Preview URL과 버튼·링크·모바일·새로고침 확인 결과를 적습니다.
선택 실습: collective.html의 서울대 카드에 https://snu-student-collective.pages.dev/learn/02/ 를 새 탭으로 여는 수업 자료 버튼을 추가합니다. SNU 홈페이지 링크는 유지합니다.

## 5. 반영과 복구
검증한 PR을 Merge하고 정식 주소를 확인합니다. 이전 성공 Production으로 Rollback하면 화면만 돌아옵니다.
GitHub에서 해당 Merge PR의 Revert로 되돌림 PR을 만들고 Preview 확인 → Merge합니다.
main과 최신 Production에 “Workshop 2 신청하기”가 보이면 복구 완료입니다.
완성본 ZIP은 비교용입니다. 연습은 시작본으로 하세요.

파일: index.html(SNU), collective.html(학교 안내), styles.css(공통 디자인), app.js(브라우저 스크립트), assets/workshop2.jpg(현장 사진)
안내: https://snu-student-collective.pages.dev/learn/02/#step-publish-site
