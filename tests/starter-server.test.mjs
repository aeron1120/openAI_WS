import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));

test('starter is reachable with its assets while private files stay inaccessible', async t => {
  const child = spawn(process.execPath, ['server.mjs'], {
    cwd: root, env: { ...process.env, PORT: '0' }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  t.after(async () => {
    if (child.exitCode === null) { child.kill(); await once(child, 'exit'); }
  });
  const origin = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Server did not start')), 5000);
    let output = '';
    child.stdout.on('data', chunk => {
      output += chunk;
      const match = output.match(/http:\/\/localhost:(\d+)/);
      if (match) { clearTimeout(timer); resolve(`http://127.0.0.1:${match[1]}`); }
    });
    child.once('error', err => { clearTimeout(timer); reject(err); });
    child.once('exit', code => { clearTimeout(timer); reject(new Error(`Server exited: ${code}`)); });
  });

  await t.test('starter and both existing workshop 2 routes render', async () => {
    for (const route of ['/starter/', '/workshop2/starter/', '/workshop2/complete/']) {
      const response = await fetch(origin + route);
      assert.equal(response.status, 200, route);
      assert.match(response.headers.get('content-type'), /text\/html/);
    }
  });

  await t.test('starter scripts and styles have browser-usable MIME types', async () => {
    for (const [route, type] of [['/starter/app.js', 'javascript'], ['/starter/styles.css', 'text/css']]) {
      const response = await fetch(origin + route);
      assert.equal(response.status, 200, route);
      assert.ok(response.headers.get('content-type').includes(type));
    }
  });

  await t.test('private config, source, traversal and unknown assets are not exposed', async () => {
    for (const route of ['/.env', '/.git/config', '/server.mjs', '/package.json', '/starter/../.env', '/starter/%2e%2e%2f.env', '/starter/missing.js']) {
      assert.equal((await fetch(origin + route)).status, 404, route);
    }
  });
});
