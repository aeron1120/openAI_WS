import { h, raw, link, richText, isUsableUrl, isExternal, isRecruiting, eventBadge, formatSchedule, copyBlock, figure, video } from './render.mjs';
import { monthCalendar, googleCalendarUrl, mapLinks } from './calendar.mjs';

const pad = n => String(n).padStart(2, '0');
const workshopPath = w => `/workshops/${w.slug}/`;
// 버튼 글 끝의 화살표: 마우스를 올리면 살짝 움직입니다.
const arrow = (dir = '→') => h` <span class="arrow" aria-hidden="true">${dir}</span>`;
// 캘린더에 넣을 행사 이름과 캘린더 파일(.ics) 주소. 파일은 build.mjs가 회차 폴더에 만듭니다.
export const eventTitle = w => `Workshop ${w.number} · ${w.title}`;
export const icsPath = w => `${workshopPath(w)}event.ics`;
export const eventDetails = (site, w) => `${w.summary}\n\n자세히 보기: ${site.url}${workshopPath(w)}`;
// 홈에 보여줄 다음 워크숍: 진행 중이거나 날짜가 정해진 다가오는 회차
export const upcomingWorkshop = workshops => workshops.find(w => ['live', 'scheduled'].includes(w.event.status) && w.event.start);
const checks = items => items?.length ? h`<ul class="checks">${items.map(item => h`<li>${item}</li>`)}</ul>` : '';
export const slidesOf = w => w.resources.find(r => r.kind === 'slides' && isUsableUrl(r.url));
// 수업 화면에서 이 단계(또는 선택지)의 '이 과제만' 보기에 넣을 슬라이드 페이지 ID: 과제 페이지, 없으면 시작 슬라이드 한 장
export const taskSlidesOf = item => (item.taskSlides?.length ? item.taskSlides : [item.slideId]).filter(Boolean).join(' ');

function scheduleText(item, timeZone) {
  return formatSchedule(item.event, timeZone) ?? '일정 준비 중';
}
const placeText = item => item.event?.place ?? (item.event?.start ? '장소 추후 안내' : '장소 준비 중');

// 카드에는 상태 칩 하나만: 모집 중 > 준비 중(자료 없음) > 행사 상태(날짜·진행 완료)
function cardStatus(w) {
  if (isRecruiting(w)) return eventBadge(w);
  if (w.materials === 'planning') return h`<span class="badge badge-planning">준비 중</span>`;
  return eventBadge(w);
}
const lockNote = w => h`<p class="opens"><span aria-hidden="true">🔒</span> 실습·슬라이드는 ${w.opensLabel}에 열려요</p>`;

// 홈의 주 행동: 신청 링크가 열린 회차 → 진행 중인 회차 실습 → 최근 회차 다시 해보기 순서.
export function primaryAction(workshops) {
  const recruiting = workshops.find(isRecruiting);
  if (recruiting) return { label: `Workshop ${recruiting.number} 신청하기`, url: recruiting.recruitment.url };
  const live = workshops.find(w => w.event.status === 'live' && w.materials === 'open');
  if (live) return { label: `Workshop ${live.number} 실습 시작하기`, url: workshopPath(live) };
  const done = workshops.filter(w => w.event.status === 'done' && w.materials === 'open').at(-1);
  if (done) return { label: `Workshop ${done.number} 다시 해보기`, url: workshopPath(done) };
  return { label: '학기 로드맵 보기', url: '/roadmap/' };
}

// 시작 전 확인 + 도움말. 도움말 내용은 template에 두고, main.js가 항목을 하나씩 강조하며 보여줍니다.
function helpStep(c) {
  return h`<section class="help-step">
  <h3>${c.title}</h3>
  <p class="help-why">${c.why}</p>
  ${c.steps?.length ? h`<ol class="help-steps step-list">${c.steps.map(step => h`<li><span>${step}</span></li>`)}</ol>` : ''}
  ${c.command ? copyBlock(c.command, '터미널에 입력', { code: true }) : ''}
  <p class="help-expect"><strong>이렇게 보이면 OK</strong> ${c.expect}</p>
  ${c.fixes?.length ? h`<div class="help-fix"><p><strong>안 될 때</strong></p><ul>${c.fixes.map(fix => h`<li>${fix}</li>`)}</ul></div>` : ''}
  ${c.extra ? copyBlock(c.extra.text, c.extra.label, { code: true }) : ''}
  ${c.tip ? h`<p class="hint">${c.tip}</p>` : ''}
  ${c.links?.length ? h`<p class="help-links">${c.links.map(l => link(l.url, l.label))}</p>` : ''}
</section>`;
}

