// 수업 듣기(/learn/) 화면의 HTML. 로그인 확인·진도·단계 이동은 learn.js가 맡습니다.
// 화면 내용은 로그인 전에는 숨겨 두고(hidden), learn.js가 로그인을 확인한 뒤 엽니다.
// 상단 바·사용자 칸은 layout.mjs의 learnLayout(학습실 화면)이 그립니다.
import { h, raw, link } from './render.mjs';
import { missionBody, slidesOf } from './pages.mjs';

const pad = n => String(n).padStart(2, '0');
export const lessonPath = w => `/learn/${w.slug}/`;
const deckId = url => /\/presentation\/d\/([A-Za-z0-9_-]+)/.exec(url)?.[1];
// Google Slides 임베드 주소. 끝에 슬라이드 페이지 ID를 붙이면 그 슬라이드부터 보여줍니다.
export const embedBase = url => `https://docs.google.com/presentation/d/${deckId(url)}/embed?start=false&loop=false&delayms=60000&slide=id.`;

// 학생용 슬라이드와 단계가 있는, 자료가 열린 회차만 수업 화면을 만듭니다.
export const lessonWorkshops = content => content.workshops.filter(w => w.materials === 'open' && slidesOf(w) && w.missions.length);

// 로그인 카드: 로그인 전에는 이것만 보이고, learn.js가 로그인을 확인하면 숨깁니다(data-learn-login).
// 안의 data-learn-gate에 확인 중·로그인 버튼·서버 깨우는 중·오류 문구가 들어갑니다.
const loginCard = ({ kicker, title, lead } = {}) => h`<section class="study-login" data-learn-login>
  ${kicker ? h`<p class="track-kicker">${kicker}</p>` : ''}
  ${title ? h`<h1>${title}</h1>` : ''}
  ${lead ? h`<p class="lead">${lead}</p>` : ''}
  <div class="learn-box" data-learn-gate aria-live="polite">
    <p class="learn-status">로그인 상태를 확인하고 있어요…</p>
    <noscript><p class="learn-error">이 화면은 JavaScript를 켜야 쓸 수 있어요.</p></noscript>
  </div>
  <p class="hint">@snu.ac.kr Google 계정만 로그인할 수 있어요. 이메일·이름과 작성한 질문은 수업 운영에만 사용합니다.</p>
</section>`;

// 진도 막대: 막대 너비(data-meter-fill)와 글자(data-progress-text)는 learn.js가 채웁니다.
const progress = (text, className = '') => h`<div class="progress${className ? ` ${className}` : ''}" data-progress>
  <div class="meter" aria-hidden="true"><span data-meter-fill></span></div>
  <p class="progress-text" data-progress-text>${text}</p>
</div>`;

// 단계 줄의 표시(✔ 완료 · ▶ 지금 · ○ 아직)는 learn.js가 바꿉니다. 화면 읽기 프로그램용 상태는 data-step-state.
const stepRow = (m, i) => h`<span class="step-mark" aria-hidden="true">○</span><span class="step-no">${pad(i + 1)}</span><span class="step-title">${m.title}</span><span class="sr-only" data-step-state></span>`;

function coursePanel(w) {
  const path = lessonPath(w);
  return h`<section class="course c-${w.color}" data-course="${w.number}" aria-labelledby="course-${w.slug}">
  <div class="course-top">
    <div class="course-name">
      <p class="track-kicker">Workshop ${pad(w.number)}</p>
      <h2 id="course-${w.slug}"><a href="${path}">${w.title}</a></h2>
    </div>
    <a class="btn btn-fill course-continue" data-continue href="${path}#step-${w.missions[0].id}">이어서 하기 →</a>
  </div>
  ${progress(`0/${w.missions.length} 완료`)}
  <ol class="course-steps">
    ${w.missions.map((m, i) => h`<li><a class="course-step" href="${path}#step-${m.id}" data-step-link="${m.id}">${stepRow(m, i)}</a></li>`)}
  </ol>
</section>`;
}

