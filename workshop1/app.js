import { meetings } from './meetings.mjs';
import { version } from './version.mjs';
import { initWeather } from './weather.mjs';
import { initAuth } from './auth.mjs';

const dateInput = document.querySelector('#meeting-date');
const tomorrow = new Date(Date.now() + 9 * 3600000 + 86400000).toISOString().slice(0, 10);
dateInput.value = tomorrow;
let category = '전체';
let selectedId = null;
let mapController = null;
const cards = document.querySelector('#meetings');
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

function dateLabel() {
  const date = new Date(`${dateInput.value}T12:00:00+09:00`);
  return Number.isNaN(date.getTime()) ? '날짜를 선택해주세요' : new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', weekday: 'short', timeZone: 'Asia/Seoul' }).format(date);
}
function renderCards() {
  cards.innerHTML = meetings.map(meeting => `<article class="meeting-card" data-meeting="${meeting.id}">
    <div class="card-image"><img src="/workshop1/assets/${meeting.image}" alt="${escape(meeting.category)} 모임 이미지" loading="lazy"><span class="category-tag">${escape(meeting.category)}</span></div>
    <div class="card-body"><p class="card-tag">${escape(meeting.tag)}</p><h3>${escape(meeting.title)}</h3><p class="description">${escape(meeting.description)}</p>
    <dl class="details"><div><dt>시간</dt><dd><span data-date-label>${dateLabel()}</span> · ${meeting.time}</dd></div><div><dt>장소</dt><dd>${escape(meeting.place)}</dd></div></dl>
    <div class="weather" data-weather-for="${meeting.id}" aria-live="polite"><span class="weather-symbol" aria-hidden="true">☁</span><div><strong>모임 날의 날씨</strong><span>아직 연결된 날씨 정보가 없어요.</span></div><span class="weather-value">— °C</span></div>
    <div class="card-bottom"><span>함께할 이웃 <strong>${escape(meeting.people)}</strong></span><button class="select-meeting" data-select="${meeting.id}" aria-pressed="false">모임 선택 <span aria-hidden="true">↗</span></button></div></div></article>`).join('');
  applyFilter();
}
function applyFilter() {
  let count = 0;
  for (const meeting of meetings) {
    const visible = category === '전체' || meeting.category === category;
    cards.querySelector(`[data-meeting="${meeting.id}"]`).hidden = !visible;
    if (visible) count++;
  }
  document.querySelector('#result-count').textContent = `${count}개의 작은 만남`;
}
function selectMeeting(id) {
  selectedId = id;
  document.querySelectorAll('[data-select]').forEach(button => {
    const active = button.dataset.select === id;
    button.setAttribute('aria-pressed', String(active));
    button.innerHTML = active ? '선택한 모임 <span aria-hidden="true">✓</span>' : '모임 선택 <span aria-hidden="true">↗</span>';
    button.closest('.meeting-card').classList.toggle('selected', active);
  });
  mapController?.select(id);
}
document.querySelector('.filters').addEventListener('click', event => {
  const button = event.target.closest('[data-category]');
  if (!button) return;
  category = button.dataset.category;
  document.querySelectorAll('[data-category]').forEach(item => {
    const active = item === button; item.classList.toggle('active', active); item.setAttribute('aria-pressed', String(active));
  });
  applyFilter();
});
cards.addEventListener('click', event => { const button = event.target.closest('[data-select]'); if (button) selectMeeting(button.dataset.select); });
dateInput.addEventListener('change', () => {
  if (!dateInput.validity.valid) return;
  document.querySelectorAll('[data-date-label]').forEach(label => { label.textContent = dateLabel(); });
});
document.querySelector('#version-pill').textContent = `${version.id} · ${version.label}`;
document.querySelector('#version-description').textContent = '실제 날씨에 Google 로그인과 새로고침 후 로그인 유지를 더했습니다.';
renderCards();
initAuth({ container: document.querySelector('#auth') });
const weather = initWeather({ meetings, getDate: () => dateInput.value });
dateInput.addEventListener('change', () => { if (dateInput.validity.valid) weather.refresh(); });
document.querySelector('#refresh-weather').addEventListener('click', async event => {
  const button = event.currentTarget;
  button.disabled = true;
  try { await weather.refresh(); } finally { button.disabled = false; }
});
