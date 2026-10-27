// 수업 듣기(/learn/…)·내 질문·운영진 화면의 공통 스크립트: 로그인 확인 → 화면 열기.
// 수업 목록은 진도·답변 수를, 수업 화면은 단계 이동·슬라이드 맞추기·완료 표시를 여기서 맡습니다.
// 질문 칸·대화(questions.js)와 운영진 화면(admin.js)은 window.Learn을 써서 이 위에 얹힙니다.
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

  // 서버가 보낸 안내 문구(message)를 그대로 씁니다. 로그인이 풀렸으면 다시 로그인하라고 알립니다.
  const EXPIRED = '로그인이 만료됐어요. 새로고침한 뒤 다시 로그인해 주세요.';
  const errorOf = ({ response, data } = {}, fallback = '잠시 후 다시 시도해 주세요.') =>
    response?.status === 401 ? EXPIRED : (typeof data?.message === 'string' && data.message) || fallback;

  // 요청하고, 실패하면 보여줄 문구를 담은 Error를 던집니다(error.status·error.code). json을 주면 JSON으로 보냅니다.
  async function call(path, { json, fallback, ...init } = {}) {
    if (json !== undefined) {
      init.headers = { 'content-type': 'application/json', ...init.headers };
      init.body = JSON.stringify(json);
    }
    let result;
    try {
      result = await api(path, init);
    } catch {
      throw Object.assign(new Error('서버에 연결하지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.'), { status: 0, code: 'NETWORK' });
    }
    const { response, data } = result;
    if (!response.ok) throw Object.assign(new Error(errorOf(result, fallback)), { status: response.status, code: data?.error });
    return data;
  }

  // 다른 스크립트가 쓰는 공통 기능. 화면별 초기화는 register(이름, (content, user) => …)로 등록합니다.
  const inits = new Map();
  const Learn = window.Learn = {
    api, call, errorOf, el, button, user: null,
    register: (name, init) => { inits.set(name, init); }
  };

  // 로그인 뒤에는 경로만 돌아와요(?id= 같은 뒷부분은 빠짐). 그래서 뒷부분을 이 탭에 잠시 기억했다가 되돌립니다.
  const RETURN_KEY = 'learn-return';
  function rememberSearch() {
    try {
      // 로그인 실패로 돌아와 주소에 ?가 없어도, 앞서 저장한 값은 그대로 둡니다(지우는 건 restoreSearch).
      if (location.search) sessionStorage.setItem(RETURN_KEY, JSON.stringify({ url: location.pathname + location.search, at: Date.now() }));
    } catch { /* 저장소가 막혀 있으면 경로만 돌아와요. */ }
  }
  function restoreSearch() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(RETURN_KEY) ?? 'null');
      sessionStorage.removeItem(RETURN_KEY);
      // 10분 안에 같은 화면으로 돌아왔을 때만 되돌립니다.
      const fresh = saved && Date.now() - saved.at < 10 * 60 * 1000 && typeof saved.url === 'string';
      if (fresh && !location.search && saved.url.startsWith(`${location.pathname}?`)) history.replaceState(null, '', saved.url + location.hash);
    } catch { /* 무시 */ }
  }

  function loginView() {
    rememberSearch();
    const link = el('a', 'btn btn-fill', '서울대 계정으로 로그인');
    link.href = `/api/auth/google?next=${encodeURIComponent(location.pathname)}`;
    const nodes = [el('p', 'learn-status', '서울대 계정으로 로그인해 주세요.'), link];
    if (loginError) nodes.unshift(el('p', 'learn-error', loginError));
    showGate(...nodes);
  }

  function signedIn(user) {
    Learn.user = user;
    restoreSearch();
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
    // 화면 종류는 data-lesson(수업) / data-questions(내 질문) / data-admin(운영진) / 없음(수업 목록)으로 구분합니다.
    const page = content.dataset;
    if (page.lesson) return initLesson(content, user);
    if ('admin' in page && !user.operator) return content.replaceChildren(el('p', 'learn-status', '운영진만 볼 수 있어요.'));
    if ('questions' in page) return inits.get('questions')?.(content, user);
    if ('admin' in page) return inits.get('admin')?.(content, user);
    initList(content, user);
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

  // 수업 목록: 회차별 진도와 "답변 N개"(운영진이 답한 내 질문 수). 못 불러와도 목록은 그대로 씁니다.
  function initList(content) {
    loadProgress().then(done => {
      for (const node of content.querySelectorAll('[data-progress-for]')) {
        const count = done.get(Number(node.dataset.progressFor))?.size ?? 0;
        node.textContent = `${count} / ${node.dataset.total} 단계 완료`;
      }
    }).catch(() => {});
    const answers = content.querySelector('[data-answer-count]');
    if (!answers) return;
    call('/api/questions').then(data => {
      const count = (data.questions ?? []).filter(q => q.status === 'answered').length;
      answers.textContent = count ? `답변 ${count}개` : '';
      answers.className = count ? 'badge badge-open' : '';
    }).catch(() => {});
  }

  function initLesson(content) {
    const workshop = Number(content.dataset.lesson);
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
      const target = event.target.closest('[data-goto], [data-prev], [data-next], [data-done], [data-ask-open]');
      if (!target) return;
      if (target.dataset.goto) return go(steps.findIndex(step => step.dataset.step === target.dataset.goto));
      if (target.hasAttribute('data-prev')) return go(current - 1);
      if (target.hasAttribute('data-next')) return go(current + 1);
      if (target.hasAttribute('data-ask-open')) {
        // 질문 칸은 questions.js가 만듭니다.
        const section = target.closest('[data-step]');
        return Learn.openAsk?.(section, { workshop, step: section.dataset.step });
      }
      // 완료 표시: 서버에 저장된 뒤에만 화면을 바꿉니다.
      const index = current;
      const step = steps[index];
      const id = step.dataset.step;
      const status = step.querySelector('[data-done-status]');
      const marking = !done.has(id);
      target.disabled = true;
      try {
        const { response } = await api(`/api/progress/${workshop}/${id}`, { method: marking ? 'PUT' : 'DELETE' });
        if (response.status === 401) throw new Error(EXPIRED);
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

  // 뒤에 오는 questions.js·admin.js가 먼저 register할 수 있게, 문서를 다 읽은 뒤에 시작합니다.
  document.addEventListener('DOMContentLoaded', () => check(Date.now()));
})();
