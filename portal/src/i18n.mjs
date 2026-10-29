// 영어 페이지(/en/…): 한국어로 만든 페이지 HTML의 글자만 content/en.mjs 사전으로 바꿉니다.
// - 글 조각(태그 사이 글, alt·aria-label·title·설명 meta)을 통째로 사전에서 찾고, 없으면 날짜 규칙과 ' · ' 단위로 다시 찾습니다.
// - 사전에 없는 글은 한국어 그대로 둡니다. build가 남은 한국어 조각 수를 알려 줍니다.
// - 영어 페이지가 있는 주소로 가는 링크는 /en/…으로 바꾸고, 수업 듣기(/learn/)는 한국어 화면으로 그대로 이어집니다.

const HANGUL = /[가-힣]/;
const decode = text => text.replace(/&(amp|lt|gt|quot|#39);/g, (_, e) => ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'" })[e]);
const encode = text => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const WEEKDAY = { 일: 'Sun', 월: 'Mon', 화: 'Tue', 수: 'Wed', 목: 'Thu', 금: 'Fri', 토: 'Sat' };
const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// 날짜·시간 표기: 페이지 곳곳에 같은 형식으로 나옵니다.
const DATE_RULES = [
  // 2026년 11월 2일 (월) 18:00–19:00
  [/(\d{4})년 (\d{1,2})월 (\d{1,2})일 \(([일월화수목금토])\)/g, (_, y, m, d, w) => `${WEEKDAY[w]}, ${MONTH[m - 1]} ${d}, ${y}`],
  // 2026년 11월 (달력 제목)
  [/^(\d{4})년 (\d{1,2})월$/g, (_, y, m) => `${MONTH_LONG[m - 1]} ${y}`],
  // 10월 – 11월 / 11월
  [/^(\d{1,2})월 – (\d{1,2})월$/g, (_, a, b) => `${MONTH_LONG[a - 1]} – ${MONTH_LONG[b - 1]}`],
  // 11/2 (월)
  [/(\d{1,2})\/(\d{1,2}) \(([일월화수목금토])\)/g, (_, m, d, w) => `${WEEKDAY[w]} ${m}/${d}`]
];

export function createTranslator(dictionary) {
  const { text: exact = {}, rules = [] } = dictionary;
  const left = new Set();

  // 한 조각: 사전 → 날짜·문장 규칙 → 다시 사전
  function one(raw) {
    if (!HANGUL.test(raw) || exact[raw] != null) return exact[raw] ?? raw;
    let out = raw;
    for (const [re, to] of [...DATE_RULES, ...rules]) out = out.replace(re, to);
    return exact[out] ?? out;
  }

  // 'A · B'나 'A — B'처럼 이어 붙인 글은 나눠서 각각 바꿉니다.
  function piece(raw) {
    if (exact[raw] != null) return exact[raw]; // 사전에 그대로 두라고 적은 글(예: '한국어')도 여기서 끝
    let out = one(raw);
    if (HANGUL.test(out)) out = out.split(' — ').map(part => part.split(' · ').map(p => one(p)).join(' · ')).join(' — ');
    if (HANGUL.test(out)) left.add(raw);
    return out;
  }

  // 앞뒤 공백은 그대로 두고 가운데 글만 바꿉니다.
  function text(value) {
    const plain = decode(value);
    const match = plain.match(/^(\s*)([\s\S]*?)(\s*)$/);
    if (!match[2] || !HANGUL.test(match[2])) return value;
    return encode(match[1] + piece(match[2].replace(/\s+/g, ' ')) + match[3]);
  }

  return { text, piece, left };
}

// enPaths: 영어 페이지가 있는 주소(예: '/', '/roadmap/'). 이 주소로 가는 링크만 /en/을 붙입니다.
export function localizeHtml(html, translator, enPaths) {
  const keep = [];
  const hold = block => `\u0000${keep.push(block) - 1}\u0000`;
  let out = html.replace(/<(script|style)\b[\s\S]*?<\/\1>/g, hold);
  // 복사해서 쓰는 요청문(copy-block)은 Codex에 그대로 보내는 글이라 바꾸지 않습니다.
  out = out.replace(/<pre\b[\s\S]*?<\/pre>/g, hold);
  out = out.replace(/>([^<]+)</g, (_, t) => `>${translator.text(t)}<`);
  out = out.replace(/\b(alt|aria-label|title|placeholder)="([^"]*)"/g, (_, name, value) => `${name}="${translator.text(value)}"`);
  out = out.replace(/(<meta (?:name="description"|property="og:(?:title|description|image:alt)") content=")([^"]*)"/g, (_, start, value) => `${start}${translator.text(value)}"`);
  out = out.replace(/<a\b[^>]*>/g, tag => tag.includes('data-lang-switch') ? tag
    : tag.replace(/\bhref="(\/[^"#?]*)([^"]*)"/, (whole, target, rest) => enPaths.has(target) ? `href="/en${target}${rest}"` : whole));
  return out.replace(/\u0000(\d+)\u0000/g, (_, i) => keep[i]);
}
