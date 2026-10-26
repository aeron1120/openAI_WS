import { h, raw, link, isUsableUrl, isRecruiting, eventBadge, formatSchedule, copyBlock, figure, video } from './render.mjs';

const pad = n => String(n).padStart(2, '0');
const workshopPath = w => `/workshops/${w.slug}/`;
const checks = items => items?.length ? h`<ul class="checks">${items.map(item => h`<li>${item}</li>`)}</ul>` : '';
const slidesOf = w => w.resources.find(r => r.audience === 'presenter' && isUsableUrl(r.url));
const demoOf = w => w.resources.find(r => r.kind === 'demo' && isUsableUrl(r.url));

function scheduleText(item, timeZone) {
  return formatSchedule(item.event, timeZone) ?? '일정 안내 예정';
}

// 카드에는 상태 칩 하나만: 모집 중 > 준비 중(자료 없음) > 행사 상태
function cardStatus(w) {
  if (isRecruiting(w)) return eventBadge(w);
  if (w.materials && w.materials !== 'open') return h`<span class="badge badge-planning">준비 중</span>`;
  return eventBadge(w);
}

// 홈의 주 행동: 실제 신청 링크가 열린 회차가 있을 때만 신청을 앞세우고, 없으면 최근 회차 다시 해보기.
export function primaryAction(workshops) {
  const recruiting = workshops.find(isRecruiting);
  if (recruiting) return { label: `Workshop ${recruiting.number} 신청하기`, url: recruiting.recruitment.url };
  const done = workshops.filter(w => w.event.status === 'done' && w.materials === 'open').at(-1);
  if (done) return { label: `Workshop ${done.number} 다시 해보기`, url: workshopPath(done) };
  return { label: '학기 로드맵 보기', url: '/roadmap/' };
}

function trackCard(w) {
  const open = w.materials === 'open';
  const slides = slidesOf(w);
  return h`<article class="track c-${open ? w.color : 'muted'}${open ? '' : ' is-planning'}">
  <div class="track-top">
    <span class="track-icon" aria-hidden="true"><span></span></span>
    <div class="track-name"><p class="track-kicker">Workshop ${pad(w.number)}</p><h3><a href="${workshopPath(w)}">${w.shortTitle}</a></h3></div>
    ${cardStatus(w)}
  </div>
  <p class="track-desc">${w.summary}</p>
  ${checks(w.highlights)}
  <div class="track-actions">
    ${isRecruiting(w) ? link(w.recruitment.url, '신청하기', 'btn btn-fill') : ''}
    ${open ? h`<a class="btn ${isRecruiting(w) ? 'btn-ghost' : 'btn-fill'}" href="${workshopPath(w)}">실습 시작하기 →</a>` : h`<a class="btn btn-ghost" href="${workshopPath(w)}">회차 소개</a>`}
    ${open && slides ? link(slides.url, '슬라이드', 'btn btn-ghost') : ''}
  </div>
</article>`;
}

