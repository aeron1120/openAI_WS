import { createServer } from 'node:http';
import { readFile, realpath } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { isStarterAsset } from './scripts/starter-assets.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2' };
const server = createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  const target = pathname.endsWith('/') ? pathname + 'index.html' : pathname;
  const starterAsset = isStarterAsset(target.slice(1));
  const allowed = target === '/index.html' || starterAsset || /^\/workshop2\/(starter|complete|recovery-practice)\/(index\.html|app\.js|styles\.css)$/.test(target);
  if (!allowed) { res.writeHead(404); res.end('Not found'); return; }
  try {
    const file = await realpath(path.join(root, target.slice(1)));
    if (starterAsset) {
      const starterRoot = await realpath(path.join(root, 'starter'));
      const relative = path.relative(starterRoot, file);
      if (relative.startsWith('..') || path.isAbsolute(relative)) { res.writeHead(404); res.end('Not found'); return; }
    }
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[path.extname(target)], 'Cache-Control': 'no-store' });
    res.end(body);
  } catch { res.writeHead(404); res.end('Not found. Check the README.'); }
});
const port = Number(process.env.PORT ?? 5173);
server.listen(port, '127.0.0.1', () => console.log(`Workshop: http://localhost:${server.address().port}`));
server.on('error', err => { console.error(err.code === 'EADDRINUSE' ? `${port} is already in use. Stop the other server with Ctrl+C.` : err.message); process.exitCode = 1; });
