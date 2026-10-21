import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
const server = createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  const target = pathname.endsWith('/') ? pathname + 'index.html' : pathname;
  const allowed = target === '/index.html' || /^\/workshop2\/(starter|complete|recovery-practice)\/(index\.html|app\.js|styles\.css)$/.test(target);
  if (!allowed) { res.writeHead(404); res.end('Not found'); return; }
  try {
    const body = await readFile(path.join(root, target.slice(1)));
    res.writeHead(200, { 'Content-Type': types[path.extname(target)], 'Cache-Control': 'no-store' });
    res.end(body);
  } catch { res.writeHead(404); res.end('Not found. Check the README.'); }
});
server.listen(5173, '127.0.0.1', () => console.log('Workshop: http://localhost:5173'));
server.on('error', err => { console.error(err.code === 'EADDRINUSE' ? '5173 is already in use. Stop the other server with Ctrl+C.' : err.message); process.exitCode = 1; });
