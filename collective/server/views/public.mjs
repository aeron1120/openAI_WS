// 공개 페이지. 모든 함수는 게시본(ctx.campuses, ctx.home)만 읽습니다. 미리보기는 같은 함수에 초안 스냅샷을 넣어 그려요.
import { attr, esc, link, rich, when, whenRange } from '../format.mjs';
import { EVENT_TYPES, HOME_DEFAULTS } from '../content.mjs';
import { campusHeader, collectiveHeader, page, primaryAction } from './layout.mjs';
import { applyButton, badge, CAMPUS_NOTE, campusBadge, campusCard, campusHref, emptyState, eventBadge, eventCard, eventMeta, materialList, nextEvent, projectCard, recruitBadge } from './parts.mjs';
import { eventState } from '../states.mjs';

const lines = text => esc(text).replace(/\n/g, '<br>');
const firstSentence = text => (text ?? '').split('\n')[0];

// 공개 대상이 확인된 학교 간 행사: 다른 학교 참가 가능 + 아직 끝나지 않음
export function openEvents(ctx) {
  return ctx.campuses.flatMap(snapshot => snapshot.events
    .filter(event => event.openToOthers && ['upcoming', 'ongoing', 'tbd'].includes(eventState(event, ctx.now)))
    .map(event => ({ snapshot, event })))
    .sort((a, b) => (Date.parse(a.event.start ?? '9999') || Infinity) - (Date.parse(b.event.start ?? '9999') || Infinity));
}

export function allProjects(ctx) {
  return ctx.campuses.flatMap(snapshot => snapshot.projects.map(project => ({ snapshot, project })));
}

// 추천 ID 중 지금도 공개된 것만 순서대로. 숨김·보관된 항목은 자동으로 빠집니다.
function featured(ids, pool, key) {
  const byId = new Map(pool.map(entry => [key(entry), entry]));
  return (ids ?? []).map(id => byId.get(id)).filter(Boolean);
}

