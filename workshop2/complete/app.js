// 모든 모임은 워크숍용 가상 데이터입니다.
const meetings = [
  { id: 'run', category: 'MOVE', title: '수업 끝나고, 가볍게 한 바퀴', time: '예시 · 월요일 18:00', place: '관악캠퍼스 정문', art: '01 / RUN' },
  { id: 'study', category: 'LEARN', title: '90분 같이 공부해요', time: '예시 · 화요일 17:00', place: '중앙도서관 앞', art: '02 / STUDY' },
  { id: 'chat', category: 'CONNECT', title: '잔디 위 한 시간', time: '예시 · 수요일 14:00', place: '자하연 근처', art: '03 / MEET' }
];
const list = document.querySelector('#meetups');
const FAVORITES_ENABLED = true;
for (const meeting of meetings) {
  const article = document.createElement('article');
  article.className = 'card';
  article.innerHTML = `<div class="art">${meeting.art}</div><div class="content"><span class="tag">${meeting.category}</span><h2>${meeting.title}</h2><div class="meta">${meeting.time}<br>${meeting.place}</div></div>`;
  list.append(article);
  const button = document.createElement('button');
  button.className = 'favorite';
  button.type = 'button';
  button.textContent = '☆ 즐겨찾기';
  button.setAttribute('aria-pressed', 'false');
  button.setAttribute('aria-label', `${meeting.title} 즐겨찾기`);
  button.disabled = !FAVORITES_ENABLED;
  button.addEventListener('click', () => {
    const selected = button.getAttribute('aria-pressed') !== 'true';
    button.setAttribute('aria-pressed', String(selected));
    button.textContent = selected ? '★ 선택됨' : '☆ 즐겨찾기';
    document.querySelector('#status').textContent = `${meeting.title}: ${selected ? '즐겨찾기 선택' : '즐겨찾기 해제'}`;
  });
  article.querySelector('.content').append(button);
}