function checkBox(w) {
  if (!w.checks.length) return '';
  const help = w.checkHelp?.length === w.checks.length;
  return h`<div class="box"${help ? raw(' data-check-guide') : ''}>
  <h2>시작 전 확인</h2>${checks(w.checks)}
  ${help ? h`<button type="button" class="help-start" hidden><span aria-hidden="true">?</span>도움말 · 하나씩 확인하기</button>
  <template>${w.checkHelp.map(helpStep)}</template>` : ''}
</div>`;
}

function trackCard(w) {
  const open = w.materials === 'open';
  const locked = w.materials === 'locked';
  const slides = slidesOf(w);
  return h`<article class="track c-${open || locked ? w.color : 'muted'}${open || locked ? '' : ' is-planning'} reveal">
  <div class="track-top">
    <span class="track-icon" aria-hidden="true"><span></span></span>
    <div class="track-name"><p class="track-kicker">Workshop ${pad(w.number)}</p><h3><a href="${workshopPath(w)}">${w.shortTitle}</a></h3></div>
    ${cardStatus(w)}
  </div>
  <p class="track-desc">${w.summary}</p>
  ${checks(w.highlights)}
  ${locked ? lockNote(w) : ''}
  <div class="track-actions">
    ${isRecruiting(w) ? link(w.recruitment.url, '신청하기', 'btn btn-fill') : ''}
    ${open ? h`<a class="btn ${isRecruiting(w) ? 'btn-ghost' : 'btn-fill'}" href="${workshopPath(w)}">실습 시작하기${arrow()}</a>` : h`<a class="btn btn-ghost" href="${workshopPath(w)}">${locked ? '준비물 보기' : '회차 소개'}</a>`}
    ${open && slides ? link(slides.url, '슬라이드', 'btn btn-ghost') : ''}
  </div>
</article>`;
}

function showcaseCard(showcase) {
  return h`<article class="track track-wide c-${showcase.color} reveal">
  <div class="track-top">
    <span class="track-icon" aria-hidden="true"><span></span></span>
    <div class="track-name"><p class="track-kicker">Showcase · 학기 마무리</p><h3><a href="/showcase/">${showcase.korean}</a></h3></div>
    ${eventBadge(showcase)}
  </div>
  <p class="track-desc">${showcase.description}</p>
  <div class="track-actions"><a class="btn btn-ghost" href="/showcase/">Showcase 안내</a></div>
</article>`;
}

function studioStrip(studio) {
  return h`<a class="strip reveal" href="/studio/">
  <span class="dot dot-navy" aria-hidden="true"></span>
  <span><strong>${studio.title}</strong> ${studio.next?.topic ? h`${studio.next.badge} · ${studio.next.topic}` : studio.message}</span>
  <span class="strip-arrow" aria-hidden="true">→</span>
</a>`;
}

function tracks(content) {
  return h`<div class="tracks-area"><div class="tracks">${content.workshops.map(trackCard)}${showcaseCard(content.showcase)}</div></div>
${studioStrip(content.studio)}`;
}

// 장소 지도: event.mapImage(네이버 지도 캡처)가 있으면 그 그림을 누르면 네이버 지도가 열리고, 없으면 Google 지도를 넣습니다.
function mapBlock(w, map) {
  if (!w.event.mapImage) {
    return h`<div class="map-frame"><iframe src="${map.embed}" title="${placeText(w)} 지도" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe></div>
      <div class="next-card-actions">${link(map.naver, '네이버 지도', 'btn btn-ghost btn-sm')}${link(map.kakao, '카카오맵', 'btn btn-ghost btn-sm')}</div>`;
  }
  return h`<a class="map-frame map-shot" href="${map.naver}" target="_blank" rel="noopener"><img src="${w.event.mapImage}" alt="${placeText(w)} 위치를 표시한 네이버 지도" width="1200" height="750" loading="lazy" decoding="async"><span class="map-open">네이버 지도 ↗</span><span class="sr-only"> (새 창)</span></a>
      <p class="map-meta"><span>© NAVER Corp.</span>${link(map.kakao, '카카오맵')}</p>`;
}

