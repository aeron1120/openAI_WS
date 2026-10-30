// HTML 이스케이프, 관리자 본문의 제한된 서식, 한국 시간 표시.
import { cleanUrl } from './content.mjs';

export const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
export const attr = esc;

// 관리자 본문은 HTML을 받지 않고, 아래 몇 가지 서식만 바꿔 그립니다. 나머지는 모두 글자로 보입니다.
//   빈 줄 = 문단, '- ' = 목록, **굵게**, [글자](https://주소)
// 링크는 https·http·사이트 안 주소만, 바깥 링크는 새 창 + noopener.
function inline(text) {
  let out = '';
  const pattern = /\*\*([^*\n]{1,200})\*\*|\[([^\]\n]{1,200})\]\(([^)\s]{1,500})\)/g;
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    out += esc(text.slice(last, match.index));
    if (match[1]) out += `<strong>${esc(match[1])}</strong>`;
    else {
      const url = cleanUrl(match[3]);
      out += url ? link(url, esc(match[2])) : esc(match[0]);
    }
    last = match.index + match[0].length;
  }
  return out + esc(text.slice(last));
}

export function link(url, label, className = '') {
  const external = !url.startsWith('/');
  return `<a href="${attr(url)}"${className ? ` class="${className}"` : ''}${external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${label}${external ? '<span class="sr-only"> (새 창)</span>' : ''}</a>`;
}

export function rich(text) {
  if (!text) return '';
  return String(text).split(/\n{2,}/).map(block => {
    const lines = block.split('\n');
    if (lines.every(line => /^\s*-\s+/.test(line))) return `<ul>${lines.map(line => `<li>${inline(line.replace(/^\s*-\s+/, ''))}</li>`).join('')}</ul>`;
    return `<p>${lines.map(inline).join('<br>')}</p>`;
  }).join('');
}

const zone = { timeZone: 'Asia/Seoul' };
const parts = (iso, options) => Object.fromEntries(new Intl.DateTimeFormat('ko-KR', { ...zone, ...options }).formatToParts(new Date(iso)).map(part => [part.type, part.value]));

// 11월 2일 (월) 18:00
export function when(iso, { time = true } = {}) {
  if (!iso) return '';
  const p = parts(iso, { month: 'numeric', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  return `${p.month}월 ${p.day}일 (${p.weekday})${time ? ` ${p.hour}:${p.minute}` : ''}`;
}

export function whenRange(start, end) {
  if (!start) return '';
  if (!end) return when(start);
  const sameDay = dateKey(start) === dateKey(end);
  return sameDay ? `${when(start)}–${when(end).split(' ').pop()}` : `${when(start)} – ${when(end)}`;
}

// 2026-11-02 (서울 기준 날짜)
export function dateKey(iso) {
  const p = parts(iso, { year: 'numeric', month: '2-digit', day: '2-digit' });
  return `${p.year}-${p.month}-${p.day}`;
}

// <input type="datetime-local">용 서울 시각 값
export function localInput(iso) {
  if (!iso) return '';
  const p = parts(iso, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}
