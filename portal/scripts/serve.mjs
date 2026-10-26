// 빌드된 포털 미리보기: npm run dev:portal → http://localhost:5174/
// Cloudflare Pages처럼 폴더 주소는 / 로 끝나게 이동하고, 없는 주소는 404.html을 보여줍니다.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { buildSite } from './build.mjs';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.mp4': 'video/mp4', '.vtt': 'text/vtt' };

async function isFile(file) {
  try { return (await stat(file)).isFile(); } catch { return false; }
}

await buildSite();
const server = createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');
  const file = path.join(dist, decodeURIComponent(pathname));
  if (!file.startsWith(dist)) { res.writeHead(400); res.end(); return; }
  if (!pathname.endsWith('/') && !path.extname(pathname) && await isFile(path.join(file, 'index.html'))) {
    res.writeHead(308, { Location: `${pathname}/` }); res.end(); return;
  }
  const target = pathname.endsWith('/') ? path.join(file, 'index.html') : file;
  const found = await isFile(target);
  const body = await readFile(found ? target : path.join(dist, '404.html'));
  res.writeHead(found ? 200 : 404, { 'Content-Type': types[found ? path.extname(target) : '.html'] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
  res.end(body);
});
const port = Number(process.env.PORT ?? 5174);
server.listen(port, '127.0.0.1', () => console.log(`포털 미리보기: http://localhost:${server.address().port}/  (콘텐츠를 바꾼 뒤에는 서버를 다시 시작하세요)`));
server.on('error', err => { console.error(err.code === 'EADDRINUSE' ? `${port} 포트가 이미 사용 중입니다. 먼저 켠 서버를 Ctrl+C로 종료하세요.` : err.message); process.exitCode = 1; });