// 홈의 다음 워크숍: 날짜는 달력, 장소는 지도로 보여줍니다. 남은 날(D-day)은 main.js가 그날 기준으로 채웁니다.
function nextWorkshop(content) {
  const { site, workshops } = content;
  const w = upcomingWorkshop(workshops);
  if (!w) {
    return h`<section class="next-ws reveal" aria-labelledby="next-ws-title">
  <p class="track-kicker">다음 워크숍</p>
  <h2 id="next-ws-title">다음 워크숍 일정을 준비하고 있어요</h2>
  <p class="track-desc">날짜와 장소가 정해지면 이곳에 달력과 지도로 안내해요. 그동안 지난 회차 실습을 혼자 따라 해 보세요.</p>
  <div class="actions"><a class="btn btn-ghost" href="/workshops/">전체 워크숍 보기${arrow()}</a></div>
</section>`;
  }
  const live = w.event.status === 'live';
  const map = w.event.mapQuery ? mapLinks(w.event.mapQuery) : null;
  return h`<section class="next-ws c-${w.color} reveal" aria-labelledby="next-ws-title">
  <div class="next-ws-head">
    <p class="track-kicker">다음 워크숍 ${eventBadge(w)}<span class="dday" data-dday="${w.event.start}" hidden></span></p>
    <h2 id="next-ws-title"><a href="${workshopPath(w)}">Workshop ${pad(w.number)} · ${w.title}</a></h2>
  </div>
  <div class="next-ws-grid">
    <div class="next-card cal-card">
      <p class="next-card-main">${scheduleText(w, site.timeZone)}</p>
      ${monthCalendar(w.event, site.timeZone, eventTitle(w))}
      <div class="next-card-actions">
        ${link(googleCalendarUrl({ title: eventTitle(w), event: w.event, details: eventDetails(site, w) }), 'Google 캘린더', 'btn btn-ghost btn-sm')}
        <a class="btn btn-ghost btn-sm" href="${icsPath(w)}" download="workshop-${w.slug}.ics">아이폰·아웃룩</a>
      </div>
    </div>
    <div class="next-card map-card">
      <p class="next-card-main">${placeText(w)}</p>
      ${map ? mapBlock(w, map) : ''}
    </div>
  </div>
  <div class="actions">
    ${isRecruiting(w) ? link(w.recruitment.url, h`신청하기${arrow()}`, 'btn btn-fill') : ''}
    ${live && w.materials === 'open'
      ? h`<a class="btn btn-fill" href="${workshopPath(w)}">실습 시작하기${arrow()}</a>`
      : h`<a class="btn btn-ghost" href="${workshopPath(w)}">자세히 보기${arrow()}</a>`}
  </div>
</section>`;
}

export function homePage(content) {
  const { site, workshops, projects } = content;
  const primary = primaryAction(workshops);
  // 홈 오른쪽에는 공개된 학생 프로젝트만 보여줍니다. 운영진 예제는 Showcase·회차 페이지에서 봐요.
  const featured = projects.find(p => p.kind === 'student' && p.published);
  // 배너 그림의 지구 자리에 돌아가는 지구(home.js)를 겹칩니다. 스크립트가 없으면 그림만 보여요.
  return h`<figure class="banner" data-globe><img src="/images/brand/banner-2000.jpg" srcset="/images/brand/banner-1000.jpg 1000w, /images/brand/banner-2000.jpg 2000w" sizes="(min-width: 1024px) calc(100vw - 340px), 100vw" width="2000" height="770" alt="OpenAI Student Collective, Seoul National University 배너" fetchpriority="high"><canvas class="globe" aria-hidden="true"></canvas><p class="globe-tip" aria-hidden="true" hidden>끌어서 돌려 보세요</p></figure>
<section class="hero${featured ? ' has-shot' : ''}">
  ${featured ? h`<figure class="hero-shot">
    <div class="shot-frame"><img src="${featured.image}" alt="${featured.alt}" width="1280" height="800" loading="lazy" decoding="async"></div>
    <figcaption>${featured.title}</figcaption>
  </figure>` : ''}
  <div class="hero-copy">
  <p class="hero-pill"><span class="dots" aria-hidden="true"><i></i><i></i><i></i><i></i></span>${site.operators.role} · ${site.semester}</p>
  <h1>아이디어를 직접 구현하고,<br><em>사람들에게 공유해요.</em></h1>
  <p class="hero-lead">ChatGPT·Codex로 한 학기 동안 내 서비스를 만들어요.</p>
  <div class="actions">
    ${link(primary.url, h`${primary.label}${arrow()}`, 'btn btn-primary')}
    <a class="btn btn-ghost" href="/roadmap/">학기 과정 한눈에 보기</a>
  </div>
  </div>
</section>
${nextWorkshop(content)}
${studioStrip(content.studio)}`;
}

