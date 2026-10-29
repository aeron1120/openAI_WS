// 수업 서버(Render 무료 요금제)는 15분 동안 요청이 없으면 잠듭니다.
// Cloudflare 예약 실행(wrangler.jsonc의 crons)으로 14분마다 상태 확인 주소를 불러 깨어 있게 합니다.
// 상태 확인은 비밀값 없이 응답하고 데이터베이스를 건드리지 않습니다.
export const HEALTH_URL = 'https://snu-learn-server-0lw6.onrender.com/api/health';

export async function ping(fetcher = fetch) {
  const started = Date.now();
  try {
    // 잠든 서버는 깨어나는 데 1분 가까이 걸릴 수 있어 넉넉히 기다립니다.
    const response = await fetcher(HEALTH_URL, { headers: { 'user-agent': 'snu-learn-keepalive' }, signal: AbortSignal.timeout(90_000) });
    console.log(`health ${response.status} in ${Date.now() - started}ms`);
    return response.status;
  } catch (error) {
    console.log(`health failed after ${Date.now() - started}ms: ${error.message}`);
    return 0;
  }
}

export default {
  async scheduled(_event, _env, ctx) {
    ctx.waitUntil(ping());
  }
};
