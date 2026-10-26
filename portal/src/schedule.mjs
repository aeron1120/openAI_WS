// 시각에 따라 달라지는 상태 계산. 같은 콘텐츠로 '그 시각의 사이트'를 만들 수 있게 합니다.
// - 행사: end가 지나면 'done', start가 있으면 'scheduled', 없으면 콘텐츠에 적힌 상태
// - 자료: materialsOpenAt 전이면 'locked' (미션·슬라이드·예제를 그리지 않음)

const at = value => value ? Date.parse(value) : NaN;

// '11/2 (월) 18:00' 형식 (한국 시간)
export function shortTime(value, timeZone) {
  const date = new Date(value);
  const part = options => new Intl.DateTimeFormat('ko-KR', { timeZone, ...options }).formatToParts(date);
  const pick = (parts, type) => parts.find(p => p.type === type)?.value;
  const md = part({ month: 'numeric', day: 'numeric' });
  const hm = part({ hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const weekday = new Intl.DateTimeFormat('ko-KR', { timeZone, weekday: 'short' }).format(date);
  return `${pick(md, 'month')}/${pick(md, 'day')} (${weekday}) ${pick(hm, 'hour')}:${pick(hm, 'minute')}`;
}

function resolveEvent(event, time, timeZone) {
  if (!event) return event;
  const resolved = { ...event };
  if (event.end && time >= at(event.end)) resolved.status = 'done';
  else if (event.start && time >= at(event.start)) resolved.status = 'live';
  else if (event.start) resolved.status = 'scheduled';
  if (event.start) resolved.badge = shortTime(event.start, timeZone);
  return resolved;
}

export function resolveContent(content, time) {
  const { timeZone } = content.site;
  const workshops = content.workshops.map(w => {
    const locked = w.materials === 'open' && w.materialsOpenAt && time < at(w.materialsOpenAt);
    return {
      ...w,
      event: resolveEvent(w.event, time, timeZone),
      materials: locked ? 'locked' : w.materials,
      opensLabel: locked ? shortTime(w.materialsOpenAt, timeZone) : null
    };
  });
  const openNumbers = new Set(workshops.filter(w => w.materials === 'open').map(w => w.number));
  return {
    ...content,
    workshops,
    studio: { ...content.studio, event: resolveEvent(content.studio.event, time, timeZone) },
    showcase: { ...content.showcase, event: resolveEvent(content.showcase.event, time, timeZone) },
    projects: content.projects.filter(p => p.workshop == null || openNumbers.has(p.workshop)),
    now: time
  };
}

// 화면이 바뀌는 시각들. 이 시각들 사이에서는 사이트가 똑같습니다.
export function boundaries(content) {
  const times = new Set();
  const add = value => { if (value && !Number.isNaN(at(value))) times.add(at(value)); };
  for (const w of content.workshops) { add(w.materialsOpenAt); add(w.event?.start); add(w.event?.end); }
  for (const item of [content.studio, content.showcase]) { add(item.event?.start); add(item.event?.end); }
  return [...times].sort((a, b) => a - b);
}