// ---------- 통합 메인 ----------
export function homePage(ctx) {
  // 비어 있는 칸은 기본 문구로 채웁니다(관리 화면에서 적은 문구가 있으면 그것을 씀).
  const home = { ...(ctx.home ?? {}) };
  for (const [key, value] of Object.entries(HOME_DEFAULTS)) if (!home[key]) home[key] = value;
  const events = openEvents(ctx);
  const projects = allProjects(ctx);
  const featuredEvents = featured(home.featuredEvents, events, entry => entry.event.id);
  const featuredProjects = featured(home.featuredProjects, projects, entry => entry.project.id);
  const featuredCampuses = featured(home.featuredCampuses, ctx.campuses, snapshot => snapshot.campus.id);
  const campusOrder = [...featuredCampuses, ...ctx.campuses.filter(snapshot => !featuredCampuses.includes(snapshot))];
  const showEvents = (featuredEvents.length ? featuredEvents : events).slice(0, 4);
  const showProjects = (featuredProjects.length ? featuredProjects : projects.filter(entry => entry.project.featured)).slice(0, 6);
  const steps = [
    ['learn', '배우기', 'Workshop', home.learnText, home.learnMediaId],
    ['make', '만들기', 'Studio Session', home.makeText, home.makeMediaId],
    ['share', '공유하기', 'Showcase', home.shareText, home.shareMediaId]
  ];

  const hero = `<section class="hero" aria-labelledby="hero-title">
  <div class="hero-art" aria-hidden="true">${home.heroMediaId ? '' : '<span class="blob blob-a"></span><span class="blob blob-b"></span><span class="blob blob-c"></span>'}</div>
  ${home.heroMediaId ? `<img class="hero-photo" src="/media/${attr(home.heroMediaId)}" alt="${attr(home.heroAlt || '')}" fetchpriority="high" width="1600" height="900">` : ''}
  <div class="wrap hero-inner">
    ${home.heroEyebrow ? `<p class="hero-eyebrow">${esc(home.heroEyebrow)}</p>` : ''}
    <h1 id="hero-title" class="hero-title">${lines(home.heroTitle)}</h1>
    ${home.heroLead ? `<p class="hero-lead">${lines(home.heroLead)}</p>` : ''}
    <p class="hero-actions">
      <a class="btn btn-light btn-lg" href="${ctx.base}/campuses/">내 학교 찾기</a>
      <a class="btn btn-outline-light btn-lg" href="#program">활동 알아보기</a>
    </p>
    <p class="last-campus" data-last-campus hidden></p>
  </div>
</section>`;

  // 배경: 활동마다 한 장(사진, 없으면 활동 색). 화면 가운데 온 활동 칸의 배경이 드러납니다(site.js가 data-active를 바꿈).
  const program = `<section id="program" class="section section-program" aria-labelledby="program-title" data-program data-active="learn">
  <div class="program-bg" aria-hidden="true"><div class="program-bg-stage">
    ${steps.map(([key, , , , mediaId]) => `<div class="program-layer layer-${key}" data-layer="${key}">${mediaId ? `<img src="/media/${attr(mediaId)}" alt="" loading="lazy" decoding="async" width="1600" height="900">` : ''}</div>`).join('')}
  </div></div>
  <div class="wrap program-grid">
    <div class="program-head">
      <h2 id="program-title" class="section-title">${lines(home.programTitle)}</h2>
      <p class="section-lead">${esc(home.programIntro)}</p>
      <ol class="program-index" aria-label="세 가지 활동">
        ${steps.map(([key, ko]) => `<li class="idx-${key}"><a href="#step-${key}">${ko}</a></li>`).join('')}
      </ol>
    </div>
    <ol class="program-steps">
      ${steps.map(([key, ko, en, text]) => `<li class="program-step step-${key}" id="step-${key}" data-step="${key}" data-reveal>
        <h3><span class="step-en">${en}</span><span class="step-ko">${ko}</span></h3>
        <p>${esc(text)}</p>
      </li>`).join('')}
    </ol>
  </div>
</section>`;

  const campuses = `<section id="campuses" class="section section-campuses" aria-labelledby="campuses-title">
  <div class="wrap">
    <h2 id="campuses-title" class="section-title" data-reveal>우리 학교에서 시작해요.</h2>
    ${ctx.campuses.length ? `${searchForm(ctx, '')}
    <ul class="campus-list" data-campus-list>${campusOrder.slice(0, 8).map(snapshot => campusCard(ctx, snapshot)).join('')}</ul>
    <p class="search-empty" data-search-empty hidden>찾는 학교가 아직 없어요. <a href="${ctx.base}/about/#open">학교 개설 문의</a></p>
    ${ctx.campuses.length > 8 ? `<p><a class="text-link" href="${ctx.base}/campuses/">전체 학교 보기</a></p>` : ''}` : emptyState('공개된 학교 공간을 준비하고 있어요.')}
  </div>
</section>`;

  const eventsSection = showEvents.length ? `<section id="events" class="section section-events" aria-labelledby="events-title">
  <div class="wrap">
    <h2 id="events-title" class="section-title" data-reveal>다른 학교 학생도<br>함께할 수 있어요.</h2>
    <div class="event-grid">${showEvents.map(({ snapshot, event }) => eventCard(ctx, snapshot, event, { showCampus: true })).join('')}</div>
    <p><a class="text-link" href="${ctx.base}/events/">모든 활동 보기</a></p>
  </div>
</section>` : `<section id="events" class="section section-events section-compact" aria-labelledby="events-title">
  <div class="wrap"><h2 id="events-title" class="section-title">함께할 활동</h2><p class="section-lead">다른 학교 학생도 참가할 수 있는 행사가 정해지면 이곳에 올라와요.</p></div>
</section>`;

  const projectsSection = showProjects.length ? `<section id="projects" class="section section-projects" aria-labelledby="projects-title">
  <div class="wrap">
    <h2 id="projects-title" class="section-title" data-reveal>직접 만든 것들.</h2>
    <div class="project-grid">${showProjects.map(({ snapshot, project }) => projectCard(ctx, snapshot, project)).join('')}</div>
    <p><a class="text-link" href="${ctx.base}/projects/">전체 프로젝트 보기</a></p>
  </div>
</section>` : `<section id="projects" class="section section-projects section-compact" aria-labelledby="projects-title">
  <div class="wrap"><h2 id="projects-title" class="section-title">직접 만든 것들</h2><p class="section-lead">학생이 공개에 동의한 결과물이 생기면 이곳에 소개해요.</p></div>
</section>`;

  const join = `<section class="section section-join" aria-labelledby="join-title">
  <div class="wrap join-grid">
    <h2 id="join-title" class="section-title" data-reveal>지금, 내 캠퍼스에서.</h2>
    <div class="join-actions" data-reveal>
      <a class="btn btn-primary btn-lg" href="${ctx.base}/campuses/">내 학교로 이동</a>
      ${home.openCampusUrl ? link(home.openCampusUrl, '우리 학교에도 열고 싶어요', 'btn btn-ghost btn-lg') : `<a class="btn btn-ghost btn-lg" href="${ctx.base}/about/#open">학교 개설 안내</a>`}
    </div>
  </div>
</section>`;

  return page({
    ctx, title: '', description: firstSentence(home.heroLead) || '함께 배우고, 직접 만들고, 서로의 결과물을 나눕니다.',
    header: collectiveHeader(ctx, { onHome: true }), canonicalPath: '/', bodyClass: 'page-home',
    body: hero + program + campuses + eventsSection + projectsSection + join
  });
}

