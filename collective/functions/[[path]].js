// Cloudflare Pages 함수: /assets/* 밖의 모든 요청을 app으로 넘깁니다(_routes.json이 정적 파일을 먼저 거릅니다).
// 운영 저장소는 Supabase뿐입니다. 비밀값이 없으면 저장소 없이 시작해 '준비 중' 화면만 보여줍니다(로컬 모드로 시작하지 않음).
import { createApp } from '../server/app.mjs';
import { createSupabaseStore } from '../server/store/supabase.mjs';

let app = null;

export async function onRequest({ request, env }) {
  if (!app) {
    const store = env.SUPABASE_URL && env.SUPABASE_SERVICE_KEY ? createSupabaseStore({ url: env.SUPABASE_URL, key: env.SUPABASE_SERVICE_KEY }) : null;
    app = createApp({ env: { ...env, CMS_MODE: 'production' }, store });
  }
  return app(request);
}
