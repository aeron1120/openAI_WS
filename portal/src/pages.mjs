import { h, raw, link, isUsableUrl, isRecruiting, eventBadge, materialsBadge, formatSchedule, copyBlock, figure, video } from './render.mjs';

const pad = n => String(n).padStart(2, '0');
const workshopPath = w => `/workshops/${w.slug}/`;
const lines = items => items?.length ? h`<ul class="list">${items.map(item => h`<li>${item}</li>`)}</ul>` : '';

function scheduleText(item, timeZone) {
  return formatSchedule(item.event, timeZone) ?? '일정 안내 예정';
}

// 홈의 주 행동: 실제 신청 링크가 열린 회차가 있을 때만 신청을 앞세우고, 없으면 최근 회차 다시 해보기.
export function primaryAction(workshops) {
  const recruiting = workshops.find(isRecruiting);
  if (recruiting) return { label: `Workshop ${recruiting.number} 신청하기`, url: recruiting.recruitment.url };
  const done = workshops.filter(w => w.event.status === 'done' && w.materials === 'open').at(-1);
  if (done) return { label: `Workshop ${done.number} 다시 해보기`, url: workshopPath(done) };
  return { label: '학기 로드맵 보기', url: '/roadmap/' };
}

function roadmapSteps({ workshops, showcase }) {
  return [
    ...workshops.map(w => ({ kicker: `Workshop ${w.number}`, title: w.title, message: w.message, doing: w.doing, outcome: w.outcome, item: w, url: workshopPath(w), action: w.materials === 'open' ? '실습 자료 보기' : '회차 소개 보기' })),
    { kicker: 'Showcase', title: showcase.korean, message: showcase.message, doing: '학기 동안 만든 서비스를 시연하고 소개해요.', outcome: showcase.outcome, item: { ...showcase, materials: null }, url: '/showcase/', action: 'Showcase 안내 보기' }
  ];
}

function studioBand(studio, compact = false) {
  return h`<div class="studio-band">
  <p class="studio-band-title"><strong>${studio.title}</strong> · 모든 워크숍 사이에 이어져요</p>
  ${compact ? '' : h`<p>${studio.message}</p>`}
  <a href="/studio/">Studio Session 안내</a>
</div>`;
}

function resourceItem(r) {
  if (!isUsableUrl(r.url)) return '';
  return h`<li class="resource">
  ${link(r.url, r.label, 'resource-link')}
  ${r.note ? h`<p>${r.note}</p>` : ''}
</li>`;
}

function missionBlock(m, index) {
  return h`<article class="mission" id="mission-${m.id}">
  <h3><span class="mission-no">${index + 1}</span>${m.title}</h3>
  <div class="mission-part"><h4>할 일</h4><p>${m.todo}</p></div>
  ${m.prompt ? copyBlock(m.prompt) : ''}
  ${m.commands ? copyBlock(m.commands, '터미널 명령 (한 줄씩 실행)', { code: true }) : ''}
  ${m.options ? h`<div class="options">${m.options.map(o => h`<details class="option">
    <summary>${o.label}</summary>
    <p><strong>먼저 필요한 것:</strong> ${o.needs}</p>
    ${copyBlock(o.prompt)}
    <p>${link(o.guide, '이 기능의 자세한 안내')}</p>
  </details>`)}</div>` : ''}
  <div class="mission-part"><h4>예상 결과</h4><p>${m.expected}</p></div>
  ${m.verify?.length ? h`<div class="mission-part"><h4>확인 방법</h4>${lines(m.verify)}</div>` : ''}
  ${m.stuck?.length ? h`<div class="mission-part stuck"><h4>막혔을 때</h4>${lines(m.stuck)}</div>` : ''}
</article>`;
}

