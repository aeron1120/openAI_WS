// Render 웹 서비스 진입점: node:http 요청을 표준 Request로 바꿔 app에 넘깁니다.
import http from 'node:http';
import { Readable } from 'node:stream';
import { createApp } from './app.mjs';
import { loadConfig } from './config.mjs';

const { problems } = loadConfig(process.env);
if (problems.length) console.warn(`learn-server: 설정 필요 → ${problems.join(', ')}`);

const app = createApp({ env: process.env });
const port = Number(process.env.PORT ?? 8787);

http.createServer(async (req, res) => {
  try {
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (Array.isArray(value)) value.forEach(item => headers.append(key, item));
      else if (value !== undefined) headers.set(key, value);
    }
    const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
    const request = new Request(`http://${req.headers.host ?? 'localhost'}${req.url}`, {
      method: req.method, headers, body: hasBody ? Readable.toWeb(req) : undefined, duplex: 'half'
    });
    const response = await app(request);
    const out = {};
    response.headers.forEach((value, key) => { if (key !== 'set-cookie') out[key] = value; });
    const cookies = response.headers.getSetCookie();
    if (cookies.length) out['set-cookie'] = cookies;
    res.writeHead(response.status, out);
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    console.error('learn-server: request failed', error?.message);
    res.writeHead(500, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
    res.end('{"error":"SERVER_ERROR","message":"잠시 후 다시 시도해 주세요."}');
  }
}).listen(port, () => console.log(`learn-server: http://localhost:${port}/api/health`));