export function workshopsPage(content) {
  return h`<header class="page-head">
  <h1>전체 워크숍</h1>
  <p class="lead">끝난 회차도 자료는 계속 열려 있어요. 혼자서도 따라 할 수 있어요.</p>
</header>
${tracks(content)}`;
}

export function roadmapPage(content) {
  const { site, workshops, showcase, studio } = content;
  const next = workshops.find(w => w.event.status !== 'done');
  const steps = [
    ...workshops.map(w => ({ kicker: `Workshop ${w.number}`, title: w.shortTitle, outcome: w.outcome, url: workshopPath(w), color: w.materials === 'planning' ? 'muted' : w.color, status: cardStatus(w), item: w })),
    { kicker: 'Showcase', title: showcase.korean, outcome: showcase.outcome, url: '/showcase/', color: showcase.color, status: eventBadge(showcase), item: showcase }
  ];
  return h`<header class="page-head">
  <h1>학기 로드맵</h1>
  <p class="lead">워크숍 4번과 매주 월요일 Studio Session, 마지막에 Showcase. 중간에 합류해도 괜찮아요.</p>
</header>
<ol class="timeline">
  ${steps.map((s, i) => h`${i > 0 && i < steps.length ? h`<li class="tl-studio"><a href="/studio/">${studio.title}</a></li>` : ''}<li class="tl reveal c-${s.color}${s.item === next ? ' is-next' : ''}">
    <span class="tl-dot" aria-hidden="true"></span>
    <div class="tl-body">
      <p class="track-kicker">${s.kicker} ${s.status}${s.item === next ? h` <span class="badge badge-next">다음 단계</span>` : ''}</p>
      <h2><a href="${s.url}">${s.title}</a></h2>
      ${s.outcome ? h`<p class="tl-outcome">남는 것 · ${s.outcome}</p>` : ''}
      ${s.item.event?.start ? h`<p class="tl-date">${formatSchedule(s.item.event, site.timeZone)}</p>` : ''}
    </div>
  </li>`)}
</ol>`;
}

// "1. …" 줄로만 된 힌트(자세한 따라하기)는 Step 1, Step 2… 목록으로 보여줍니다.
function hintText(text) {
  const lines = String(text).split('\n');
  if (!lines.every(line => /^\d+\. /.test(line))) return richText(text);
  return h`<ol class="step-list">${lines.map(line => h`<li><span>${richText(line.replace(/^\d+\. /, ''))}</span></li>`)}</ol>`;
}

// 단계별 힌트: 처음에는 힌트 1만 보이고, 앞 힌트를 열면 다음 힌트가 나타납니다(main.js).
// 스크립트가 없으면 모든 힌트가 접힌 채로 보입니다. 힌트가 3개면 마지막은 자세한 따라하기입니다.
// 화면으로 따라 하기: 실제 화면 캡처에서 누를 곳을 강조해 한 단계씩 보여줍니다(main.js가 창을 띄움).
// 단계 데이터는 data-walk에 담고, 스크립트가 없을 때를 위해 같은 내용을 글 목록으로도 둡니다.
function walkthrough(walk) {
  if (!walk?.steps?.length) return '';
  const steps = walk.steps.map(s => ({ image: s.image ?? null, box: s.box ?? null, text: String(richText(s.text)), note: s.note ?? '', blank: s.blank ?? null }));
  return h`<div class="walk" data-walk="${JSON.stringify(steps)}" data-walk-title="${walk.title}">
      <button type="button" class="walk-open" data-walk-open hidden><span class="walk-icon" aria-hidden="true">🎬</span><span><strong>화면으로 따라 하기</strong><small>${walk.title} · ${walk.steps.length}단계</small></span><span class="arrow" aria-hidden="true">→</span></button>
      <details class="walk-list"><summary>화면 따라 하기를 글로 보기</summary><ol class="step-list">${walk.steps.map(s => h`<li><span>${richText(s.text)}${s.note ? h` <small>${s.note}</small>` : ''}</span></li>`)}</ol></details>
    </div>`;
}

