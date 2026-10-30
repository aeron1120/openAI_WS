// 기존 SNU 학습 서버의 회차 열림 상태를 읽는 작은 어댑터.
// 기존 포털 주소의 /api/health(로그인 없이 열림)에서 configured·openWorkshops만 읽습니다. 쿠키나 프록시 비밀값은 보내지 않아요.
// 실패하거나 설정이 덜 됐으면 'checking'(확인 중)으로 두고, 미공개 자료를 열린 것으로 표시하지 않습니다.
// 미래 공개 시각은 이 응답에 없으므로 표시하지 않습니다.
const FRESH_MS = 60 * 1000;       // 이 시간 안의 응답은 그대로 씁니다.
const STALE_MS = 10 * 60 * 1000;  // 새로 묻는 동안에는 이 시간까지 지난 응답을 씁니다(페이지가 기다리지 않도록). 넘으면 '확인 중'.
const COOLDOWN_MS = 60 * 1000;    // 실패하면 1분 동안은 다시 묻지 않습니다(회로 차단).

export function createLegacyStatus({ origin, fetchImpl = fetch, timeoutMs = 4000 }) {
  let cache = null; // { at, open: Set<number> }
  let failedAt = -Infinity;
  let pending = null;

  async function load(now) {
    try {
      const response = await fetchImpl(`${origin}/api/health`, { headers: { accept: 'application/json' }, redirect: 'error', signal: AbortSignal.timeout(timeoutMs) });
      if (!response.ok) throw new Error();
      const data = await response.json();
      if (data?.configured !== true || !Array.isArray(data.openWorkshops) || !data.openWorkshops.every(Number.isInteger)) {
        // 서버가 직접 '설정 안 됨'이나 이상한 값을 알려주면 지난 값도 바로 버립니다.
        cache = null;
        failedAt = now;
        return;
      }
      cache = { at: now, open: new Set(data.openWorkshops) };
    } catch {
      failedAt = now;
      // 설정이 빠졌다는 응답이나 오류가 오래 이어지면 지난 값도 버립니다.
      if (cache && now - cache.at > STALE_MS) cache = null;
    }
  }

  // number 회차의 상태: 'open' | 'closed' | 'checking'
  return async function workshopStatus(number, now = Date.now()) {
    const age = cache ? now - cache.at : Infinity;
    if (age > FRESH_MS && now - failedAt >= COOLDOWN_MS) {
      pending ??= load(now).finally(() => { pending = null; });
      // 쓸 만한 지난 값이 있으면 기다리지 않고 그 값을 씁니다.
      if (age > STALE_MS) await pending;
    }
    if (!cache || now - cache.at > STALE_MS) return 'checking';
    return cache.open.has(number) ? 'open' : 'closed';
  };
}
