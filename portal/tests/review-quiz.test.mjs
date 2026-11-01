import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

// Only the DOM operations used by learn.js; run the entire production script
// and its registered click handler, without a browser or a live login server.
class Element {
  constructor(tag = 'div', dataset = {}, children = []) {
    this.tagName = tag;
    this.dataset = dataset;
    this.children = [];
    this.hidden = false;
    this.disabled = false;
    this.textContent = '';
    this.attributes = {};
    this.listeners = {};
    const classes = new Set();
    this.classList = {
      add: name => classes.add(name),
      contains: name => classes.has(name),
      toggle: (name, on) => on ? classes.add(name) : classes.delete(name)
    };
    this.append(...children);
  }
  append(...children) { for (const child of children) { child.parent = this; this.children.push(child); } }
  replaceChildren(...children) { this.children = []; this.append(...children); }
  setAttribute(key, value) { this.attributes[key] = value; }
  removeAttribute(key) { delete this.attributes[key]; }
  addEventListener(name, callback) { this.listeners[name] = callback; }
  focus() { this.focused = true; }
  matches(selector) {
    if (selector.startsWith('.')) return this.classList.contains(selector.slice(1)) || this.className === selector.slice(1);
    const attr = selector.match(/^\[data-([\w-]+)(?:="([^"]*)")?\](?:\.([\w-]+))?$/);
    if (!attr) return this.tagName === selector;
    const key = attr[1].replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    return key in this.dataset && (attr[2] === undefined || this.dataset[key] === attr[2]) && (!attr[3] || this.classList.contains(attr[3]));
  }
  closest(selector) { return this.matches(selector) ? this : this.parent?.closest(selector) ?? null; }
  querySelectorAll(selector) {
    const selectors = selector.split(',').map(s => s.trim());
    return this.children.flatMap(child => [...(selectors.some(s => child.matches(s)) ? [child] : []), ...child.querySelectorAll(selector)]);
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] ?? null; }
}

async function setup() {
  const devices = Array.from({ length: 3 }, (_, i) => new Element('button', { device: String(i) }, [new Element('span', { deviceState: '' })]));
  const quizzes = devices.map((_, i) => {
    const explanation = new Element('p');
    explanation.classList.add('quiz-explain');
    explanation.hidden = true;
    const quiz = new Element('div', { quiz: String(i) }, [
      new Element('button', { choice: '' }), new Element('button', { choice: '', answer: '' }), explanation
    ]);
    quiz.hidden = i !== 0;
    return quiz;
  });
  const next = new Element('button', { quizNext: '' });
  const finish = new Element('a', { quizFinish: '' });
  next.hidden = finish.hidden = true;
  const count = new Element('p', { quizCount: '' });
  const feedback = new Element('p', { quizFeedback: '' });
  const panel = new Element('div', { quizPanel: '' }, [...quizzes, count, feedback, next, finish]);
  const scene = new Element('section', { scene: 'review' }, [...devices, panel]);
  const world = new Element('div', { map: '', default: 'review' }, [scene]);
  const content = new Element('main', { learnContent: '' }, [world]);
  const document = new Element('document', {}, [new Element('div', { learnGate: '' }), new Element('div', { learnUser: '' }), content]);
  document.createElement = tag => new Element(tag);
  runInNewContext(await readFile(new URL('../src/learn.js', import.meta.url), 'utf8'), {
    document, window: {}, URLSearchParams,
    location: { hostname: 'localhost', pathname: '/learn/', search: '?preview', hash: '' },
    matchMedia: () => ({ matches: true })
  });
  await document.listeners.DOMContentLoaded();
  const click = target => world.listeners.click({ target });
  return { devices, quizzes, next, finish, count, feedback, click,
    correct: i => click(quizzes[i].querySelector('[data-answer]')) };
}

test('correct answers reveal Next quiz; the workshop link appears only after all three answers', async () => {
  const ui = await setup();
  ui.click(ui.quizzes[0].querySelector('[data-choice]'));
  assert.equal(ui.next.hidden, true, 'a wrong answer cannot advance');
  assert.equal(ui.finish.hidden, true);
  for (let i = 0; i < 3; i++) {
    ui.correct(i);
    assert.equal(ui.count.textContent, `${i + 1} / 3 확인`);
    assert.equal(ui.finish.hidden, i < 2, 'the workshop link stays hidden until every quiz is solved');
    assert.equal(ui.next.hidden, i === 2);
    assert.equal(ui.quizzes[i].querySelector('.quiz-explain').hidden, false);
    if (i < 2) {
      ui.click(ui.next);
      assert.equal(ui.quizzes[i].hidden, true);
      assert.equal(ui.quizzes[i + 1].hidden, false);
      assert.equal(ui.next.hidden, true, 'the next question must be answered first');
      assert.equal(ui.quizzes[i + 1].querySelector('[data-choice]').focused, true);
    }
  }
});

test('Next quiz wraps to unanswered blocks and manual selection keeps the buttons in sync', async () => {
  const ui = await setup();
  ui.click(ui.devices[2]);
  ui.correct(2);
  assert.equal(ui.finish.hidden, true, 'answering the last block first does not finish the review');
  assert.equal(ui.next.hidden, false);
  ui.click(ui.devices[1]);
  assert.equal(ui.next.hidden, true, 'an unanswered block cannot advance');
  ui.click(ui.devices[2]);
  assert.equal(ui.next.hidden, false, 'returning to a solved block restores Next quiz');
  ui.click(ui.next);
  assert.equal(ui.quizzes[0].hidden, false, 'wrap around to the first unanswered quiz');
  ui.correct(0);
  ui.click(ui.next);
  assert.equal(ui.quizzes[1].hidden, false);
  ui.correct(1);
  assert.equal(ui.count.textContent, '3 / 3 확인');
  assert.equal(ui.finish.hidden, false);
  assert.equal(ui.next.hidden, true);
  ui.click(ui.devices[0]);
  assert.equal(ui.finish.hidden, false, 'completed state survives revisiting another block');
  assert.equal(ui.next.hidden, true);
});
