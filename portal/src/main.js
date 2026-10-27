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
    button.textContent = '복사됨';
    setTimeout(() => { button.textContent = '복사'; }, 2000);
  } else {
    selectText(target);
    report(status, '자동 복사가 되지 않았어요. 글을 선택해 두었으니 Ctrl+C(⌘C)를 누르거나 길게 눌러 복사하세요.', false);
  }
});
for (const button of document.querySelectorAll('[data-copy-target]')) button.hidden = false;

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
