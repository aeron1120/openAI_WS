// 수업 지도(/learn/)의 섬 그림과 섬 위 장치. 화면은 src/learn-pages.mjs, 움직임은 src/learn.js가 맡습니다.
// 그림: snu-map-handoff-v5(2026-10-31)의 투명 PNG를 웹용 WebP로 줄인 것(public/images/learn-map/). 테두리 없이 섬만 보입니다.
// - key: 회차 번호(1, 2, …) 또는 'final'(마지막 Showcase) · 'review'(복습 섬)
// - tab: 위쪽 스테이지 줄에 쓰는 짧은 이름
// - robot: 지금 여기 섬에서 로봇의 발이 닿는 자리('지금 여기' 이름표는 발 아래에 붙음). devices[].x·y: 장치 자리. 둘 다 그림 전체 기준 0~1 비율입니다.
// - devices[].step: 이 장치와 같은 수업 단계 id. 그 단계를 끝내면 장치 이름표에 ✓가 붙습니다(실제 진도만 씀).
// - 장치는 열린 회차와 복습 섬에만 보입니다. 열리지 않은 회차에 수업 내용을 미리 지어내지 않습니다.
// - 복습 섬의 quiz는 연습용입니다. 정답 여부는 저장하지 않고, 수업 완료와도 상관없습니다.

export const learnMap = {
  1: {
    tab: 'API 연결',
    art: { file: 'island-01.webp', width: 1100, height: 1100, alt: '로그인·지도·날씨 기능 블록을 문에 연결하는 섬' },
    robot: [0.24, 0.69],
    deviceIntro: 'Workshop 01에서는 셋 중 하나를 골라 내 서비스에 연결해요.',
    devices: [
      { label: '로그인', x: 0.38, y: 0.43, note: 'Google 로그인으로 누가 쓰는지 확인하는 기능이에요.' },
      { label: '지도', x: 0.52, y: 0.46, note: '장소를 지도 위에 보여주는 기능이에요. 결제 없이 데모 키로 시작해요.' },
      { label: '날씨', x: 0.68, y: 0.52, note: '기상청 인증키로 오늘 날씨를 가져오는 기능이에요.' }
    ]
  },
  2: {
    tab: '기록·배포',
    art: { file: 'island-02.webp', width: 1300, height: 814, alt: '변경 기록 타일과 버전 분기 장치, 다리를 건너 업로드 문으로 가는 섬' },
    robot: [0.28, 0.73],
    devices: [
      { label: '공개', x: 0.84, y: 0.25, step: 'publish-site', note: '내 사이트를 공개 주소로 올려요. 다리 건너 출구가 공개예요.' },
      { label: '변경 기록', x: 0.38, y: 0.42, step: 'save-source', note: 'GitHub에 원본을 두고, 고칠 때마다 기록을 쌓아요.' },
      { label: 'Preview', x: 0.24, y: 0.29, step: 'test-preview', note: '정식 사이트는 두고 갈림길(Preview)에서 먼저 시험해요.' }
    ]
  },
  3: {
    tab: 'Midterm',
    art: { file: 'island-03.webp', width: 1200, height: 938, alt: '돌벽을 돌려 길을 바꾸는 섬' },
    robot: [0.2, 0.62]
  },
  4: {
    tab: '다음 수업',
    art: { file: 'island-04.webp', width: 1100, height: 1100, alt: '아래층과 위층을 잇는 승강기가 있는 섬' },
    robot: [0.22, 0.78]
  },
  final: {
    tab: 'Showcase',
    art: { file: 'island-final.webp', width: 1100, height: 1100, alt: '세 갈래 길이 가운데 빛나는 등대로 모이는 섬' },
    robot: [0.3, 0.76]
  },
  review: {
    tab: '복습',
    title: 'API 리플레이',
    lead: 'Workshop 01에서 만난 기능을 다시 떠올려요.',
    from: 1, // 복습할 회차
    art: { file: 'island-review.webp', width: 1100, height: 1100, alt: '연못을 도는 길 위에 로그인·지도·날씨 블록이 놓인 복습 섬' },
    robot: [0.2, 0.74],
    devices: [
      {
        label: '로그인', x: 0.27, y: 0.4,
        quiz: {
          question: '기초 틀을 http://localhost:5173/starter/ 에서 열었어요. Google 클라이언트 ID의 ‘승인된 JavaScript 원본’에 넣을 값은?',
          choices: ['http://localhost:5173/starter/', 'http://localhost:5173', 'localhost:5173/starter', 'https://accounts.google.com'],
          answer: 1,
          explain: '접속한 주소의 앞부분만, 경로(/starter/)와 마지막 / 없이 넣어요.'
        }
      },
      {
        label: '지도', x: 0.63, y: 0.3,
        quiz: {
          question: '실습에서 쓴 지도 데모 키에 대한 설명으로 맞는 것은?',
          choices: ['결제 정보를 등록해야 받을 수 있다', '학교에서 받은 Google Workspace 계정으로도 받을 수 있다', '하루 한도를 넘으면 다음 날까지 멈추고, 요금은 나오지 않는다', '브라우저에서 쓰는 키라서 GitHub에 올려도 괜찮다'],
          answer: 2,
          explain: '데모 키는 개인 Gmail로 결제 없이 받아요. 키는 공개 파일이 아니라 비공개 설정 파일에 넣어요.'
        }
      },
      {
        label: '날씨', x: 0.64, y: 0.55,
        quiz: {
          question: '공공데이터포털에서 날씨 인증키를 받을 때 골라야 하는 서비스는?',
          choices: ['기상청_단기예보 조회서비스', '기상청_단기예보 조회서비스(기상청API허브 연계)', '기상청 API허브에서 따로 발급한 키', '기상청 서비스라면 어느 것이든 같은 키'],
          answer: 0,
          explain: 'API허브 연계 서비스는 다른 키예요. 받은 일반 인증키는 서버 설정(KMA_SERVICE_KEY)에 직접 넣어요.'
        }
      }
    ]
  },
  robot: { file: 'robot.webp', width: 320, height: 320 }
};
