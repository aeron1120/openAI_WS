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
    slug: 'ws2-1102', status: 'published', title: 'Workshop 2', eventDate: '2026-11-02',
    summary: '웹사이트를 공개하고, 다음 버전을 만드는 시간',
    intro: '내 컴퓨터의 사이트를 공개 URL로 배포하고, GitHub에 변경을 기록했습니다. Preview에서 확인한 뒤 정식 사이트에 반영하고 복구하는 흐름을 함께 살펴봤습니다.',
    cover: 0,
    photos: [
      { src: '/images/recap/ws2-1102/01.jpg', alt: 'Workshop 02 화면 앞에서 웹사이트 배포 수업을 진행하는 모습', caption: '웹사이트 배포와 버전 관리 · 2026.11.02' },
      { src: '/images/recap/ws2-1102/02.jpg', alt: '서울대학교 강의실에서 Workshop 2를 진행하는 모습', caption: '공개 배포부터 Preview와 복구까지' },
      { src: '/images/recap/ws2-1102/03.jpg', alt: '공개 주소와 버튼 동작을 확인하는 배포 후 점검 슬라이드를 설명하는 모습', caption: '배포 후 실제 사용자 동작 확인' },
      { src: '/images/recap/ws2-1102/04.jpg', alt: 'Cloudflare Pages 직접 업로드 화면을 강의실에서 시연하는 모습', caption: '사이트 파일을 올려 공개 주소 만들기' }
    ]
  },
  {
    slug: 'ax-hackathon-1031', status: 'published', title: '크라이치즈버거 AX 해커톤', eventDate: '2026-10-31',
    summary: '서울대·연세대·고려대가 함께한 AX 해커톤',
    intro: 'OpenAI Student Collective가 주최하고 서울대학교 DWNC, 연세대학교 YBIGTA, 고려대학교 ITS가 함께한 크라이치즈버거 AX 해커톤의 현장입니다.',
    cover: 0,
    photos: [{ src: '/images/recap/ax-hackathon-1031/01.jpg', alt: '크라이치즈버거 AX 해커톤 현수막을 들고 함께 찍은 참가자 단체 사진', caption: '함께한 참가자들과 · 2026.10.31' }]
  },
  {
    slug: 'ws1-1026', status: 'published', title: 'Workshop 1', eventDate: '2026-10-26',
    summary: '노트북을 펼치고 함께 만든 첫 웹앱',
    intro: '참가자들이 각자의 노트북으로 웹앱 만들기를 따라 해 본 Workshop 1의 현장입니다.',
    cover: 0,
    photos: [{ src: '/images/recap/ws1-1026/01.jpg', alt: '강의실에서 노트북을 펼치고 Workshop 1 실습에 참여하는 학생들', caption: '첫 웹앱 만들기 실습 · 2026.10.26' }]
  }
];