function searchForm(ctx, query) {
  return `<form class="campus-search" role="search" action="${ctx.base}/campuses/" method="get" data-campus-search>
  <label for="campus-q">학교 이름으로 찾기</label>
  <div class="search-row"><input id="campus-q" name="q" type="search" value="${attr(query)}" autocomplete="off" placeholder="예: 서울대">
  <button class="btn btn-primary" type="submit">찾기</button></div>
</form>`;
}

// ---------- 통합 목록 ----------
export function campusesPage(ctx, query = '') {
  const q = query.trim().toLowerCase().slice(0, 60);
  const list = q ? ctx.campuses.filter(s => `${s.campus.name} ${s.campus.shortName ?? ''} ${s.campus.slug}`.toLowerCase().includes(q)) : ctx.campuses;
  const body = `<section class="section section-first"><div class="wrap">
  <h1 class="page-title">학교 찾기</h1>
  <p class="section-lead">공개된 학교 공간이에요. 내 학교를 골라 일정과 참여 방법을 확인하세요.</p>
  ${searchForm(ctx, query)}
  ${ctx.campuses.length ? `<ul class="campus-list" data-campus-list>${list.map(snapshot => campusCard(ctx, snapshot)).join('')}</ul>` : ''}
  <p class="search-empty" data-search-empty${list.length || !q ? ' hidden' : ''}>‘${esc(query)}’에 맞는 학교가 없어요. 아직 열리지 않은 학교일 수 있어요. <a href="${ctx.base}/about/#open">학교 개설 안내</a></p>
  ${ctx.campuses.length || q ? '' : emptyState('공개된 학교 공간을 준비하고 있어요.')}
</div></section>`;
  return page({ ctx, title: '학교 찾기', description: 'Student Collective가 열린 학교 목록', header: collectiveHeader(ctx), canonicalPath: '/campuses/', body });
}

export function eventsPage(ctx) {
  const events = openEvents(ctx);
  const body = `<section class="section section-first"><div class="wrap">
  <h1 class="page-title">함께할 활동</h1>
  <p class="section-lead">다른 학교 학생도 참가할 수 있다고 주최 학교가 확인한 활동만 모았어요.</p>
  ${events.length ? `<div class="event-grid">${events.map(({ snapshot, event }) => eventCard(ctx, snapshot, event, { showCampus: true })).join('')}</div>` : emptyState('지금 열려 있는 학교 간 공개 활동이 없어요. 각 학교 공간에서 학교별 일정을 확인해 주세요.')}
</div></section>`;
  return page({ ctx, title: '함께할 활동', description: '학교 간 공개 활동', header: collectiveHeader(ctx), canonicalPath: '/events/', body });
}

