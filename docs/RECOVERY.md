# 5분 복구 연습

실습 전에 저장소 루트에서 한 번 준비합니다. 기존 폴더가 있으면 덮어쓰지 않고 중단합니다. 다시 연습하려면 새 Clone에서 준비하세요.

```sh
node scripts/prepare-recovery.mjs
```

`workshop2/recovery-practice`에 **독립된 Git 저장소**와 두 개의 연습 commit이 생깁니다. 첫 commit은 버튼이 작동하고, 마지막 commit은 실수로 버튼을 비활성화합니다. 원본 GitHub에는 이 연습 폴더가 올라가지 않습니다.

루트에서 `npm run dev`를 실행한 상태로 `http://localhost:5173/workshop2/recovery-practice/`를 엽니다. 즐겨찾기 버튼이 눌리지 않는 것을 확인하세요. 새 터미널에서 다음을 실행합니다.

```sh
cd workshop2/recovery-practice
git status
git log --oneline -2
```

현재 폴더가 recovery-practice이고, 작업 중 변경이 없고, 최신 commit 메시지가 `practice: accidentally disable favorites`인지 확인합니다. 이 연습에서만 최신 commit을 되돌립니다.

```sh
git revert --no-edit HEAD
git log --oneline -3
```

Git이 작성자 정보를 요구하면 이 연습 폴더 안에서 본인의 user.name과 user.email을 설정한 뒤 다시 실행합니다. 새로고침하면 버튼이 다시 동작해야 합니다. 과거 두 commit은 남고 새 Revert commit이 추가되어야 합니다.

이 독립 저장소에는 원격 저장소가 없습니다. 여기서는 로컬 복구까지 확인합니다. 기본 과제의 GitHub push는 starter를 수정한 상위 저장소에서 진행합니다. 실제 공유 저장소의 복구 commit은 확인 후 해당 원격에 push할 수 있습니다.

충돌이 나면 멈추고 운영진에게 요청합니다. `git reset --hard`, 강제 push로 해결하지 않습니다.

공식 설명: https://git-scm.com/docs/git-revert