function showcaseCard(showcase) {
  return h`<article class="track track-wide c-${showcase.color}">
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
  return h`<a class="strip" href="/studio/">
  <span class="dot dot-navy" aria-hidden="true"></span>
  <span><strong>${studio.title}</strong> ${studio.message}</span>
  <span class="strip-arrow" aria-hidden="true">→</span>
</a>`;
}

function tracks(content) {
  return h`<div class="tracks-area"><div class="tracks">${content.workshops.map(trackCard)}${showcaseCard(content.showcase)}</div></div>
${studioStrip(content.studio)}`;
}

export function homePage(content) {
  const { site, workshops, projects } = content;
  const primary = primaryAction(workshops);
  const featured = projects.find(p => p.kind === 'student' && p.published) ?? projects.find(p => p.kind === 'operator' && p.published);
  return h`<section class="hero">
  ${featured ? h`<figure class="hero-shot">
    <div class="shot-frame"><img src="${featured.image}" alt="${featured.alt}" width="1280" height="800" loading="lazy" decoding="async"></div>
    <figcaption>${featured.kind === 'operator' ? h`<span class="tag-operator">운영진 예제</span> ` : ''}${featured.title}</figcaption>
  </figure>` : ''}
  <div class="hero-copy">
  <p class="hero-pill"><span class="dots" aria-hidden="true"><i></i><i></i><i></i><i></i></span>${site.operators.role} · ${site.semester}</p>
  <h1>아이디어를 만들고 공유하고,<br><em>사람들 앞에서 소개해요.</em></h1>
  <p class="hero-lead">ChatGPT·Codex로 한 학기 동안 내 서비스를 만들어요.</p>
  <ul class="tags" aria-label="프로그램 특징"><li>전공 무관</li><li>코딩 경험 없어도 OK</li><li>워크숍 4회 + Showcase</li></ul>
  <div class="actions">
    ${link(primary.url, `${primary.label} →`, 'btn btn-primary')}
    <a class="btn btn-ghost" href="/roadmap/">학기 과정 한눈에 보기</a>
  </div>
  </div>
</section>
<section aria-label="학기 과정">
${tracks(content)}
</section>`;
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
    ...workshops.map(w => ({ kicker: `Workshop ${w.number}`, title: w.shortTitle, outcome: w.outcome, url: workshopPath(w), color: w.materials === 'open' ? w.color : 'muted', status: cardStatus(w), item: w })),
    { kicker: 'Showcase', title: showcase.korean, outcome: showcase.outcome, url: '/showcase/', color: showcase.color, status: eventBadge(showcase), item: showcase }
  ];
  return h`<header class="page-head">
  <h1>학기 로드맵</h1>
  <p class="lead">워크숍 4번, 그 사이마다 Studio Session, 마지막에 Showcase. 중간에 합류해도 괜찮아요.</p>
</header>
<ol class="timeline">
  ${steps.map((s, i) => h`${i > 0 && i < steps.length ? h`<li class="tl-studio"><a href="/studio/">${studio.title}</a></li>` : ''}<li class="tl c-${s.color}${s.item === next ? ' is-next' : ''}">
    <span class="tl-dot" aria-hidden="true"></span>
    <div class="tl-body">
      <p class="track-kicker">${s.kicker} ${s.status}${s.item === next ? h` <span class="badge badge-next">다음 단계</span>` : ''}</p>
      <h2><a href="${s.url}">${s.title}</a></h2>
      <p class="tl-outcome">남는 것 · ${s.outcome}</p>
      ${s.item.event?.start ? h`<p class="tl-date">${formatSchedule(s.item.event, site.timeZone)}</p>` : ''}
    </div>
  </li>`)}
</ol>`;
}

function missionBlock(m, index) {
  return h`<details class="mission" id="mission-${m.id}" ${index === 0 ? raw('open') : ''}>
  <summary><span class="mission-no">${index + 1}</span><span class="mission-title">${m.title}</span></summary>
  <div class="mission-body">
    <p>${m.todo}</p>
    ${m.prompt ? copyBlock(m.prompt) : ''}
    ${m.commands ? copyBlock(m.commands, '터미널 명령 (한 줄씩 실행)', { code: true }) : ''}
    ${m.options ? h`<div class="options">${m.options.map(o => h`<details class="option">
      <summary>${o.label}</summary>
      <p class="hint">먼저 필요한 것: ${o.needs}</p>
      ${copyBlock(o.prompt)}
      <p>${link(o.guide, '자세한 안내')}</p>
    </details>`)}</div>` : ''}
    <div class="result">
      <p><strong>예상 결과</strong>${m.expected}</p>
      ${m.verify?.length ? h`<div><strong>확인</strong>${checks(m.verify)}</div>` : ''}
    </div>
    ${m.stuck?.length ? h`<details class="stuck"><summary>막혔을 때</summary><ul>${m.stuck.map(s => h`<li>${s}</li>`)}</ul></details>` : ''}
  </div>
</details>`;
}

function resourceRow(r) {
  if (!isUsableUrl(r.url)) return '';
  return h`<li>
  ${link(r.url, r.label, 'res-link')}
  ${r.audience === 'presenter' ? h`<span class="badge badge-presenter">발표 자료</span>` : ''}
  ${r.note ? h`<small>${r.note}</small>` : ''}
</li>`;
}

export function workshopPage(content, w) {
  const { site, workshops } = content;
  const index = workshops.indexOf(w);
  const prev = workshops[index - 1];
  const next = workshops[index + 1];
  const open = w.materials === 'open';
  const color = open ? w.color : 'muted';
  const demo = demoOf(w);
  const slides = slidesOf(w);
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
    ${open ? h`<a class="btn ${isRecruiting(w) ? 'btn-ghost' : 'btn-fill'}" href="#missions">실습 시작하기 ↓</a>` : ''}
    ${demo ? link(demo.url, '예제 열기', 'btn btn-ghost') : ''}
    ${slides ? link(slides.url, '발표 슬라이드', 'btn btn-ghost') : ''}
  </div>` : ''}
  <dl class="info">
    <div><dt>일정</dt><dd>${scheduleText(w, site.timeZone)}</dd></div>
    <div><dt>장소</dt><dd>${w.event.place ?? '장소 미정'}</dd></div>
    ${w.duration ? h`<div><dt>시간</dt><dd>${w.duration}</dd></div>` : ''}
    ${w.audience ? h`<div><dt>대상</dt><dd>${w.audience}</dd></div>` : ''}
  </dl>
</header>`;

  if (!open) {
    const latest = workshops.filter(x => x.materials === 'open').at(-1);
    return h`<div class="c-${color}">${head}
<section class="pending">
  <h2>이 회차는 준비하고 있어요</h2>
  <p>목표: <strong>${w.outcome}</strong></p>
  <p class="hint">세부 내용은 확정되면 이 페이지에서 안내해요.</p>
  <div class="actions">${latest ? h`<a class="btn btn-primary" href="${workshopPath(latest)}">Workshop ${latest.number} 실습하기</a>` : ''}<a class="btn btn-ghost" href="/roadmap/">학기 로드맵</a></div>
</section>
${pager}</div>`;
  }

  const resources = w.resources.filter(r => isUsableUrl(r.url));
  return h`<div class="c-${color}">${head}
