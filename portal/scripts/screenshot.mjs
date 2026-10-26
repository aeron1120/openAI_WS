// 운영진용: 예제 화면·공유 이미지를 PNG로 저장합니다. 사이트 빌드에는 필요하지 않습니다.
// 사용법: node portal/scripts/screenshot.mjs <URL 또는 파일 경로> <저장할 PNG> [가로,세로]
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const candidates = [
  process.env.BROWSER,
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium'
].filter(Boolean);

export function findBrowser() {
  const browser = candidates.find(file => existsSync(file));
  if (!browser) throw new Error('Edge 또는 Chrome을 찾지 못했습니다. BROWSER 환경 변수에 실행 파일 경로를 지정하세요.');
  return browser;
}

export async function screenshot(target, out, size = '1280,800') {
  const url = /^https?:|^file:/.test(target) ? target : pathToFileURL(path.resolve(target)).href;
  mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  const profile = mkdtempSync(path.join(os.tmpdir(), 'portal-shot-'));
  const args = ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-device-scale-factor=1',
    `--user-data-dir=${profile}`, `--window-size=${size}`, '--virtual-time-budget=6000', `--screenshot=${path.resolve(out)}`, url];
  try {
    await new Promise((resolve, reject) => {
      const child = spawn(findBrowser(), args, { stdio: 'ignore' });
      child.on('error', reject);
      child.on('exit', code => code === 0 ? resolve() : reject(new Error(`브라우저 종료 코드 ${code}`)));
    });
  } finally {
    rmSync(profile, { recursive: true, force: true });
  }
  if (!existsSync(out)) throw new Error(`화면을 저장하지 못했습니다: ${out}`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [target, out, size] = process.argv.slice(2);
  if (!target || !out) {
    console.error('사용법: node portal/scripts/screenshot.mjs <URL 또는 파일> <저장할 PNG> [가로,세로]');
    process.exit(1);
  }
  await screenshot(target, out, size);
  console.log(`저장: ${out}`);
}
