import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { listStarterAssets } from '../scripts/starter-assets.mjs';

test('public build accepts new feature assets but omits instructions, hidden config and server source', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'workshop-kit-assets-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const files = ['starter/index.html', 'starter/features/my-map.js', 'starter/assets/pin.svg', 'starter/README.md', 'starter/.env', 'starter/server.mjs', 'starter/.private/key.js', 'starter/assets/.config.js'];
  for (const file of files) {
    await mkdir(path.dirname(path.join(root, file)), {recursive:true});
    await writeFile(path.join(root, file), 'test fixture');
  }
  assert.deepEqual((await listStarterAssets(root)).sort(), ['starter/assets/pin.svg', 'starter/features/my-map.js', 'starter/index.html']);
});
