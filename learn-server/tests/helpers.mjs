// 테스트 공용 값과 가짜 외부 서비스. 실제 네트워크는 쓰지 않습니다.
export const ENV = {
  PUBLIC_ORIGIN: 'https://portal.test',
  PROXY_SECRET: 'p'.repeat(40),
  SESSION_SECRET: 's'.repeat(40),
  GOOGLE_CLIENT_ID: 'client-123.apps.googleusercontent.com',
  GOOGLE_CLIENT_SECRET: 'google-secret',
  SUPABASE_URL: 'https://db.test',
  SUPABASE_SERVICE_KEY: 'sb_secret_test',
  OPERATOR_EMAILS: 'op@snu.ac.kr'
};
export const NOW = Date.parse('2026-10-27T12:00:00Z');