export function homePage(content) {
  const { site, workshops, studio, showcase, projects } = content;
  const primary = primaryAction(workshops);
  const openWorkshops = workshops.filter(w => w.materials === 'open');
  const studentProjects = projects.filter(p => p.kind === 'student' && p.published);
  const featured = projects.find(p => p.kind === 'operator' && p.published);
  return h`<section class="hero">
  <div class="wrap hero-inner">
    <div class="hero-copy">
      <p class="eyebrow">${site.semester} · 서울대학교 학생 프로그램</p>
      <h1>아이디어를 만들고,<br>친구에게 공유하고,<br>사람들 앞에서 소개하기.</h1>
      <p class="lead">ChatGPT와 Codex로 내 아이디어를 실제로 움직이는 웹 서비스로 만들어요. 워크숍 4회와 Studio Session, Showcase로 한 학기 동안 이어지고, 코딩 경험이 없어도 시작할 수 있어요.</p>
      <div class="actions">
        ${link(primary.url, primary.label, 'button button-primary')}
        <a class="button button-secondary" href="/workshops/">실습 자료 보기</a>
      </div>
    </div>
    ${featured ? h`<figure class="shot hero-shot">
      <div class="shot-frame"><img src="${featured.image}" alt="${featured.alt}" width="1280" height="800" fetchpriority="high" decoding="async"></div>
      <figcaption><span class="tag-operator">운영진 예제</span> ${featured.title} · ${featured.stage}</figcaption>
    </figure>` : ''}
  </div>
</section>

<section class="section" aria-labelledby="journey-title">
  <div class="wrap">
    <div class="section-head">
      <h2 id="journey-title">한 학기 동안 만들고, 남는 것</h2>
      <p>회차마다 하나씩 쌓여요. 중간에 합류해도 필요한 준비만 하면 참여할 수 있어요.</p>
    </div>
    <ol class="journey">
      ${roadmapSteps(content).map(step => h`<li class="journey-step">
        <p class="kicker">${step.kicker}</p>
        <h3>${step.message}</h3>
        <p class="outcome"><span>남는 것</span> ${step.outcome}</p>
        <p class="badges">${eventBadge(step.item)}</p>
      </li>`)}
    </ol>
    ${studioBand(studio, true)}
    <p class="more"><a href="/roadmap/">전체 로드맵 자세히 보기</a></p>
  </div>
</section>

<section class="section section-tint" aria-labelledby="materials-title">
  <div class="wrap">
    <div class="section-head">
      <h2 id="materials-title">지금 열려 있는 실습 자료</h2>
      <p>워크숍 중에도, 끝난 뒤 집에서도 같은 페이지로 이어서 실습해요.</p>
    </div>
    <div class="cards">
      ${openWorkshops.map(w => h`<article class="card">
        <p class="kicker">Workshop ${pad(w.number)}</p>
        <h3><a href="${workshopPath(w)}">${w.title}</a></h3>
        <p>${w.summary}</p>
        <p class="badges">${eventBadge(w)} ${materialsBadge(w)}</p>
        <p class="meta">${scheduleText(w, site.timeZone)}</p>
      </article>`)}
    </div>
  </div>
</section>

<section class="section" aria-labelledby="showcase-title">
  <div class="wrap">
    <div class="section-head">
      <h2 id="showcase-title">이런 것을 만들어요</h2>
      <p>${studentProjects.length ? '참가자들이 공개한 프로젝트예요.' : '학생 프로젝트는 준비되는 대로 소개합니다. 지금은 운영진이 워크숍에서 만든 예제를 먼저 보여드려요.'}</p>
    </div>
    <div class="cards">
      ${[...studentProjects, ...projects.filter(p => p.kind === 'operator' && p.published)].slice(0, 3).map(projectCard)}
    </div>
    <p class="more"><a href="/showcase/">Showcase 안내 보기</a></p>
  </div>
</section>

<section class="section section-tint" aria-labelledby="about-title">
  <div class="wrap split">
    <div>
      <h2 id="about-title">누가 운영하나요</h2>
      <p>서울대학교 학생을 위한 프로그램으로, ${site.operators.role}(${site.operators.names.join('·')})가 운영해요. ${site.supportNotice}</p>
    </div>
    <div>
      <h2>함께 키워갈 곳을 찾고 있어요</h2>
      <p>학생회, 행정실, 동아리·학회, 교육·창업 조직과 함께 더 많은 학생이 참여할 수 있는 방법을 찾고 있어요.</p>
      <p><a href="/about/">운영 소개와 협력 안내</a></p>
    </div>
  </div>
</section>`;
}

export function projectCard(p) {
  return h`<article class="card project">
  ${p.image ? h`<div class="shot-frame"><img src="${p.image}" alt="${p.alt}" width="1280" height="800" loading="lazy" decoding="async"></div>` : ''}
  <p class="badges">${p.kind === 'operator' ? h`<span class="tag-operator">운영진 예제</span>` : h`<span class="badge badge-materials">학생 프로젝트</span>`}</p>
  <h3>${p.title}</h3>
  <p><strong>해결하려는 문제</strong> ${p.problem}</p>
  <p class="meta">${p.stage}${p.maker ? ` · 만든 사람 ${p.maker}` : ''}</p>
  ${p.links?.length ? h`<p class="card-links">${p.links.map(l => link(l.url, l.label))}</p>` : ''}
</article>`;
}