export function projectsPage(ctx) {
  const projects = allProjects(ctx);
  const body = `<section class="section section-first"><div class="wrap">
  <h1 class="page-title">프로젝트</h1>
  <p class="section-lead">학생이 공개에 동의한 결과물과 운영진 예제예요.</p>
  ${projects.length ? `<div class="project-grid">${projects.map(({ snapshot, project }) => projectCard(ctx, snapshot, project)).join('')}</div>` : emptyState('아직 공개된 프로젝트가 없어요.')}
</div></section>`;
  return page({ ctx, title: '프로젝트', description: '공개 프로젝트', header: collectiveHeader(ctx), canonicalPath: '/projects/', body });
}

export function projectPage(ctx, snapshot, project) {
  const body = `<article class="section section-first"><div class="wrap narrow">
  <p class="eyebrow">${project.kind === 'operator' ? '운영진 예제' : '학생 결과물'} · <a href="${attr(campusHref(ctx, snapshot.campus))}">${esc(snapshot.campus.name)}</a></p>
  <h1 class="page-title">${esc(project.title)}</h1>
  ${project.summary ? `<p class="section-lead">${esc(project.summary)}</p>` : ''}
  ${project.mediaId ? `<img class="detail-image" src="/media/${attr(project.mediaId)}" alt="${attr(project.alt || '')}" width="1200" height="750">` : ''}
  <div class="prose">${rich(project.body)}</div>
  ${project.maker ? `<p class="meta">만든 사람 · ${esc(project.maker)}</p>` : ''}
  ${project.demoUrl ? `<p>${link(project.demoUrl, '데모 열기', 'btn btn-primary')}</p>` : ''}
  <p><a class="text-link" href="${ctx.base}/projects/">전체 프로젝트</a></p>
</div></article>`;
  return page({ ctx, title: project.title, description: project.summary, header: collectiveHeader(ctx), canonicalPath: `/projects/${project.id}/`, body });
}

export function aboutPage(ctx) {
  const home = ctx.home ?? {};
  const body = `<section class="section section-first"><div class="wrap narrow">
  <h1 class="page-title">소개·문의</h1>
  <div class="prose">${home.aboutBody ? rich(home.aboutBody) : '<p>Student Collective는 학생이 직접 배우고, 만들고, 결과물을 나누는 학교별 프로그램이에요. 각 학교 공간은 그 학교의 Campus Lead가 운영해요.</p>'}</div>
  <h2 id="open">우리 학교에도 열고 싶다면</h2>
  ${home.openCampusUrl ? `<p>${link(home.openCampusUrl, '학교 개설 문의하기', 'btn btn-primary')}</p>` : '<p class="empty">학교 개설 문의 창구를 준비하고 있어요.</p>'}
  <h2>운영 문의</h2>
  ${home.contactUrl ? `<p>${link(home.contactUrl, '운영 문의하기', 'btn btn-ghost')}</p>` : '<p class="empty">운영 문의 창구를 준비하고 있어요. 각 학교 공간의 참여 안내에서 학교별 문의처를 확인해 주세요.</p>'}
</div></section>`;
  return page({ ctx, title: '소개·문의', header: collectiveHeader(ctx), canonicalPath: '/about/', body });
}

// ---------- 학교 공간 ----------
const campusPath = (ctx, snapshot, rest = '') => `${ctx.base}/campuses/${snapshot.campus.slug}/${rest}`;
const currentTerm = snapshot => snapshot.terms.find(term => term.id === snapshot.campus.currentTermId) ?? null;
const termEvents = snapshot => {
  const term = currentTerm(snapshot);
  return term ? snapshot.events.filter(event => event.termId === term.id) : snapshot.events;
};

function campusShell(ctx, snapshot, { title, current, body, path, description }) {
  return page({ ctx, title: title ? `${title} · ${snapshot.campus.name}` : snapshot.campus.name, description: description ?? snapshot.campus.intro, header: campusHeader(ctx, snapshot, { current }), canonicalPath: `/campuses/${snapshot.campus.slug}/${path}`, body, bodyClass: 'page-campus' });
}

