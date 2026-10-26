const KMA_ENDPOINT = 'https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst';
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const GRID = { nx: 59, ny: 125 };

function seoulDate(now) { return new Date(now.getTime() + 9 * HOUR); }

// The app waits ten minutes after a scheduled issue to avoid querying mid-publication.
export function latestBaseTime(now = new Date()) {
  const local = seoulDate(new Date(now.getTime() - 10 * 60 * 1000));
  const hour = local.getUTCHours();
  const issueHour = [23, 20, 17, 14, 11, 8, 5, 2].find(value => value <= hour);
  if (issueHour === undefined) local.setUTCDate(local.getUTCDate() - 1);
  return {
    baseDate: local.toISOString().slice(0, 10).replaceAll('-', ''),
    baseTime: `${String(issueHour ?? 23).padStart(2, '0')}00`,
  };
}

function numeric(value, minimum, maximum) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= minimum && number <= maximum ? number : null;
}

export function selectForecast(items, date, time, issued) {
  if (!Array.isArray(items)) return null;
  const matching = items.filter(item => String(item.fcstDate) === date && String(item.fcstTime) === time
    && Number(item.nx) === GRID.nx && Number(item.ny) === GRID.ny
    && String(item.baseDate) === issued.baseDate && String(item.baseTime) === issued.baseTime);
  const temperature = numeric(matching.find(item => item.category === 'TMP')?.fcstValue, -100, 70);
  const precipitationProbability = numeric(matching.find(item => item.category === 'POP')?.fcstValue, 0, 100);
  if (temperature === null || precipitationProbability === null) return null;
  return { temperature, precipitationProbability };
}

function json(body, status = 200, headers = {}) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers } });
}

function unavailable() {
  return json({ code: 'FORECAST_NOT_AVAILABLE', message: '이 날짜와 시간의 예보가 아직 없어요. 가까운 날짜를 선택해 주세요.' }, 404);
}

export async function handleWeather(request, env, { fetchImpl = fetch, now = new Date() } = {}) {
  if (request.method !== 'GET') return json({ code: 'METHOD_NOT_ALLOWED', message: '지원하지 않는 요청이에요.' }, 405, { Allow: 'GET' });
  const params = new URL(request.url).searchParams;
  const date = params.get('date');
  const time = params.get('time');
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(date ?? '') && !Number.isNaN(Date.parse(`${date}T00:00:00Z`))
    && new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) === date;
  const allowedParams = [...params.keys()].every(key => ['date', 'time'].includes(key));
  if (!validDate || !/^([01]\d|2[0-3]):00$/.test(time ?? '') || !allowedParams
    || params.getAll('date').length !== 1 || params.getAll('time').length !== 1) {
    return json({ code: 'INVALID_WEATHER_QUERY', message: '올바른 날짜와 정시(예: 18:00)를 선택해 주세요.' }, 400);
  }
  const today = seoulDate(now).toISOString().slice(0, 10);
  const daysAhead = (Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / DAY;
  if (daysAhead < 0 || daysAhead > 4) return unavailable();
  if (typeof env.KMA_SERVICE_KEY !== 'string' || !env.KMA_SERVICE_KEY.trim()) {
    return json({ code: 'WEATHER_NOT_CONFIGURED', message: '날씨 연결을 준비하고 있어요. 잠시 후 다시 확인해 주세요.' }, 503);
  }

  const issued = latestBaseTime(now);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    // Accept either portal encoding variant; URLSearchParams performs the final encoding.
    const suppliedKey = env.KMA_SERVICE_KEY.trim();
    const serviceKey = suppliedKey.includes('%') ? decodeURIComponent(suppliedKey) : suppliedKey;
    const url = new URL(KMA_ENDPOINT);
    url.search = new URLSearchParams({ serviceKey, pageNo: '1', numOfRows: '2000', dataType: 'JSON',
      base_date: issued.baseDate, base_time: issued.baseTime, nx: String(GRID.nx), ny: String(GRID.ny) }).toString();
    const response = await fetchImpl(url.toString(), { signal: controller.signal, redirect: 'error', headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error('Weather upstream failed');
    const result = await response.json();
    const code = String(result?.response?.header?.resultCode ?? '');
    if (code === '03') return unavailable();
    if (code !== '00') throw new Error('Weather upstream rejected request');
    const forecast = selectForecast(result?.response?.body?.items?.item, date.replaceAll('-', ''), time.replace(':', ''), issued);
    if (!forecast) return unavailable();
    return json({ ...forecast, forecastDate: date, forecastTime: time, timeZone: 'Asia/Seoul',
      nx: GRID.nx, ny: GRID.ny, baseDate: issued.baseDate, baseTime: issued.baseTime,
      source: '기상청 단기예보', fetchedAt: now.toISOString() });
  } catch {
    // Never serialize upstream errors, URLs, raw bodies or the service key.
    return json({ code: 'WEATHER_UPSTREAM_ERROR', message: '기상청 예보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.' }, 502);
  } finally {
    clearTimeout(timeout);
  }
}
