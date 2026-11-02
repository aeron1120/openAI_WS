import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { api, loginAs, questionApp, send } from '../../learn-server/tests/helpers.mjs';

// 브라우저 대신 DOM 경계만 제공하고 실제 admin.js와 수업 API를 함께 실행합니다.
class Element {
  constructor(tag, className = '', text = '') {
    Object.assign(this, { tag, className: className || '', textContent: text, children: [], attrs: {}, listeners: {}, dataset: {}, hidden: false, disabled: false, value: '' });
    this.classList = { add: name => { this.className += ` ${name}`; }, remove: name => { this.className = this.className.split(' ').filter(c => c !== name).join(' '); } };
  }
  append(...nodes) { nodes.forEach(node => { node.parent = this; this.children.push(node); }); }
  prepend(...nodes) { nodes.forEach(node => { node.parent = this; }); this.children.unshift(...nodes); }
  replaceChildren(...nodes) { this.children = []; this.append(...nodes); }
  replaceWith(node) { node.parent = this.parent; this.parent.children[this.parent.children.indexOf(this)] = node; }
  setAttribute(key, value) { this.attrs[key] = value; }
  getAttribute(key) { return this.attrs[key]; }
  addEventListener(key, fn) { this.listeners[key] = fn; }
  focus() { this.focused = true; }
  reportValidity() { return true; } // 날짜 검증은 API에서 독립적으로 검사합니다.
  matches(selector) {
    if (selector[0] === '#') return this.id === selector.slice(1);
    if (selector[0] === '.') return this.className.split(' ').includes(selector.slice(1));
    const attr = /^\[([^=\]]+)(?:="([^"]*)")?\]$/.exec(selector);
    if (attr) return Object.hasOwn(this.attrs, attr[1]) && (attr[2] === undefined || this.attrs[attr[1]] === attr[2]);
    return this.tag === selector;
  }
  querySelectorAll(selector) { return this.children.flatMap(c => [...(c.matches(selector) ? [c] : []), ...c.querySelectorAll(selector)]); }
  querySelector(selector) { return this.querySelectorAll(selector)[0] ?? null; }
}

async function setup() {
  const flow = questionApp();
  const operator = await loginAs(flow, 9, 'op@snu.ac.kr');
  const content = new Element('div');
  content.dataset.steps = JSON.stringify([{ number: 2, title: 'Workshop 2', steps: [] }]);
  let init;
  const Learn = {
    el: (tag, cls, text) => new Element(tag, cls, text),
    button: (text, cls, fn) => { const node = new Element('button', cls, text); node.addEventListener('click', fn); return node; },
    register: (_, fn) => { init = fn; },
    async call(path, { method = 'GET', json } = {}) {
      const res = method === 'GET' ? await flow.app(api(path, { cookie: operator })) : await send(flow.app, path, operator, { method, body: json });
      const data = await res.json();
      if (!res.ok) throw Object.assign(new Error(data.message), { status: res.status });
      return data;
    }
  };
  runInNewContext(await readFile(new URL('../src/admin.js', import.meta.url), 'utf8'), {
    window: { Learn }, URLSearchParams, location: { pathname: '/admin/', search: '?tab=materials' }, document: { body: new Element('body') }
  });
  init(content);
  await new Promise(resolve => setImmediate(resolve));
  const card = () => content.querySelectorAll('.admin-material-card')[1];
  return { flow, content, card };
}

test('operator form saves Korea time via the real API and updates its status', async () => {
  const ui = await setup();
  assert.equal(ui.card().querySelector('input').value, '2026-11-02T18:00');
  ui.card().querySelector('input').value = '2026-11-02T19:30';
  await ui.card().listeners.submit({ preventDefault() {} });
  const setting = (await (await ui.flow.app(api('/api/materials'))).json()).materials.find(w => w.workshop === 2);
  assert.equal(setting.opensAt, '2026-11-02T10:30:00.000Z');
  assert.match(ui.card().querySelector('.admin-material-state').textContent, /19:30/);
  const mode = ui.card().querySelector('select');
  mode.value = 'open';
  mode.listeners.change();
  assert.equal(ui.card().querySelector('input').disabled, true);
  assert.equal(ui.card().querySelector('input').parent.hidden, true);
  await ui.card().listeners.submit({ preventDefault() {} });
  assert.equal(ui.card().querySelector('.admin-material-state').textContent, '공개 중');
  const close = ui.card().querySelector('select');
  close.value = 'closed';
  close.listeners.change();
  await ui.card().listeners.submit({ preventDefault() {} });
  assert.equal(ui.card().querySelector('.admin-material-state').textContent, '비공개');
});

test('failed saves retain inputs and expose an error; keyboard navigation reaches all three tabs', async () => {
  const ui = await setup();
  ui.flow.db.saveMaterialSetting = async () => { throw new Error('offline'); };
  ui.card().querySelector('input').value = '2026-11-03T20:30';
  await ui.card().listeners.submit({ preventDefault() {} });
  assert.equal(ui.card().querySelector('input').value, '2026-11-03T20:30');
  assert.equal(ui.card().querySelector('button').disabled, false);
  assert.match(ui.card().querySelector('[role="status"]').textContent, /저장하지 못/);
  const tabs = ui.content.querySelector('.admin-tabs');
  const key = name => tabs.listeners.keydown({ key: name, preventDefault() {} });
  key('Home');
  assert.equal(ui.content.querySelector('#admin-tab-questions').getAttribute('aria-selected'), 'true');
  key('ArrowRight');
  assert.equal(ui.content.querySelector('#admin-tab-progress').getAttribute('aria-selected'), 'true');
  key('ArrowRight');
  assert.equal(ui.content.querySelector('#admin-tab-materials').getAttribute('aria-selected'), 'true');
  key('ArrowRight');
  assert.equal(ui.content.querySelector('#admin-tab-questions').getAttribute('aria-selected'), 'true');
});