export function campusHomePage(ctx, snapshot) {
  const campus = snapshot.campus;
  const term = currentTerm(snapshot);
  const next = nextEvent(snapshot, ctx.now);
  const action = primaryAction(ctx, snapshot);
  const roadmap = termEvents(snapshot);
  const notices = snapshot.notices.slice(0, 3);
  const projects = snapshot.projects.slice(0, 3);
  const joinLinks = [[campus.applyUrl, '참여 신청'], [campus.communityUrl, '커뮤니티 참여']].filter(([url]) => url);

  const intro = `<section class="campus-hero" data-last-visit="${attr(campus.slug)}" data-last-visit-name="${attr(campus.name)}">
  <div class="wrap campus-hero-grid">
    <div>
      <p class="eyebrow">${term ? esc(term.name) : 'Student Collective'} ${campusBadge(campus.status)}</p>
      <h1 class="page-title">${esc(campus.name)}</h1>
      ${campus.intro ? `<p class="section-lead">${esc(campus.intro)}</p>` : ''}
      ${CAMPUS_NOTE[campus.status] ? `<p class="status-note">${esc(CAMPUS_NOTE[campus.status])}</p>` : ''}
      <p class="hero-actions">${next ? applyButton(next, ctx.now, 'btn btn-primary btn-lg') : ''}${action.external ? link(action.href, action.label, 'btn btn-ghost btn-lg') : `<a class="btn btn-ghost btn-lg" href="${attr(action.href)}">${action.label}</a>`}</p>
    </div>
    ${campus.photoMediaId ? `<img class="campus-photo" src="/media/${attr(campus.photoMediaId)}" alt="${attr(campus.photoAlt || '')}" width="960" height="640">` : ''}
  </div>
</section>`;

  const nextBlock = next ? `<section class="section section-tight" aria-labelledby="next-title"><div class="wrap">
  <h2 id="next-title" class="block-title">다음 활동</h2>
  <div class="next-card">
    <div>
      <p class="eyebrow">${esc(EVENT_TYPES[next.type])}</p>
      <h3><a href="${campusPath(ctx, snapshot, `workshops/${next.id}/`)}">${esc(next.title)}</a></h3>
      <div class="badges">${eventBadge(next, ctx.now)}${recruitBadge(next, ctx.now)}</div>
      ${eventMeta(next)}
    </div>
    ${next.prepare?.length ? `<div><p class="mini-title">준비물</p><ul class="checks">${next.prepare.slice(0, 4).map(item => `<li>${esc(item)}</li>`).join('')}</ul></div>` : ''}
  </div>
</div></section>` : `<section class="section section-tight"><div class="wrap"><h2 class="block-title">다음 활동</h2>${emptyState(campus.status === 'active' ? '다음 일정은 확정되면 이곳에 안내해요.' : '지금 예정된 활동이 없어요.')}</div></section>`;

  const roadmapBlock = roadmap.length ? `<section class="section section-tight" aria-labelledby="roadmap-title"><div class="wrap">
  <h2 id="roadmap-title" class="block-title">학기 흐름</h2>
  <ol class="roadmap">${roadmap.map(event => `<li class="roadmap-item type-${attr(event.type)}${eventState(event, ctx.now) === 'ended' ? ' is-past' : ''}">
    <p class="eyebrow">${esc(EVENT_TYPES[event.type])}</p>
    <h3><a href="${campusPath(ctx, snapshot, `workshops/${event.id}/`)}">${esc(event.title)}</a></h3>
    <div class="badges">${eventBadge(event, ctx.now)}</div>
  </li>`).join('')}</ol>
  <p><a class="text-link" href="${campusPath(ctx, snapshot, 'program/')}">일정·자료 전체 보기</a></p>
</div></section>` : '';

  const noticeBlock = notices.length ? `<section class="section section-tight" aria-labelledby="notice-title"><div class="wrap">
  <h2 id="notice-title" class="block-title">최근 공지</h2>
  <ul class="notice-list">${notices.map(notice => `<li>${notice.pinned ? badge('고정', 'info') : ''}<a href="${campusPath(ctx, snapshot, `notices/${notice.id}/`)}">${esc(notice.title)}</a> <small>${esc(when(notice.postedAt, { time: false }))}</small></li>`).join('')}</ul>
  ${snapshot.notices.length > 3 ? `<p><a class="text-link" href="${campusPath(ctx, snapshot, 'notices/')}">공지 전체 보기</a></p>` : ''}
</div></section>` : '';

  const projectBlock = projects.length ? `<section class="section section-tight" aria-labelledby="campus-projects-title"><div class="wrap">
  <h2 id="campus-projects-title" class="block-title">프로젝트</h2>
  <div class="project-grid">${projects.map(project => projectCard(ctx, snapshot, project, { showCampus: false })).join('')}</div>
  <p><a class="text-link" href="${campusPath(ctx, snapshot, 'projects/')}">프로젝트 전체 보기</a></p>
</div></section>` : '';

  const joinBlock = `<section class="section section-tight" aria-labelledby="campus-join-title"><div class="wrap">
  <h2 id="campus-join-title" class="block-title">참여하기</h2>
  ${joinLinks.length ? `<p class="hero-actions">${joinLinks.map(([url, label]) => link(url, label, 'btn btn-ghost')).join('')}</p>` : '<p class="empty">참여 신청 창구를 준비하고 있어요.</p>'}
  <p><a class="text-link" href="${campusPath(ctx, snapshot, 'join/')}">처음이라면 참여 안내 보기</a></p>
</div></section>`;

  return campusShell(ctx, snapshot, { title: '', current: 'home', path: '', body: intro + nextBlock + roadmapBlock + noticeBlock + projectBlock + joinBlock });
}

