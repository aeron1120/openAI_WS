// 중앙 관리 화면. 밝은 표·폼 중심이며 전시용 움직임은 쓰지 않습니다.
// 폼은 content.mjs의 필드 정의로 그리고, 저장은 /assets/manage.js가 API로 보냅니다(서버 응답 뒤에만 '저장됨' 표시).
import { attr, esc, localInput, when } from '../format.mjs';
import { CAMPUS_KINDS, CAMPUS_STATUS, EVENT_TYPES, KINDS, emptyData } from '../content.mjs';
import { campusScope, GLOBAL_SCOPE } from '../publish.mjs';
import { eventState } from '../states.mjs';

const FONT = 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css';

function shell(actx, { title, body, campus = null, crumbs = [], preview = null }) {
  const nav = [['/manage/', '전체 현황'], ['/manage/campuses/', '학교 관리'], ['/manage/materials/', '자료 관리'], ['/manage/home/', '통합 메인'], ['/manage/publish/', '게시'], ['/manage/history/', '변경 기록'], ['/manage/learning/', '학습 운영 연결']];
  const current = nav.filter(([href]) => actx.path.startsWith(href)).sort((a, b) => b[0].length - a[0].length)[0]?.[0];
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<meta name="cms-csrf" content="${attr(actx.session.csrf)}">
<title>${esc(title)} · 중앙 관리</title>
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="${FONT}">
<link rel="stylesheet" href="/assets/manage.css">
<script src="/assets/manage.js" defer></script>
</head>
<body>
<a class="skip" href="#main">본문으로 건너뛰기</a>
<header class="m-top">
  <div class="m-top-row">
    <a class="m-brand" href="/manage/">Student Collective <span>중앙 관리</span></a>
    ${actx.mode === 'local' ? '<span class="m-pill m-pill-warn" title="파일에 저장하는 로컬 개발 모드">로컬 모드</span>' : ''}
    <span class="m-dirty" data-dirty-indicator hidden>저장하지 않은 변경 있음</span>
    <span class="m-spacer"></span>
    ${preview ? `<a class="m-btn m-btn-ghost" href="${attr(preview)}" target="_blank" rel="noopener">미리보기<span class="sr-only"> (새 창)</span></a>` : ''}
    <span class="m-user">${esc(actx.session.email)}</span>
    <form method="post" action="/manage/logout/" class="m-inline"><button class="m-btn m-btn-ghost" type="submit">로그아웃</button></form>
  </div>
  <nav class="m-nav" aria-label="관리 메뉴"><ul>${nav.map(([href, label]) => `<li><a href="${href}"${href === current ? ' aria-current="page"' : ''}>${label}</a></li>`).join('')}</ul></nav>
  ${campus ? `<div class="m-scope">편집 범위: <strong>${esc(campus.data.name)}</strong> <span class="m-muted">(학교 선택은 편집 범위일 뿐 권한이 아니에요)</span></div>` : ''}
</header>
<main id="main" class="m-main" tabindex="-1">
${crumbs.length ? `<nav class="m-crumbs" aria-label="위치"><ol>${crumbs.map(([href, label]) => `<li>${href ? `<a href="${attr(href)}">${esc(label)}</a>` : esc(label)}</li>`).join('')}</ol></nav>` : ''}
<div class="m-status" role="status" aria-live="polite" data-status></div>
${body}
</main>
</body>
</html>`;
}

const scopeOf = item => item.campusId ? campusScope(item.campusId) : GLOBAL_SCOPE;
const titleOf = item => item.data.title ?? item.data.name ?? item.data.version ?? (item.kind === 'home' ? '통합 메인' : item.id);
const pill = (text, tone = '') => `<span class="m-pill${tone ? ` m-pill-${tone}` : ''}">${esc(text)}</span>`;

// 공개본과 초안이 다른 대상(게시하지 않은 변경)
async function pendingScopes(store) {
  const active = new Map((await store.activeReleases()).map(release => [release.scope, release]));
  const items = await store.listItems();
  const scopes = new Map();
  for (const item of items) {
    if (['material', 'material_version'].includes(item.kind)) continue;
    const scope = scopeOf(item);
    const release = active.get(scope);
    if (!release || release.itemRevisions?.[item.id] !== item.revision) scopes.set(scope, (scopes.get(scope) ?? 0) + 1);
  }
  // 초안에서 빠진 항목은 없으므로(삭제 없음) 위 비교로 충분합니다.
  return { scopes, active };
}

export async function dashboard(actx) {
  const { store, now } = actx;
  const { scopes, active } = await pendingScopes(store);
  const campuses = await store.listItems({ kind: 'campus' });
  const names = new Map(campuses.map(item => [campusScope(item.id), item.data.name]));
  const live = [...active.values()].filter(release => release.scope.startsWith('campus:'));
  const upcoming = live.flatMap(release => release.snapshot.events.filter(event => ['upcoming', 'ongoing'].includes(eventState(event, now))).map(event => ({ event, campus: release.snapshot.campus })))
    .sort((a, b) => Date.parse(a.event.start) - Date.parse(b.event.start)).slice(0, 6);
  const versions = (await store.listItems({ kind: 'material_version' })).filter(item => Date.parse(item.data.publicAt) > now).sort((a, b) => a.data.publicAt.localeCompare(b.data.publicAt));
  const body = `<h1>전체 현황</h1>
<div class="m-cards">
  <section class="m-card"><h2>공개 중인 학교</h2><p class="m-big">${live.filter(release => ['active', 'preparing', 'paused'].includes(release.snapshot.campus.status)).length}</p><p class="m-muted">게시본 기준 · 전체 학교 ${campuses.length}곳</p><a href="/manage/campuses/">학교 관리</a></section>
  <section class="m-card"><h2>게시하지 않은 변경</h2>${scopes.size ? `<ul>${[...scopes].map(([scope, count]) => `<li>${esc(scope === GLOBAL_SCOPE ? '통합 메인' : names.get(scope) ?? scope)} · ${count}개 항목 <a href="/manage/publish/?scope=${attr(scope)}">게시 준비</a></li>`).join('')}</ul>` : '<p class="m-muted">모든 초안이 공개본과 같아요.</p>'}</section>
  <section class="m-card"><h2>가까운 행사</h2>${upcoming.length ? `<ul>${upcoming.map(({ event, campus }) => `<li>${esc(when(event.start))} · ${esc(campus.name)} · ${esc(event.title)}</li>`).join('')}</ul>` : '<p class="m-muted">게시된 예정 행사가 없어요.</p>'}</section>
  <section class="m-card"><h2>자료 공개 예정</h2>${versions.length ? `<ul>${versions.slice(0, 6).map(item => `<li>${esc(when(item.data.publicAt))} · <a href="/manage/items/${attr(item.id)}/">${esc(item.data.version)}</a></li>`).join('')}</ul>` : '<p class="m-muted">예약된 자료가 없어요.</p>'}</section>
</div>`;
  return shell(actx, { title: '전체 현황', body, preview: '/manage/preview/' });
}

export async function campusList(actx) {
  const { store } = actx;
  const campuses = await store.listItems({ kind: 'campus' });
  const active = new Map((await store.activeReleases()).map(release => [release.scope, release]));
  const rows = campuses.map(item => {
    const release = active.get(campusScope(item.id));
    return `<tr><td><a href="/manage/campuses/${attr(item.id)}/">${esc(item.data.name)}</a>${item.data.fixture ? ` ${pill('시험용', 'warn')}` : ''}</td><td><code>/campuses/${esc(item.data.slug)}/</code></td><td>${esc(CAMPUS_STATUS[item.data.status])}</td><td>${release ? `${release.number}번 게시본 · ${esc(CAMPUS_STATUS[release.snapshot.campus.status])}` : pill('게시 전')}</td></tr>`;
  }).join('');
  const body = `<h1>학교 관리</h1>
<table class="m-table"><caption class="sr-only">학교 목록</caption><thead><tr><th scope="col">학교</th><th scope="col">주소</th><th scope="col">초안 상태</th><th scope="col">공개본</th></tr></thead><tbody>${rows || '<tr><td colspan="4">아직 학교가 없어요.</td></tr>'}</tbody></table>
<section class="m-panel" aria-labelledby="add-campus">
  <h2 id="add-campus">학교 추가</h2>
  <p class="m-muted">기본 구성은 화면과 빈 콘텐츠 구조, 선택한 학교의 일정 틀(제목·유형·자료 연결)만 복사해요. 날짜·장소·신청 링크, 학생·진도·질문, 신청 폼·채팅방·연락처는 복사하지 않아요. 새 학교는 ‘초안’ 상태로 만들어지고, 게시하기 전에는 공개되지 않아요.</p>
  <form class="m-form" data-campus-form>
    <div class="m-field"><label for="nc-name">학교 이름</label><input id="nc-name" name="name" required maxlength="60"></div>
    <div class="m-field"><label for="nc-slug">주소 이름 (영문 소문자·숫자·-)</label><input id="nc-slug" name="slug" required pattern="[a-z0-9][a-z0-9\\-]{0,38}[a-z0-9]" maxlength="40"><p class="m-hint">/campuses/<주소 이름>/ — 공개한 뒤에는 바꾸지 마세요.</p></div>
    <div class="m-field"><label for="nc-short">짧은 이름</label><input id="nc-short" name="shortName" maxlength="20"></div>
    <div class="m-field"><label for="nc-term">첫 학기 이름</label><input id="nc-term" name="termName" required maxlength="40" value="2026년 2학기"></div>
    <div class="m-field"><label for="nc-intro">짧은 소개</label><textarea id="nc-intro" name="intro" maxlength="400" rows="2"></textarea></div>
    <div class="m-field"><label for="nc-template">기본 구성 불러오기</label><select id="nc-template" name="templateCampusId"><option value="">빈 구성으로 시작</option>${campuses.map(item => `<option value="${attr(item.id)}">${esc(item.data.name)}의 현재 학기 일정 틀</option>`).join('')}</select></div>
    <div class="m-field m-check"><input id="nc-fixture" name="fixture" type="checkbox"><label for="nc-fixture">시험용 학교 (로컬·미리보기 전용, 실제 사이트에 게시 안 됨)</label></div>
    <p><button class="m-btn" type="submit">학교 만들기</button></p>
  </form>
</section>`;
  return shell(actx, { title: '학교 관리', body, crumbs: [[null, '학교 관리']], preview: '/manage/preview/campuses/' });
}

export async function campusDetail(actx, campus) {
  const { store } = actx;
  const items = await store.listItems({ campusId: campus.id });
  const of = kind => items.filter(item => item.kind === kind);
  const terms = of('term');
  const termName = id => terms.find(term => term.id === id)?.data.name ?? '학기 없음';
  const release = (await store.activeReleases()).find(item => item.scope === campusScope(campus.id));
  const changed = !release || [campus, ...items].some(item => release.itemRevisions?.[item.id] !== item.revision);
  const table = (kind, columns, rows) => `<section class="m-panel" aria-labelledby="sec-${kind}">
  <div class="m-panel-head"><h2 id="sec-${kind}">${KINDS[kind].label}</h2><a class="m-btn m-btn-sm" href="/manage/new/${kind}/?campus=${attr(campus.id)}">${KINDS[kind].label} 추가</a></div>
  ${rows.length ? `<table class="m-table"><thead><tr>${columns.map(col => `<th scope="col">${col}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table>` : '<p class="m-muted">아직 없어요.</p>'}
</section>`;
  const events = of('event').sort((a, b) => (a.data.order ?? 999) - (b.data.order ?? 999));
  const body = `<div class="m-panel-head"><h1>${esc(campus.data.name)}</h1>
  <p class="m-actions"><a class="m-btn m-btn-ghost" href="/manage/items/${attr(campus.id)}/">학교 정보 수정</a><a class="m-btn" href="/manage/publish/?scope=${attr(campusScope(campus.id))}">${esc(campus.data.shortName || campus.data.name)}에 게시</a></p></div>
<p>${pill(CAMPUS_STATUS[campus.data.status])} ${campus.data.fixture ? pill('시험용', 'warn') : ''} ${release ? pill(`공개본 ${release.number}번 · ${when(release.createdAt)}`) : pill('아직 게시 안 함', 'warn')} ${changed ? pill('게시하지 않은 변경 있음', 'warn') : pill('초안 = 공개본', 'ok')}</p>
${campus.data.externalUrl
    ? `<p class="m-status-box">이 학교는 학교 사이트(<a href="${attr(campus.data.externalUrl)}" target="_blank" rel="noopener noreferrer">${esc(campus.data.externalUrl)}</a>)로 바로 연결돼요. 학교 목록·카드만 여기서 관리하고, 일정·공지는 그 사이트에서 고쳐요. 아래 일정·공지는 공개 화면에 나오지 않아요.</p>`
    : `<p class="m-muted">현재 학기: ${esc(termName(campus.data.currentTermId))} · 공개 주소 <code>/campuses/${esc(campus.data.slug)}/</code></p>`}
${table('term', ['학기', '기간'], terms.map(item => `<tr><td><a href="/manage/items/${attr(item.id)}/">${esc(item.data.name)}</a>${item.id === campus.data.currentTermId ? ` ${pill('현재', 'ok')}` : ''}</td><td>${esc(item.data.startsOn ?? '')} ~ ${esc(item.data.endsOn ?? '')}</td></tr>`))}
${table('event', ['순서', '일정', '학기', '상태', '공개'], events.map(item => `<tr><td>${esc(item.data.order ?? '')}</td><td><a href="/manage/items/${attr(item.id)}/">${esc(item.data.title)}</a> <span class="m-muted">${esc(EVENT_TYPES[item.data.type])}</span></td><td>${esc(termName(item.data.termId))}</td><td>${item.data.status === 'cancelled' ? pill('취소', 'danger') : item.data.start ? esc(when(item.data.start)) : pill('준비 중')} ${item.data.openToOthers ? pill('학교 간 공개') : ''}</td><td>${item.data.visible ? pill('표시', 'ok') : pill('숨김')}</td></tr>`))}
${table('notice', ['공지', '고정', '공개'], of('notice').map(item => `<tr><td><a href="/manage/items/${attr(item.id)}/">${esc(item.data.title)}</a></td><td>${item.data.pinned ? '고정' : ''}</td><td>${item.data.visible ? pill('표시', 'ok') : pill('숨김')}</td></tr>`))}
${table('project', ['프로젝트', '구분', '동의', '공개'], of('project').map(item => `<tr><td><a href="/manage/items/${attr(item.id)}/">${esc(item.data.title)}</a></td><td>${item.data.kind === 'student' ? '학생' : '운영진 예제'}</td><td>${item.data.kind === 'student' ? (item.data.consentConfirmed ? pill('확인', 'ok') : pill('미확인', 'warn')) : '-'}</td><td>${item.data.visible ? pill('표시', 'ok') : pill('숨김')}${item.data.featured ? ` ${pill('메인 추천 후보')}` : ''}</td></tr>`))}
<p class="m-muted">학교를 보관하려면 학교 정보에서 운영 상태를 ‘보관’으로 바꾸고 게시하세요. 보관해도 학기·콘텐츠·게시 이력은 남아요. 영구 삭제는 지원하지 않아요.</p>`;
  return shell(actx, { title: campus.data.name, body, campus, crumbs: [['/manage/campuses/', '학교 관리'], [null, campus.data.name]], preview: `/manage/preview/campuses/${campus.data.slug}/` });
}

// ---------- 폼 ----------
async function refOptions(store, field, campusId) {
  if (field.refKind === 'term') return (await store.listItems({ kind: 'term', campusId })).map(item => [item.id, item.data.name]);
  if (field.refKind === 'material') return (await store.listItems({ kind: 'material' })).map(item => [item.id, item.data.title]);
  if (field.refKind === 'campus') return (await store.listItems({ kind: 'campus' })).map(item => [item.id, `${item.data.name}${item.data.status === 'active' ? '' : ` (${CAMPUS_STATUS[item.data.status]})`}`]);
  const campusNames = new Map((await store.listItems({ kind: 'campus' })).map(item => [item.id, item.data.shortName || item.data.name]));
  return (await store.listItems({ kind: field.refKind })).map(item => [item.id, `${campusNames.get(item.campusId) ?? ''} · ${item.data.title}${item.data.visible ? '' : ' (숨김)'}`]);
}

async function versionOptions(store, now) {
  const materials = new Map((await store.listItems({ kind: 'material' })).map(item => [item.id, item.data.title]));
  return (await store.listItems({ kind: 'material_version' })).map(item => ({ id: item.id, label: `${materials.get(item.data.materialId) ?? '자료'} · ${item.data.version}`, publicAt: item.data.publicAt, isPublic: Date.parse(item.data.publicAt) <= now }));
}

async function fieldHtml(actx, field, value, { campusId, existing }) {
  const id = `f-${field.name}`;
  const locked = existing && field.locked;
  const lockedPublicAt = existing && field.name === 'publicAt' && Date.parse(value) <= actx.now;
  const disabled = locked || lockedPublicAt ? ' disabled' : '';
  const required = field.required && !disabled ? ' required' : '';
  const hint = field.hint ? `<p class="m-hint" id="${id}-hint">${esc(field.hint)}</p>` : '';
  const described = field.hint ? ` aria-describedby="${id}-hint"` : '';
  const common = `id="${id}" name="${attr(field.name)}" data-type="${field.type}"${described}${disabled}${required}`;
  const label = `<label for="${id}">${esc(field.label)}${field.required ? ' <span class="m-req">(필수)</span>' : ''}</label>`;
  const lockNote = locked ? '<p class="m-hint">버전 내용은 만든 뒤 바꿀 수 없어요. 고치려면 새 버전을 만드세요.</p>' : lockedPublicAt ? '<p class="m-hint">이미 전체 공개된 자료라 공개 시각을 바꿀 수 없어요.</p>' : '';
  switch (field.type) {
    case 'text': case 'slug':
      return `<div class="m-field">${label}<input ${common} value="${attr(value ?? '')}"${field.max ? ` maxlength="${field.max}"` : ''}>${hint}${lockNote}</div>`;
    case 'url':
      return `<div class="m-field">${label}<input ${common} inputmode="url" placeholder="https://" value="${attr(value ?? '')}">${hint}${lockNote}</div>`;
    case 'textarea': case 'rich':
      return `<div class="m-field">${label}<textarea ${common} rows="${field.type === 'rich' ? 8 : 3}" maxlength="${field.max}">${esc(value ?? '')}</textarea>${field.type === 'rich' ? '<p class="m-hint">빈 줄 = 문단, ‘- ’ = 목록, **굵게**, [글자](https://주소). HTML은 글자로 보여요.</p>' : ''}${hint}${lockNote}</div>`;
    case 'number':
      return `<div class="m-field">${label}<input ${common} type="number" min="${field.min}" max="${field.max}" step="1" value="${attr(value ?? '')}">${hint}</div>`;
    case 'bool':
      return `<div class="m-field m-check"><input ${common} type="checkbox"${value ? ' checked' : ''}><label for="${id}">${esc(field.label)}</label>${hint}</div>`;
    case 'datetime':
      return `<div class="m-field">${label}<input ${common} type="datetime-local" value="${attr(localInput(value))}"><p class="m-hint">한국 시간(KST) 기준</p>${hint}${lockNote}</div>`;
    case 'date':
      return `<div class="m-field">${label}<input ${common} type="date" value="${attr(value ?? '')}">${hint}</div>`;
    case 'select':
      return `<div class="m-field">${label}<select ${common}>${field.required ? '' : '<option value="">선택 안 함</option>'}${Object.entries(field.options).map(([key, text]) => `<option value="${attr(key)}"${key === value ? ' selected' : ''}>${esc(text)}</option>`).join('')}</select>${hint}</div>`;
    case 'ref': {
      const options = await refOptions(actx.store, field, campusId);
      return `<div class="m-field">${label}<select ${common}>${field.required ? '' : '<option value="">선택 안 함</option>'}${options.map(([key, text]) => `<option value="${attr(key)}"${key === value ? ' selected' : ''}>${esc(text)}</option>`).join('')}</select>${!options.length ? `<p class="m-hint">먼저 ${field.refKind === 'term' ? '학기를' : '항목을'} 만들어 주세요.</p>` : ''}${hint}${lockNote}</div>`;
    }
    case 'refs': {
      const options = await refOptions(actx.store, field, campusId);
      const order = new Map((value ?? []).map((key, index) => [key, index + 1]));
      return `<fieldset class="m-field m-refs" ${`data-name="${attr(field.name)}" data-type="refs"`}><legend>${esc(field.label)}</legend>${options.length ? options.map(([key, text]) => `<div class="m-ref-row"><input type="checkbox" id="${id}-${attr(key)}" value="${attr(key)}"${order.has(key) ? ' checked' : ''}><label for="${id}-${attr(key)}">${esc(text)}</label><label class="m-order">순서 <input type="number" min="1" max="99" value="${order.get(key) ?? ''}" aria-label="${attr(text)} 순서"></label></div>`).join('') : '<p class="m-hint">고를 항목이 아직 없어요.</p>'}<p class="m-hint">체크한 항목만 순서대로 보여줘요. 숨김·보관되거나 게시되지 않은 항목은 공개 화면에서 자동으로 빠져요.</p></fieldset>`;
    }
    case 'list':
      return `<div class="m-field">${label}<textarea ${common} rows="4">${esc((value ?? []).join('\n'))}</textarea><p class="m-hint">한 줄에 하나씩</p>${hint}</div>`;
    case 'media': {
      const info = value ? await actx.store.getMediaInfo(value) : null;
      const accept = field.pdf ? 'image/png,image/jpeg,image/webp,application/pdf' : 'image/png,image/jpeg,image/webp';
      return `<div class="m-field m-media" data-media-field>${label}
  <input type="hidden" ${common} value="${attr(value ?? '')}">
  <div class="m-media-current" data-media-current>${info ? (info.mime.startsWith('image/') ? `<img src="/media/${attr(info.id)}" alt="" width="160" height="100">` : '') + `<span>${esc(info.filename || info.id)}</span>` : '<span class="m-muted">없음</span>'}</div>
  ${disabled ? '' : `<input type="file" accept="${accept}" data-media-upload aria-label="${attr(field.label)} 파일 고르기"><button type="button" class="m-btn m-btn-ghost m-btn-sm" data-media-clear>비우기</button><p class="m-hint">${field.pdf ? 'PDF 25MB, ' : ''}이미지 10MB까지. 올린 파일은 게시 전에는 공개되지 않아요.</p>`}${lockNote}
</div>`;
    }
    case 'materials': {
      const versions = await versionOptions(actx.store, actx.now);
      const row = link => `<div class="m-mat-row" data-mat-row>
    <label>자료 버전<select data-mat="versionId">${versions.map(option => `<option value="${attr(option.id)}" data-public="${option.isPublic}"${option.id === link.versionId ? ' selected' : ''}>${esc(option.label)}${option.isPublic ? ' (이미 공개됨)' : ` (${esc(when(option.publicAt))} 공개)`}</option>`).join('')}</select></label>
    <label>이 학교 화면 노출 시점 (비우면 자료 공개와 함께)<input type="datetime-local" data-mat="exposeAt" value="${attr(localInput(link.exposeAt))}"></label>
    <label>메모<input data-mat="note" maxlength="200" value="${attr(link.note ?? '')}"></label>
    <p class="m-hint" data-mat-public-note hidden>이미 공개된 자료 · 학교별 일정은 노출 시점에만 적용돼요.</p>
    <button type="button" class="m-btn m-btn-ghost m-btn-sm" data-mat-remove>연결 빼기</button>
  </div>`;
      return `<fieldset class="m-field m-materials" data-name="materials" data-type="materials"><legend>${esc(field.label)}</legend>
  <p class="m-hint">자료 자체의 전체 공개 시점은 <a href="/manage/materials/">자료 관리</a>에서 정해요. 여기서는 이 학교 화면에 소개할 시점만 정하고, 전체 공개 시점보다 빠를 수 없어요.</p>
  <div data-mat-list>${(value ?? []).map(row).join('')}</div>
  ${versions.length ? `<template data-mat-template>${row({})}</template><button type="button" class="m-btn m-btn-ghost m-btn-sm" data-mat-add>자료 연결 추가</button>` : '<p class="m-hint">연결할 자료 버전이 아직 없어요.</p>'}
</fieldset>`;
    }
    default: return '';
  }
}

async function form(actx, kind, data, { item = null, campusId = null }) {
  const fields = [];
  for (const field of KINDS[kind].fields) fields.push(await fieldHtml(actx, field, data[field.name], { campusId, existing: Boolean(item) }));
  const scope = campusId ? campusScope(campusId) : GLOBAL_SCOPE;
  const publishLabel = kind === 'material' || kind === 'material_version' ? '' : `<a class="m-btn m-btn-ghost" href="/manage/publish/?scope=${attr(scope)}">게시 준비</a>`;
  return `<form class="m-form" data-item-form data-kind="${attr(kind)}"${item ? ` data-id="${attr(item.id)}" data-revision="${item.revision}"` : ''}${campusId ? ` data-campus="${attr(campusId)}"` : ''} novalidate>
  ${fields.join('\n')}
  <div class="m-form-actions">
    <button class="m-btn" type="submit">${item ? '초안 저장' : '만들기'}</button>
    ${item ? publishLabel : ''}
    <span class="m-save-state" data-save-state>${item ? `마지막 저장 ${esc(when(item.updatedAt))} · ${esc(item.updatedBy)} · 수정 ${item.revision}번째` : ''}</span>
  </div>
  <p class="m-hint">${kind === 'material_version' ? '자료 버전과 공개 시각은 저장하면 바로 적용돼요(학교 화면 노출은 각 학교 게시 후).' : kind === 'material' ? '자료 이름·설명은 저장하면 바로 적용돼요.' : '저장해도 공개 사이트는 바뀌지 않아요. 게시해야 반영돼요.'}</p>
</form>`;
}

function previewPath(item, campus) {
  if (!campus) return item.kind === 'home' ? '/manage/preview/' : item.kind === 'material_version' ? `/manage/preview/materials/${item.id}/` : null;
  const base = `/manage/preview/campuses/${campus.data.slug}/`;
  if (item.kind === 'event') return `${base}workshops/${item.id}/`;
  if (item.kind === 'notice') return `${base}notices/${item.id}/`;
  if (item.kind === 'project') return `/manage/preview/projects/${item.id}/`;
  return base;
}

export async function itemEditor(actx, item) {
  const campus = item.campusId ? await actx.store.getItem(item.campusId) : null;
  const crumbs = campus ? [['/manage/campuses/', '학교 관리'], [`/manage/campuses/${campus.id}/`, campus.data.name], [null, titleOf(item)]]
    : item.kind === 'home' ? [[null, '통합 메인']] : [['/manage/materials/', '자료 관리'], [null, titleOf(item)]];
  const body = `<h1>${esc(KINDS[item.kind].label)} · ${esc(titleOf(item))}</h1>
${item.kind === 'campus' ? '<p class="m-hint">운영 상태가 ‘초안’·‘보관’이면 게시해도 공개 목록과 학교 주소에 나타나지 않아요.</p>' : ''}
${await form(actx, item.kind, item.data, { item, campusId: item.kind === 'campus' ? item.id : item.campusId })}`;
  return shell(actx, { title: titleOf(item), body, campus: campus ?? null, crumbs, preview: previewPath(item, campus) });
}

export async function itemCreator(actx, kind, campusId, preset = {}) {
  const campus = campusId ? await actx.store.getItem(campusId) : null;
  const data = { ...emptyData(kind), ...preset };
  if (campus && KINDS[kind].fields.some(field => field.name === 'termId')) data.termId = campus.data.currentTermId;
  if (kind === 'home') Object.assign(data, { heroEyebrow: 'OpenAI Student Collective', heroTitle: '아이디어가 시작되는 곳,\n우리 캠퍼스.', heroLead: '함께 배우고, 직접 만들고, 서로의 결과물을 나눕니다.' });
  const crumbs = campus ? [['/manage/campuses/', '학교 관리'], [`/manage/campuses/${campus.id}/`, campus.data.name], [null, `새 ${KINDS[kind].label}`]] : [[null, `새 ${KINDS[kind].label}`]];
  const body = `<h1>새 ${esc(KINDS[kind].label)}</h1>${await form(actx, kind, data, { campusId })}`;
  return shell(actx, { title: `새 ${KINDS[kind].label}`, body, campus, crumbs });
}

export async function materials(actx) {
  const { store, now } = actx;
  const list = await store.listItems({ kind: 'material' });
  const versions = await store.listItems({ kind: 'material_version' });
  const events = await store.listItems({ kind: 'event' });
  const campuses = new Map((await store.listItems({ kind: 'campus' })).map(item => [item.id, item.data.shortName || item.data.name]));
  const usage = versionId => events.filter(event => event.data.materials.some(link => link.versionId === versionId)).map(event => `${campuses.get(event.campusId)} · ${event.data.title}`);
  const body = `<div class="m-panel-head"><h1>자료 관리</h1><a class="m-btn" href="/manage/new/material/">공통 자료 추가</a></div>
<p class="m-hint">공통 자료는 버전으로 고정해요. 새 버전을 만들어도 진행 중인 학교 수업은 바뀌지 않고, 각 학교 일정에서 새 버전을 골라 게시해야 바뀌어요.</p>
<p class="m-hint">‘자료 전체 공개 시각’ 전에는 본문·파일을 직접 주소나 API로도 받을 수 없어요. 한 번 전체 공개된 자료는 모든 학교에 공개된 자료예요. 학교별 일정은 그 학교 화면에 소개하는 시점만 정해요.</p>
${list.length ? list.map(material => {
    const own = versions.filter(version => version.data.materialId === material.id);
    return `<section class="m-panel"><div class="m-panel-head"><h2><a href="/manage/items/${attr(material.id)}/">${esc(material.data.title)}</a></h2><a class="m-btn m-btn-sm" href="/manage/new/material_version/?material=${attr(material.id)}">새 버전</a></div>
  ${own.length ? `<table class="m-table"><thead><tr><th scope="col">버전</th><th scope="col">전체 공개</th><th scope="col">사용하는 학교 일정</th></tr></thead><tbody>${own.map(version => `<tr><td><a href="/manage/items/${attr(version.id)}/">${esc(version.data.version)}</a></td><td>${Date.parse(version.data.publicAt) <= now ? pill(`공개됨 · ${when(version.data.publicAt)}`, 'ok') : pill(`${when(version.data.publicAt)} 공개 예정`, 'warn')}</td><td>${usage(version.id).map(esc).join('<br>') || '<span class="m-muted">없음</span>'}</td></tr>`).join('')}</tbody></table>` : '<p class="m-muted">버전이 없어요.</p>'}
</section>`;
  }).join('') : '<p class="m-muted">아직 공통 자료가 없어요.</p>'}`;
  return shell(actx, { title: '자료 관리', body, crumbs: [[null, '자료 관리']] });
}

export async function publishPage(actx, selected) {
  const { store } = actx;
  const campuses = await store.listItems({ kind: 'campus' });
  const { scopes } = await pendingScopes(store);
  const option = (scope, label, extra = '') => `<div class="m-check"><input type="checkbox" id="p-${attr(scope)}" name="scope" value="${attr(scope)}"${selected.includes(scope) ? ' checked' : ''}><label for="p-${attr(scope)}">${esc(label)}${scopes.has(scope) ? ` ${pill('변경 있음', 'warn')}` : ''}${extra}</label></div>`;
  const body = `<h1>게시</h1>
<p class="m-hint">게시할 대상을 직접 골라요. 목록에 보이는 학교가 자동으로 함께 게시되지 않아요. 여러 곳을 고르면 모두 검증한 뒤 한 번에 반영하고, 하나라도 문제가 있으면 아무것도 바뀌지 않아요.</p>
<form class="m-panel" data-publish-form>
  <fieldset><legend>게시 대상</legend>
    ${option(GLOBAL_SCOPE, '통합 메인')}
    ${campuses.map(item => option(campusScope(item.id), item.data.name, item.data.fixture ? ` ${pill('시험용', 'warn')}` : '')).join('')}
  </fieldset>
  <p><button class="m-btn m-btn-ghost" type="submit" data-plan-button>변경 내용 확인</button></p>
</form>
<section class="m-panel" data-plan hidden aria-live="polite"></section>`;
  return shell(actx, { title: '게시', body, crumbs: [[null, '게시']], preview: '/manage/preview/' });
}

export async function history(actx) {
  const { store } = actx;
  const releases = await store.listReleases();
  const active = new Set((await store.activeReleases()).map(release => release.id));
  const audit = await store.listAudit({ limit: 80 });
  const ACTION = { publish: '게시', restore: '복원', save: '초안 저장', create: '만들기', create_campus: '학교 추가', upload: '파일 올림', login: '로그인' };
  const body = `<h1>변경 기록</h1>
<section class="m-panel"><h2>게시 이력</h2>
<p class="m-hint">복원하면 그 게시본을 새 번호로 다시 게시해요. 초안과 파일은 지우지 않아요.</p>
${releases.length ? `<table class="m-table"><thead><tr><th scope="col">대상</th><th scope="col">번호</th><th scope="col">시각·편집자</th><th scope="col">요약</th><th scope="col"></th></tr></thead><tbody>${releases.map(release => `<tr>
  <td>${esc(release.summary?.label ?? release.scope)}</td>
  <td>${release.number}번 ${release.kind === 'restore' ? pill('복원') : ''} ${active.has(release.id) ? pill('지금 공개 중', 'ok') : ''}</td>
  <td>${esc(when(release.createdAt))}<br><span class="m-muted">${esc(release.createdBy)}</span></td>
  <td>${(release.summary?.lines ?? []).map(esc).join('<br>')}</td>
  <td>${active.has(release.id) ? '' : `<button class="m-btn m-btn-ghost m-btn-sm" type="button" data-restore="${attr(release.id)}" data-restore-label="${attr(`${release.summary?.label ?? release.scope} ${release.number}번`)}">이 게시본으로 복원</button>`}</td>
</tr>`).join('')}</tbody></table>` : '<p class="m-muted">아직 게시한 적이 없어요.</p>'}
</section>
<section class="m-panel"><h2>최근 변경</h2>
${audit.length ? `<table class="m-table"><thead><tr><th scope="col">시각</th><th scope="col">편집자</th><th scope="col">한 일</th><th scope="col">대상</th></tr></thead><tbody>${audit.map(row => `<tr><td>${esc(when(row.at))}</td><td>${esc(row.actor)}</td><td>${esc(ACTION[row.action] ?? row.action)}</td><td>${esc(row.summary?.label ?? row.summary?.title ?? row.summary?.name ?? row.summary?.filename ?? row.scope ?? '')}${row.summary?.number ? ` ${row.summary.number}번` : ''}</td></tr>`).join('')}</tbody></table>` : '<p class="m-muted">기록이 없어요.</p>'}
</section>`;
  return shell(actx, { title: '변경 기록', body, crumbs: [[null, '변경 기록']] });
}

export async function learning(actx) {
  const campuses = (await actx.store.listItems({ kind: 'campus' })).filter(item => item.data.learningMode === 'legacy_external');
  const body = `<h1>학습 운영 연결</h1>
<p class="m-hint">학습실의 질문·진도 관리는 각 학교의 기존 학습실 운영 화면에서 해요. 이 관리 시스템은 질문·진도 데이터를 읽거나 보여주지 않아요(외부 연결).</p>
${campuses.length ? `<ul class="m-list">${campuses.map(item => `<li><strong>${esc(item.data.name)}</strong> ${item.data.adminUrl ? `<a class="m-btn m-btn-sm" href="${attr(item.data.adminUrl)}" target="_blank" rel="noopener noreferrer">질문·진도 운영 화면 열기 (외부)<span class="sr-only"> 새 창</span></a>` : '<span class="m-muted">운영 화면 주소가 없어요. 학교 정보에서 입력하세요.</span>'} ${item.data.learnUrl ? `<a href="${attr(item.data.learnUrl)}" target="_blank" rel="noopener noreferrer">학습실</a>` : ''}</li>`).join('')}</ul>` : '<p class="m-muted">기존 학습실을 연결한 학교가 없어요.</p>'}`;
  return shell(actx, { title: '학습 운영 연결', body, crumbs: [[null, '학습 운영 연결']] });
}

export async function mediaLibrary(actx) {
  const media = await actx.store.listMedia();
  const body = `<h1>올린 파일</h1>${media.length ? `<table class="m-table"><thead><tr><th scope="col">파일</th><th scope="col">형식</th><th scope="col">크기</th><th scope="col">올린 시각</th></tr></thead><tbody>${media.map(item => `<tr><td><a href="/media/${attr(item.id)}" target="_blank" rel="noopener">${esc(item.filename || item.id)}</a></td><td>${esc(item.mime)}</td><td>${Math.ceil(item.size / 1024)}KB</td><td>${esc(when(item.createdAt))}</td></tr>`).join('')}</tbody></table>` : '<p class="m-muted">올린 파일이 없어요.</p>'}`;
  return shell(actx, { title: '올린 파일', body });
}

export async function notFound(actx) {
  return shell(actx, { title: '찾을 수 없음', body: '<h1>찾을 수 없어요</h1><p>주소를 확인하거나 <a href="/manage/">전체 현황</a>으로 돌아가세요.</p>' });
}

function bare(title, body) {
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>${esc(title)}</title><link rel="stylesheet" href="${FONT}"><link rel="stylesheet" href="/assets/manage.css"></head><body class="m-bare"><main class="m-login">${body}</main></body></html>`;
}

const LOGIN_ERRORS = {
  expired: '로그인 시간이 지났어요. 다시 시도해 주세요.',
  failed: 'Google 로그인을 확인하지 못했어요. 다시 시도해 주세요.',
  cancelled: '로그인을 취소했어요.',
  not_admin: '이 계정은 관리 권한이 없어요. 허용된 관리자 계정으로 로그인해 주세요.',
  logged_out: '로그아웃했어요.'
};

export function loginPage(config, error, next) {
  const message = LOGIN_ERRORS[error] ?? '';
  const body = `<h1>중앙 관리 로그인</h1>
${message ? `<p class="m-status-box" role="status">${esc(message)}</p>` : ''}
${config.mode === 'local'
    ? `<p class="m-hint">로컬 모드예요. 파일에 저장하고, 아래 버튼은 이 컴퓨터(localhost)에서만 동작해요.</p><form method="post" action="/manage/auth/dev/"><button class="m-btn" type="submit">${esc([...config.admins][0])}(으)로 로컬 로그인</button></form>`
    : `<p><a class="m-btn" href="/manage/auth/google/?next=${encodeURIComponent(next)}">Google 계정으로 로그인</a></p><p class="m-hint">허용된 관리자 계정만 들어올 수 있어요.</p>`}
<p><a href="/">공개 사이트로</a></p>`;
  return bare('중앙 관리 로그인', body);
}

export function notConfigured(config) {
  return bare('준비 중', `<h1>사이트를 준비하고 있어요</h1><p>잠시 후 다시 방문해 주세요.</p>${config.mode === 'local' ? `<p class="m-hint">설정 필요: ${config.problems.map(esc).join(', ')}</p>` : ''}`);
}

export function serverError() {
  return bare('잠시 문제가 생겼어요', '<h1>잠시 문제가 생겼어요</h1><p>잠시 후 새로고침해 주세요.</p><p><a href="/">처음으로</a></p>');
}
