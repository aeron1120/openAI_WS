// 사이트 전체 정보. 링크가 없으면 null로 두세요. null인 링크의 버튼은 화면에 나타나지 않습니다.
export const site = {
  name: 'OpenAI Student Collective | SNU',
  shortName: 'Student Collective · SNU',
  promise: '아이디어를 직접 구현하고, 사람들에게 공유해요.',
  description: '서울대학교 학생이 ChatGPT·Codex로 내 아이디어를 웹 서비스로 만들고, 고치고, 공유하는 학기 프로그램. 워크숍 4회와 Studio Session, Showcase로 이어집니다.',
  // 공유 미리보기와 canonical 주소의 기준. 도메인이 바뀌면 이 값만 고치고 다시 빌드하세요.
  url: 'https://snu-student-collective.pages.dev',
  timeZone: 'Asia/Seoul',
  semester: '2026년 2학기',
  operators: {
    role: 'SNU Campus Leads',
    names: ['김태현', '박서린']
  },
  supportNotice: '운영자는 OpenAI Student Collective 프로그램을 통해 활동비 등 지원을 받습니다.',
  links: {
    openChat: 'https://open.kakao.com/o/pqDgx8Pi', // 오픈채팅 주소 ('https://open.kakao.com/...' 형식)
    contact: 'https://open.kakao.com/o/pqDgx8Pi', // 협력 문의 주소(폼·이메일 링크도 가능, mailto: 도 가능). 지금은 오픈채팅으로 받아요
    repository: 'https://github.com/aeron1120/openAI_WS'
  }
};