// 수업 화면에서는 힌트마다 '관련 실습 페이지 보기'(pages[i])가 붙어, 누르면 슬라이드 보기가 그 과제 페이지로 넘어갑니다(learn.js).
function hintBox(hints, walk, pages = []) {
  if (!hints?.length && !walk) return '';
  const label = i => i === 2 ? '힌트 3 · 자세한 따라하기' : h`힌트 ${i + 1} <span class="hint-verb">보기</span>`;
  return h`<div class="hints" data-hints>
      <p class="hints-title"><span aria-hidden="true">💡</span> 막히면 힌트를 열어 보세요</p>
      ${walkthrough(walk)}
      ${(hints ?? []).map((text, i) => h`<details class="hint" data-hint="${i + 1}"><summary>${label(i)}</summary><div class="hint-text">${pages[i] ? h`<button type="button" class="hint-jump" data-slide-jump="${pages[i]}">관련 실습 페이지 보기 <span aria-hidden="true">↑</span></button>` : ''}${hintText(text)}</div></details>`)}
    </div>`;
}

// 미션 본문: 수업 화면(/learn/)의 단계마다 씁니다. 공개 회차 페이지는 단계 제목만 보여주고 수업 화면으로 보냅니다.
// 설명 글(todo·expected·verify·stuck·needs·hints)은 [글](주소) 링크를 쓸 수 있고, 요청문·명령은 그대로 복사됩니다.
export function missionBody(m) {
  const jumps = item => item.hintSlides ?? [];
  return h`<p>${richText(m.todo)}</p>
    ${m.prompt ? copyBlock(m.prompt) : ''}
    ${m.commands ? copyBlock(m.commands, '터미널 명령 (한 줄씩 실행)', { code: true }) : ''}
    ${m.options ? h`<div class="options">${m.options.map(o => h`<details class="option"${taskSlidesOf(o) ? h` data-task-slides="${taskSlidesOf(o)}"` : ''}>
      <summary>${o.label}</summary>
      <p class="hint">먼저 필요한 것: ${richText(o.needs)}</p>
      ${copyBlock(o.prompt)}
      <p>${link(o.guide, '자세한 안내')}</p>
      ${hintBox(o.hints, o.walkthrough, jumps(o))}
    </details>`)}</div>` : ''}
    ${hintBox(m.hints, m.walkthrough, jumps(m))}
    <div class="result">
      <p><strong>예상 결과</strong>${richText(m.expected)}</p>
      ${m.verify?.length ? h`<div><strong>확인</strong>${checks(m.verify.map(richText))}</div>` : ''}
    </div>
    ${m.stuck?.length ? h`<details class="stuck"><summary>막혔을 때</summary><ul>${m.stuck.map(s => h`<li>${richText(s)}</li>`)}</ul></details>` : ''}`;
}

// 실습은 수업 듣기(/learn/)에서만 합니다. 회차 페이지에는 그리로 가는 큰 카드와 단계 제목만 둡니다.
const lessonHref = w => `/learn/${w.slug}/`;
function lessonCard(w) {
  return h`<a class="learn-card" href="${lessonHref(w)}">
  <span class="learn-icon" aria-hidden="true">▶</span>
  <span class="learn-text">
    <strong>수업 듣기에서 실습하기</strong>
    <span class="learn-steps">${w.missions.map((m, i) => h`<span>${pad(i + 1)} ${m.title}</span>`)}</span>
  </span>
  <span class="res-go" aria-hidden="true">→</span>
</a>`;
}

