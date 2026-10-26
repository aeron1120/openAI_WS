import { copyFile, mkdir, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { listStarterAssets } from './starter-assets.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.resolve(root, 'dist');
if (path.dirname(output) !== path.resolve(root)) throw new Error('Build output must be inside this project.');
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

// Only these public demo assets are deployed; no repository files or credentials.
const files = ['index.html', ...await listStarterAssets(root)];
for (const version of ['starter', 'complete']) {
  for (const file of ['index.html', 'app.js', 'styles.css']) {
    files.push(`workshop2/${version}/${file}`);
  }
}
for (const file of files) {
  const target = path.join(output, file);
  await mkdir(path.dirname(target), { recursive: true });
  await copyFile(path.join(root, file), target);
}
await writeFile(path.join(output, '404.html'), '<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>페이지를 찾을 수 없습니다</title><h1>페이지를 찾을 수 없습니다.</h1><p><a href="/">Workshop Kit 시작 화면으로 돌아가기</a></p></html>');
console.log(`Built ${files.length + 1} public files in dist/`);
