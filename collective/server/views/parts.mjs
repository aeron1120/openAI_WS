// 공개 화면 조각: 상태 배지, 행사·프로젝트·학교 카드. 학교 페이지와 통합 목록이 같은 조각을 씁니다.
import { attr, esc, link, when, whenRange } from '../format.mjs';
import { EVENT_TYPES } from '../content.mjs';
import { eventState, materialState, recruitState } from '../states.mjs';

export const CAMPUS_NOTE = {
  preparing: '준비 중인 학교예요. 일정이 정해지면 이곳에 안내해요.',
  paused: '이번 학기에는 잠시 쉬고 있어요. 지난 활동과 프로젝트는 그대로 볼 수 있어요.'
};
const CAMPUS_BADGE = { active: ['운영 중', 'ok'], preparing: ['준비 중', 'wait'], paused: ['쉬는 중', 'muted'] };

// 학교로 가는 주소: 학교 사이트 주소가 있으면 그 사이트로 바로, 없으면 공통 학교 공간
export const campusHref = (ctx, campus) => campus.externalUrl || `${ctx.base}/campuses/${campus.slug}/`;

export const badge = (label, tone = 'muted') => `<span class="badge badge-${tone}">${esc(label)}</span>`;
export const campusBadge = status => CAMPUS_BADGE[status] ? badge(...CAMPUS_BADGE[status]) : '';

export function eventBadge(event, now) {
  const state = eventState(event, now);
  if (state === 'cancelled') return badge('취소됨', 'danger');
  if (state === 'tbd') return badge('일정 준비 중', 'wait');
  if (state === 'ongoing') return badge('진행 중', 'ok');
  if (state === 'ended') return badge('종료', 'muted');
  return badge(when(event.start), 'info');
}

export function recruitBadge(event, now) {
  const state = recruitState(event, now);
  if (state === 'open') return badge('신청 받는 중', 'ok');
  if (state === 'soon') return badge(`신청 ${when(event.applyOpensAt)}부터`, 'wait');
  if (state === 'closed') return badge('신청 마감', 'muted');
  return '';
}

export function applyButton(event, now, className = 'btn btn-primary') {
  return recruitState(event, now) === 'open' ? link(event.applyUrl, '신청하기', className) : '';
}

// 자료 상태 목록. legacy: 기존 학습실 회차 상태('open'|'closed'|'checking')
export function materialList(ctx, snapshot, event) {
  const rows = [];
  const campus = snapshot.campus;
  if (event.legacyWorkshop) {
    const status = ctx.legacy.get(event.id) ?? 'checking';
    if (status === 'open') rows.push(`<li class="material"><span>학습실 자료 · 진도 · 질문</span> ${badge('자료 열림', 'ok')} ${link(campus.learnUrl, '학습실에서 보기', 'text-link')}</li>`);
    else if (status === 'closed') rows.push(`<li class="material"><span>학습실 자료</span> ${badge('아직 공개 전', 'wait')}</li>`);
    else rows.push(`<li class="material"><span>학습실 자료</span> ${badge('자료 상태 확인 중', 'muted')} <small>잠시 후 다시 확인해 주세요.</small></li>`);
  }
  for (const item of event.materials ?? []) {
    const meta = snapshot.materialMeta?.[item.versionId] ?? { title: '자료' };
    const state = materialState(item, ctx.versions.get(item.versionId), ctx.now);
    const note = item.note ? ` <small>${esc(item.note)}</small>` : '';
    if (state.state === 'open') rows.push(`<li class="material"><span>${esc(meta.title)}</span> ${badge('자료 열림', 'ok')} <a class="text-link" href="${ctx.base}/materials/${attr(item.versionId)}/">자료 보기</a>${note}</li>`);
    else if (state.state === 'scheduled') rows.push(`<li class="material"><span>${esc(meta.title)}</span> ${badge(`${when(state.at)} 공개 예정`, 'wait')}${note}</li>`);
  }
  return rows.length ? `<ul class="materials">${rows.join('')}</ul>` : '';
}