// 자료는 눌러 보고 싶은 카드로: 종류별 아이콘, 마우스를 올리면 떠오르고 화살표가 움직입니다.
const resourceIcons = { demo: '🖥️', starter: '📦', guide: '📘', slides: '📑' };
function resourceCard(r) {
  if (!isUsableUrl(r.url)) return '';
  const external = isExternal(r.url);
  return h`<li><a class="res-card${r.kind === 'demo' ? ' is-demo' : ''}" href="${r.url}"${external ? raw(' target="_blank" rel="noopener"') : ''}>
  <span class="res-icon" aria-hidden="true">${resourceIcons[r.kind] ?? '🔗'}</span>
  <span class="res-text"><strong>${r.label}</strong>${r.audience === 'presenter' ? h` <span class="badge badge-presenter">발표 자료</span>` : ''}${r.note ? h`<small>${r.note}</small>` : ''}</span>
  <span class="res-go" aria-hidden="true">${external ? '↗' : '→'}</span>${external ? raw('<span class="sr-only"> (새 창)</span>') : ''}
</a></li>`;
}

export function workshopPage(content, w) {
  const { site, workshops } = content;
  const index = workshops.indexOf(w);
  const prev = workshops[index - 1];
  const next = workshops[index + 1];
  const open = w.materials === 'open';
  const locked = w.materials === 'locked';
  const color = w.materials === 'planning' ? 'muted' : w.color;
  const pager = h`<nav class="pager" aria-label="다른 회차">
  ${prev ? h`<a href="${workshopPath(prev)}">← Workshop ${pad(prev.number)}</a>` : raw('<span></span>')}
  ${next ? h`<a href="${workshopPath(next)}">Workshop ${pad(next.number)} →</a>` : h`<a href="/showcase/">Showcase →</a>`}
</nav>`;
  const head = h`<nav class="crumbs" aria-label="현재 위치"><a href="/workshops/">워크숍</a> › Workshop ${pad(w.number)}</nav>
<header class="detail-head c-${color}">
  <p class="track-kicker">Workshop ${pad(w.number)} ${cardStatus(w)}</p>
  <h1>${w.title}</h1>
  <p class="lead">${w.summary}</p>
  ${open || isRecruiting(w) ? h`<div class="actions">
    ${isRecruiting(w) ? link(w.recruitment.url, '신청하기', 'btn btn-fill') : ''}
    ${open && w.missions.length ? h`<a class="btn ${isRecruiting(w) ? 'btn-ghost' : 'btn-fill'}" href="${lessonHref(w)}">수업 듣기에서 실습하기${arrow()}</a>` : ''}
  </div>` : ''}
  <dl class="info">
    <div><dt>일정</dt><dd>${scheduleText(w, site.timeZone)}</dd></div>
    <div><dt>장소</dt><dd>${placeText(w)}</dd></div>
    ${w.audience ? h`<div><dt>대상</dt><dd>${w.audience}</dd></div>` : ''}
  </dl>
</header>`;

  if (locked) {
    return h`<div class="c-${color}">${head}
<section class="pending locked">
  <h2><span aria-hidden="true">🔒</span> 실습과 슬라이드는 ${w.opensLabel}에 열려요</h2>
</section>
<section class="block reveal two">
  ${w.prepare.length ? h`<div class="box"><h2>준비물</h2>${checks(w.prepare)}</div>` : ''}
  ${checkBox(w)}
</section>
${pager}</div>`;
  }

  if (!open) {
    const latest = workshops.filter(x => x.materials === 'open').at(-1);
    return h`<div class="c-${color}">${head}
<section class="pending">
  <h2>이 회차는 준비하고 있어요</h2>
  ${w.outcome ? h`<p>목표: <strong>${w.outcome}</strong></p>
  <p class="hint">세부 내용은 확정되면 이 페이지에서 안내해요.</p>` : h`<p class="hint">주제와 일정이 정해지면 이 페이지에서 안내해요.</p>`}
  <div class="actions">${latest ? h`<a class="btn btn-primary" href="${workshopPath(latest)}">Workshop ${latest.number} 실습하기</a>` : ''}<a class="btn btn-ghost" href="/roadmap/">학기 로드맵</a></div>
</section>
${pager}</div>`;
  }

  const resources = w.resources.filter(r => isUsableUrl(r.url));
  return h`<div class="c-${color}">${head}

<section class="block reveal" id="materials">
  <h2>실습과 자료</h2>
  ${w.missions.length ? lessonCard(w) : ''}
  ${resources.length ? h`<ul class="res-cards">${resources.map(resourceCard)}</ul>` : ''}
</section>

<section class="block reveal">
  ${video(w) || figure(w.preview)}
</section>

<section class="block reveal two">
  ${w.prepare.length ? h`<div class="box"><h2>준비물</h2>${checks(w.prepare)}</div>` : ''}
  ${checkBox(w)}
</section>

<section class="block reveal">
  <details class="mission more" id="help">
    <summary><span class="mission-no">?</span><span class="mission-title">막혔을 때</span></summary>
    <div class="mission-body">
      <p>무엇을 했고 무엇이 보이는지 Codex에 그대로 설명하세요. 비밀번호·API 키는 가려 주세요.</p>
      ${w.help?.prompt ? copyBlock(w.help.prompt, '오류를 설명하는 요청문') : ''}
      <p>${w.help?.guide ? h`${link(w.help.guide, '문제 해결 안내')} · ` : ''}<a href="/studio/">Studio Session에서 같이 풀기</a></p>
    </div>
  </details>
</section>

${w.share ? h`<section class="block reveal next-box">
  <h2>완료 목표</h2>
  <p class="goal">${w.share}</p>
  <div class="actions"><a class="btn btn-ghost" href="/studio/">Studio Session</a>${next ? h`<a class="btn btn-ghost" href="${workshopPath(next)}">다음 회차${arrow()}</a>` : ''}</div>
</section>` : ''}
${pager}</div>`;
}

