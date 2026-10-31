// Studio Session, Showcase, 학생 프로젝트, 협력 안내.
// 일정이 확정되면 event의 start/end/place를 채우고 status를 'scheduled'로 바꾸세요.

export const studio = {
  title: 'Studio Session',
  korean: '함께 만드는 시간',
  cadence: '매주 월요일',
  audience: '누구나 · 필수 아님',
  message: '매주 월요일, 워크숍 내용을 다시 짚고 막힌 곳을 함께 풀어요.',
  description: '매주 월요일에 열리는 작업 시간이에요. 워크숍 내용을 다시 정리하고, 막힌 부분이나 다음 기능 질문을 가져오면 함께 풀어요.',
  // 상태와 배지는 sessions에서 다음 회차를 찾아 자동으로 정합니다.
  event: { status: 'tbd', start: null, end: null, place: null },
  // 회차: { start, end, place, note, topic?, detail?, tag?, call?, slides? } — tag는 배지, call은 강조 문장으로 표시
  // slides: 학생용 Google 슬라이드 주소('링크가 있는 모든 사용자 · 뷰어'로 공유). 있으면 '세션 슬라이드' 버튼이 생깁니다.
  sessions: [
    { start: '2026-10-26T19:00:00+09:00', end: '2026-10-26T20:00:00+09:00', place: null, note: 'Workshop 1이 끝난 뒤' },
    {
      start: '2026-11-02T19:00:00+09:00', end: '2026-11-02T20:00:00+09:00', place: null, note: 'Workshop 2가 끝난 뒤',
      slides: 'https://docs.google.com/presentation/d/1TwJDjzG1Oo24YirHCgSs3BGoOPhncrmkVkVTDjmOpCQ/edit?usp=sharing',
      topic: 'VS Code 세팅 · GitHub·Cloudflare 실습 Q&A',
      detail: 'VS Code를 함께 세팅하고, Workshop 2의 GitHub·Cloudflare 실습 예제를 따라가며 생긴 문제를 질문하고 해결해요.',
      tag: '처음이라면 추천',
      call: '코딩이 처음이라면 와서 함께 세팅해 보세요. 실습하다 막힌 화면을 그대로 가져오면 돼요.'
    }
  ],
  bring: [
    '작업 중인 내 프로젝트 (완성하지 않아도 괜찮아요)',
    '만들고 싶은 것, 시도한 방법, 막힌 부분이나 오류 화면',
    '노트북과 충전기'
  ],
  question: `만들고 싶은 것: [내 서비스와 이번에 넣고 싶은 기능]
시도한 방법: [Codex에 요청한 내용, 바꾼 설정]
막힌 부분: [기대한 결과와 실제 화면, 오류 문구]`,
  caution: '비밀번호·API 키는 가려 주세요'
};

export const showcase = {
  title: 'Showcase',
  korean: '결과물 전시 및 소개하기',
  mapTitle: 'Final Showcase', // 수업 지도(/learn/) 마지막 섬 이름표
  message: '내가 만든 것을 사람들에게 보여준다',
  outcome: '프로젝트 시연과 소개 경험',
  color: 'orange',
  description: '워크숍과 스튜디오 세션을 거치며 만든 결과물을 시연하고 소개해요.',
  event: { status: 'tbd', start: null, end: null, place: null },
};

// 프로젝트 카드. kind: 'student'(학생 결과물) | 'operator'(운영진 예제)
// 학생 결과물은 제작자가 공개에 동의한 경우에만 추가하고, published: true로 바꾸세요.
// 제작자 이름은 공개 동의를 받은 경우에만 maker에 적습니다.
export const projects = [
  {
    title: '틈 — 캠퍼스 모임 플래너',
    kind: 'operator',
    published: true,
    problem: '비어 있는 시간에 근처에서 함께할 모임을 찾기 어려운 문제',
    stage: 'Workshop 1 발표용 예제 · 날씨 → 로그인 → 지도 순서로 기능 추가',
    image: '/images/examples/ws1-teum-home.png',
    alt: '‘비어 있는 시간에, 함께하는 틈.’이라는 제목과 달리기 사진이 있는 모임 앱 첫 화면.',
    maker: null,
    links: [{ label: '단계별 화면 보기', url: 'https://openai-ws-workshop1.a01085519047.workers.dev/versions/' }]
  },
  {
    title: '틈 — 즐겨찾기 추가',
    kind: 'operator',
    workshop: 2, // 이 회차 자료가 열릴 때 함께 공개
    published: true,
    problem: '관심 있는 모임을 다시 찾기 어려운 문제',
    stage: 'Workshop 2 비교용 완성본 · 새로고침하면 초기화',
    image: '/images/examples/ws2-complete.png',
    alt: '모임 카드 세 개에 즐겨찾기 버튼이 있는 화면.',
    maker: null,
    links: [{ label: '완성본 열기', url: '/examples/workshop2/complete/' }]
  }
];

// 함께하는 팀: 협력이 확정된 곳만 적습니다. 연락처는 공개 페이지에 넣지 않아요.
export const collaboration = [
  { who: 'OpenAI Student Collective', what: '프로그램 운영 지원' },
  { who: '총동아리연합회', what: '공동 홍보' },
  { who: 'SNUquill', what: '공동 홍보(인스타그램), 팀 워크숍 참여' },
  { who: '총연극회', what: '공동 홍보, 팀 워크숍 참여' },
  { who: '야생조류연구회', what: '팀 워크숍 참여' },
  { who: 'DWNC', what: '공동 홍보(인스타그램)' }
];