export function programPage(ctx, snapshot) {
  const term = currentTerm(snapshot);
  const events = termEvents(snapshot);
  const past = term ? snapshot.events.filter(event => event.termId !== term.id) : [];
  const withMaterials = events.filter(event => event.legacyWorkshop || event.materials?.length);
  const body = `<section class="section section-first"><div class="wrap">
  <h1 class="page-title">일정·워크숍</h1>
  <p class="section-lead">${term ? `${esc(term.name)} 일정이에요. ` : ''}행사 일정, 신청, 자료 공개는 따로 표시해요. 끝난 행사의 자료가 열려 있을 수 있어요.</p>
  ${events.length ? `<div class="event-grid">${events.map(event => eventCard(ctx, snapshot, event)).join('')}</div>` : emptyState('이번 학기 일정은 확정되면 이곳에 안내해요.')}
</div></section>
<section id="materials" class="section section-tight" aria-labelledby="materials-title"><div class="wrap">
  <h2 id="materials-title" class="block-title">자료</h2>
  ${withMaterials.length ? withMaterials.map(event => `<div class="material-group"><h3><a href="${campusPath(ctx, snapshot, `workshops/${event.id}/`)}">${esc(event.title)}</a></h3>${materialList(ctx, snapshot, event) || '<p class="empty">아직 공개된 자료가 없어요.</p>'}</div>`).join('') : emptyState('아직 공개된 자료가 없어요.')}
</div></section>
${past.length ? `<section class="section section-tight"><div class="wrap"><h2 class="block-title">지난 학기</h2><div class="event-grid">${past.map(event => eventCard(ctx, snapshot, event)).join('')}</div></div></section>` : ''}`;
  return campusShell(ctx, snapshot, { title: '일정·워크숍', current: 'program', path: 'program/', body });
}