export function roadmapPage(content) {
  const { site, workshops, studio } = content;
  const lastDone = workshops.filter(w => w.event.status === 'done').at(-1);
  const next = workshops.find(w => w.event.status !== 'done');
  return h`<section class="page-head">
  <div class="wrap">
    <p class="eyebrow">${site.semester} 로드맵</p>
    <h1>워크숍 4회, 그 사이의 Studio Session, 그리고 Showcase</h1>
    <p class="lead">각 회차는 앞 회차의 결과 위에 하나씩 쌓이지만, 모든 회차에 출석해야 하는 건 아니에요. 참여하고 싶은 회차의 준비만 확인하면 중간에도 합류할 수 있어요.</p>
    <p class="now"><strong>지금 위치</strong> ${lastDone ? `Workshop ${lastDone.number} 진행 완료` : '학기 시작 전'}${next ? ` · 다음은 Workshop ${next.number} (${next.materials === 'open' ? '실습 자료 공개, ' : ''}${formatSchedule(next.event, site.timeZone) ?? '일정 미정'})` : ''}</p>
  </div>
</section>
<section class="section">
  <div class="wrap">
    <ol class="roadmap">
      ${roadmapSteps(content).map((step, i) => h`<li class="roadmap-step${step.item === next ? ' is-next' : ''}">
        ${i > 0 ? h`<p class="between" aria-hidden="true">Studio Session으로 이어서 작업</p>` : ''}
        <div class="roadmap-card">
          <p class="kicker">${step.kicker}${step.item === next ? h` <span class="next-label">다음 단계</span>` : ''}</p>
          <h2>${step.title}</h2>
          <p class="message">“${step.message}”</p>
          <dl class="facts">
            <div><dt>무엇을 하나요</dt><dd>${step.doing}</dd></div>
            <div><dt>무엇이 남나요</dt><dd>${step.outcome}</dd></div>
            <div><dt>현재 상태</dt><dd><span class="badges">${eventBadge(step.item)} ${step.item.materials ? materialsBadge(step.item) : ''}</span></dd></div>
          </dl>
          <a class="button button-small" href="${step.url}">${step.action}</a>
        </div>
      </li>`)}
    </ol>
    ${studioBand(studio)}
  </div>
</section>`;
}

export function workshopsPage(content) {
  const { site, workshops, studio, showcase } = content;
  return h`<section class="page-head">
  <div class="wrap">
    <p class="eyebrow">워크숍과 실습 자료</p>
    <h1>회차별 주제와 자료</h1>
    <p class="lead">행사가 끝난 회차도 자료는 계속 열려 있어요. 참석하지 못했어도 각 페이지의 단계를 따라 혼자 실습할 수 있어요.</p>
  </div>
</section>
<section class="section">
  <div class="wrap">
    <ul class="workshop-list">
      ${workshops.map(w => h`<li class="card workshop-row">
        <p class="kicker">Workshop ${pad(w.number)}</p>
        <h2><a href="${workshopPath(w)}">${w.title}</a></h2>
        <p>${w.summary}</p>
        <p class="badges">${eventBadge(w)} ${materialsBadge(w)}</p>
        <dl class="facts compact">
          <div><dt>일정</dt><dd>${scheduleText(w, site.timeZone)}</dd></div>
          <div><dt>장소</dt><dd>${w.event.place ?? '장소 미정'}</dd></div>
        </dl>
      </li>`)}
    </ul>
    <div class="cards two">
      <article class="card"><p class="kicker">워크숍 사이마다</p><h2><a href="/studio/">${studio.title}</a></h2><p>${studio.message}</p><p class="badges">${eventBadge(studio)}</p></article>
      <article class="card"><p class="kicker">학기 마무리</p><h2><a href="/showcase/">${showcase.title}</a></h2><p>${showcase.description}</p><p class="badges">${eventBadge(showcase)}</p></article>
    </div>
  </div>
</section>`;
}

