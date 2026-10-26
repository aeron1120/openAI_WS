let libraryPromise;
function loadGoogleIdentity() {
  if (window.google?.accounts?.id) return Promise.resolve(window.google.accounts.id);
  if (libraryPromise) return libraryPromise;
  libraryPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    const timeout = setTimeout(() => { script.remove(); libraryPromise = null; reject(new Error('Google 로그인 창을 불러오지 못했어요. 다시 시도해 주세요.')); }, 15000);
    script.onload = () => {
      clearTimeout(timeout);
      if (window.google?.accounts?.id) resolve(window.google.accounts.id);
      else { libraryPromise = null; reject(new Error('Google 로그인 창을 불러오지 못했어요.')); }
    };
    script.onerror = () => { clearTimeout(timeout); script.remove(); libraryPromise = null; reject(new Error('Google에 연결할 수 없어요. 인터넷 연결을 확인해 주세요.')); };
    document.head.append(script);
  });
  return libraryPromise;
}
async function api(path, body) {
  const result = await fetch(`/api/auth/${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    credentials: 'same-origin', cache: 'no-store',
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  let data;
  try { data = await result.json(); } catch { throw new Error('로그인 서버에 연결할 수 없어요. 잠시 후 다시 시도해 주세요.'); }
  if (!result.ok) throw new Error(data.message || '로그인 요청을 처리하지 못했어요.');
  return data;
}
function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function profilePicture(value) {
  try {
    const url = new URL(value);
    if (url.protocol === 'https:' && (url.hostname === 'googleusercontent.com' || url.hostname.endsWith('.googleusercontent.com'))) return url.href;
  } catch { /* A profile picture is optional. */ }
  return null;
}

/** The application owns the surrounding layout; the module owns this container. */
export async function initAuth({ container }) {
  if (!container) throw new Error('로그인 영역이 필요합니다.');
  let disposed = false;
  let generation = 0;
  let busy = false;
  let currentUser = null;
  const status = element('p', '', 'auth-status');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');

  function reset() { container.replaceChildren(); status.textContent = ''; }
  function retry(message) {
    if (disposed) return;
    reset();
    status.textContent = message;
    const button = element('button', '로그인 다시 시도', 'auth-retry');
    button.type = 'button';
    button.addEventListener('click', refresh);
    container.append(status, button);
  }
  function showUser(user) {
    if (disposed) return;
    currentUser = user;
    reset();
    const profile = element('div', '', 'auth-profile');
    const picture = profilePicture(user.picture);
    if (picture) {
      const avatar = element('img', '', 'auth-avatar');
      avatar.src = picture;
      avatar.alt = '';
      avatar.width = 36;
      avatar.height = 36;
      avatar.referrerPolicy = 'no-referrer';
      avatar.addEventListener('error', () => avatar.remove(), { once: true });
      profile.append(avatar);
    }
    profile.append(element('span', `${user.name || 'Google 사용자'} 님`, 'auth-name'));
    const logout = element('button', '로그아웃', 'auth-logout');
    logout.type = 'button';
    logout.addEventListener('click', async () => {
      logout.disabled = true;
      try {
        await api('logout', {});
        window.google?.accounts?.id?.disableAutoSelect();
        currentUser = null;
        await refresh();
      } catch (error) { if (!disposed) { status.textContent = error.message; logout.disabled = false; } }
    });
    profile.append(logout);
    container.append(profile, status);
  }
  async function showGuest(config, run, notice = '') {
    const [identity, challenge] = await Promise.all([loadGoogleIdentity(), api('nonce')]);
    if (disposed || run !== generation) return;
    reset();
    const label = element('span', '게스트로 둘러보는 중', 'auth-guest');
    const slot = element('div', '', 'auth-google-button');
    status.textContent = notice;
    container.append(label, slot, status);
    identity.initialize({
      client_id: config.clientId,
      nonce: challenge.nonce,
      auto_select: false,
      ux_mode: 'popup',
      callback: async ({ credential }) => {
        if (disposed || run !== generation || busy || currentUser) return;
        busy = true;
        status.textContent = 'Google 로그인 정보를 확인하고 있어요…';
        try {
          const { user } = await api('google', { credential });
          if (run === generation) showUser(user);
        } catch (error) {
          if (!disposed && run === generation) {
            try { await showGuest(config, ++generation, error.message); }
            catch (refreshError) { retry(refreshError.message); }
          }
        } finally { busy = false; }
      },
    });
    identity.renderButton(slot, { type: 'standard', theme: 'outline', size: 'large', shape: 'pill', text: 'signin_with', locale: 'ko', width: 220 });
  }
  async function refresh() {
    const run = ++generation;
    reset();
    status.textContent = '로그인 상태 확인 중…';
    container.append(status);
    try {
      const [config, session] = await Promise.all([api('config'), api('session')]);
      if (disposed || run !== generation) return;
      if (!config.configured) {
        currentUser = null;
        status.textContent = 'Google 로그인 설정을 준비하고 있어요. 모임은 로그인 없이 둘러볼 수 있어요.';
        return;
      }
      if (session.user) { showUser(session.user); return; }
      currentUser = null;
      await showGuest(config, run);
    } catch (error) { if (!disposed && run === generation) retry(error.message || '로그인 상태를 확인하지 못했어요.'); }
  }
  await refresh();
  return { refresh, destroy() { disposed = true; generation++; container.replaceChildren(); } };
}
