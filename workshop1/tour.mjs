import { version } from './version.mjs';

// 버전마다 새로 생긴 기능을 짚어주는 화면 가이드입니다. 처음 방문하면 자동으로 열리고, 도움말 버튼으로 다시 볼 수 있어요.
const steps = {
  v0: [
    { target: '.meeting-card', title: '모임 카드 한 장에 다 담았어요', text: '모임 이름, 시간, 장소를 카드 하나로 보여줘요. 이 앱이 출발하는 기본 화면이에요.' },
    { target: '.filters', title: '종류별로 골라보기', text: '러닝·카공·농구 버튼을 눌러보세요. 고른 종류의 모임만 남아요.' },
    { target: '.meeting-card .weather', title: '아직 비어 있는 날씨 자리', text: '지금은 날씨 정보가 없어요.', tip: '다음 단계(v1)에서 이 자리에 실제 날씨가 들어와요.' }
  ],
  v1: [
    { target: '.meeting-card .weather', isNew: true, title: '모임 시간의 날씨', text: '기상청 단기예보로 모임 시간의 기온과 강수확률을 보여줘요.' },
    { target: '.date-label', isNew: true, title: '날짜를 바꾸면 날씨도 바뀌어요', text: '만나는 날을 바꾸면 그날 날씨를 다시 불러와요.', tip: '예보는 오늘부터 며칠 뒤까지만 제공돼요.' },
    { target: '#refresh-weather', isNew: true, title: '날씨 새로고침', text: '최신 예보가 궁금하면 눌러서 다시 불러오세요.' }
  ],
  v2: [
    { target: '#auth', isNew: true, title: 'Google 계정으로 들어오기', text: '로그인하면 내 이름과 프로필 사진이 화면에 보여요.', tip: '새로고침해도 로그인이 그대로 유지되는지 확인해보세요.' },
    { target: '.meeting-card .weather', title: '날씨는 그대로', text: '앞 단계에서 만든 날씨 기능 위에 로그인이 더해졌어요.' }
  ],
  v3: [
    { target: '.select-meeting', isNew: true, title: '모임을 고르면', text: '카드의 ‘모임 선택’을 누르면 지도가 그 장소로 이동해요.' },
    { target: '#map-section', isNew: true, title: '만날 장소를 지도로', text: '모임 장소가 마커로 표시돼요. 마커를 눌러도 같은 모임이 선택돼요.', tip: '지도 설정이 아직이면 ‘지도를 준비하고 있어요’라고 보여요.' },
    { target: '#auth', title: '앞 단계 기능도 함께', text: '날씨와 로그인 위에 지도가 더해진 마지막 단계예요.' }
  ]
};

const list = steps[version.id] ?? [];
const storageKey = `teum-tour-${version.id}`;
let index = 0;
let open = false;
let ui = null;
let lastFocus = null;

const GAP = 16;
const MARGIN = 12;
const docked = () => innerWidth < 600;
const fitsBeside = (box, card) => box.right + GAP + card.width <= innerWidth - MARGIN;
const visible = element => element && element.getClientRects().length > 0 && !element.closest('[hidden]');
const targetOf = step => [...document.querySelectorAll(step.target)].find(visible);
const remember = () => { try { localStorage.setItem(storageKey, 'seen'); } catch {} };
const seen = () => { try { return localStorage.getItem(storageKey) === 'seen'; } catch { return false; } };

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

function build() {
  const spot = node('div', 'tour-spot');
  const card = node('div', 'tour-card');
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-labelledby', 'tour-title');
  card.innerHTML = `<div class="tour-head"><span class="tour-label"><span class="tour-dot" aria-hidden="true"></span>화면 가이드 · ${version.id}</span><span class="tour-count"></span></div>
<div class="tour-progress" aria-hidden="true"><span></span></div>
<p class="tour-new">NEW · 이번 단계에서 추가</p>
<h2 id="tour-title"></h2><p class="tour-text"></p><p class="tour-tip"></p>
<div class="tour-actions"><button type="button" class="tour-close">그만 보기</button><button type="button" class="tour-prev">이전</button><button type="button" class="tour-next">다음</button></div>
<p class="tour-keys">← → 단계 이동 · Esc 닫기</p>`;
  card.querySelector('.tour-close').addEventListener('click', close);
  card.querySelector('.tour-prev').addEventListener('click', () => go(index - 1));
  card.querySelector('.tour-next').addEventListener('click', () => (index === list.length - 1 ? close() : go(index + 1)));
  document.body.append(spot, card);
  return { spot, card };
}