export function eventPage(ctx, snapshot, event) {
  const campus = snapshot.campus;
  const state = eventState(event, ctx.now);
  const materials = materialList(ctx, snapshot, event);
  const index = termEvents(snapshot).findIndex(item => item.id === event.id);
  const following = index >= 0 ? termEvents(snapshot)[index + 1] : null;
  const body = `<article class="section section-first"><div class="wrap narrow">
  <p class="eyebrow">${esc(EVENT_TYPES[event.type])} · ${esc(campus.name)}</p>
  <h1 class="page-title">${esc(event.title)}</h1>
  <div class="badges">${eventBadge(event, ctx.now)}${recruitBadge(event, ctx.now)}${event.openToOthers ? badge('다른 학교 참가 가능', 'info') : ''}</div>
  ${state === 'cancelled' ? '<p class="status-note">이 행사는 취소됐어요.</p>' : ''}
  ${event.summary ? `<p class="section-lead">${esc(event.summary)}</p>` : ''}
  <dl class="facts">
    ${event.goal ? `<div><dt>만들 결과물</dt><dd>${esc(event.goal)}</dd></div>` : ''}
    ${event.audience ? `<div><dt>참가 대상</dt><dd>${esc(event.audience)}</dd></div>` : ''}
    <div><dt>일정</dt><dd>${event.start ? esc(whenRange(event.start, event.end)) : '일정 준비 중'}</dd></div>
    ${event.place ? `<div><dt>장소</dt><dd>${esc(event.place)}</dd></div>` : ''}
    ${event.onlineUrl ? `<div><dt>온라인</dt><dd>${link(event.onlineUrl, '온라인 주소 열기')}</dd></div>` : ''}
  </dl>
  ${applyButton(event, ctx.now, 'btn btn-primary btn-lg') ? `<p>${applyButton(event, ctx.now, 'btn btn-primary btn-lg')}</p>` : ''}
  ${event.prepare?.length ? `<h2 class="block-title">준비물</h2><ul class="checks">${event.prepare.map(item => `<li>${esc(item)}</li>`).join('')}</ul>` : ''}
  ${event.body ? `<div class="prose">${rich(event.body)}</div>` : ''}
  <h2 class="block-title">자료</h2>
  ${materials || '<p class="empty">아직 공개된 자료가 없어요.</p>'}
  <h2 class="block-title">다음 단계</h2>
  <p class="hero-actions">${following ? `<a class="btn btn-ghost" href="${campusPath(ctx, snapshot, `workshops/${following.id}/`)}">다음: ${esc(following.title)}</a>` : ''}<a class="btn btn-ghost" href="${campusPath(ctx, snapshot, 'program/')}">전체 일정</a></p>
</div></article>`;
  return campusShell(ctx, snapshot, { title: event.title, current: 'program', path: `workshops/${event.id}/`, body, description: event.summary });
}

export function noticesPage(ctx, snapshot) {
  const body = `<section class="section section-first"><div class="wrap narrow">
  <h1 class="page-title">공지</h1>
  ${snapshot.notices.length ? `<ul class="notice-list">${snapshot.notices.map(notice => `<li>${notice.pinned ? badge('고정', 'info') : ''}<a href="${campusPath(ctx, snapshot, `notices/${notice.id}/`)}">${esc(notice.title)}</a> <small>${esc(when(notice.postedAt, { time: false }))}</small></li>`).join('')}</ul>` : emptyState('공지가 없어요.')}
</div></section>`;
  return campusShell(ctx, snapshot, { title: '공지', current: 'home', path: 'notices/', body });
}

export function noticePage(ctx, snapshot, notice) {
  const body = `<article class="section section-first"><div class="wrap narrow">
  <p class="eyebrow">공지 · ${esc(when(notice.postedAt, { time: false }))}</p>
  <h1 class="page-title">${esc(notice.title)}</h1>
  <div class="prose">${rich(notice.body)}</div>
  <p><a class="text-link" href="${campusPath(ctx, snapshot, 'notices/')}">공지 전체</a></p>
</div></article>`;
  return campusShell(ctx, snapshot, { title: notice.title, current: 'home', path: `notices/${notice.id}/`, body });
}

export function campusProjectsPage(ctx, snapshot) {
  const operator = snapshot.projects.filter(project => project.kind === 'operator');
  const student = snapshot.projects.filter(project => project.kind === 'student');
  const group = (title, list, empty) => `<h2 class="block-title">${title}</h2>${list.length ? `<div class="project-grid">${list.map(project => projectCard(ctx, snapshot, project, { showCampus: false })).join('')}</div>` : emptyState(empty)}`;
  const body = `<section class="section section-first"><div class="wrap">
  <h1 class="page-title">프로젝트</h1>
  ${group('학생 결과물', student, '공개 동의를 받은 학생 결과물이 생기면 이곳에 소개해요.')}
  ${operator.length ? group('운영진 예제', operator, '') : ''}
</div></section>`;
  return campusShell(ctx, snapshot, { title: '프로젝트', current: 'projects', path: 'projects/', body });
}