function sessionRow(s, timeZone) {
  const done = s.status === 'done';
  return h`<li class="session${done ? ' is-done' : ''}">
  <p class="session-time">${formatSchedule(s, timeZone)}${done ? h` <span class="badge badge-done">진행 완료</span>` : s.status === 'live' ? h` <span class="badge badge-open">진행 중</span>` : ''}</p>
  <p class="hint">${[s.note, s.topic, done ? null : s.place ?? '장소 추후 안내'].filter(Boolean).join(' · ')}</p>
  ${s.slides ? h`<p class="hint">${link(s.slides, '세션 슬라이드')}</p>` : ''}
</li>`;
}

export function studioPage(content) {
  const { site, studio } = content;
  const { next, sessions } = studio;
  return h`<header class="detail-head c-navy">
  <p class="track-kicker">${studio.korean} ${eventBadge(studio)}</p>
  <h1>${studio.title}</h1>
  <p class="lead">${studio.description}</p>
  <p><strong>${studio.optionalNote}</strong></p>
  <p class="hint">${studio.timingNote}</p>
  ${isUsableUrl(site.links.openChat) ? h`<div class="actions">${link(site.links.openChat, '오픈채팅에서 일정 받기', 'btn btn-primary')}</div>` : ''}
</header>
${next?.topic ? h`<section class="block reveal next-session">
  <p class="next-label">다음 세션 · ${next.badge}${next.tag ? h` <span class="badge badge-open">${next.tag}</span>` : ''}</p>
  <h2>${next.topic}</h2>
  <p>${next.detail}</p>
  ${next.call ? h`<p class="next-call">${next.call}</p>` : ''}
  <p class="hint">${formatSchedule(next, site.timeZone)} · ${[next.note, next.place ?? '장소 추후 안내'].filter(Boolean).join(' · ')}</p>
  ${next.slides ? h`<div class="actions">${link(next.slides, '📑 세션 슬라이드 보기', 'btn btn-primary')}</div>` : ''}
</section>` : ''}
<section class="block reveal two">
  <div class="box">
    <h2>일정 <small class="hint">${studio.cadence}</small></h2>
    ${sessions.length
      ? h`<ul class="sessions">${sessions.map(s => sessionRow(s, site.timeZone))}</ul>`
      : h`<p class="hint">준비 중이에요. 정해지면 이곳에 안내할게요.</p>`}
  </div>
  <div class="box"><h2>가져올 것</h2>${checks(studio.bring)}</div>
</section>
<section class="block reveal">
  <h2>질문 정리 틀</h2>
  ${copyBlock(studio.question, '이 틀에 맞춰 적어 오세요')}
  <p class="hint">${studio.caution}</p>
</section>`;
}

