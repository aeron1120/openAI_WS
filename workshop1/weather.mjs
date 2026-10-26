const ERROR_MESSAGES = {
  WEATHER_NOT_CONFIGURED: '날씨 연결을 준비하고 있어요.',
  FORECAST_NOT_AVAILABLE: '이 시간의 예보가 아직 없어요.',
  INVALID_WEATHER_QUERY: '날짜와 시간을 다시 확인해 주세요.',
  WEATHER_UPSTREAM_ERROR: '예보를 불러오지 못했어요. 다시 시도해 주세요.',
};

export function initWeather({ meetings, getDate, root = document, fetchImpl = fetch }) {
  let generation = 0;
  let controller;
  const targetsFor = id => [...root.querySelectorAll('[data-weather-for]')].filter(node => node.dataset.weatherFor === id);
  function paint(id, state, text, title = '') {
    for (const node of targetsFor(id)) {
      node.dataset.weatherState = state;
      node.setAttribute('aria-live', 'polite');
      node.setAttribute('aria-busy', state === 'loading' ? 'true' : 'false');
      node.textContent = text;
      node.title = title;
    }
  }
  async function refresh() {
    const current = ++generation;
    controller?.abort();
    controller = new AbortController();
    const signal = controller.signal;
    const date = getDate();
    const groups = new Map();
    for (const meeting of meetings) {
      paint(meeting.id, 'loading', '모임 시간의 날씨를 확인하고 있어요…');
      const group = groups.get(meeting.time) ?? [];
      group.push(meeting);
      groups.set(meeting.time, group);
    }
    await Promise.all([...groups].map(async ([time, group]) => {
      try {
        const response = await fetchImpl(`/api/weather?${new URLSearchParams({ date, time })}`, { signal, cache: 'no-store' });
        const data = await response.json();
        if (current !== generation) return;
        if (!response.ok) {
          const state = data.code === 'FORECAST_NOT_AVAILABLE' ? 'unavailable' : 'error';
          for (const meeting of group) paint(meeting.id, state, ERROR_MESSAGES[data.code] ?? ERROR_MESSAGES.WEATHER_UPSTREAM_ERROR);
          return;
        }
        if (!Number.isFinite(data.temperature) || !Number.isFinite(data.precipitationProbability)
          || data.forecastDate !== date || data.forecastTime !== time) throw new Error('Invalid weather response');
        const issued = `${data.baseDate.slice(0, 4)}.${data.baseDate.slice(4, 6)}.${data.baseDate.slice(6)} ${data.baseTime.slice(0, 2)}:${data.baseTime.slice(2)}`;
        for (const meeting of group) paint(meeting.id, 'ready', `${data.temperature}°C · 비 올 확률 ${data.precipitationProbability}%`,
          `출처: 기상청 단기예보 · ${date} ${time} 예보 · ${issued} 발표 · 대학동 격자 59, 125`);
      } catch (error) {
        if (current !== generation || error.name === 'AbortError') return;
        for (const meeting of group) paint(meeting.id, 'error', ERROR_MESSAGES.WEATHER_UPSTREAM_ERROR);
      }
    }));
  }
  const ready = refresh();
  return { refresh, ready, destroy() { generation++; controller?.abort(); } };
}
