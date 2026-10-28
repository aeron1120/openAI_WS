// 홈의 다음 워크숍: 달력, 캘린더에 추가(Google·.ics), 지도 링크. 날짜는 한국 시간 기준으로 계산합니다.
import { h, raw } from './render.mjs';

const pad2 = n => String(n).padStart(2, '0');

// 그 시각의 한국 날짜(연·월·일)
export function localDate(value, timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(new Date(value));
  const get = type => Number(parts.find(p => p.type === type).value);
  return { year: get('year'), month: get('month'), day: get('day') };
}

// 20261102T090000Z 형식 (캘린더 파일·Google 캘린더 공통)
const utcStamp = value => new Date(value).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

// 행사 날이 들어 있는 달의 달력. 오늘 표시는 main.js가 data-date를 보고 붙입니다.
export function monthCalendar(event, timeZone, label) {
  const { year, month, day } = localDate(event.start, timeZone);
  const blanks = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const length = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells = [...Array(blanks).fill(null), ...Array.from({ length }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  const weeks = Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));
  return h`<table class="cal">
  <caption>${year}년 ${month}월<span class="sr-only"> 달력, ${day}일 ${label}</span></caption>
  <thead><tr>${['일', '월', '화', '수', '목', '금', '토'].map(name => h`<th scope="col">${name}</th>`)}</tr></thead>
  <tbody>${weeks.map(week => h`<tr>${week.map(d => d == null
    ? raw('<td></td>')
    : h`<td data-date="${year}-${pad2(month)}-${pad2(d)}"${d === day ? raw(' class="is-event"') : ''}><span>${d}</span></td>`)}</tr>`)}</tbody>
</table>`;
}

export function googleCalendarUrl({ title, event, details }) {
  const params = new URLSearchParams({ action: 'TEMPLATE', text: title, dates: `${utcStamp(event.start)}/${utcStamp(event.end ?? event.start)}`, details, location: event.place ?? '', ctz: 'Asia/Seoul' });
  return `https://calendar.google.com/calendar/render?${params}`;
}

// 캘린더 파일(.ics, RFC 5545). 아이폰·아웃룩 캘린더에서 열려요.
const icsText = value => String(value).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const bytes = text => new TextEncoder().encode(text).length;
// 75바이트가 넘는 줄은 접습니다. 한글이 중간에 잘리지 않도록 글자 단위로 셉니다.
function fold(line) {
  const out = [];
  let current = '';
  for (const ch of line) {
    if (bytes(current + ch) > (out.length ? 74 : 75)) { out.push(current); current = ''; }
    current += ch;
  }
  out.push(current);
  return out.join('\r\n ');
}
export function icsFile({ uid, title, event, details, url, now }) {
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//OpenAI Student Collective SNU//Portal//KO', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT', `UID:${uid}`, `DTSTAMP:${utcStamp(now)}`, `DTSTART:${utcStamp(event.start)}`, `DTEND:${utcStamp(event.end ?? event.start)}`,
    `SUMMARY:${icsText(title)}`, event.place ? `LOCATION:${icsText(event.place)}` : null, `DESCRIPTION:${icsText(details)}`, `URL:${url}`,
    'END:VEVENT', 'END:VCALENDAR'
  ].filter(Boolean).map(fold).join('\r\n') + '\r\n';
}

// 지도: 홈에는 Google 지도를 넣고, 많이 쓰는 지도 앱 링크를 함께 줍니다.
export function mapLinks(query) {
  const q = encodeURIComponent(query);
  return {
    embed: `https://www.google.com/maps?q=${q}&hl=ko&z=16&output=embed`,
    naver: `https://map.naver.com/p/search/${q}`,
    kakao: `https://map.kakao.com/link/search/${q}`,
    google: `https://www.google.com/maps/search/?api=1&query=${q}`
  };
}