${w.joinNote ? h`<p class="note">${w.joinNote}</p>` : ''}

<section class="block">
  ${video(w) || figure(w.preview)}
</section>

<section class="block two">
  ${w.prepare.length ? h`<div class="box"><h2>준비물</h2>${checks(w.prepare)}</div>` : ''}
  ${w.checks.length ? h`<div class="box"><h2>시작 전 확인</h2>${checks(w.checks)}</div>` : ''}
</section>

${w.missions.length ? h`<section class="block" id="missions">
  <h2>단계별 미션</h2>
  <p class="hint">단계를 눌러 펼쳐요. 요청문은 복사해서 Codex에 붙여 넣으세요.</p>
  ${w.missions.map(missionBlock)}
</section>` : ''}

<section class="block">
  ${w.apply ? h`<details class="mission more">
    <summary><span class="mission-no">+</span><span class="mission-title">${w.apply.title}</span></summary>
    <div class="mission-body"><p>${w.apply.body}</p>${w.apply.prompt ? copyBlock(w.apply.prompt, '빈칸을 내 아이디어로 바꿔 쓰세요') : ''}</div>
  </details>` : ''}
  <details class="mission more" id="help">
    <summary><span class="mission-no">?</span><span class="mission-title">막혔을 때</span></summary>
    <div class="mission-body">
      <p>무엇을 했고 무엇이 보이는지 Codex에 그대로 설명하세요. 비밀번호·API 키는 가려 주세요.</p>
      ${w.help?.prompt ? copyBlock(w.help.prompt, '오류를 설명하는 요청문') : ''}
      <p>${w.help?.guide ? h`${link(w.help.guide, '문제 해결 안내')} · ` : ''}<a href="/studio/">Studio Session에서 같이 풀기</a></p>
    </div>
  </details>
</section>

${resources.length ? h`<section class="block" id="materials">
  <h2>자료</h2>
  <ul class="res-list">${resources.map(resourceRow)}</ul>
</section>` : ''}

${w.share ? h`<section class="block next-box">
  <h2>다 했다면</h2>
  <p>${w.share}</p>
  <div class="actions"><a class="btn btn-ghost" href="/studio/">Studio Session</a>${next ? h`<a class="btn btn-ghost" href="${workshopPath(next)}">다음 회차 →</a>` : ''}</div>
</section>` : ''}
${pager}</div>`;
}

export function studioPage(content) {
  const { site, studio } = content;
  const sessions = studio.sessions.filter(s => s.start);
  return h`<header class="detail-head c-navy">
  <p class="track-kicker">${studio.korean} ${eventBadge(studio)}</p>
  <h1>${studio.title}</h1>
  <p class="lead">${studio.description}</p>
  ${isUsableUrl(site.links.openChat) ? h`<div class="actions">${link(site.links.openChat, '오픈채팅에서 일정 받기', 'btn btn-primary')}</div>` : ''}
</header>
<section class="block two">
  <div class="box">
    <h2>일정</h2>
    ${sessions.length
      ? checks(sessions.map(s => `${formatSchedule(s, site.timeZone)} · ${s.place ?? '장소 미정'}`))
      : h`<p class="hint">일정 안내 예정 · 장소 미정</p>`}
  </div>
  <div class="box"><h2>가져올 것</h2>${checks(studio.bring)}</div>
</section>
<section class="block">
  <h2>질문 정리 틀</h2>
  ${copyBlock(studio.question, '이 틀에 맞춰 적어 오세요')}
  <p class="hint">${studio.caution}</p>
</section>`;
}

export function projectCard(p) {
  return h`<article class="project">
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
<section class="block">
  <h2>학생 프로젝트</h2>
  ${student.length
    ? h`<div class="projects">${student.map(projectCard)}</div>`
    : h`<div class="empty"><strong>학생 프로젝트는 준비되는 대로 소개합니다.</strong><p class="hint">공개하고 싶다면 Studio Session에서 알려주세요. 동의한 프로젝트만 올려요.</p></div>`}
</section>
<section class="block">
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
<section class="block two">
  <div class="box">
    <h2>운영</h2>
    <p>${site.operators.role} ${site.operators.names.join('·')}</p>
    <p class="hint">${site.supportNotice} 서울대학교나 OpenAI의 공식 홈페이지가 아닙니다.</p>
  </div>
  <div class="box">
    <h2>진행 기록</h2>
    ${done.length
      ? h`<ul class="checks">${done.map(w => h`<li><a href="${workshopPath(w)}">Workshop ${pad(w.number)}</a> · ${formatSchedule(w.event, site.timeZone)}<br><small>${w.event.place}</small></li>`)}</ul>`
      : h`<p class="hint">첫 회차를 준비하고 있어요.</p>`}
  </div>
</section>
<section class="block">
  <h2>함께할 수 있는 방법</h2>
  <p class="hint">가능한 협력 방식의 예시예요. 확정된 협력 기관을 뜻하지 않습니다.</p>
  <ul class="collab">${collaboration.map(c => h`<li><strong>${c.who}</strong><span>${c.what}</span></li>`)}</ul>
</section>
<section class="block">
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
