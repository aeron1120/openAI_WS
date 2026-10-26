import test from 'node:test';
import assert from 'node:assert/strict';
import { initWeather } from '../workshop1/weather.mjs';

function fixture() {
  const meetings = [{ id: 'run', time: '18:00' }, { id: 'study', time: '18:00' }];
  const nodes = meetings.map(meeting => ({ dataset: { weatherFor: meeting.id }, attrs: {}, textContent: '', title: '', setAttribute(key, value) { this.attrs[key] = value; } }));
  return { meetings, nodes, root: { querySelectorAll: () => nodes } };
}
const result = (date, temperature = 18) => ({ temperature, precipitationProbability: 30, forecastDate: date, forecastTime: '18:00', baseDate: '20261026', baseTime: '1100' });

test('same hour shares one request, renders source and refresh genuinely fetches again', async () => {
  const { meetings, nodes, root } = fixture();
  let calls = 0;
  const view = initWeather({ meetings, root, getDate: () => '2026-10-27', fetchImpl: async () => { calls++; return Response.json(result('2026-10-27')); } });
  assert.equal(nodes[0].dataset.weatherState, 'loading');
  await view.ready;
  assert.equal(calls, 1);
  assert.equal(nodes[0].textContent, '18°C · 비 올 확률 30%');
  assert.ok(nodes[0].title.includes('기상청'));
  assert.equal(nodes[1].dataset.weatherState, 'ready');
  await view.refresh();
  assert.equal(calls, 2);
  view.destroy();
});

test('late result from previous date cannot overwrite the latest selected date', async () => {
  const { meetings, nodes, root } = fixture();
  let date = '2026-10-27';
  const pending = [];
  const view = initWeather({ meetings, root, getDate: () => date, fetchImpl: (_url, options) => new Promise(resolve => pending.push({ resolve, signal: options.signal })) });
  date = '2026-10-28';
  const latest = view.refresh();
  assert.equal(pending[0].signal.aborted, true);
  pending[1].resolve(Response.json(result('2026-10-28', 9)));
  await latest;
  pending[0].resolve(Response.json(result('2026-10-27', 18)));
  await view.ready;
  assert.equal(nodes[0].textContent, '9°C · 비 올 확률 30%');
  view.destroy();
});

test('failure replaces previous weather, and untrusted server messages are not rendered', async () => {
  const { meetings, nodes, root } = fixture();
  let fail = false;
  const view = initWeather({ meetings, root, getDate: () => '2026-10-27', fetchImpl: async () => fail
    ? Response.json({ code: 'FORECAST_NOT_AVAILABLE', message: '<img src=x onerror=alert(1)>' }, { status: 404 })
    : Response.json(result('2026-10-27')) });
  await view.ready;
  fail = true;
  await view.refresh();
  assert.equal(nodes[0].dataset.weatherState, 'unavailable');
  assert.ok(!nodes[0].textContent.includes('18°C'));
  assert.ok(!nodes[0].textContent.includes('<img'));
  assert.equal(nodes[0].attrs['aria-busy'], 'false');
  view.destroy();
});