// 자료가 아직 열리지 않은 회차: 단계 이름·링크 없이 여는 시각과 단계 수만 보여줍니다.
const lockedPanel = w => h`<section class="course is-locked c-${w.color}" aria-labelledby="course-${w.slug}">
  <div class="course-top">
    <div class="course-name">
      <p class="track-kicker">Workshop ${pad(w.number)}</p>
      <h2 id="course-${w.slug}">${w.title}</h2>
    </div>
  </div>
  <p class="course-lock"><span aria-hidden="true">🔒</span> ${w.opensLabel}에 열려요 · ${w.missions.length}단계</p>
</section>`;

export function learnPage(content) {
  const open = lessonWorkshops(content);
  const locked = content.workshops.filter(w => w.materials === 'locked');
  const total = open.reduce((sum, w) => sum + w.missions.length, 0);
  const program = content.site.name.split(' | ')[0];
  return h`${loginCard({ title: '수업 듣기', lead: '서울대 계정으로 로그인하면 슬라이드를 보며 단계별로 따라 하고, 막힌 부분을 바로 질문할 수 있어요.' })}
<div class="course-list" data-learn-content hidden>
  <header class="course-head">
    <p class="track-kicker">${program} · ${content.site.semester}</p>
    <h1>수업</h1>
    ${total ? progress(`0 / ${total} 단계`, 'progress-overall') : ''}
  </header>
  ${open.map(coursePanel)}
  ${locked.map(lockedPanel)}
  ${open.length || locked.length ? '' : h`<p class="empty">지금 열린 수업이 없어요.</p>`}
</div>`;
}

// 단계 이름 전달용 data-steps 값: [{ number, title, steps: [{ id, title }] }] (열린 회차만)
const stepsOf = content => JSON.stringify(lessonWorkshops(content).map(w => ({ number: w.number, title: w.title, steps: w.missions.map(m => ({ id: m.id, title: m.title })) })));

// 내 질문(/learn/questions/): 목록·대화는 questions.js가 채웁니다. 단계 이름은 data-steps로 전달합니다.
export function questionsPage(content) {
  return h`<header class="study-head">
  <h1>내 질문</h1>
  <p class="lead">수업 중에 남긴 질문과 운영진의 답을 모아 보여줘요.</p>
</header>
${loginCard()}
<div class="questions" data-learn-content data-questions hidden data-steps="${stepsOf(content)}"></div>
<p class="hint">질문과 첨부한 이미지는 운영진만 볼 수 있어요. 비밀번호나 개인정보가 보이는 화면은 가려서 올려 주세요.</p>`;
}

// 운영진(/admin/): 질문 답변·진도 화면은 admin.js가 채웁니다. 단계 이름은 data-steps로 전달합니다.
export function adminPage(content) {
  return h`<header class="study-head">
  <h1>운영진</h1>
  <p class="lead">학생 질문에 답하고 수업 진행 상황을 확인해요. 운영진 계정만 쓸 수 있어요.</p>
</header>
${loginCard()}
<div class="admin" data-learn-content data-admin hidden data-steps="${stepsOf(content)}"></div>`;
}

// 중간 단계는 "다음 →"이 그 단계를 완료로 저장하고 넘어갑니다. 완료 버튼은 마지막 단계에만 있습니다.
function lessonStep(m, i, total) {
  const last = i === total - 1;
  return h`<section class="lesson-step" id="step-${m.id}" data-step="${m.id}" data-slide-id="${m.slideId}" ${i ? raw('hidden') : ''}>
  <p class="track-kicker">${i + 1} / ${total} 단계</p>
  <h2 tabindex="-1">${m.title}</h2>
  ${missionBody(m)}
  <div class="lesson-actions">
    <button type="button" class="btn btn-ghost" data-prev ${i === 0 ? raw('disabled') : ''}>← 이전</button>
    ${last
      ? h`<button type="button" class="btn btn-fill" data-done aria-pressed="false">실습 완료</button>`
      : h`<button type="button" class="btn btn-fill" data-next>다음 →</button>`}
    <button type="button" class="btn btn-ghost" data-ask-open aria-expanded="false" aria-controls="ask-${m.id}">막혔어요 · 질문하기</button>
  </div>
  <div class="ask" data-ask id="ask-${m.id}" hidden></div>
  <p class="lesson-status" data-done-status role="status" aria-live="polite"></p>
</section>`;
}