export function projectCard(p) {
  return h`<article class="project reveal">
  ${p.image ? h`<div class="shot-frame"><img src="${p.image}" alt="${p.alt}" width="1280" height="800" loading="lazy" decoding="async"></div>` : ''}
  <div class="project-body">
    <p>${p.kind === 'operator' ? h`<span class="tag-operator">운영진 예제</span>` : h`<span class="badge badge-materials">학생 프로젝트</span>`}</p>
    <h3>${p.title}</h3>
    <p class="hint">${p.problem}</p>
    <p class="hint">${p.stage}${p.maker ? ` · 만든 사람 ${p.maker}` : ''}</p>
    ${p.links?.length ? h`<p class="card-links">${p.links.map(l => link(l.url, l.label))}</p>` : ''}
  </div>
</article>`;
}

export function showcasePage(content) {
  const { showcase, projects } = content;
  const student = projects.filter(p => p.kind === 'student' && p.published);
  const operator = projects.filter(p => p.kind === 'operator' && p.published);
  return h`<header class="detail-head c-${showcase.color}">
  <p class="track-kicker">${showcase.korean} ${eventBadge(showcase)}</p>
  <h1>${showcase.title}</h1>
  <p class="lead">${showcase.description}</p>
  <p class="hint">${showcase.timingNote}</p>
</header>
<section class="block reveal">
  <h2>학생 프로젝트</h2>
  ${student.length
    ? h`<div class="projects">${student.map(projectCard)}</div>`
    : h`<div class="empty"><strong>학생 프로젝트는 준비되는 대로 소개합니다.</strong><p class="hint">공개하고 싶다면 Studio Session에서 알려주세요. 동의한 프로젝트만 올려요.</p></div>`}
</section>
<section class="block reveal">
  <h2>운영진 예제</h2>
  <div class="projects">${operator.map(projectCard)}</div>
</section>`;
}

export function aboutPage(content) {
  const { site, workshops, collaboration } = content;
  const done = workshops.filter(w => w.event.status === 'done');
  return h`<header class="page-head">
  <h1>운영·협력 안내</h1>
  <p class="lead">${site.name}는 서울대학교 학생이 직접 만들고 공유하는 경험을 돕는 학생 프로그램이에요.</p>
</header>
<section class="block reveal two">
  <div class="box">
    <h2>운영</h2>
    <p>${site.operators.role} ${site.operators.names.join('·')}</p>
    <p class="hint">${site.supportNotice}</p>
  </div>
  <div class="box">
    <h2>진행 기록</h2>
    ${done.length
      ? h`<ul class="checks">${done.map(w => h`<li><a href="${workshopPath(w)}">Workshop ${pad(w.number)}</a> · ${formatSchedule(w.event, site.timeZone)}<br><small>${w.event.place}</small></li>`)}</ul>`
      : h`<p class="hint">첫 회차를 준비하고 있어요.</p>`}
  </div>
</section>
<section class="block reveal">
  <h2>함께하는 팀</h2>
  <ul class="collab">${collaboration.map(c => h`<li><strong>${c.who}</strong><span>${c.what}</span></li>`)}</ul>
</section>
<section class="block reveal">
  <h2>문의</h2>
  ${isUsableUrl(site.links.contact)
    ? h`<div class="actions">${link(site.links.contact, '협력 문의하기', 'btn btn-primary')}</div>`
    : h`<p class="empty">협력 문의 채널은 준비 중이에요. 확정되면 이 자리에 안내합니다.</p>`}
  ${isUsableUrl(site.links.openChat) ? h`<p>${link(site.links.openChat, '학생 커뮤니티 오픈채팅')}</p>` : ''}
</section>`;
}

export function notFoundPage() {
  return h`<header class="page-head">
  <h1>페이지를 찾을 수 없어요</h1>
  <p class="lead">주소가 바뀌었거나 아직 준비되지 않은 페이지예요.</p>
  <div class="actions"><a class="btn btn-primary" href="/">처음으로</a><a class="btn btn-ghost" href="/workshops/">전체 워크숍</a></div>
</header>`;
}
