// HTML 조각과 공통 화면 요소. 값은 기본으로 escape되고, raw()로 감싼 값만 그대로 들어갑니다.

class Raw { constructor(value) { this.value = value; } toString() { return this.value; } }
export const raw = value => new Raw(value);

const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = value => String(value ?? '').replace(/[&<>"']/g, c => entities[c]);
const toHtml = value => value == null || value === false ? '' : value instanceof Raw ? value.value : Array.isArray(value) ? value.map(toHtml).join('') : esc(value);
export const h = (strings, ...values) => raw(strings.reduce((out, part, i) => out + part + (i < values.length ? toHtml(values[i]) : ''), ''));

// 공개 가능한 링크만 버튼으로 만듭니다. 빈 값, '#', http:// 주소는 링크가 되지 않습니다.
export function isUsableUrl(url) {
  return typeof url === 'string' && (/^https:\/\/[^\s]+$/.test(url) || /^\/(?!\/)[^\s]*$/.test(url) || /^mailto:[^\s@]+@[^\s@]+$/.test(url));
}
export const isExternal = url => /^https:/.test(url);

export function link(url, label, className = '') {
  if (!isUsableUrl(url)) return '';
  const cls = className ? h` class="${className}"` : '';
  return isExternal(url)
    ? h`<a${cls} href="${url}" target="_blank" rel="noopener">${label}<span class="ext" aria-hidden="true">↗</span><span class="sr-only"> (새 창)</span></a>`
    : h`<a${cls} href="${url}">${label}</a>`;
}

// 날짜는 확정된 절대 시각만 한국 시간으로 표시합니다.
export function formatSchedule(event, timeZone) {
  if (!event?.start) return null;
  const start = new Date(event.start);
  const day = new Intl.DateTimeFormat('ko-KR', { timeZone, year: 'numeric', month: 'long', day: 'numeric' }).format(start);
  const date = `${day} (${new Intl.DateTimeFormat('ko-KR', { timeZone, weekday: 'short' }).format(start)})`;
  const time = new Intl.DateTimeFormat('ko-KR', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const end = event.end ? `–${time.format(new Date(event.end))}` : '';
  return `${date} ${time.format(start)}${end} (한국 시간)`;
}

const eventLabels = { done: ['진행 완료', 'done'], scheduled: ['일정 확정', 'scheduled'], tbd: ['일정 미정', 'tbd'], planning: ['기획 중', 'planning'] };
export function isRecruiting(item) {
  return Boolean(item.recruitment?.open && isUsableUrl(item.recruitment.url));
}
export function eventBadge(item) {
  if (isRecruiting(item)) return h`<span class="badge badge-open">모집 중</span>`;
  const [label, tone] = eventLabels[item.event?.status] ?? eventLabels.tbd;
  return h`<span class="badge badge-${tone}">${label}</span>`;
}
export function materialsBadge(item) {
  return item.materials === 'open'
    ? h`<span class="badge badge-materials">자료 열림</span>`
    : h`<span class="badge badge-planning">자료 준비 중</span>`;
}

let promptCount = 0;
export function copyBlock(text, label = 'Codex에 붙여 넣을 요청문', { code = false } = {}) {
  const id = `copy-${++promptCount}`;
  return h`<div class="copy-block">
  <div class="copy-head"><span id="${id}-label">${label}</span><button type="button" class="copy-button" data-copy-target="${id}" aria-describedby="${id}-label" hidden>복사</button></div>
  <pre id="${id}" ${code ? raw('class="is-code" ') : ''}tabindex="0" aria-labelledby="${id}-label"><code>${text}</code></pre>
  <p class="copy-status" role="status" aria-live="polite"></p>
</div>`;
}

export function figure(preview, { eager = false } = {}) {
  if (!preview?.image) return '';
  return h`<figure class="shot">
  <div class="shot-frame"><img src="${preview.image}" alt="${preview.alt}" width="1280" height="${preview.height ?? 800}" ${eager ? raw('fetchpriority="high"') : raw('loading="lazy"')} decoding="async"></div>
  ${preview.caption ? h`<figcaption>${preview.caption}</figcaption>` : ''}
</figure>`;
}

// 영상은 사용자가 재생하기 전까지 내려받지 않습니다(preload="none"). 영상이 없으면 아무것도 그리지 않습니다.
export function video(item) {
  const v = item.video;
  if (!v?.ready || !isUsableUrl(v.src)) return '';
  return h`<figure class="video">
  <video controls playsinline preload="none" ${v.poster ? h`poster="${v.poster}"` : ''}>
    <source src="${v.src}" type="${v.type ?? 'video/mp4'}">
    ${v.captions ? h`<track kind="captions" src="${v.captions}" srclang="ko" label="한국어" default>` : ''}
  </video>
  <figcaption>${v.description}</figcaption>
</figure>`;
}
