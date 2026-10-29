// 요청문 복사. 클립보드를 쓸 수 없으면 글을 선택해 두고 직접 복사하도록 안내합니다.
function selectText(element) {
  const range = document.createRange();
  range.selectNodeContents(element);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
}

function legacyCopy(element) {
  try {
    selectText(element);
    return document.execCommand('copy');
  } catch {
    return false;
  }
}

function report(status, message, ok) {
  status.textContent = message;
  status.classList.toggle('is-ok', ok);
  status.classList.toggle('is-error', !ok);
}

// 도움말 카드 안에 복제된 버튼도 동작하도록 클릭을 문서에서 한 번에 받습니다.
document.addEventListener('click', async event => {
  const button = event.target.closest('[data-copy-target]');
  if (!button) return;
  const block = button.closest('.copy-block');
  const target = block?.querySelector('pre');
  const status = block?.querySelector('.copy-status');
  if (!target || !status) return;
  const text = target.textContent;
  let copied = false;
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      copied = true;
    }
  } catch {
    copied = false;
  }
  if (!copied) copied = legacyCopy(target);
  if (copied) {
    report(status, button.closest('.help-card') ? '복사했어요. 터미널에 붙여 넣으세요.' : '복사했어요. Codex 입력창에 붙여 넣으세요.', true);
    button.textContent = '복사됨 ✓';
    button.classList.add('is-copied');
    setTimeout(() => { button.textContent = '복사'; button.classList.remove('is-copied'); }, 2000);
  } else {
    selectText(target);
    report(status, '자동 복사가 되지 않았어요. 글을 선택해 두었으니 Ctrl+C(⌘C)를 누르거나 길게 눌러 복사하세요.', false);
  }
});
for (const button of document.querySelectorAll('[data-copy-target]')) button.hidden = false;

// 힌트: 앞 힌트를 한 번 열어야 다음 힌트가 보입니다. 스크립트가 없으면 모든 힌트가 보입니다.
function showHints(box) {
  const hints = [...box.querySelectorAll(':scope > details[data-hint]')];
  hints.forEach((hint, i) => { hint.hidden = i > 0 && !hints[i - 1].hasAttribute('data-opened'); });
}
// toggle은 버블링되지 않아 capture로 받습니다.
document.addEventListener('toggle', event => {
  const hint = event.target;
  if (!hint.matches?.('details[data-hint]') || !hint.open) return;
  hint.setAttribute('data-opened', '');
  showHints(hint.parentElement);
}, true);
for (const box of document.querySelectorAll('[data-hints]')) showHints(box);

// 시작 전 확인 도움말: 항목을 하나씩 강조하고, 옆 카드에 확인·설치 방법을 보여줍니다.
const GAP = 16;
const MARGIN = 12;

function startGuide(box) {
  const items = [...box.querySelectorAll('.checks > li')];
  const steps = [...box.querySelector('template').content.querySelectorAll('.help-step')];
  const opener = box.querySelector('.help-start');
  let index = 0;
  const spot = document.createElement('div');
  spot.className = 'help-spot';
  const card = document.createElement('div');
  card.className = 'help-card';
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-labelledby', 'help-card-title');
  card.innerHTML = `<div class="help-head"><span><span class="help-dot" aria-hidden="true"></span>시작 전 확인 도움말</span><span class="help-count"></span></div>
<div class="help-progress" aria-hidden="true"><span></span></div>
<div class="help-body" tabindex="-1"></div>
<div class="help-actions"><button type="button" class="help-close">닫기</button><button type="button" class="help-prev">이전</button><button type="button" class="help-next">다음</button></div>
<p class="help-keys">← → 항목 이동 · Esc 닫기</p>`;
  document.body.append(spot, card);

  const docked = () => innerWidth < 720;
  function place() {
    const box = items[index].getBoundingClientRect();
    const pad = 6;
    Object.assign(spot.style, { top: `${box.top - pad}px`, left: `${box.left - pad}px`, width: `${box.width + pad * 2}px`, height: `${box.height + pad * 2}px` });
    if (docked()) { Object.assign(card.style, { left: `${MARGIN}px`, right: `${MARGIN}px`, top: '', bottom: `${MARGIN}px` }); return; }
    const size = card.getBoundingClientRect();
    let left = box.right + GAP;
    if (left + size.width > innerWidth - MARGIN) left = box.left - GAP - size.width;
    if (left < MARGIN) left = Math.max(MARGIN, innerWidth - size.width - MARGIN);
    const top = Math.min(Math.max(box.top + box.height / 2 - size.height / 2, MARGIN), innerHeight - size.height - MARGIN);
    Object.assign(card.style, { left: `${left}px`, right: '', top: `${top}px`, bottom: '' });
  }
  function reveal() {
    const box = items[index].getBoundingClientRect();
    const room = docked() ? innerHeight - card.getBoundingClientRect().height - MARGIN * 2 : innerHeight;
    scrollBy({ top: box.top + box.height / 2 - room / 2, behavior: 'instant' });
  }
  function go(next) {
    if (next < 0 || next >= items.length) return;
    index = next;
    items.forEach((item, i) => item.classList.toggle('is-help-current', i === index));
    card.querySelector('.help-count').textContent = `${index + 1} / ${items.length}`;
    card.querySelector('.help-progress span').style.width = `${((index + 1) / items.length) * 100}%`;
    const body = card.querySelector('.help-body');
    body.replaceChildren(steps[index].cloneNode(true));
    body.querySelector('h3')?.setAttribute('id', 'help-card-title');
    body.querySelectorAll('[data-copy-target]').forEach(button => { button.hidden = false; });
    body.scrollTop = 0;
    card.querySelector('.help-prev').disabled = index === 0;
    card.querySelector('.help-next').textContent = index === items.length - 1 ? '완료' : '다음';
    reveal();
    requestAnimationFrame(place);
    body.focus({ preventScroll: true });
  }
  function close() {
    spot.remove();
    card.remove();
    items.forEach(item => item.classList.remove('is-help-current'));
    removeEventListener('keydown', onKey);
    removeEventListener('resize', place);
    removeEventListener('scroll', place);
    opener.focus({ preventScroll: true });
  }
  function onKey(event) {
    if (event.key === 'Escape') close();
    else if (event.key === 'ArrowRight' && !event.target.closest('pre')) go(index + 1);
    else if (event.key === 'ArrowLeft' && !event.target.closest('pre')) go(index - 1);
  }
  card.querySelector('.help-close').addEventListener('click', close);
  card.querySelector('.help-prev').addEventListener('click', () => go(index - 1));
  card.querySelector('.help-next').addEventListener('click', () => (index === items.length - 1 ? close() : go(index + 1)));
  addEventListener('keydown', onKey);
  addEventListener('resize', place);
  addEventListener('scroll', place, { passive: true });
  go(0);
}

