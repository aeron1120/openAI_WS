// Render 환경값을 읽고 빠진 값을 알려줍니다. 비밀값 자체는 메시지에 넣지 않습니다.
const REQUIRED = ['PUBLIC_ORIGIN', 'PROXY_SECRET', 'SESSION_SECRET', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'SUPABASE_URL', 'SUPABASE_SERVICE_KEY'];

export function loadConfig(env) {
  const problems = REQUIRED.filter(key => !env[key]).map(key => `${key} 없음`);
  if (env.SESSION_SECRET && env.SESSION_SECRET.length < 32) problems.push('SESSION_SECRET은 32자 이상');
  if (env.PROXY_SECRET && env.PROXY_SECRET.length < 32) problems.push('PROXY_SECRET은 32자 이상');
  if (env.PUBLIC_ORIGIN && !/^(https:\/\/[^/]+|http:\/\/localhost(:\d+)?)$/.test(env.PUBLIC_ORIGIN)) problems.push('PUBLIC_ORIGIN 형식 (https://주소, 끝에 / 없음)');
  if (env.SUPABASE_URL && !/^https:\/\/[^/]+$/.test(env.SUPABASE_URL)) problems.push('SUPABASE_URL 형식 (https://주소, 끝에 / 없음)');
  // 회차별 공개 시각. 이 시각이 지난 회차만 진도·질문을 받습니다. 없으면 모든 회차가 닫힘.
  const workshopOpenAt = new Map();
  if (env.WORKSHOP_OPEN_AT) {
    try {
      const parsed = JSON.parse(env.WORKSHOP_OPEN_AT);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error();
      for (const [number, time] of Object.entries(parsed)) {
        if (!/^\d{1,2}$/.test(number) || typeof time !== 'string' || !/([+-]\d\d:\d\d|Z)$/.test(time) || Number.isNaN(Date.parse(time))) throw new Error();
        workshopOpenAt.set(Number(number), Date.parse(time));
      }
    } catch {
      problems.push('WORKSHOP_OPEN_AT 형식 (예: {"1":"2026-10-26T18:00:00+09:00"})');
    }
  }
  return {
    ok: problems.length === 0,
    problems,
    publicOrigin: env.PUBLIC_ORIGIN,
    proxySecret: env.PROXY_SECRET,
    sessionSecret: env.SESSION_SECRET,
    google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET },
    supabase: { url: env.SUPABASE_URL, key: env.SUPABASE_SERVICE_KEY },
    operators: new Set((env.OPERATOR_EMAILS ?? '').split(',').map(email => email.trim().toLowerCase()).filter(Boolean)),
    workshopOpenAt
  };
}
