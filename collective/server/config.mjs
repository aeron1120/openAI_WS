// 환경값을 읽고 빠진 값을 알려줍니다. 비밀값 자체는 메시지에 넣지 않습니다.
// CMS_MODE=local은 내 컴퓨터 전용입니다(파일 저장 + 개발용 로그인). 공개 주소(https)에서는 켜지지 않습니다.
const PRODUCTION_REQUIRED = ['PUBLIC_ORIGIN', 'SESSION_SECRET', 'ADMIN_EMAILS', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'SUPABASE_URL', 'SUPABASE_SERVICE_KEY'];
const LOCAL_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

export function loadConfig(env) {
  const mode = env.CMS_MODE === 'local' ? 'local' : 'production';
  const problems = [];
  if (mode === 'local') {
    if (!LOCAL_ORIGIN.test(env.PUBLIC_ORIGIN ?? '')) problems.push('CMS_MODE=local은 PUBLIC_ORIGIN이 http://localhost일 때만 쓸 수 있어요');
    if (!env.ADMIN_EMAILS) problems.push('ADMIN_EMAILS 없음');
  } else {
    problems.push(...PRODUCTION_REQUIRED.filter(key => !env[key]).map(key => `${key} 없음`));
    if (env.PUBLIC_ORIGIN && !/^https:\/\/[^/]+$/.test(env.PUBLIC_ORIGIN)) problems.push('PUBLIC_ORIGIN 형식 (https://주소, 끝에 / 없음)');
    if (env.SUPABASE_URL && !/^https:\/\/[^/]+$/.test(env.SUPABASE_URL)) problems.push('SUPABASE_URL 형식 (https://주소, 끝에 / 없음)');
  }
  if (env.SESSION_SECRET && env.SESSION_SECRET.length < 32) problems.push('SESSION_SECRET은 32자 이상');
  const admins = new Set((env.ADMIN_EMAILS ?? '').split(',').map(email => email.trim().toLowerCase()).filter(Boolean));
  if (env.ADMIN_EMAILS && [...admins].some(email => !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))) problems.push('ADMIN_EMAILS 형식 (메일 주소, 쉼표로 구분)');
  // 기존 SNU 출처. 자료 열림 상태(/api/health)를 읽고 학습실로 연결할 때만 씁니다.
  const legacyOrigin = env.SNU_LEGACY_ORIGIN || 'https://snu-student-collective.pages.dev';
  if (!/^https:\/\/[^/]+$/.test(legacyOrigin)) problems.push('SNU_LEGACY_ORIGIN 형식 (https://주소, 끝에 / 없음)');
  return {
    ok: problems.length === 0,
    problems,
    mode,
    publicOrigin: env.PUBLIC_ORIGIN,
    // 로컬 모드에서는 비밀값이 없어도 실행되도록 개발용 값을 씁니다(운영 모드에서는 쓰지 않음).
    sessionSecret: env.SESSION_SECRET || (mode === 'local' ? 'local-development-only-session-secret-0000' : ''),
    admins,
    google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET },
    supabase: { url: env.SUPABASE_URL, key: env.SUPABASE_SERVICE_KEY },
    legacyOrigin,
    siteName: env.SITE_NAME || 'Student Collective'
  };
}
