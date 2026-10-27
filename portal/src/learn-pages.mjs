// 수업 듣기(/learn/) 화면의 HTML. 로그인 확인·진도·단계 이동은 learn.js가 맡습니다.
// 화면 내용은 로그인 전에는 숨겨 두고(hidden), learn.js가 로그인을 확인한 뒤 엽니다.
import { h, raw, link } from './render.mjs';
import { missionBody, slidesOf } from './pages.mjs';

const pad = n => String(n).padStart(2, '0');
export const lessonPath = w => `/learn/${w.slug}/`;
const deckId = url => /\/presentation\/d\/([A-Za-z0-9_-]+)/.exec(url)?.[1];
// Google Slides 임베드 주소. 끝에 슬라이드 페이지 ID를 붙이면 그 슬라이드부터 보여줍니다.
export const embedBase = url => `https://docs.google.com/presentation/d/${deckId(url)}/embed?start=false&loop=false&delayms=60000&slide=id.`;

// 학생용 슬라이드와 단계가 있는, 자료가 열린 회차만 수업 화면을 만듭니다.
export const lessonWorkshops = content => content.workshops.filter(w => w.materials === 'open' && slidesOf(w) && w.missions.length);

const gate = h`<section class="box learn-box" data-learn-gate aria-live="polite">
  <p class="learn-status">로그인 상태를 확인하고 있어요…</p>
  <noscript><p class="learn-error">이 화면은 JavaScript를 켜야 쓸 수 있어요.</p></noscript>
</section>`;

export function learnPage(content) {
  const open = lessonWorkshops(content);
  const locked = content.workshops.filter(w => w.materials === 'locked');
  return h`<header class="page-head">
  <h1>수업 듣기</h1>
  <p class="lead">서울대 계정으로 로그인하면 슬라이드를 보며 단계별로 따라 하고, 막힌 부분을 바로 질문할 수 있어요.</p>
</header>
${gate}
<section class="learn-list" data-learn-content hidden aria-label="수업 목록">
  <p class="learn-links"><a href="/learn/questions/">내 질문</a> <span data-answer-count></span></p>
  ${open.map(w => h`<a class="learn-card c-${w.color}" href="${lessonPath(w)}">
    <span class="track-kicker">Workshop ${pad(w.number)}</span>
    <strong>${w.title}</strong>
    <span class="learn-progress" data-progress-for="${w.number}" data-total="${w.missions.length}">${w.missions.length}단계</span>
  </a>`)}
  ${locked.map(w => h`<div class="learn-card is-locked c-${w.color}">
    <span class="track-kicker">Workshop ${pad(w.number)}</span>
    <strong>${w.title}</strong>
    <span class="learn-progress">${w.opensLabel}에 열려요</span>
  </div>`)}
  ${open.length || locked.length ? '' : h`<p class="hint">지금 열린 수업이 없어요.</p>`}
</section>
<p class="hint">@snu.ac.kr Google 계정만 로그인할 수 있어요. 이메일·이름과 작성한 질문은 수업 운영에만 사용합니다.</p>`;
}

// 내 질문(/learn/questions/): 목록·대화는 questions.js가 채웁니다.
export function questionsPage() {
  return h`<nav class="crumbs" aria-label="현재 위치"><a href="/learn/">수업 듣기</a> › 내 질문</nav>
<header class="page-head">
  <h1>내 질문</h1>
  <p class="lead">수업 중에 남긴 질문과 운영진의 답을 모아 보여줘요.</p>
</header>
${gate}
<div class="questions" data-learn-content data-questions hidden></div>
<p class="hint">질문과 첨부한 이미지는 운영진만 볼 수 있어요. 비밀번호나 개인정보가 보이는 화면은 가려서 올려 주세요.</p>`;
}

// 운영진(/admin/): 질문 답변·진도 화면은 admin.js가 채웁니다. 단계 이름은 data-steps로 전달합니다.
export function adminPage(content) {
  const steps = lessonWorkshops(content).map(w => ({ number: w.number, title: w.title, steps: w.missions.map(m => ({ id: m.id, title: m.title })) }));
  return h`<header class="page-head">
  <h1>운영진</h1>
  <p class="lead">학생 질문에 답하고 수업 진행 상황을 확인해요. 운영진 계정만 쓸 수 있어요.</p>
</header>
${gate}
<div class="admin" data-learn-content data-admin hidden data-steps="${JSON.stringify(steps)}"></div>`;
}

function lessonStep(m, i, total) {
  return h`<section class="lesson-step" id="step-${m.id}" data-step="${m.id}" data-slide-id="${m.slideId}" ${i ? raw('hidden') : ''}>
  <p class="track-kicker">${i + 1} / ${total} 단계</p>
  <h2 tabindex="-1">${m.title}</h2>
  ${missionBody(m)}
  <div class="lesson-actions">
    <button type="button" class="btn btn-ghost" data-prev ${i === 0 ? raw('disabled') : ''}>← 이전</button>
    <button type="button" class="btn btn-fill" data-done aria-pressed="false">이 단계 완료</button>
    <button type="button" class="btn btn-ghost" data-next ${i === total - 1 ? raw('disabled') : ''}>다음 →</button>
    <button type="button" class="btn btn-ghost" data-ask-open>막혔어요 · 질문하기</button>
  </div>
  <div class="ask" data-ask hidden></div>
  <p class="lesson-status" data-done-status role="status" aria-live="polite"></p>
</section>`;
}

export function lessonPage(content, w) {
  const slides = slidesOf(w);
  const base = embedBase(slides.url);
  return h`<nav class="crumbs" aria-label="현재 위치"><a href="/learn/">수업 듣기</a> › Workshop ${pad(w.number)}</nav>
<header class="page-head c-${w.color}">
  <p class="track-kicker">Workshop ${pad(w.number)}</p>
  <h1>${w.title}</h1>
</header>
${gate}
<div class="lesson c-${w.color}" data-learn-content data-lesson="${w.number}" hidden>
  <ol class="lesson-dots" aria-label="단계">
    ${w.missions.map((m, i) => h`<li><button type="button" data-goto="${m.id}" aria-label="${i + 1}단계: ${m.title}">${i + 1}</button></li>`)}
  </ol>
  <div class="lesson-grid">
    <div class="lesson-slides">
      <div class="slides-frame"><iframe data-slides data-embed-base="${base}" src="${base}${w.missions[0].slideId}" title="Workshop ${w.number} 학생용 슬라이드" allowfullscreen></iframe></div>
      <p class="hint">${link(slides.url, '슬라이드 새 창으로 열기')}</p>
    </div>
    <div class="lesson-steps">${w.missions.map((m, i) => lessonStep(m, i, w.missions.length))}</div>
  </div>
</div>`;
}
