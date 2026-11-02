// Studio Session, Showcase, 학생 프로젝트, 협력 안내.
// 일정이 확정되면 event의 start/end/place를 채우고 status를 'scheduled'로 바꾸세요.

export const studio = {
  title: 'Studio Session',
  korean: '함께 만드는 시간',
  cadence: '매주 월요일',
  message: '매주 월요일, 워크숍 내용을 다시 짚고 막힌 곳을 함께 풀어요.',
  description: '매주 월요일에 열리는 작업 시간이에요. 워크숍 내용을 다시 정리하고, 막힌 부분이나 다음 기능 질문을 가져오면 함께 풀어요.',
  // 상태와 배지는 sessions에서 다음 회차를 찾아 자동으로 정합니다.
  event: { status: 'tbd', start: null, end: null, place: null },
  // 회차: { start, end, place, note, topic?, detail?, tag?, call?, slides?, apply?, talk?, speaker? } — tag는 배지, call은 강조 문장으로 표시
  // slides: 학생용 Google 슬라이드 주소('링크가 있는 모든 사용자 · 뷰어'로 공유). 있으면 '세션 슬라이드' 버튼이 생깁니다.
  // apply: 참가 신청 주소(Luma 등). 있으면 Studio 페이지와 홈에 '참가 신청' 버튼이 생깁니다.
  // talk: true면 연사 특강으로 보고 가져올 것·질문 틀을 숨깁니다.
  // 다음 워크숍보다 다음 Studio Session이 먼저면 홈의 '다음 일정' 칸에 Studio Session을 크게 보여줍니다.
  sessions: [
    { start: '2026-10-26T19:00:00+09:00', end: '2026-10-26T20:00:00+09:00', place: null, note: 'Workshop 1이 끝난 뒤' },
    {
      start: '2026-11-02T19:00:00+09:00', end: '2026-11-02T20:00:00+09:00', place: null, note: 'Workshop 2가 끝난 뒤',
      slides: 'https://docs.google.com/presentation/d/1TwJDjzG1Oo24YirHCgSs3BGoOPhncrmkVkVTDjmOpCQ/edit?usp=sharing',
      topic: 'VS Code 세팅 · GitHub·Cloudflare 실습 Q&A',
      detail: 'VS Code를 함께 세팅하고, Workshop 2의 GitHub·Cloudflare 실습 예제를 따라가며 생긴 문제를 질문하고 해결해요.',
      tag: '처음이라면 추천',
      call: '코딩이 처음이라면 와서 함께 세팅해 보세요. 실습하다 막힌 화면을 그대로 가져오면 돼요.'
    },
    {
      // 끝 시각은 공지에 없어 다른 회차처럼 1시간으로 둡니다. 확정되면 고치세요.
      start: '2026-11-09T19:00:00+09:00', end: '2026-11-09T20:00:00+09:00', place: null, note: '스페셜 게스트 토크',
      topic: 'AI 시대의 Identity',
      detail: '에이전트가 나를 대신해 행동할 때, 서비스는 ‘나’와 ‘에이전트’를 어떻게 구분할까요? Vercel · Better Auth 메인테이너 김태수 님과 Agent Identity, 오픈소스, 여러분의 프로젝트에 대해 이야기 나눠요.',
      tag: '스페셜 게스트',
      talk: true, // 연사 특강: 가져올 것·질문 틀을 숨깁니다.
      speaker: '김태수 · Vercel / Better Auth 메인테이너',
      call: '개인 노트북을 꼭 가져와 주세요.',
      apply: 'https://luma.com/yj2yy948' // 있으면 '참가 신청' 버튼이 생깁니다.
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
    title: 'SNU ECE 공지방',
    kind: 'operator',
    published: true,
    problem: '학부 소식이 여러 곳에 흩어져 있어 한곳에서 확인하기 어려운 문제',
    stage: '서울대 전기·정보공학부 공지를 모아 보는 학생 운영 비공식 서비스 · Google 로그인 후 이용',
    image: '/images/examples/snu-ece-logo.png',
    alt: 'SNU ECE 공지방 로고.',
    maker: null,
    links: [{ label: '사이트 열기', url: 'https://snu-ece-announcement.pages.dev/login?next=%2F' }]
  },
  {
    title: 'Golden Time Router — 골든타임 라우터',
    kind: 'operator',
    published: true,
    problem: '응급 상황에서 환자 상태와 현재 위치를 빠르게 정리하기 어려운 문제',
    stage: '환자 상태를 음성으로 말하고 현재 위치를 확인하는 웹앱 · 마이크·위치 권한 필요',
    image: '/images/examples/golden-time-router-logo.png',
    alt: 'Golden Time Router 로고.',
    maker: null,
    links: [{ label: '사이트 열기', url: 'https://irb2026.pages.dev/' }]
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
