// 운영진용: 학생용 슬라이드를 한 장씩 이미지로 받아 portal/slides/에 저장합니다. 수업 화면(/learn/)이 이 이미지로 슬라이드를 보여줍니다.
// 사용법: node portal/scripts/slides-snapshot.mjs  (인터넷 필요. 슬라이드를 고쳤다면 다시 실행한 뒤 빌드·배포하세요)
// - 슬라이드는 '링크가 있는 모든 사용자 · 뷰어'로 공유되어 있어야 합니다.
// - 글 위주 페이지는 선명한 SVG로, 사진이 많아 SVG가 큰 페이지는 PNG로 받습니다.
// - 이미지는 빌드할 때 자료가 열린 회차만 사이트에 복사되므로, 미리 받아 두어도 공개 시각 전에는 보이지 않습니다.
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { workshops } from '../content/workshops.mjs';

const OUT = fileURLToPath(new URL('../slides/', import.meta.url));
const SVG_LIMIT = 250 * 1024;
const deckId = url => /\/presentation\/d\/([A-Za-z0-9_-]+)/.exec(url ?? '')?.[1];
const base = id => `https://docs.google.com/presentation/d/${id}`;

async function get(url) {
  const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (slides-snapshot)' } });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return Buffer.from(await response.arrayBuffer());
}

// 발표 보기 화면(htmlpresent)에 페이지 ID가 슬라이드 순서대로 들어 있습니다.
async function pageIds(id) {
  const html = (await get(`${base(id)}/htmlpresent`)).toString('utf8');
  const ids = [...html.matchAll(/pageid=([A-Za-z0-9_-]+)/g)].map(m => m[1]);
  return [...new Set(ids)];
}

const manifest = {};
for (const w of workshops) {
  const deck = w.resources.find(r => r.kind === 'slides' && r.audience === 'student');
  const id = deckId(deck?.url);
  if (!id || manifest[id]) continue;
  const dir = path.join(OUT, id);
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  const pages = [];
  for (const page of await pageIds(id)) {
    const svg = await get(`${base(id)}/export/svg?pageid=${page}`);
    const [ext, data] = svg.length <= SVG_LIMIT ? ['svg', svg] : ['png', await get(`${base(id)}/export/png?pageid=${page}`)];
    await writeFile(path.join(dir, `${page}.${ext}`), data);
    pages.push({ id: page, file: `${page}.${ext}` });
  }
  manifest[id] = { workshop: w.number, fetched: new Date().toISOString(), pages };
  console.log(`Workshop ${w.number}: ${pages.length}장 저장 (${pages.filter(p => p.file.endsWith('.svg')).length}장 SVG)`);
}

// 지금 회차에 없는 예전 슬라이드 폴더는 지웁니다.
for (const name of await readdir(OUT).catch(() => [])) {
  if (name !== 'manifest.json' && !manifest[name]) await rm(path.join(OUT, name), { recursive: true, force: true });
}
await writeFile(path.join(OUT, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`저장: ${path.join(OUT, 'manifest.json')}`);