export function joinPage(ctx, snapshot) {
  const campus = snapshot.campus;
  const rows = [
    [campus.applyUrl, '참여 신청', '이번 학기 프로그램에 참여 신청해요.'],
    [campus.communityUrl, '커뮤니티', '공지와 질문을 나누는 학교 커뮤니티예요.'],
    [campus.contactUrl, '운영 문의', '협력이나 운영 관련 문의를 받아요.']
  ];
  const body = `<section class="section section-first"><div class="wrap narrow">
  <h1 class="page-title">참여 안내</h1>
  ${CAMPUS_NOTE[campus.status] ? `<p class="status-note">${esc(CAMPUS_NOTE[campus.status])}</p>` : ''}
  <h2 class="block-title">처음 참여한다면</h2>
  <div class="prose">${campus.firstTimeNote ? rich(campus.firstTimeNote) : '<p>학교 공간의 일정에서 가까운 활동을 고르고, 신청 링크가 열려 있으면 신청하면 돼요. 코딩 경험이 없어도 참여할 수 있는지는 각 활동의 참가 대상을 확인해 주세요.</p>'}</div>
  <h2 class="block-title">참여 경로</h2>
  <ul class="join-list">${rows.map(([url, label, text]) => `<li><div><strong>${label}</strong><p>${text}</p></div>${url ? link(url, `${label} 열기`, 'btn btn-ghost btn-sm') : '<span class="empty-inline">준비 중</span>'}</li>`).join('')}</ul>
  ${campus.learningMode === 'legacy_external' && campus.learnUrl ? `<h2 class="block-title">학습실</h2><p>수업 자료·진도·질문은 기존 학습실에서 이어져요. 학습실 로그인은 그 학교 계정으로 해요.</p><p>${link(campus.learnUrl, '수업 듣기', 'btn btn-primary')}</p>` : '<h2 class="block-title">자료</h2><p>공개된 자료는 일정·워크숍 페이지에서 바로 볼 수 있어요. 개인 진도·질문 기능은 아직 이 학교에 연결되어 있지 않아요.</p>'}
  ${campus.leadNote ? `<h2 class="block-title">운영</h2><div class="prose">${rich(campus.leadNote)}</div>` : ''}
</div></section>`;
  return campusShell(ctx, snapshot, { title: '참여 안내', current: 'join', path: 'join/', body });
}

export function materialPage(ctx, version, material) {
  const body = `<article class="section section-first"><div class="wrap narrow">
  <p class="eyebrow">자료 · ${esc(version.data.version)}</p>
  <h1 class="page-title">${esc(material?.data.title ?? '자료')}</h1>
  ${material?.data.description ? `<p class="section-lead">${esc(material.data.description)}</p>` : ''}
  ${version.data.body ? `<div class="prose">${rich(version.data.body)}</div>` : ''}
  <p class="hero-actions">${version.data.url ? link(version.data.url, '자료 열기', 'btn btn-primary') : ''}${version.data.mediaId ? `<a class="btn btn-ghost" href="/media/${attr(version.data.mediaId)}">파일 받기</a>` : ''}</p>
</div></article>`;
  return page({ ctx, title: material?.data.title ?? '자료', header: collectiveHeader(ctx), body, noindex: true });
}

export function notFoundPage(ctx, { campusMissing = false } = {}) {
  const body = `<section class="section section-first"><div class="wrap narrow">
  <h1 class="page-title">${campusMissing ? '찾는 학교 공간이 없어요' : '페이지를 찾을 수 없어요'}</h1>
  <p class="section-lead">${campusMissing ? '주소가 바뀌었거나 아직 공개되지 않은 학교일 수 있어요.' : '주소를 다시 확인하거나 아래에서 이동해 주세요.'}</p>
  <p class="hero-actions"><a class="btn btn-primary" href="${ctx.base}/campuses/">학교 찾기</a><a class="btn btn-ghost" href="${ctx.base}/">통합 메인</a></p>
</div></section>`;
  return page({ ctx, title: '찾을 수 없음', header: collectiveHeader(ctx), body, noindex: true });
}

export function scheduledMaterialPage(ctx) {
  const body = `<section class="section section-first"><div class="wrap narrow">
  <h1 class="page-title">아직 공개되지 않은 자료예요</h1>
  <p class="section-lead">공개 시각이 되면 학교 공간의 일정 페이지에서 열려요.</p>
  <p><a class="btn btn-primary" href="${ctx.base}/campuses/">학교 찾기</a></p>
</div></section>`;
  return page({ ctx, title: '공개 전 자료', header: collectiveHeader(ctx), body, noindex: true });
}
