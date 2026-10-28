// 학습실(/learn/…)·내 질문·운영진 화면의 공통 스크립트: 로그인 확인 → 화면 열기.
// 로그인하면 로그인 카드(data-learn-login)를 숨기고 상단 바 사용자 칸(data-learn-user)과 답변 수를 채웁니다.
// 수업 목록은 진도 막대·이어서 하기를, 수업 화면은 단계 탭·단계 이동·슬라이드 맞추기·완료 표시를 여기서 맡습니다.
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
  // 미리보기(?preview): 내 컴퓨터(localhost)에서만, 서버 없이 가짜 사용자·진도로 로그인 뒤 화면을 봅니다.
  // 배포 사이트 주소에서는 꺼져 있어 아무 일도 하지 않습니다.
  const preview = location.hostname === 'localhost' && params.has('preview');

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
    if (preview) return previewApi(path);
    const response = await fetch(path, { credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(15000), ...init });
    const data = await response.json().catch(() => ({}));
    return { response, data };
  }

  // 미리보기용 가짜 응답: 회차마다 앞쪽 절반 단계를 끝낸 것으로, 답변 받은 질문 1개로 둡니다.
  function previewApi(path) {
    const ok = data => ({ response: { ok: true, status: 200 }, data });
    if (path === '/api/me') return ok({ user: { name: '김서울 / 학생 / 미리보기', email: 'preview@snu.ac.kr', operator: true } });
    if (path === '/api/progress') {
      const progress = [];
      const add = (workshop, ids) => ids.slice(0, Math.ceil(ids.length / 2)).forEach(step => progress.push({ workshop, step }));
      for (const course of document.querySelectorAll('[data-course]')) add(Number(course.dataset.course), [...course.querySelectorAll('[data-step-link]')].map(node => node.dataset.stepLink));
      const lesson = document.querySelector('[data-lesson]');
      if (lesson) add(Number(lesson.dataset.lesson), [...lesson.querySelectorAll('[data-step]')].map(node => node.dataset.step));
      return ok({ progress });
    }
    if (path === '/api/questions') return ok({ questions: [{ id: 'preview', workshop: 1, step: 'run-local', status: 'answered', preview: '미리보기 질문이에요.', updatedAt: new Date().toISOString() }] });
    return ok({});
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

  const userSlot = document.querySelector('[data-learn-user]');
  const loginCard = gate.closest('[data-learn-login]');

  function signedIn(user) {
    Learn.user = user;
    restoreSearch();
    // 학교 계정 이름은 "이름 / 학생 / 학과"처럼 와서, 화면에는 첫 부분만 보여줍니다.
    const name = user.name.split(' / ')[0] || user.name;
    const bar = el('div', 'learn-user');
    const logout = button('로그아웃', 'btn btn-ghost', async () => {
      logout.disabled = true;
      bar.querySelector('.learn-error')?.remove();
      try {
        const { response } = await api('/api/session', { method: 'DELETE' });
        if (!response.ok) throw new Error();
        location.replace('/');
      } catch {
        logout.disabled = false;
        bar.append(el('span', 'learn-error', '로그아웃하지 못했어요. 다시 시도해 주세요.'));
      }
    });
    const who = el('span', 'learn-name', `${name}님`);
    who.title = user.email;
    bar.append(who);
    if (user.operator) {
      const admin = el('a', 'learn-admin', '운영진');
      admin.href = '/admin/';
      if (location.pathname === '/admin/') admin.setAttribute('aria-current', 'page');
      bar.append(admin);
    }
    bar.append(logout);
    // 상단 바가 있으면 거기에 이름·로그아웃을 두고 로그인 카드를 숨깁니다.
    if (userSlot) {
      userSlot.replaceChildren(bar);
      (loginCard ?? gate).hidden = true;
    } else {
      bar.insertBefore(el('span', 'hint', user.email), logout);
      showGate(bar);
    }
    showAnswerCount();
    if (!content) return;
    content.hidden = false;
    // 화면 종류는 data-lesson(수업) / data-questions(내 질문) / data-admin(운영진) / 없음(수업 목록)으로 구분합니다.
    const page = content.dataset;
    if (page.lesson) return initLesson(content, user);
    if ('admin' in page && !user.operator) return content.replaceChildren(el('p', 'learn-status', '운영진만 볼 수 있어요.'));
    // 화면 스크립트가 불러와지지 않았으면 빈 화면 대신 안내를 보여줍니다.
    const run = name => inits.has(name)
      ? inits.get(name)(content, user)
      : content.replaceChildren(el('p', 'learn-error', '화면을 불러오지 못했어요. 새로고침해 주세요.'));
    if ('questions' in page) return run('questions');
    if ('admin' in page) return run('admin');
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

  // 상단 바 "내 질문" 옆 답변 수(운영진이 답한 내 질문 수). 못 불러오면 비워 둡니다.
  function showAnswerCount() {
    const slot = document.querySelector('[data-answer-count]');
    if (!slot) return;
    call('/api/questions').then(data => {
      const count = (data.questions ?? []).filter(q => q.status === 'answered').length;
      slot.textContent = count ? `답변 ${count}개` : '';
      slot.className = count ? 'badge badge-open' : '';
    }).catch(() => {});
  }

  // 진도 막대(data-progress) 하나를 채웁니다.
  function setProgress(box, count, total, text) {
    if (!box) return;
    box.querySelector('[data-meter-fill]').style.width = `${total ? Math.round((count / total) * 100) : 0}%`;
    box.querySelector('[data-progress-text]').textContent = text;
  }

  // 단계 줄 표시: ✔ 완료 · ▶ 지금 보는 단계 · ○ 아직
  function markStep(node, finished, current = false) {
    node.classList.toggle('is-done', finished);
    node.classList.toggle('is-current', current);
    node.querySelector('.step-mark').textContent = current ? '▶' : finished ? '✔' : '○';
    node.querySelector('[data-step-state]').textContent = finished ? ' (완료)' : '';
  }

  // 수업 목록: 회차별 진도 막대·단계 표시와 "이어서 하기"(처음으로 안 끝낸 단계). 못 불러와도 목록은 그대로 씁니다.
  function initList(content) {
    loadProgress().then(done => {
      let all = 0;
      let allDone = 0;
      for (const course of content.querySelectorAll('[data-course]')) {
        const finished = done.get(Number(course.dataset.course)) ?? new Set();
        const links = [...course.querySelectorAll('[data-step-link]')];
        let next = null;
        let count = 0;
        for (const link of links) {
          const ok = finished.has(link.dataset.stepLink);
          markStep(link, ok);
          if (ok) count++;
          else next ??= link;
        }
        setProgress(course.querySelector('[data-progress]'), count, links.length, `${count}/${links.length} 완료`);
        const resume = course.querySelector('[data-continue]');
        if (resume && links.length) {
          resume.href = (next ?? links[0]).getAttribute('href');
          resume.textContent = !count ? '시작하기 →' : next ? '이어서 하기 →' : '처음부터 다시 보기 →';
        }
        all += links.length;
        allDone += count;
      }
      setProgress(content.querySelector('.course-head [data-progress]'), allDone, all, `${allDone} / ${all} 단계`);
    }).catch(() => {});
  }

  function initLesson(content) {
    const workshop = Number(content.dataset.lesson);
    const steps = [...content.querySelectorAll('[data-step]')];
    const items = new Map([...content.querySelectorAll('[data-goto]')].map(item => [item.dataset.goto, item]));
    const frame = content.querySelector('[data-slides]');
    const tabs = content.querySelector('.step-tabs');
    const meter = content.querySelector('.lesson-head [data-progress]');
    const body = content.querySelector('.lesson-body');
    const finish = content.querySelector('[data-finish]');
    const finishTab = content.querySelector('[data-finish-tab]');
    const done = new Set();
    let current = 0;
    let finished = false; // 완료 화면을 보는 중인지
    const allDone = () => steps.every(step => done.has(step.dataset.step));

    const showSlide = slideId => {
      const src = frame.dataset.embedBase + slideId;
      if (slideId && frame.src !== src) frame.src = src;
    };
    function render() {
      steps.forEach((step, i) => {
        const id = step.dataset.step;
        const ok = done.has(id);
        const here = !finished && i === current;
        step.hidden = i !== current;
        const item = items.get(id);
        if (item) {
          markStep(item, ok, here);
          if (here) item.setAttribute('aria-current', 'step');
          else item.removeAttribute('aria-current');
        }
        // 완료 버튼은 마지막 단계에만 있습니다.
        const toggle = step.querySelector('[data-done]');
        if (toggle) {
          toggle.textContent = ok ? '완료함 · 취소하기' : '실습 완료';
          toggle.setAttribute('aria-pressed', String(ok));
        }
      });
      const count = steps.filter(step => done.has(step.dataset.step)).length;
      setProgress(meter, count, steps.length, `${count}/${steps.length} 완료`);
      // 완료 화면·완료 탭은 모든 단계를 끝냈을 때만 씁니다.
      if (finished && !allDone()) finished = false;
      body.hidden = finished;
      finish.hidden = !finished;
      finishTab.hidden = !allDone();
      const tab = finishTab.querySelector('button');
      tab.classList.toggle('is-current', finished);
      if (finished) tab.setAttribute('aria-current', 'step');
      else tab.removeAttribute('aria-current');
    }
    function showFinish({ focus = true } = {}) {
      finished = true;
      history.replaceState(null, '', '#done');
      render();
      revealTab(finishTab);
      if (!focus) return;
      finish.focus();
      finish.scrollIntoView({ block: 'start' });
    }
    // 탭 줄이 가로로 넘치면(좁은 화면) 지금 단계 탭이 보이도록 탭 줄 안에서만 옮깁니다.
    function revealTab(tab = items.get(steps[current].dataset.step)) {
      if (!tabs || !tab || tabs.scrollWidth <= tabs.clientWidth) return;
      const left = tab.getBoundingClientRect().left - tabs.getBoundingClientRect().left + tabs.scrollLeft;
      tabs.scrollLeft = left - (tabs.clientWidth - tab.offsetWidth) / 2;
    }
    function go(index, { focus = true } = {}) {
      current = Math.max(0, Math.min(steps.length - 1, index));
      finished = false;
      const step = steps[current];
      history.replaceState(null, '', `#step-${step.dataset.step}`);
      showSlide(step.dataset.slideId);
      render();
      revealTab();
      if (focus) step.querySelector('h2').focus();
    }

    content.addEventListener('click', async event => {
      const target = event.target.closest('[data-goto], [data-prev], [data-next], [data-done], [data-ask-open], [data-finish-open], [data-restart]');
      if (!target) return;
      if (target.dataset.goto) return go(steps.findIndex(step => step.dataset.step === target.dataset.goto));
      if (target.hasAttribute('data-finish-open')) return showFinish();
      if (target.hasAttribute('data-restart')) return go(0);
      if (target.hasAttribute('data-prev')) return go(current - 1);
      if (target.hasAttribute('data-ask-open')) {
        // 질문 칸은 questions.js가 만듭니다.
        const section = target.closest('[data-step]');
        return Learn.openAsk?.(section, { workshop, step: section.dataset.step });
      }
      // 진도 저장: 중간 단계의 "다음 →"은 완료로 저장하고 넘어가고, 마지막 단계의 "실습 완료"는 완료·취소를 오갑니다.
      // 서버에 저장된 뒤에만 화면을 바꿉니다.
      const index = current;
      const step = steps[index];
      const id = step.dataset.step;
      const status = step.querySelector('[data-done-status]');
      const next = target.hasAttribute('data-next');
      if (next && done.has(id)) return go(index + 1);
      const marking = next || !done.has(id);
      target.disabled = true;
      try {
        const { response } = await api(`/api/progress/${workshop}/${id}`, { method: marking ? 'PUT' : 'DELETE' });
        if (response.status === 401) throw new Error(EXPIRED);
        if (!response.ok) throw new Error();
        status.textContent = '';
        if (marking) done.add(id); else done.delete(id);
        // 저장하는 동안 다른 단계로 옮겼다면 그 자리에 둡니다.
        // 중간 단계는 다음 단계로, 마지막 단계는 다 끝냈으면 완료 화면, 아니면 아직 안 끝낸 첫 단계로 갑니다.
        if (!marking || current !== index) render();
        else if (next) go(index + 1);
        else if (allDone()) showFinish();
        else go(steps.findIndex(s => !done.has(s.dataset.step)));
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
      .then(map => {
        for (const id of map.get(workshop) ?? []) done.add(id);
        // #done 주소로 들어왔고 다 끝낸 상태면 완료 화면부터 보여줍니다.
        if (location.hash === '#done' && allDone()) showFinish({ focus: false });
        else render();
      })
      .catch(() => { /* 진도를 못 불러와도 단계는 볼 수 있어요. */ });
  }

  // 뒤에 오는 questions.js·admin.js가 먼저 register할 수 있게, 문서를 다 읽은 뒤에 시작합니다.
  document.addEventListener('DOMContentLoaded', () => check(Date.now()));
})();