export function eventMeta(event) {
  const bits = [];
  if (event.start) bits.push(`<span>${esc(whenRange(event.start, event.end))}</span>`);
  if (event.place) bits.push(`<span>${esc(event.place)}</span>`);
  if (event.onlineUrl) bits.push('<span>온라인</span>');
  if (event.audience) bits.push(`<span>${esc(event.audience)}</span>`);
  return bits.length ? `<p class="meta">${bits.join('<span aria-hidden="true"> · </span>')}</p>` : '';
}

export function eventCard(ctx, snapshot, event, { showCampus = false } = {}) {
  const href = `${ctx.base}/campuses/${attr(snapshot.campus.slug)}/workshops/${attr(event.id)}/`;
  return `<article class="event-card type-${attr(event.type)}" data-reveal>
  <p class="eyebrow">${esc(EVENT_TYPES[event.type] ?? '행사')}${showCampus ? ` · ${esc(snapshot.campus.name)}` : ''}</p>
  <h3><a href="${href}">${esc(event.title)}</a></h3>
  <div class="badges">${eventBadge(event, ctx.now)}${recruitBadge(event, ctx.now)}${event.openToOthers && !showCampus ? badge('다른 학교 참가 가능', 'info') : ''}</div>
  ${eventMeta(event)}
  ${event.summary ? `<p>${esc(event.summary)}</p>` : ''}
  <p class="card-actions">${applyButton(event, ctx.now, 'btn btn-primary btn-sm')}<a class="text-link" href="${href}">자세히 보기</a></p>
</article>`;
}

export function projectCard(ctx, snapshot, project, { showCampus = true } = {}) {
  const href = `${ctx.base}/projects/${attr(project.id)}/`;
  const image = project.mediaId
    ? `<img src="/media/${attr(project.mediaId)}" alt="${attr(project.alt || '')}" loading="lazy" decoding="async" width="800" height="500">`
    : `<div class="project-placeholder" aria-hidden="true"><span>${esc(project.title.slice(0, 1))}</span></div>`;
  return `<article class="project-card" data-reveal>
  <a class="project-media" href="${href}" tabindex="-1" aria-hidden="true">${image}</a>
  <div class="project-body">
    <p class="eyebrow">${project.kind === 'operator' ? '운영진 예제' : '학생 결과물'}${showCampus ? ` · ${esc(snapshot.campus.name)}` : ''}</p>
    <h3><a href="${href}">${esc(project.title)}</a></h3>
    ${project.summary ? `<p>${esc(project.summary)}</p>` : ''}
  </div>
</article>`;
}

export function campusCard(ctx, snapshot) {
  const campus = snapshot.campus;
  const href = campusHref(ctx, campus);
  // 학교 사이트로 연결하는 학교는 일정을 그 사이트에서 관리하므로, 여기서 '다음 활동'을 추측해 쓰지 않습니다.
  const next = campus.externalUrl ? null : nextEvent(snapshot, ctx.now);
  const nextLine = campus.externalUrl ? '<p class="meta">일정과 자료는 학교 사이트에서 확인해요.</p>'
    : next ? `<p class="meta">다음 활동 · ${esc(next.title)}${next.start ? ` · ${esc(when(next.start))}` : ''}</p>`
    : campus.status === 'active' ? '<p class="meta">다음 일정은 준비 중이에요.</p>' : '';
  return `<li class="campus-row" data-campus-name="${attr(`${campus.name} ${campus.shortName ?? ''} ${campus.slug}`.toLowerCase())}" data-reveal>
  <div class="campus-row-main">
    <h3><a href="${attr(href)}">${esc(campus.name)}</a> ${campusBadge(campus.status)}</h3>
    ${campus.intro ? `<p>${esc(campus.intro)}</p>` : ''}
    ${nextLine}
  </div>
  <a class="btn btn-ghost" href="${attr(href)}">${campus.externalUrl ? '학교 사이트로' : '학교 공간으로'}<span class="sr-only"> · ${esc(campus.name)}</span></a>
</li>`;
}

// 아직 끝나지 않은 가장 가까운 행사(취소 제외). 날짜가 없는 준비 중 일정은 뒤로.
export function nextEvent(snapshot, now) {
  return snapshot.events
    .filter(event => ['upcoming', 'ongoing'].includes(eventState(event, now)))
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start))[0] ?? null;
}

export function emptyState(text) {
  return `<p class="empty">${esc(text)}</p>`;
}
