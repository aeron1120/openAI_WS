// 수업 듣기: 로그인 상태 확인 → 로그인 버튼 또는 내 정보·로그아웃.
// 수업 서버는 Render 무료 요금제라 잠들어 있을 수 있어요. 응답이 없으면 최대 1분 동안 5초마다 다시 시도합니다.
(() => {
  const root = document.querySelector('[data-learn]');
  if (!root) return;
  const messages = {
    not_snu: '서울대학교 @snu.ac.kr 계정으로 다시 로그인해 주세요.',
    cancelled: '로그인을 취소했어요. 다시 시도할 수 있어요.',
    expired: '로그인 시간이 지났어요. 다시 시도해 주세요.',
    failed: '로그인을 완료하지 못했어요. 잠시 후 다시 시도해 주세요.'
  };
  const params = new URLSearchParams(location.search);
  const loginError = messages[params.get('error')];
  if (params.has('error')) history.replaceState(null, '', location.pathname);

  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  };
  const show = (...nodes) => root.replaceChildren(...nodes);
  const button = (label, className, onClick) => {
    const node = el('button', className, label);
    node.type = 'button';
    node.addEventListener('click', onClick);
    return node;
  };

  function loginView() {
    const link = el('a', 'btn btn-fill', '서울대 계정으로 로그인');
    link.href = `/api/auth/google?next=${encodeURIComponent(location.pathname)}`;
    const nodes = [el('p', 'learn-status', '서울대 계정으로 로그인해 주세요.'), link];
    if (loginError) nodes.unshift(el('p', 'learn-error', loginError));
    show(...nodes);
  }

  function signedInView(user) {
    const logout = button('로그아웃', 'btn btn-ghost', async () => {
      logout.disabled = true;
      try {
        const response = await fetch('/api/session', { method: 'DELETE', credentials: 'same-origin' });
        if (!response.ok) throw new Error();
        location.replace('/');
      } catch {
        logout.disabled = false;
        show(el('p', 'learn-error', '로그아웃하지 못했어요. 다시 시도해 주세요.'), logout);
      }
    });
    const nodes = [el('p', 'learn-status', `${user.name}님, 로그인되었어요.`), el('p', 'hint', user.email)];
    if (user.operator) nodes.push(el('p', 'hint', '운영진 계정이에요.'));
    nodes.push(el('p', '', '수업 화면은 곧 열려요.'), logout);
    show(...nodes);
  }

  async function check(started) {
    let response = null;
    let data = {};
    try {
      response = await fetch('/api/me', { credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(15000) });
      data = await response.json().catch(() => ({}));
    } catch { /* 연결 실패: 서버가 깨어나는 중일 수 있어요. */ }
    if (response?.ok && data.user) return signedInView(data.user);
    if (response?.status === 401) return loginView();
    if (data.error === 'LEARN_NOT_CONFIGURED') return show(el('p', 'learn-status', '수업 서버를 준비하고 있어요. 운영진이 설정을 마치면 열려요.'));
    if (Date.now() - started < 60000) {
      show(el('p', 'learn-status', '서버를 깨우는 중이에요. 최대 1분 정도 걸려요…'));
      setTimeout(() => check(started), 5000);
      return;
    }
    show(el('p', 'learn-error', '수업 서버에 연결하지 못했어요.'), button('다시 시도', 'btn btn-ghost', () => check(Date.now())));
  }

  check(Date.now());
})();