function place() {
  if (!open) return;
  const target = targetOf(list[index]);
  if (!target) return;
  const pad = 8;
  const box = target.getBoundingClientRect();
  Object.assign(ui.spot.style, { top: `${box.top - pad}px`, left: `${box.left - pad}px`, width: `${box.width + pad * 2}px`, height: `${box.height + pad * 2}px` });
  const card = ui.card.getBoundingClientRect();
  // 좁은 화면에서는 아래쪽에 붙이고, 넓은 화면에서는 강조한 곳 옆, 아래, 위 순서로 빈자리를 찾습니다.
  if (docked()) {
    Object.assign(ui.card.style, { left: `${MARGIN}px`, top: '', bottom: `${MARGIN}px` });
    return;
  }
  let left = box.right + GAP;
  let top = box.top;
  if (!fitsBeside(box, card)) {
    left = Math.min(Math.max(box.left, MARGIN), innerWidth - card.width - MARGIN);
    if (box.bottom + GAP + card.height <= innerHeight - MARGIN) top = box.bottom + GAP;
    else if (box.top - GAP - card.height >= MARGIN) top = box.top - GAP - card.height;
    else { left = innerWidth - card.width - MARGIN; top = innerHeight - card.height - MARGIN; }
  }
  top = Math.min(Math.max(top, MARGIN), innerHeight - card.height - MARGIN);
  Object.assign(ui.card.style, { left: `${left}px`, top: `${top}px`, bottom: '' });
}

// 강조한 곳과 안내 카드가 한 화면에 같이 보이도록 스크롤합니다.
function reveal(target) {
  const box = target.getBoundingClientRect();
  const card = ui.card.getBoundingClientRect();
  let center = box.top + box.height / 2;
  let room = innerHeight;
  if (docked()) room = innerHeight - card.height - MARGIN * 2;
  else if (!fitsBeside(box, card) && box.height + GAP + card.height <= innerHeight - MARGIN * 2) center = box.top + (box.height + GAP + card.height) / 2;
  scrollBy({ top: center - room / 2, behavior: 'instant' });
}

function go(next) {
  if (next < 0 || next >= list.length) return;
  index = next;
  const step = list[index];
  const target = targetOf(step);
  const { card } = ui;
  card.querySelector('.tour-count').textContent = `${index + 1} / ${list.length}`;
  card.querySelector('.tour-progress span').style.width = `${((index + 1) / list.length) * 100}%`;
  card.querySelector('.tour-new').hidden = !step.isNew;
  card.querySelector('#tour-title').textContent = step.title;
  card.querySelector('.tour-text').textContent = step.text;
  card.querySelector('.tour-tip').textContent = step.tip ?? '';
  card.querySelector('.tour-tip').hidden = !step.tip;
  card.querySelector('.tour-prev').disabled = index === 0;
  card.querySelector('.tour-next').textContent = index === list.length - 1 ? '완료' : '다음';
  ui.spot.hidden = !target;
  if (target) reveal(target);
  requestAnimationFrame(place);
  setTimeout(place, 400);
  card.querySelector('.tour-next').focus({ preventScroll: true });
}

function start() {
  if (!list.some(step => targetOf(step))) return;
  ui ??= build();
  lastFocus = document.activeElement;
  open = true;
  document.documentElement.classList.add('tour-open');
  ui.spot.hidden = false;
  ui.card.hidden = false;
  go(Math.max(list.findIndex(step => targetOf(step)), 0));
}

function close() {
  if (!open) return;
  open = false;
  remember();
  document.documentElement.classList.remove('tour-open');
  ui.spot.hidden = true;
  ui.card.hidden = true;
  lastFocus?.focus?.({ preventScroll: true });
}

function onKey(event) {
  if (!open) return;
  if (event.key === 'Escape') close();
  else if (event.key === 'ArrowRight') go(index + 1);
  else if (event.key === 'ArrowLeft') go(index - 1);
  else if (event.key === 'Tab') {
    const buttons = [...ui.card.querySelectorAll('button:not(:disabled)')];
    const first = buttons[0];
    const last = buttons.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
}

if (list.length) {
  const style = document.createElement('link');
  style.rel = 'stylesheet';
  style.href = new URL('./tour.css', import.meta.url).href;
  document.head.append(style);
  const help = node('button', 'tour-help');
  help.type = 'button';
  help.innerHTML = '<span aria-hidden="true">?</span>도움말';
  help.addEventListener('click', start);
  document.querySelector('.header nav')?.append(help);
  addEventListener('keydown', onKey);
  addEventListener('resize', place);
  addEventListener('scroll', place, { passive: true });
  // 카드와 날씨 영역이 그려진 뒤에 시작합니다.
  if (!seen() && !new URLSearchParams(location.search).has('noguide')) {
    addEventListener('load', () => setTimeout(start, 600), { once: true });
  }
}
