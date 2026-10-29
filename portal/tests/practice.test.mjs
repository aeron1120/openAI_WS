import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { defaultContent, validateContent } from '../scripts/build.mjs';
import { lessonPage } from '../src/learn-pages.mjs';
import { workshopPage } from '../src/pages.mjs';

test('each Workshop 1 assignment has its own pages with a readable transcript, including separate feature branches', () => {
  const w = defaultContent.workshops[0];
  const groups = w.missions.flatMap(m => [m, ...(m.options ?? [])]);
  const allIds = groups.flatMap(g => g.taskSlides);
  assert.equal(allIds.length, 17);
  assert.equal(new Set(allIds).size, 17, 'no question or feature shares unrelated pages');
  assert.deepEqual(w.missions.map(m => m.taskSlides.length), [2, 3, 2, 1]);
  for (const id of allIds) assert.ok(defaultContent.transcripts[id]?.text.length > 50, `${id} has a transcript`);
});

test('Workshop 2 keeps 48 lecture pages and bounds five assignments to their own 19 practice pages', async () => {
  const w = defaultContent.workshops[1];
  const deckId = '1N_guFeYU5IbLcgVMR8LI8MYdEZup9dK0gm32qI8W4kE';
  const deck = defaultContent.decks[deckId];
  const ids = w.missions.flatMap(m => m.taskSlides);
  assert.equal(deck.pages.length, 67);
  assert.equal(deck.pages.filter(p => !p.id.startsWith('ws2_task_')).length, 48);
  assert.deepEqual(w.missions.map(m => m.taskSlides.length), [4, 3, 3, 4, 5]);
  assert.equal(new Set(ids).size, 19);
  for (const m of w.missions) {
    assert.equal(m.hintSlides.length, m.hints.length);
    assert.ok(m.hintSlides.every(id => m.taskSlides.includes(id)));
    for (const id of m.taskSlides) {
      assert.ok(defaultContent.transcripts[id]?.text.length > 50);
      const page = deck.pages.find(p => p.id === id);
      const bytes = await readFile(new URL(`../slides/${deckId}/${page.file}`, import.meta.url));
      assert.equal(bytes.subarray(8, 12).toString(), 'WEBP');
    }
  }
  const html = String(lessonPage(defaultContent, w));
  assert.match(html, /data-slide-jump="ws2_task_20261029_release_4"/);
  assert.match(html, /data-deck-mode="task" aria-pressed="true"/);
  const bad = structuredClone(defaultContent);
  bad.workshops[1].missions[0].hintSlides[0] = w.missions[4].slideId;
  assert.throws(() => validateContent(bad), /hintSlides/);
  const zip = await readFile(new URL('../public/downloads/workshop2-site.zip', import.meta.url));
  assert.equal(zip.subarray(0, 2).toString(), 'PK');
});

test('the lesson deck offers the page text and hints jump to their own task pages', () => {
  const w = defaultContent.workshops[0];
  const html = String(lessonPage(defaultContent, w));
  assert.match(html, /data-deck-text/);
  assert.match(html, /이 페이지 글로 읽기/);
  assert.ok(html.includes('&quot;text&quot;:&quot;목표: 설치 없이'), 'task page text travels with the deck pages');
  assert.match(html, /data-slide-jump="ws1_task_20261029_change_2"/);
  assert.match(html, /data-slide-jump="ws1_task_20261029_weather_1"/);
  // 공개 워크숍 페이지에는 슬라이드 보기가 없으니 버튼도 없습니다.
  assert.doesNotMatch(String(workshopPage(defaultContent, w)), /data-slide-jump/);
});

test('hintSlides must stay inside the hint owner’s task pages and not outnumber the hints', () => {
  const bad = edit => {
    const c = structuredClone(defaultContent); edit(c.workshops[0]);
    assert.throws(() => validateContent(c), /hintSlides/);
  };
  bad(w => { w.missions[0].hintSlides = ['ws1_task_20261029_map_1']; });
  bad(w => { w.missions[3].options[0].hintSlides = ['ws1_task_20261029_login_1']; });
  bad(w => { w.missions[1].hintSlides = Array(4).fill('ws1_task_20261029_local_1'); });
  bad(w => { w.missions[2].hintSlides = 'ws1_task_20261029_change_1'; });
});
