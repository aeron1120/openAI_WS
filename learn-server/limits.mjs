// 학생별 시간당 요청 횟수 제한(서버 메모리). 무료 서버가 잠들면 초기화되지만, 장난·실수로 많이 보내는 것은 막습니다.
export function createLimiter({ limit, windowMs }) {
  const hits = new Map();
  return function allow(key, nowMs) {
    const recent = (hits.get(key) ?? []).filter(time => nowMs - time < windowMs);
    const allowed = recent.length < limit;
    if (allowed) recent.push(nowMs);
    hits.set(key, recent);
    return allowed;
  };
}
