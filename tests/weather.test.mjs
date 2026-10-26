import test from 'node:test';
import assert from 'node:assert/strict';
import { latestBaseTime, selectForecast, handleWeather } from '../server/weather.mjs';

const now = new Date('2026-10-26T02:30:00Z'); // 11:30 KST
const request = (query = 'date=2026-10-27&time=18:00', method = 'GET') => new Request(`https://example.test/api/weather?${query}`, { method });
const row = (category, fcstValue, overrides = {}) => ({ baseDate: '20261026', baseTime: '1100', fcstDate: '20261027', fcstTime: '1800', nx: 59, ny: 125, category, fcstValue, ...overrides });
const payload = (items, code = '00') => ({ response: { header: { resultCode: code, resultMsg: 'test' }, body: { items: { item: items }, totalCount: items.length } } });

test('base time uses KST, publication margin and prior day at midnight', () => {
  assert.deepEqual(latestBaseTime(now), { baseDate: '20261026', baseTime: '1100' });
  assert.deepEqual(latestBaseTime(new Date('2026-10-25T17:09:00Z')), { baseDate: '20261025', baseTime: '2300' });
  assert.deepEqual(latestBaseTime(new Date('2026-10-25T17:10:00Z')), { baseDate: '20261026', baseTime: '0200' });
  assert.deepEqual(latestBaseTime(new Date('2025-12-31T15:05:00Z')), { baseDate: '20251231', baseTime: '2300' });
});

test('only pairs TMP and POP for the same target date, hour, grid and issued forecast', () => {
  const items = [row('TMP', '99', { nx: 60 }), row('POP', '80', { fcstTime: '1700' }), row('TMP', '18.5'), row('POP', '30')];
  assert.deepEqual(selectForecast(items, '20261027', '1800', latestBaseTime(now)), { temperature: 18.5, precipitationProbability: 30 });
  assert.equal(selectForecast([row('TMP', '18'), row('POP', '20', { baseTime: '0800' })], '20261027', '1800', latestBaseTime(now)), null);
  assert.equal(selectForecast([row('TMP', '18'), row('POP', '20', { fcstDate: '20261028' })], '20261027', '1800', latestBaseTime(now)), null);
});

test('invalid and missing values never turn into displayed zero weather', () => {
  for (const value of ['', null, 'NaN', '-999', '1000']) {
    assert.equal(selectForecast([row('TMP', value), row('POP', '20')], '20261027', '1800', latestBaseTime(now)), null);
  }
  assert.equal(selectForecast([row('TMP', '18'), row('POP', '101')], '20261027', '1800', latestBaseTime(now)), null);
  assert.deepEqual(selectForecast([row('TMP', '0'), row('POP', '0')], '20261027', '1800', latestBaseTime(now)), { temperature: 0, precipitationProbability: 0 });
});

test('invalid dates, non-hour times, grid override and unknown URL rejected before outbound request', async () => {
  for (const query of ['date=2026-02-30&time=18:00', 'date=2026-10-27&time=18:30', 'date=2026-10-27&time=24:00', 'date=2026-10-27', 'date=2026-10-27&time=18:00&nx=60', 'date=2026-10-27&time=18:00&url=https://evil.test']) {
    const response = await handleWeather(request(query), { KMA_SERVICE_KEY: 'test-only' }, { now, fetchImpl: () => assert.fail('must not fetch') });
    assert.equal(response.status, 400, query);
  }
  assert.equal((await handleWeather(request(undefined, 'POST'), {}, { now })).status, 405);
});

test('returns explicit configuration and outside forecast window states', async () => {
  const missing = await handleWeather(request(), {}, { now });
  assert.equal(missing.status, 503);
  assert.equal((await missing.json()).code, 'WEATHER_NOT_CONFIGURED');
  const outside = await handleWeather(request('date=2026-11-12&time=18:00'), { KMA_SERVICE_KEY: 'test-only' }, { now, fetchImpl: () => assert.fail('must not fetch') });
  assert.equal(outside.status, 404);
  assert.equal((await outside.json()).code, 'FORECAST_NOT_AVAILABLE');
});

test('calls only official HTTPS endpoint, encodes secret once and returns selected source metadata', async () => {
  let requested;
  const response = await handleWeather(request(), { KMA_SERVICE_KEY: 'test%2Bkey%3D' }, { now, fetchImpl: async (input, init) => {
    requested = new URL(input);
    assert.equal(init.redirect, 'error');
    return Response.json(payload([row('TMP', '18.5'), row('POP', '30')]));
  }});
  assert.equal(response.status, 200);
  assert.equal(requested.origin + requested.pathname, 'https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst');
  assert.equal(requested.searchParams.get('serviceKey'), 'test+key=');
  assert.equal(requested.searchParams.get('nx'), '59');
  assert.equal(requested.searchParams.get('ny'), '125');
  assert.equal(requested.searchParams.get('base_time'), '1100');
  const body = await response.json();
  assert.equal(body.temperature, 18.5);
  assert.equal(body.precipitationProbability, 30);
  assert.equal(body.forecastDate, '2026-10-27');
  assert.equal(body.forecastTime, '18:00');
  assert.equal(body.source, '기상청 단기예보');
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.ok(!JSON.stringify(body).includes('test+key'));
});

test('missing matching forecast is explicit and not a nearest-hour substitution', async () => {
  const response = await handleWeather(request(), { KMA_SERVICE_KEY: 'test-only' }, { now, fetchImpl: async () => Response.json(payload([row('TMP', '18'), row('POP', '20', { fcstTime: '1900' })])) });
  assert.equal(response.status, 404);
  assert.equal((await response.json()).code, 'FORECAST_NOT_AVAILABLE');
});

test('upstream failure never exposes key, raw response or exception', async () => {
  const fetches = [async () => { throw new Error('SECRET_VALUE request failed'); }, async () => new Response('SECRET_VALUE', { status: 500 }), async () => new Response('<xml>SECRET_VALUE</xml>'), async () => Response.json(payload([], '30'))];
  for (const fetchImpl of fetches) {
    const response = await handleWeather(request(), { KMA_SERVICE_KEY: 'SECRET_VALUE' }, { now, fetchImpl });
    assert.equal(response.status, 502);
    assert.ok(!(await response.text()).includes('SECRET_VALUE'));
  }
});
