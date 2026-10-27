// Studio Session, Showcase, 학생 프로젝트, 협력 안내.
// 일정이 확정되면 event의 start/end/place를 채우고 status를 'scheduled'로 바꾸세요.

export const studio = {
  title: 'Studio Session',
  korean: '함께 만드는 시간',
  cadence: '매주 월요일',
  message: '매주 월요일, 워크숍 내용을 다시 짚고 막힌 곳을 함께 풀어요.',
  description: '매주 월요일에 열리는 작업 시간이에요. 워크숍 내용을 다시 정리하고, 막힌 부분이나 다음 기능 질문을 가져오면 함께 풀어요.',
  optionalNote: '오면 좋지만 필수는 아니에요. 매번 내용을 다시 정리하기 때문에, 못 와도 다음 워크숍을 따라가는 데 문제없어요.',
  timingNote: '시간은 주마다 달라질 수 있어요. 회차별 시간은 일정에서 확인해 주세요.',
  // 상태와 배지는 sessions에서 다음 회차를 찾아 자동으로 정합니다.
  event: { status: 'tbd', start: null, end: null, place: null },
  // 회차: { start, end, place, note, topic?, detail?, tag?, call? } — tag는 배지, call은 강조 문장으로 표시
  sessions: [
    { start: '2026-10-26T19:00:00+09:00', end: '2026-10-26T20:00:00+09:00', place: null, note: 'Workshop 1이 끝난 뒤' },
    {
      start: '2026-11-02T19:00:00+09:00', end: '2026-11-02T20:00:00+09:00', place: null, note: 'Workshop 2가 끝난 뒤',
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
  caution: '질문에 화면을 공유할 때 비밀번호·API 키는 꼭 가려 주세요.'
};

export const showcase = {
  title: 'Showcase',
  korean: '만든 것을 소개하는 날',
  message: '내가 만든 것을 사람들에게 보여준다',
  outcome: '프로젝트 시연과 소개 경험',
  color: 'rose',
  description: '학기 동안 만든 서비스를 사람들 앞에서 시연하고 소개해요.',
  event: { status: 'tbd', start: null, end: null, place: null },
  timingNote: '학기 말 개최를 검토하고 있어요. 일정은 확정되면 안내합니다.'
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

export const collaboration = [
  { who: '학생회', what: '소속 학생 대상 모집 안내, 단과대·학과 학생을 위한 공동 세션' },
  { who: '행정실·관련 부서', what: '실습 공간과 교내 공지 협조, 적절한 담당 부서 연결' },
  { who: '동아리·학회', what: '관심 주제에 맞춘 실습, 참여 그룹 모집과 진행 지원' },
  { who: '교육·창업 관련 조직', what: '멘토링, 후속 프로젝트 지원, Showcase 연계' }
];
