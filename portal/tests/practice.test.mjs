import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { defaultContent, validateContent } from '../scripts/build.mjs';
import { lessonPage } from '../src/learn-pages.mjs';

test('each Workshop 1 assignment has its own pages, including separate feature branches', async () => {
  const w = defaultContent.workshops[0];
  const groups = w.missions.flatMap(m => [m, ...(m.options ?? [])]);
  const allIds = groups.flatMap(g => g.practiceSlides.map(p => p.id));
  assert.equal(allIds.length, 17);
  assert.equal(new Set(allIds).size, 17, 'no question or feature shares unrelated pages');
  assert.deepEqual(w.missions.map(m => m.practiceSlides.length), [2, 3, 2, 1]);
  for (const group of groups) for (const page of group.practiceSlides) {
    const bytes = await readFile(new URL('../public' + page.image, import.meta.url));
    assert.equal(bytes.subarray(8, 12).toString(), 'WEBP');
    assert.ok(page.text.length > 50);
  }
  const html = String(lessonPage(defaultContent, w));
  assert.doesNotMatch(html, /<iframe data-slides/);
  assert.match(html, /data-practice-viewer/);
  assert.match(html, /data-practice-text/);
  assert.match(html, /data-practice-jump="ws1_task_20261029_local_3"/);
  assert.match(html, /data-practice-source/);
});

test('practice metadata rejects links outside the current assignment and incomplete mappings', () => {
  const bad = edit => {
    const c = structuredClone(defaultContent); edit(c.workshops[0]);
    assert.throws(() => validateContent(c), /practiceSlides/);
  };
  bad(w => { w.missions[0].practiceSlides = []; });
  bad(w => { w.missions[0].hintSlides = ['ws1_task_20261029_map_1']; });
  bad(w => { w.missions[0].practiceSlides.push(w.missions[0].practiceSlides[0]); });
  bad(w => { delete w.missions[3].options[0].practiceSlides; });
});