export function workshopPage(content, w) {
  const { site, workshops } = content;
  const index = workshops.indexOf(w);
  const prev = workshops[index - 1];
  const next = workshops[index + 1];
  const header = h`<section class="page-head">
  <div class="wrap">
    <nav class="crumbs" aria-label="현재 위치"><a href="/workshops/">워크숍</a> <span aria-hidden="true">›</span> Workshop ${pad(w.number)}</nav>
    <p class="eyebrow">Workshop ${pad(w.number)} · ${w.message}</p>
    <h1>${w.title}</h1>
    <p class="lead">${w.summary}</p>
    <p class="badges">${eventBadge(w)} ${materialsBadge(w)}</p>
    ${isRecruiting(w) ? h`<p class="actions">${link(w.recruitment.url, '신청하기', 'button button-primary')}</p>` : ''}
  </div>
</section>`;
  const pager = h`<nav class="pager wrap" aria-label="다른 회차">
  ${prev ? h`<a href="${workshopPath(prev)}">← Workshop ${pad(prev.number)} · ${prev.title}</a>` : raw('<span></span>')}
  ${next ? h`<a href="${workshopPath(next)}">Workshop ${pad(next.number)} · ${next.title} →</a>` : h`<a href="/showcase/">Showcase →</a>`}
</nav>`;

  if (w.materials !== 'open') {
    const latest = workshops.filter(x => x.materials === 'open').at(-1);
    return h`${header}
<section class="section">
  <div class="wrap narrow">
    <div class="pending">
      <h2>이 회차는 준비하고 있어요</h2>
      <dl class="facts">
        <div><dt>목표 결과</dt><dd>${w.outcome}</dd></div>
        <div><dt>일정</dt><dd>${scheduleText(w, site.timeZone)}</dd></div>
        <div><dt>장소</dt><dd>${w.event.place ?? '장소 미정'}</dd></div>
      </dl>
      <p>세부 주제와 실습 자료는 확정되면 이 페이지에서 안내합니다. 그 전에는 앞 회차 자료로 내 프로젝트를 준비하고, Studio Session에서 질문을 이어가세요.</p>
      <p class="actions">${latest ? h`<a class="button button-primary" href="${workshopPath(latest)}">Workshop ${latest.number} 실습 자료 보기</a>` : ''}<a class="button button-secondary" href="/roadmap/">학기 로드맵 보기</a></p>
    </div>
  </div>
</section>
${pager}`;
  }

  const student = w.resources.filter(r => r.audience === 'student' && isUsableUrl(r.url));
  const presenter = w.resources.filter(r => r.audience === 'presenter' && isUsableUrl(r.url));
  const toc = [
    ['result', '만들 결과'],
    ['info', '일정·대상·준비물'],
    student.length || presenter.length ? ['materials', '자료'] : null,
    w.checks.length ? ['checks', '시작 전 확인'] : null,
    w.missions.length ? ['missions', '단계별 미션'] : null,
    w.apply ? ['apply', w.apply.title] : null,
    ['help', '막혔을 때'],
    ['next', '공유하고 이어가기']
  ].filter(Boolean);
  const tocList = h`<ol>${toc.map(([id, label]) => h`<li><a href="#${id}">${label}</a>${id === 'missions' ? h`<ol>${w.missions.map(m => h`<li><a href="#mission-${m.id}">${m.title}</a></li>`)}</ol>` : ''}</li>`)}</ol>`;

  return h`${header}
<div class="wrap guide">
  <aside class="toc" aria-label="이 페이지 목차">
    <details class="toc-mobile"><summary>이 페이지 목차</summary>${tocList}</details>
    <div class="toc-desktop"><p>이 페이지 목차</p>${tocList}</div>
  </aside>
  <div class="guide-body">
    <section id="result" class="guide-section">
      <h2>만들 결과</h2>
      <p class="outcome-line"><strong>${w.outcome}</strong></p>
      ${video(w) || figure(w.preview)}
    </section>

    <section id="info" class="guide-section">
      <h2>일정·대상·준비물</h2>
      ${w.joinNote ? h`<p class="note">${w.joinNote}</p>` : ''}
      <dl class="facts">
        <div><dt>일정</dt><dd>${scheduleText(w, site.timeZone)}${w.event.status === 'done' ? ' · 진행 완료' : ''}</dd></div>
        <div><dt>장소</dt><dd>${w.event.place ?? '장소 미정'}</dd></div>
        ${w.duration ? h`<div><dt>소요 시간</dt><dd>${w.duration}</dd></div>` : ''}
        ${w.audience ? h`<div><dt>대상</dt><dd>${w.audience}</dd></div>` : ''}
        <div><dt>신청</dt><dd>${isRecruiting(w) ? link(w.recruitment.url, '신청하기') : w.event.status === 'done' ? '종료된 회차예요. 자료는 계속 열려 있어요.' : '모집 전이에요. 일정과 신청 방법은 확정되면 안내합니다.'}</dd></div>
      </dl>
      ${w.prepare.length ? h`<h3>준비물</h3>${lines(w.prepare)}` : ''}
    </section>

    ${student.length || presenter.length ? h`<section id="materials" class="guide-section">
      <h2>자료</h2>
      ${student.length ? h`<h3>학생용 자료</h3><ul class="resources">${student.map(resourceItem)}</ul>` : ''}
      ${presenter.length ? h`<h3>발표 자료</h3><p class="hint">발표자의 설명과 함께 보도록 만든 자료예요. 학생용 학습 자료는 이 페이지의 웹 가이드예요.</p><ul class="resources">${presenter.map(resourceItem)}</ul>` : ''}
    </section>` : ''}

    ${w.checks.length ? h`<section id="checks" class="guide-section">
      <h2>시작 전 확인</h2>
      <ul class="checklist">${w.checks.map(c => h`<li>${c}</li>`)}</ul>
    </section>` : ''}

    ${w.missions.length ? h`<section id="missions" class="guide-section">
      <h2>단계별 미션</h2>
      <p class="hint">각 단계는 할 일 → 요청문 → 예상 결과 → 확인 방법 → 막혔을 때 순서예요. 요청문은 복사 버튼으로 복사하거나 직접 선택해서 복사하세요.</p>
      ${w.missions.map(missionBlock)}
    </section>` : ''}

    ${w.apply ? h`<section id="apply" class="guide-section">
      <h2>${w.apply.title}</h2>
      <p>${w.apply.body}</p>
      ${w.apply.prompt ? copyBlock(w.apply.prompt, '빈칸을 내 아이디어로 바꿔 쓰는 요청문') : ''}
    </section>` : ''}

    <section id="help" class="guide-section">
      <h2>막혔을 때</h2>
      <p>각 미션의 ‘막혔을 때’를 먼저 확인하세요. 그래도 안 되면 무엇을 했고 무엇이 보이는지 Codex에 그대로 설명하세요.</p>
      ${w.help?.prompt ? copyBlock(w.help.prompt, '오류를 설명하는 요청문') : ''}
      ${w.help?.guide ? h`<p>${link(w.help.guide, '문제 해결 안내 전체 보기')}</p>` : ''}
      <p>혼자 풀기 어려우면 <a href="/studio/">Studio Session</a>에 화면과 질문을 가져오세요. 비밀번호·API 키는 꼭 가려 주세요.</p>
    </section>

    <section id="next" class="guide-section">
      <h2>공유하고 이어가기</h2>
      ${w.share ? h`<p>${w.share}</p>` : ''}
      <p class="actions"><a class="button button-secondary" href="/studio/">Studio Session 안내</a>${next ? h`<a class="button button-secondary" href="${workshopPath(next)}">다음: Workshop ${pad(next.number)}</a>` : ''}</p>
    </section>
  </div>
</div>
${pager}`;
}

