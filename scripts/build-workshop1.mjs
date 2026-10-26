import { copyFile, mkdir, rm, readdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.resolve(root, 'dist-workshop1');
if (path.dirname(output) !== path.resolve(root)) throw new Error('Invalid build output.');
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
const files = ['workshop1/index.html', 'workshop1/styles.css', 'workshop1/app.js', 'workshop1/meetings.mjs', 'workshop1/version.mjs'];
for (const file of await readdir(path.join(root, 'workshop1'))) {
  if (['weather.mjs', 'auth.mjs', 'maps.mjs'].includes(file)) files.push(`workshop1/${file}`);
}
for (const file of ['running.jpg', 'cafe.jpg', 'basketball.jpg', 'pretendard.woff2', 'FONT-LICENSE.txt', 'favicon.svg']) files.push(`workshop1/assets/${file}`);
for (const stage of ['starter', 'complete']) for (const file of ['index.html', 'app.js', 'styles.css']) files.push(`workshop2/${stage}/${file}`);
for (const file of files) {
  const target = path.join(output, file);
  await mkdir(path.dirname(target), { recursive: true });
  await copyFile(path.join(root, file), target);
}
await copyFile(path.join(root, 'workshop1/index.html'), path.join(output, 'index.html'));
await mkdir(path.join(output, 'versions'), { recursive: true });
await copyFile(path.join(root, 'workshop1/versions.html'), path.join(output, 'versions/index.html'));
await writeFile(path.join(output, '404.html'), '<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>페이지를 찾을 수 없습니다</title><h1>페이지를 찾을 수 없습니다.</h1><a href="/">틈으로 돌아가기</a></html>');
console.log(`Workshop 01: built ${files.length + 3} public files.`);
