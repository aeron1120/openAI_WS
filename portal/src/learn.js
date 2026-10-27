// 수업 듣기(/learn/…): 로그인 확인 → 화면 열기 → 진도 표시·단계 이동·슬라이드 맞추기.
// 수업 서버는 Render 무료 요금제라 잠들어 있을 수 있어요. 응답이 없으면 최대 1분 동안 5초마다 다시 시도합니다.
(() => {
  const gate = document.querySelector('[data-learn-gate]');
  const content = document.querySelector('[data-learn-content]');
  if (!gate) return;
  const messages = {
    not_snu: '서울대학교 @snu.ac.kr 계정으로 다시 로그인해 주세요.',
    cancelled: '로그인을 취소했어요. 다시 시도할 수 있어요.',
    expired: '로그인 시간이 지났어요. 다시 시도해 주세요.',
    failed: '로그인을 완료하지 못했어요. 잠시 후 다시 시도해 주세요.'
  };
  const params = new URLSearchParams(location.search);
  const errorCode = params.get('error');
  const loginError = Object.hasOwn(messages, errorCode) ? messages[errorCode] : null;
  if (params.has('error')) history.replaceState(null, '', location.pathname);

  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  };
  const button = (label, className, onClick) => {
    const node = el('button', className, label);
    node.type = 'button';
    node.addEventListener('click', onClick);
    return node;
  };
  const showGate = (...nodes) => gate.replaceChildren(...nodes);

  async function api(path, init = {}) {
    const response = await fetch(path, { credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(15000), ...init });
    const data = await response.json().catch(() => ({}));
    return { response, data };
  }

  function loginView() {
    const link = el('a', 'btn btn-fill', '서울대 계정으로 로그인');
    link.href = `/api/auth/google?next=${encodeURIComponent(location.pathname)}`;
    const nodes = [el('p', 'learn-status', '서울대 계정으로 로그인해 주세요.'), link];
    if (loginError) nodes.unshift(el('p', 'learn-error', loginError));
    showGate(...nodes);
  }

  function signedIn(user) {
    // 학교 계정 이름은 "이름 / 학생 / 학과"처럼 와서, 화면에는 첫 부분만 보여줍니다.
    const name = user.name.split(' / ')[0] || user.name;
    const bar = el('div', 'learn-user');
    const logout = button('로그아웃', 'btn btn-ghost', async () => {
      logout.disabled = true;
      try {
        const { response } = await api('/api/session', { method: 'DELETE' });
        if (!response.ok) throw new Error();
        location.replace('/');
      } catch {
        logout.disabled = false;
        bar.append(el('span', 'learn-error', '로그아웃하지 못했어요. 다시 시도해 주세요.'));
      }
    });
    bar.append(el('span', 'learn-status', `${name}님`), el('span', 'hint', user.email));
    if (user.operator) bar.append(el('span', 'hint', '운영진'));
    bar.append(logout);
    showGate(bar);
    if (!content) return;
    content.hidden = false;
    if (content.dataset.lesson) initLesson(Number(content.dataset.lesson));
    else initList();
  }

  async function check(started) {
    let result = {};
    try { result = await api('/api/me'); } catch { /* 연결 실패: 서버가 깨어나는 중일 수 있어요. */ }
    const { response, data } = result;
    if (response?.ok && data?.user) return signedIn(data.user);
    if (response?.status === 401) return loginView();
    if (data?.error === 'LEARN_NOT_CONFIGURED') return showGate(el('p', 'learn-status', '수업 서버를 준비하고 있어요. 운영진이 설정을 마치면 열려요.'));
    if (Date.now() - started < 60000) {
      showGate(el('p', 'learn-status', '서버를 깨우는 중이에요. 최대 1분 정도 걸려요…'));
      setTimeout(() => check(started), 5000);
      return;
    }
    showGate(el('p', 'learn-error', '수업 서버에 연결하지 못했어요.'), button('다시 시도', 'btn btn-ghost', () => check(Date.now())));
  }

  // 회차 번호 → 완료한 단계 id 모음
  async function loadProgress() {
    const { response, data } = await api('/api/progress');
    if (!response.ok) throw new Error();
    const done = new Map();
    for (const row of data.progress ?? []) {
      if (!done.has(row.workshop)) done.set(row.workshop, new Set());
      done.get(row.workshop).add(row.step);
    }
    return done;
  }

  async function initList() {
    let done;
    try { done = await loadProgress(); } catch { return; } // 진도를 못 불러와도 목록은 그대로 씁니다.
    for (const node of content.querySelectorAll('[data-progress-for]')) {
      const count = done.get(Number(node.dataset.progressFor))?.size ?? 0;
      node.textContent = `${count} / ${node.dataset.total} 단계 완료`;
    }
  }

  function initLesson(workshop) {
    const steps = [...content.querySelectorAll('[data-step]')];
    const dots = new Map([...content.querySelectorAll('[data-goto]')].map(dot => [dot.dataset.goto, dot]));
    const frame = content.querySelector('[data-slides]');
    const done = new Set();
    let current = 0;

    const showSlide = slideId => {
      const src = frame.dataset.embedBase + slideId;
      if (slideId && frame.src !== src) frame.src = src;
    };
    function render() {
      steps.forEach((step, i) => {
        const id = step.dataset.step;
        const finished = done.has(id);
        step.hidden = i !== current;
        dots.get(id).classList.toggle('is-done', finished);
        if (i === current) dots.get(id).setAttribute('aria-current', 'step');
        else dots.get(id).removeAttribute('aria-current');
        const toggle = step.querySelector('[data-done]');
        toggle.textContent = finished ? '완료함 · 취소하기' : '이 단계 완료';
        toggle.setAttribute('aria-pressed', String(finished));
      });
    }
    function go(index, { focus = true } = {}) {
      current = Math.max(0, Math.min(steps.length - 1, index));
      const step = steps[current];
      history.replaceState(null, '', `#step-${step.dataset.step}`);
      showSlide(step.dataset.slideId);
      render();
      if (focus) step.querySelector('h2').focus();
    }

    content.addEventListener('click', async event => {
      const target = event.target.closest('[data-goto], [data-prev], [data-next], [data-done]');
      if (!target) return;
      if (target.dataset.goto) return go(steps.findIndex(step => step.dataset.step === target.dataset.goto));
      if (target.hasAttribute('data-prev')) return go(current - 1);
      if (target.hasAttribute('data-next')) return go(current + 1);
      // 완료 표시: 서버에 저장된 뒤에만 화면을 바꿉니다.
      const index = current;
      const step = steps[index];
      const id = step.dataset.step;
      const status = step.querySelector('[data-done-status]');
      const marking = !done.has(id);
      target.disabled = true;
      try {
        const { response } = await api(`/api/progress/${workshop}/${id}`, { method: marking ? 'PUT' : 'DELETE' });
        if (response.status === 401) throw new Error('로그인이 만료됐어요. 새로고침한 뒤 다시 로그인해 주세요.');
        if (!response.ok) throw new Error();
        status.textContent = '';
        if (marking) done.add(id); else done.delete(id);
        // 저장하는 동안 다른 단계로 옮겼다면 그 자리에 둡니다.
        if (marking && current === index && index < steps.length - 1) go(index + 1);
        else render();
      } catch (error) {
        status.textContent = error.message || '저장하지 못했어요. 잠시 후 다시 눌러 주세요.';
      } finally {
        target.disabled = false;
      }
    });
    // 선택지(예: 로그인·지도)를 펼치면 그 기능의 슬라이드로 이동합니다. toggle은 버블링되지 않아 capture로 받습니다.
    content.addEventListener('toggle', event => {
      const option = event.target;
      if (option.open && option.dataset?.slideId) showSlide(option.dataset.slideId);
    }, true);

    const start = steps.findIndex(step => location.hash === `#step-${step.dataset.step}`);
    go(start >= 0 ? start : 0, { focus: false });
    loadProgress()
      .then(map => { for (const id of map.get(workshop) ?? []) done.add(id); render(); })
      .catch(() => { /* 진도를 못 불러와도 단계는 볼 수 있어요. */ });
  }

  check(Date.now());
})();
