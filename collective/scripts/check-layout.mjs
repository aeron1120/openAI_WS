// 화면 너비별 확인: Edge/Chrome을 원격 디버깅으로 띄워 360·768·1440px에서 가로 넘침을 재고 스크린샷을 남깁니다.
//   node collective/scripts/check-layout.mjs <저장 폴더> [주소 ...]   (로컬 서버 실행 중이어야 함)
// 운영진 확인용 도구이며 사이트 동작에는 쓰이지 않습니다.
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { findBrowser } from '../../portal/scripts/screenshot.mjs';

const [outDir, ...targets] = process.argv.slice(2);
if (!outDir) { console.error('사용법: node collective/scripts/check-layout.mjs <저장 폴더> [주소 ...]'); process.exit(1); }
const urls = targets.length ? targets : ['http://localhost:5180/'];
const widths = [360, 768, 1440];
mkdirSync(outDir, { recursive: true });

const port = 9300 + Math.floor(Math.random() * 500);
const profile = mkdtempSync(path.join(os.tmpdir(), 'collective-check-'));
const browser = spawn(findBrowser(), ['--headless=new', '--disable-gpu', '--no-first-run', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

let target;
for (let i = 0; i < 40 && !target; i++) {
  await wait(250);
  try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(item => item.type === 'page'); } catch {}
}
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }));
let nextId = 0;
const pending = new Map();
socket.addEventListener('message', event => {
  const data = JSON.parse(event.data);
  if (data.id && pending.has(data.id)) { pending.get(data.id)(data); pending.delete(data.id); }
});
const send = (method, params = {}) => new Promise(resolve => { const id = ++nextId; pending.set(id, resolve); socket.send(JSON.stringify({ id, method, params })); });
const evaluate = async expression => (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result?.result?.value;

await send('Page.enable');
const results = [];
for (const url of urls) {
  for (const width of widths) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 700 });
    await send('Page.navigate', { url });
    await wait(1500);
    // 끝까지 스크롤해 등장 효과를 모두 켠 뒤 측정합니다.
    await evaluate('(async () => { for (let y = 0; y < document.body.scrollHeight; y += 400) { scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); } scrollTo(0, 0); await new Promise(r => setTimeout(r, 400)); })()');
    const overflow = await evaluate(`(() => { const w = document.documentElement.clientWidth; const wide = [...document.querySelectorAll('body *')].filter(el => { const r = el.getBoundingClientRect(); return r.width && (r.right > w + 1) && getComputedStyle(el).position !== 'fixed' && !el.closest('.hero-art, .campus-nav, .m-nav, .m-panel'); }).slice(0, 5).map(el => el.tagName.toLowerCase() + '.' + [...el.classList].join('.')); return { scrollWidth: document.documentElement.scrollWidth, clientWidth: w, wide }; })()`);
    const height = await evaluate('document.documentElement.scrollHeight');
    await send('Emulation.setDeviceMetricsOverride', { width, height: Math.min(height, 6000), deviceScaleFactor: 1, mobile: width < 700 });
    await wait(300);
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    const name = `${new URL(url).pathname.replace(/\W+/g, '_') || 'root'}-${width}.png`;
    writeFileSync(path.join(outDir, name), Buffer.from(shot.result.data, 'base64'));
    results.push({ url, width, ...overflow, ok: overflow.scrollWidth <= overflow.clientWidth });
  }
}
socket.close();
browser.kill();
await wait(300);
rmSync(profile, { recursive: true, force: true });
for (const row of results) console.log(`${row.ok ? '통과' : '넘침'} ${row.width}px ${row.url} (scroll ${row.scrollWidth} / ${row.clientWidth})${row.wide.length ? ` ${row.wide.join(', ')}` : ''}`);
process.exitCode = results.every(row => row.ok) ? 0 : 1;