for (const box of document.querySelectorAll('[data-check-guide]')) {
  const opener = box.querySelector('.help-start');
  opener.hidden = false;
  opener.addEventListener('click', () => startGuide(box));
}

// 화면으로 따라 하기: 캡처 위에서 누를 곳만 밝게 강조하고 한 단계씩 넘깁니다.
// 좁은 화면에서는 강조한 곳을 확대해 보여주고, 그림이 없는 단계(로그인 뒤 화면 등)는 글로만 보여줍니다.
const ZOOM_BELOW = 640;
const ZOOM = 2.2;

function openWalk(box) {
  const steps = JSON.parse(box.dataset.walk);
  const opener = box.querySelector('[data-walk-open]');
  let index = 0;
  const layer = document.createElement('div');
  layer.className = 'walk-layer';
  layer.innerHTML = `<div class="walk-card" role="dialog" aria-modal="true" aria-labelledby="walk-title" tabindex="-1">
<div class="walk-head"><span class="walk-title" id="walk-title"></span><span class="walk-count"></span><button type="button" class="walk-close" aria-label="닫기">✕</button></div>
<div class="walk-progress" aria-hidden="true"><span></span></div>
<div class="walk-shot"><div class="walk-zoom"><img alt=""><span class="walk-box" aria-hidden="true"></span></div><p class="walk-noimg"></p></div>
<p class="walk-text"></p>
<p class="walk-note"></p>
<div class="walk-actions"><button type="button" class="walk-prev">이전</button><button type="button" class="walk-next">다음</button></div>
</div>`;
  layer.querySelector('.walk-title').textContent = `🎬 ${box.dataset.walkTitle}`;
  document.body.append(layer);
  document.documentElement.classList.add('walk-lock');
  const card = layer.querySelector('.walk-card');
  const shot = layer.querySelector('.walk-shot');
  const zoom = layer.querySelector('.walk-zoom');
  const img = zoom.querySelector('img');
  const mark = zoom.querySelector('.walk-box');

  // 좁은 화면: 강조 상자의 가운데가 보이도록 확대한 뒤, 그림 밖으로 벗어나지 않게 옮깁니다.
  function fit() {
    const step = steps[index];
    const width = shot.clientWidth;
    const height = shot.clientHeight;
    if (!step.box || width >= ZOOM_BELOW) { zoom.style.transform = ''; return; }
    const [x, y, w, h] = step.box;
    // 넓은 상자(예: 검색창)는 상자 전체가 보이는 만큼만 확대합니다.
    const scale = Math.max(1, Math.min(ZOOM, 85 / w, 85 / h));
    const cx = (x + w / 2) / 100 * width * scale;
    const cy = (y + h / 2) / 100 * height * scale;
    const tx = Math.min(0, Math.max(width - width * scale, width / 2 - cx));
    const ty = Math.min(0, Math.max(height - height * scale, height / 2 - cy));
    zoom.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
  }
  let shown = ''; // 지금 화면에 걸린 그림
  async function go(next) {
    if (next < 0 || next >= steps.length) return;
    index = next;
    const step = steps[index];
    const turn = index;
    // 새 그림은 다 받아 둔 뒤에 바꿉니다. 받는 동안 빈 화면이나 이전 그림 위의 상자가 보이지 않게 합니다.
    if (step.image && step.image !== shown) {
      const ready = new Image();
      ready.src = step.image;
      await ready.decode().catch(() => {});
      if (turn !== index) return; // 그사이 다른 단계로 넘어갔어요.
    }
    layer.querySelector('.walk-count').textContent = `Step ${index + 1} / ${steps.length}`;
    layer.querySelector('.walk-progress span').style.width = `${((index + 1) / steps.length) * 100}%`;
    // 같은 그림 안에서만 강조 상자가 미끄러지듯 옮겨 가고, 그림이 바뀌면 상자는 바로 새 자리에 놓입니다.
    const sameImage = !!step.image && step.image === shown;
    shot.classList.toggle('is-still', !sameImage);
    shot.classList.toggle('is-text', !step.image);
    if (step.image) {
      if (!sameImage) img.src = step.image;
      shown = step.image;
    // 그림이 없는 단계는 왜 그림이 없는지 짧게 알려줍니다(기본: 로그인한 뒤의 화면).
    } else {
      shot.querySelector('.walk-noimg').textContent = step.blank ?? '🔒 로그인한 뒤의 화면이에요';
      shown = '';
    }
    mark.hidden = !step.box;
    if (step.box) {
      const [x, y, w, h] = step.box;
      Object.assign(mark.style, { left: `${x}%`, top: `${y}%`, width: `${w}%`, height: `${h}%` });
    }
    layer.querySelector('.walk-text').innerHTML = `<strong>Step ${index + 1}</strong> ${step.text}`;
    layer.querySelector('.walk-note').textContent = step.note;
    layer.querySelector('.walk-prev').disabled = index === 0;
    layer.querySelector('.walk-next').textContent = index === steps.length - 1 ? '다 했어요' : '다음';
    const ahead = steps[index + 1]?.image;
    if (ahead) new Image().src = ahead;
    // 강조 상자는 넘길 때마다 다시 깜빡여 눈이 가게 합니다.
    mark.classList.remove('is-pulse');
    void mark.offsetWidth;
    mark.classList.add('is-pulse');
    fit();
  }
  function close() {
    layer.remove();
    document.documentElement.classList.remove('walk-lock');
    removeEventListener('keydown', onKey);
    removeEventListener('resize', fit);
    opener.focus({ preventScroll: true });
  }
  function onKey(event) {
    if (event.key === 'Escape') close();
    else if (event.key === 'ArrowRight') go(index + 1);
    else if (event.key === 'ArrowLeft') go(index - 1);
  }
  layer.addEventListener('click', event => {
    if (event.target === layer || event.target.closest('.walk-close')) close();
    else if (event.target.closest('.walk-prev')) go(index - 1);
    else if (event.target.closest('.walk-next')) index === steps.length - 1 ? close() : go(index + 1);
  });
  addEventListener('keydown', onKey);
  addEventListener('resize', fit);
  go(0);
  card.focus({ preventScroll: true });
}

