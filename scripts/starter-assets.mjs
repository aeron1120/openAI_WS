import { readdir } from 'node:fs/promises';
import path from 'node:path';

// Only browser assets inside starter/ may be served or included in the public build.
export function isStarterAsset(relativePath) {
  return /^starter\/(?:[a-zA-Z0-9_-][a-zA-Z0-9_.-]*\/)*[a-zA-Z0-9_-][a-zA-Z0-9_.-]*\.(?:html|css|js|svg|png|jpe?g|webp|gif|ico|woff2?)$/.test(relativePath);
}

export async function listStarterAssets(root, directory = 'starter') {
  const assets = [];
  for (const entry of await readdir(path.join(root, directory), { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const relativePath = `${directory}/${entry.name}`;
    if (entry.isDirectory()) assets.push(...await listStarterAssets(root, relativePath));
    else if (entry.isFile() && isStarterAsset(relativePath)) assets.push(relativePath);
  }
  return assets;
}
