import test from 'node:test';
import assert from 'node:assert/strict';
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
