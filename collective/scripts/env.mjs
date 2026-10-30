// 로컬 스크립트 공통: collective/.env를 읽고(있으면), 환경에 맞는 저장소를 만듭니다.
// 로컬 모드 → collective/.data/ 파일, 아니면 Supabase(서비스 키 필요).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createLocalStore } from '../server/store/local.mjs';
import { createSupabaseStore } from '../server/store/supabase.mjs';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const DATA_DIR = join(ROOT, '.data');

export function loadEnv() {
  const env = { ...process.env };
  try {
    for (const line of readFileSync(join(ROOT, '.env'), 'utf8').split(/\r?\n/)) {
      const match = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
      if (match && env[match[1]] === undefined) env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  return env;
}

export async function storeFromEnv(env) {
  if (env.CMS_MODE === 'local') return createLocalStore({ file: join(DATA_DIR, 'cms.json'), mediaDir: join(DATA_DIR, 'media') });
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) throw new Error('SUPABASE_URL·SUPABASE_SERVICE_KEY가 없어요. 로컬에서 시험하려면 CMS_MODE=local로 실행하세요.');
  return createSupabaseStore({ url: env.SUPABASE_URL, key: env.SUPABASE_SERVICE_KEY });
}
