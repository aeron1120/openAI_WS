// Recap: 행사 사진과 그때 한 일을 짧게 남기는 활동 기록 (/recap/, /recap/<slug>/).
// 수업 복습·진도·자료가 아니라 "그날 무엇을 했는지"의 기록입니다. 실제 행사만 적고, 예시용 기록은 공개하지 마세요.
//
// 한 행사 = 객체 하나. 공개 목록은 eventDate 최신순(같은 날이면 slug 순)입니다.
// {
//   slug: 'ws1-1026',                 // 주소 /recap/ws1-1026/ (영문 소문자·숫자·-)
//   status: 'published',              // 'published'만 공개. 'draft'는 빌드에서 빠짐(미리보기: PORTAL_DRAFTS=1)
//   title: 'Workshop 1',              // 행사명. 기존 영문 명칭(Workshop 1, Studio Session, Showcase)을 그대로
//   eventDate: '2026-10-26',          // 실제 행사 날짜 (YYYY-MM-DD)
//   summary: '기초 틀로 첫 기능 연결', // 목록 카드의 한 줄 (40자 안팎)
//   intro: '…',                       // 상세 화면의 한두 문장
//   cover: 0,                         // 대표 사진: photos의 순번(0부터)
//   photos: [
//     { src: '/images/recap/ws1-1026/01.jpg', alt: '노트북으로 실습하는 참가자들', caption: '선택' }
//   ]
// }
//
// 사진: portal/public/images/recap/<slug>/에 둡니다. 공개 동의를 받은 사진만, 이름표·학번·화면 속 개인정보가 보이지 않게,
// 위치 정보(EXIF)를 지운 뒤 올리세요. alt(무엇이 보이는지)는 꼭 적습니다. 영어 페이지용 번역은 content/en.mjs에 더합니다.
export const recaps = [
  {
    slug: 'ws1-1026',
    status: 'published',
    title: 'Workshop 1',
    eventDate: '2026-10-26',
    summary: '기초 틀을 열고 Codex로 첫 기능을 연결했어요.',
    intro: '56동 105호에서 첫 워크숍을 열었어요. 각자 기초 틀을 내 컴퓨터에서 실행하고, Codex와 함께 로그인·지도·날씨 중 하나를 연결했어요.',
    cover: 0,
    // 얼굴은 흐리게 처리하고 노트북 화면은 원본부터 가려진 사진입니다.
    photos: [
      { src: '/images/recap/ws1-1026/01.jpg', alt: '강의실에서 노트북을 펴고 앞쪽 발표를 듣는 참가자들. 얼굴은 흐리게 처리했어요.' }
    ]
  }
];