export function studioPage(content) {
  const { site, studio } = content;
  const sessions = studio.sessions.filter(s => s.start);
  return h`<section class="page-head">
  <div class="wrap">
    <p class="eyebrow">${studio.korean}</p>
    <h1>${studio.title}</h1>
    <p class="lead">${studio.message}</p>
    <p class="badges">${eventBadge(studio)}</p>
  </div>
</section>
<section class="section">
  <div class="wrap narrow">
    <p>${studio.description}</p>
    <h2>일정</h2>
    ${sessions.length
      ? h`<ul class="list">${sessions.map(s => h`<li>${formatSchedule(s, site.timeZone)} · ${s.place ?? '장소 미정'}</li>`)}</ul>`
      : h`<p class="pending-inline">일정 안내 예정 · 장소 미정. 확정되면 이 페이지에 회차별로 안내합니다.</p>`}
    ${isUsableUrl(site.links.openChat) ? h`<p class="actions">${link(site.links.openChat, '오픈채팅에서 일정 받기', 'button button-primary')}</p>` : ''}
    <h2>가져오면 좋은 것</h2>
    ${lines(studio.bring)}
    <h2>질문은 이렇게 정리해 오세요</h2>
    ${copyBlock(studio.question, '질문 정리 틀')}
    <p class="note">${studio.caution}</p>
    <h2>어느 회차든 이어서</h2>
    <p>Workshop을 놓쳤다면 <a href="/workshops/">회차별 실습 자료</a>로 먼저 시작해 보세요. 막힌 지점부터 Studio Session에서 함께 이어갈 수 있어요.</p>
  </div>
</section>`;
}

