// 학생별 시간당 요청 횟수 제한(서버 메모리). 무료 서버가 잠들면 초기화되지만, 장난·실수로 많이 보내는 것은 막습니다.
export function createLimiter({ limit, windowMs }) {
  const hits = new Map();
  let calls = 0;
  function allow(key, nowMs) {
    // 100번에 한 번, 한 시간 넘게 조용한 학생 기록을 지워 메모리가 계속 늘지 않게 합니다.
    if (++calls % 100 === 0) for (const [k, times] of hits) if (nowMs - times.at(-1) >= windowMs) hits.delete(k);
    const recent = (hits.get(key) ?? []).filter(time => nowMs - time < windowMs);
    const allowed = recent.length < limit;
    if (allowed) recent.push(nowMs);
    hits.set(key, recent);
    return allowed;
  }
  allow.size = () => hits.size;
  return allow;
}
