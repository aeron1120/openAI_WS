// Cloudflare Pages 함수: /assets/* 밖의 모든 요청을 app으로 넘깁니다(_routes.json이 정적 파일을 먼저 거릅니다).
// 운영 저장소는 Supabase뿐입니다. 비밀값이 없으면 저장소 없이 시작해 '준비 중' 화면만 보여줍니다(로컬 모드로 시작하지 않음).
import { createApp } from '../server/app.mjs';
import { loadConfig } from '../server/config.mjs';
import { createSupabaseStore } from '../server/store/supabase.mjs';

let app = null;

export async function onRequest({ request, env }) {
  if (!app) {
    const runtimeEnv = { ...env, CMS_MODE: 'production' };
    // 빠진 값·형식 문제는 이름만 로그에 남깁니다(값은 남기지 않음). 확인: wrangler pages deployment tail
    const { problems, supabase } = loadConfig(runtimeEnv);
    if (problems.length) console.warn(`collective: 설정 필요 → ${problems.join(', ')}`);
    const store = supabase.url && supabase.key ? createSupabaseStore(supabase) : null;
    app = createApp({ env: runtimeEnv, store });
  }
  return app(request);
}