export function showcasePage(content) {
  const { showcase, projects } = content;
  const student = projects.filter(p => p.kind === 'student' && p.published);
  const operator = projects.filter(p => p.kind === 'operator' && p.published);
  return h`<section class="page-head">
  <div class="wrap">
    <p class="eyebrow">${showcase.korean}</p>
    <h1>${showcase.title}</h1>
    <p class="lead">${showcase.message}</p>
    <p class="badges">${eventBadge(showcase)}</p>
  </div>
</section>
<section class="section">
  <div class="wrap">
    <div class="narrow">
      <p>${showcase.description}</p>
      <p class="pending-inline">${showcase.timingNote}</p>
    </div>
    <h2 class="section-title">학생 프로젝트</h2>
    ${student.length
      ? h`<div class="cards">${student.map(projectCard)}</div>`
      : h`<div class="empty"><p><strong>학생 프로젝트는 준비되는 대로 소개합니다.</strong></p><p>워크숍에서 만든 서비스를 공개하고 싶다면 Studio Session에서 운영진에게 알려주세요. 공개에 동의한 프로젝트만 이곳에 올립니다.</p></div>`}
    <h2 class="section-title">운영진 예제</h2>
    <p class="hint">워크숍 실습용으로 운영진이 만든 예제예요. 학생 결과물과 구분해서 보여드려요.</p>
    <div class="cards">${operator.map(projectCard)}</div>
  </div>
</section>`;
}

export function aboutPage(content) {
  const { site, workshops, collaboration } = content;
  const done = workshops.filter(w => w.event.status === 'done');
  return h`<section class="page-head">
  <div class="wrap">
    <p class="eyebrow">운영 소개</p>
    <h1>${site.name}</h1>
    <p class="lead">서울대학교 학생이 ChatGPT와 Codex로 직접 만들고, 고치고, 공유하는 경험을 한 학기 동안 이어갈 수 있도록 돕는 학생 프로그램이에요.</p>
  </div>
</section>
<section class="section">
  <div class="wrap narrow">
    <h2>운영</h2>
    <dl class="facts">
      <div><dt>운영진</dt><dd>${site.operators.role} ${site.operators.names.join('·')}</dd></div>
      <div><dt>지원</dt><dd>${site.supportNotice}</dd></div>
      <div><dt>사이트 성격</dt><dd>Campus Leads가 운영하는 프로그램 안내 페이지예요. 서울대학교나 OpenAI의 공식 홈페이지가 아닙니다.</dd></div>
    </dl>

    <h2>지금까지의 진행 기록</h2>
    ${done.length
      ? h`<ul class="list">${done.map(w => h`<li><a href="${workshopPath(w)}">Workshop ${pad(w.number)} · ${w.title}</a> — ${formatSchedule(w.event, site.timeZone)}, ${w.event.place}</li>`)}</ul>`
      : h`<p>첫 회차를 준비하고 있어요.</p>`}
    <p>학기 전체 계획은 <a href="/roadmap/">로드맵</a>에서 볼 수 있어요.</p>

    <h2>함께할 수 있는 방법</h2>
    <p>더 많은 학생이 참여할 수 있도록 교내 조직과의 협력을 찾고 있어요. 아래는 가능한 협력 방식의 예시이며, 현재 확정된 협력 기관을 뜻하지 않습니다.</p>
    <ul class="collab">${collaboration.map(c => h`<li><strong>${c.who}</strong><span>${c.what}</span></li>`)}</ul>

    <h2>문의</h2>
    ${isUsableUrl(site.links.contact)
      ? h`<p class="actions">${link(site.links.contact, '협력 문의하기', 'button button-primary')}</p>`
      : h`<p class="pending-inline">협력 문의 채널은 준비 중이에요. 확정되면 이 자리에 안내합니다.</p>`}
    ${isUsableUrl(site.links.openChat) ? h`<p>${link(site.links.openChat, '학생 커뮤니티 오픈채팅')}</p>` : ''}
  </div>
</section>`;
}

export function notFoundPage() {
  return h`<section class="page-head">
  <div class="wrap narrow">
    <p class="eyebrow">404</p>
    <h1>페이지를 찾을 수 없어요</h1>
    <p class="lead">주소가 바뀌었거나 아직 준비되지 않은 페이지예요.</p>
    <p class="actions"><a class="button button-primary" href="/">처음으로</a><a class="button button-secondary" href="/workshops/">실습 자료 보기</a></p>
  </div>
</section>`;
}
