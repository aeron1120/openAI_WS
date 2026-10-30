// 로컬 실행: node collective/scripts/serve.mjs → http://localhost:5180/
// /assets/*는 public/에서 바로 내려주고, 나머지는 app이 처리합니다(Cloudflare의 _routes.json과 같은 나눔).
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, normalize } from 'node:path';
import { Readable } from 'node:stream';
import { createApp } from '../server/app.mjs';
import { loadConfig } from '../server/config.mjs';
import { loadEnv, ROOT, storeFromEnv } from './env.mjs';

const env = loadEnv();
env.CMS_MODE ??= 'local';
env.PUBLIC_ORIGIN ??= 'http://localhost:5180';
const port = Number(new URL(env.PUBLIC_ORIGIN).port || 5180);
const config = loadConfig(env);
if (!config.ok) console.warn(`collective: 설정 필요 → ${config.problems.join(', ')}\n  collective/.env.example을 collective/.env로 복사하고 ADMIN_EMAILS를 채우세요.`);
const store = await storeFromEnv(env);
const app = createApp({ env, store });
const TYPES = { '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp' };
const PUBLIC = join(ROOT, 'public');

http.createServer(async (req, res) => {
  try {
    const path = new URL(req.url, 'http://localhost').pathname;
    if (path.startsWith('/assets/')) {
      const file = normalize(join(PUBLIC, decodeURIComponent(path)));
      if (!file.startsWith(join(PUBLIC, 'assets'))) throw Object.assign(new Error(), { code: 'ENOENT' });
      const body = await readFile(file).catch(() => null);
      if (!body) { res.writeHead(404); res.end('Not found'); return; }
      res.writeHead(200, { 'content-type': TYPES[file.slice(file.lastIndexOf('.'))] ?? 'application/octet-stream', 'cache-control': 'no-cache' });
      res.end(body);
      return;
    }
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (Array.isArray(value)) value.forEach(item => headers.append(key, item));
      else if (value !== undefined) headers.set(key, value);
    }
    const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
    const request = new Request(`${env.PUBLIC_ORIGIN}${req.url}`, { method: req.method, headers, body: hasBody ? Readable.toWeb(req) : undefined, duplex: 'half' });
    const response = await app(request);
    const out = {};
    response.headers.forEach((value, key) => { if (key !== 'set-cookie') out[key] = value; });
    const cookies = response.headers.getSetCookie();
    if (cookies.length) out['set-cookie'] = cookies;
    res.writeHead(response.status, out);
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    console.error('collective: request failed', error?.message);
    res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('server error');
  }
}).listen(port, () => console.log(`collective (${config.mode}, ${store.kind}): ${env.PUBLIC_ORIGIN}/  ·  관리: ${env.PUBLIC_ORIGIN}/manage/`));