// 완료 화면: 모든 단계를 끝내면 learn.js가 슬라이드·설명 대신 이 화면을 엽니다(#done).
// 다음 회차가 열려 있으면 바로가기 버튼을, 아직 잠겨 있으면 여는 시각을 보여줍니다.
function finishScreen(content, w) {
  const next = content.workshops.find(x => x.number > w.number && (x.materials === 'locked' || lessonWorkshops(content).includes(x)));
  const locked = next?.materials === 'locked';
  return h`<section class="lesson-finish" data-finish tabindex="-1" hidden>
  <p class="finish-mark" aria-hidden="true">🎉</p>
  <h2>Workshop ${pad(w.number)}을 모두 마쳤어요!</h2>
  <p class="lead">${w.missions.length}단계를 끝까지 따라왔어요.</p>
  <ol class="finish-steps">
    ${w.missions.map((m, i) => h`<li class="finish-step"><span aria-hidden="true">✔</span> ${pad(i + 1)} ${m.title}</li>`)}
  </ol>
  ${locked ? h`<p class="finish-next">다음 수업 Workshop ${pad(next.number)}는 ${next.opensLabel}에 열려요.</p>` : ''}
  <div class="finish-actions">
    <a class="btn btn-fill" href="/learn/">수업 목록으로</a>
    ${next && !locked ? h`<a class="btn btn-ghost" href="${lessonPath(next)}">Workshop ${pad(next.number)}로 →</a>` : ''}
    <button type="button" class="btn btn-ghost" data-restart>단계 다시 보기</button>
  </div>
</section>`;
}

// 수업 화면: 위 머리말(목록으로·제목·진도) + 단계 탭 줄 + 왼쪽 슬라이드(고정)와 오른쪽 지금 단계 설명.
// 좁은 화면(900px 이하)에서는 슬라이드가 위, 설명이 아래로 쌓입니다. 탭 표시는 learn.js가 바꿉니다.
// 모든 단계를 끝내면 슬라이드·설명 자리에 완료 화면이 나오고, 탭 줄 끝에 "완료" 탭이 생깁니다.
export function lessonPage(content, w) {
  const slides = slidesOf(w);
  const base = embedBase(slides.url);
  const total = w.missions.length;
  return h`${loginCard({ kicker: `Workshop ${pad(w.number)}`, title: w.title, lead: '로그인하면 슬라이드를 보며 단계별로 따라 하고, 막힌 부분을 바로 질문할 수 있어요.' })}
<div class="lesson c-${w.color}" data-learn-content data-lesson="${w.number}" hidden>
  <header class="lesson-head">
    <a class="lesson-back" href="/learn/">← 수업 목록</a>
    <div class="lesson-name">
      <p class="track-kicker">Workshop ${pad(w.number)}</p>
      <h1>${w.title}</h1>
    </div>
    ${progress(`0/${total} 완료`, 'lesson-progress')}
  </header>
  <nav class="lesson-tabs" aria-label="단계">
    <ol class="step-tabs">
      ${w.missions.map((m, i) => h`<li><button type="button" class="step-tab" data-goto="${m.id}" title="${pad(i + 1)} ${m.title}">${stepRow(m, i)}</button></li>`)}
      <li data-finish-tab hidden><button type="button" class="step-tab step-tab-finish" data-finish-open><span aria-hidden="true">🏁</span> 완료</button></li>
    </ol>
  </nav>
  <div class="lesson-body">
    <div class="lesson-slides">
      <div class="slides-frame"><iframe data-slides data-embed-base="${base}" src="${base}${w.missions[0].slideId}" title="Workshop ${w.number} 학생용 슬라이드" allowfullscreen></iframe></div>
      <p class="hint">${link(slides.url, '슬라이드 새 창으로 열기')}</p>
    </div>
    <div class="lesson-steps">${w.missions.map((m, i) => lessonStep(m, i, total))}</div>
  </div>
  ${finishScreen(content, w)}
</div>`;
}