for (const box of document.querySelectorAll('[data-walk]')) {
  const opener = box.querySelector('[data-walk-open]');
  opener.hidden = false;
  opener.addEventListener('click', () => openWalk(box));
}

// 움직임: 스크롤하면 섹션이 아래에서 떠오르고, 버튼을 누르면 누른 자리에서 물결이 퍼집니다.
// '동작 줄이기' 설정이거나 IntersectionObserver가 없으면 처음부터 모두 보입니다.
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const reveals = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window && !reduceMotion) {
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-in');
      observer.unobserve(entry.target);
    }
  }, { rootMargin: '0px 0px -6% 0px' });
  reveals.forEach(element => observer.observe(element));
} else {
  reveals.forEach(element => element.classList.add('is-in'));
}

document.addEventListener('pointerdown', event => {
  const target = event.target.closest('.btn, .copy-button, .res-card, .learn-card, .help-start, .walk-open');
  if (!target || reduceMotion) return;
  const box = target.getBoundingClientRect();
  const size = Math.max(box.width, box.height) * 2;
  const ripple = document.createElement('span');
  ripple.className = 'ripple';
  ripple.setAttribute('aria-hidden', 'true');
  Object.assign(ripple.style, { width: `${size}px`, height: `${size}px`, left: `${event.clientX - box.left - size / 2}px`, top: `${event.clientY - box.top - size / 2}px` });
  target.append(ripple);
  ripple.addEventListener('animationend', () => ripple.remove());
});

// 홈의 다음 워크숍: 남은 날(D-day)과 달력의 오늘 표시는 보는 날 기준(한국 시간)으로 계산합니다.
// 페이지 묶음은 행사 시각에만 바뀌므로 날짜 계산은 브라우저가 맡습니다.
const seoulDay = date => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(date);
const today = seoulDay(new Date());
document.querySelector(`.cal td[data-date="${today}"]`)?.classList.add('is-today');
for (const badge of document.querySelectorAll('[data-dday]')) {
  const start = new Date(badge.dataset.dday);
  if (Number.isNaN(start.getTime()) || Date.now() >= start.getTime()) continue;
  const days = Math.round((Date.parse(seoulDay(start)) - Date.parse(today)) / 86400000);
  badge.textContent = days === 0 ? 'D-DAY · 오늘' : `D-${days}`;
  badge.hidden = false;
}
