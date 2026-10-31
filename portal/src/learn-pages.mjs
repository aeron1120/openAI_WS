// 수업 듣기(/learn/) 화면의 HTML. 로그인 확인·진도·단계 이동은 learn.js가 맡습니다.
// 화면 내용은 로그인 전에는 숨겨 두고(hidden), learn.js가 로그인을 확인한 뒤 엽니다.
// 상단 바·사용자 칸은 layout.mjs의 learnLayout(학습실 화면)이 그립니다.
import { h, raw, link, copyBlock } from './render.mjs';
import { missionBody, slidesOf, taskSlidesOf } from './pages.mjs';

const pad = n => String(n).padStart(2, '0');
export const lessonPath = w => `/learn/${w.slug}/`;
export const deckId = url => /\/presentation\/d\/([A-Za-z0-9_-]+)/.exec(url ?? '')?.[1];
// 수업 화면의 슬라이드는 한 장씩 받아 둔 이미지(portal/slides/, scripts/slides-snapshot.mjs)로 보여줍니다.
export const deckOf = (content, w) => content.decks?.[deckId(slidesOf(w)?.url)];

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

// 수업 지도: 한 번에 섬 하나(스테이지)를 크게 보여줍니다. 왼쪽에 회차 이름, 가운데 섬, 오른쪽에 미션 칸,
// 아래 양옆에 복습 섬·다음 섬 갈림길이 있고, 위 스테이지 줄이나 갈림길을 누르면 가운데 섬과 미션 칸이 함께 바뀝니다.
// 섬 그림·장치 자리는 content/learn-map.mjs. 진도·지금 여기(로봇)·장치 ✓·스테이지 바꾸기는 learn.js가 맡습니다.
// 그림을 살펴보는 것과 수업이 열렸는지는 따로입니다: 열리지 않은 회차는 섬만 보이고 수업 링크·장치가 없습니다.
const MAP = '/images/learn-map';
const pct = n => `${Math.round(n * 1000) / 10}%`;
const stageNo = key => (key === 'final' ? 'FINAL' : key === 'review' ? 'REPLAY' : pad(key));

// 가운데 섬: 그림 + 완료 표시 + 로봇(지금 여기일 때 learn.js가 엶) + 장치 버튼(눌러서 설명·연습 문제를 봄)
function islandOf(spot, robot, devices, eager) {
  const { art } = spot;
  return h`<div class="scene-island${art.width > art.height * 1.2 ? ' is-wide' : ''}" style="--ratio: ${art.width} / ${art.height}">
    <img class="scene-art" src="${MAP}/${art.file}" alt="${art.alt}" width="${art.width}" height="${art.height}" decoding="async"${eager ? '' : raw(' loading="lazy"')}>
    <i class="badge-clear" aria-hidden="true"></i>
    ${robot ? h`<span class="scene-robot" data-robot style="left: ${pct(spot.robot[0])}; top: ${pct(spot.robot[1])}" hidden>
      <img src="${MAP}/${robot.file}" alt="" width="${robot.width}" height="${robot.height}" loading="lazy">
      <span class="robot-tag">지금 여기</span>
    </span>` : ''}
    ${devices.map((d, i) => h`<button type="button" class="device" style="left: ${pct(d.x)}; top: ${pct(d.y)}" data-device="${i}"${d.step ? h` data-device-step="${d.step}"` : ''} aria-pressed="${String(i === 0)}"><span class="device-label">${d.label}</span><span class="sr-only" data-device-state></span></button>`)}
  </div>`;
}

const sceneHead = ({ key, kicker, title, lead, chip, chipTone }) => h`<div class="scene-id">
    <p class="scene-kicker">${kicker}</p>
    <h2 class="scene-title" id="scene-title-${key}" tabindex="-1">${title}</h2>
    ${lead ? h`<p class="scene-lead">${lead}</p>` : ''}
    ${chip ? h`<span class="stage-chip${chipTone ? ` chip-${chipTone}` : ''}" data-stage-chip>${chip}</span>` : ''}
  </div>`;

// 갈림길: 다음 섬(오른쪽 아래)과 복습 섬(왼쪽 아래)의 작은 그림. 누르면 그 섬이 가운데로 옵니다.
const branch = (side, key, spot, kicker, label) => h`<button type="button" class="branch branch-${side}" data-go="${key}" aria-controls="scene-${key}">
    <img src="${MAP}/${spot.art.file}" alt="" width="${spot.art.width}" height="${spot.art.height}" loading="lazy" decoding="async">
    <span class="branch-kicker">${kicker}</span>
    <strong>${label}</strong>
  </button>`;

// 열린 회차의 미션 칸: 다음 미션(처음으로 안 끝낸 단계)·진도·이어하기 + 장치 설명
function openPanel(w, devices, intro) {
  const path = lessonPath(w);
  return h`<div class="scene-panel">
    <p class="mission-kicker" data-mission-kicker>다음 미션</p>
    <p class="mission-title" data-mission-title>${w.missions[0].title}</p>
    ${progress(`0 / ${w.missions.length} 미션 완료`)}
    <a class="btn btn-fill mission-go" href="${path}#step-${w.missions[0].id}" data-continue>미션 시작 →</a>
    ${devices.length ? h`<div class="device-note" aria-live="polite">
      <p class="device-intro">${intro ?? '섬의 장치를 눌러 보세요.'}</p>
      ${devices.map((d, i) => h`<p class="device-text" data-device-text="${i}"${i ? raw(' hidden') : ''}><strong>${d.label}</strong> ${d.note}</p>`)}
    </div>` : ''}
  </div>`;
}

// 복습 섬의 미션 칸: 블록마다 짧은 연습 문제. 저장하지 않고, 수업 완료와 상관없습니다.
const reviewPanel = (devices, w) => h`<div class="scene-panel" data-quiz-panel>
    <p class="mission-kicker">연습 · 기록되지 않아요</p>
    <p class="mission-title">블록을 눌러 기능을 맞혀 보세요</p>
    <p class="quiz-count" data-quiz-count>0 / ${devices.length} 확인</p>
    ${devices.map((d, i) => h`<div class="quiz" data-quiz="${i}"${i ? raw(' hidden') : ''}>
      <p class="quiz-q"><strong>${d.label}</strong> · ${d.quiz.question}</p>
      <div class="quiz-choices">${d.quiz.choices.map((c, j) => h`<button type="button" class="quiz-choice" data-choice${j === d.quiz.answer ? raw(' data-answer') : ''}>${c}</button>`)}</div>
      <p class="quiz-explain" hidden>${d.quiz.explain}</p>
    </div>`)}
    <p class="quiz-feedback" data-quiz-feedback role="status"></p>
    <a class="btn btn-ghost mission-go" href="${lessonPath(w)}">Workshop ${pad(w.number)} 다시 보기</a>
  </div>`;

// 열리지 않은 회차·마지막 Showcase의 칸: 언제 열리는지와 안내 페이지 링크만
const infoPanel = (kicker, title, href, label) => h`<div class="scene-panel">
    <p class="mission-kicker">${kicker}</p>
    <p class="mission-title">${title}</p>
    <a class="btn btn-ghost mission-go" href="${href}">${label}</a>
  </div>`;

// 스테이지 목록: 회차들 → FINAL, 복습할 회차가 열려 있으면 복습 섬. 그림이 없는 칸은 건너뜁니다.
function stagesOf(content) {
  const map = content.learnMap ?? {};
  const open = lessonWorkshops(content);
  const list = content.workshops.filter(w => map[w.number]?.art).map(w => ({ key: String(w.number), w, spot: map[w.number], open: open.includes(w) }));
  if (map.final?.art) list.push({ key: 'final', spot: map.final });
  const from = open.find(w => w.number === map.review?.from);
  const review = map.review?.art && from ? { key: 'review', spot: map.review, w: from } : null;
  return { list, review, robot: map.robot };
}

function scene(stage, i, { list, review, robot }, content, shown) {
  const { key, w, spot } = stage;
  const next = key === 'review' ? list.find(s => s.w === review.w) : list[i + 1];
  const devices = (stage.open || key === 'review') ? spot.devices ?? [] : [];
  let head;
  let panel;
  let state = '';
  if (key === 'review') {
    head = { kicker: `REPLAY · Workshop ${pad(w.number)}`, title: spot.title, lead: spot.lead, chip: '복습' };
    panel = reviewPanel(devices, w);
  } else if (key === 'final') {
    const showcase = content.showcase;
    head = { kicker: 'FINAL STAGE', title: showcase.mapTitle ?? showcase.title, lead: showcase.description };
    panel = infoPanel('학기 마무리', showcase.korean, '/showcase/', 'Showcase 안내 보기');
  } else if (stage.open) {
    head = { kicker: `STAGE ${pad(w.number)}`, title: w.mapTitle ?? w.shortTitle, lead: w.summary, chip: '도전 가능', chipTone: 'open' };
    panel = openPanel(w, devices, spot.deviceIntro);
  } else if (w.materials === 'locked') {
    state = ' is-locked';
    head = { kicker: `STAGE ${pad(w.number)}`, title: w.mapTitle ?? w.shortTitle, lead: w.summary, chip: '곧 열려요', chipTone: 'lock' };
    panel = infoPanel('곧 열려요', `${w.opensLabel}에 열려요`, `/workshops/${w.slug}/`, '수업 안내 보기');
  } else {
    state = ' is-fog';
    head = { kicker: `STAGE ${pad(w.number)}`, title: w.mapTitle ?? '다음 워크숍', lead: w.summary, chip: w.mapTitle ? '다음 도전' : '준비 중', chipTone: 'lock' };
    panel = infoPanel('준비 중', w.mapTitle ? '날짜는 추후 안내해요' : '주제를 정하고 있어요', `/workshops/${w.slug}/`, '수업 안내 보기');
  }
  const course = stage.open
    ? h` data-course="${w.number}" data-path="${lessonPath(w)}" data-steps="${JSON.stringify(w.missions.map(m => m.id))}" data-titles="${JSON.stringify(w.missions.map(m => m.title))}"`
    : '';
  return h`<section class="scene${state}" id="scene-${key}" data-scene="${key}"${course} aria-labelledby="scene-title-${key}"${key === shown ? '' : raw(' hidden')}>
  <svg class="scene-routes" aria-hidden="true" focusable="false"><path data-route="review"/><path data-route="next"/></svg>
  ${sceneHead({ key, ...head })}
  ${islandOf(spot, robot, devices, key === shown)}
  ${panel}
  ${review && key !== 'review' ? branch('review', 'review', review.spot, '배운 기능 다시 연결', '복습 섬 →') : ''}
  ${next ? branch('next', next.key, next.spot, key === 'review' ? '돌아가기' : '다음 스테이지', `${stageNo(next.key)} · ${next.spot.tab}`) : ''}
</section>`;
}

// 수업 지도: 제목·수업 완료 수 → 스테이지 줄 → 가운데 섬 하나. 처음에는 마지막으로 열린 회차를 보여주고,
// 진도를 불러오면 learn.js가 지금 할 섬(진행 중 → 안 시작한 열린 회차 → 다 끝냈으면 복습 섬)으로 옮깁니다.
export function learnPage(content) {
  const stages = stagesOf(content);
  const open = stages.list.filter(s => s.open);
  const shown = (open.at(-1) ?? stages.list[0])?.key;
  const all = [...stages.list, ...(stages.review ? [stages.review] : [])];
  return h`${loginCard({ title: '수업 듣기', lead: '서울대 계정으로 로그인하면 슬라이드를 보며 단계별로 따라 하고, 막힌 부분을 바로 질문할 수 있어요.' })}
<div class="quest" data-learn-content hidden>
  <header class="quest-head">
    <h1 class="quest-title">수업 지도</h1>
    <p class="quest-count"><span class="count-check" aria-hidden="true"></span>수업 완료 <strong data-clear-count>0 / ${content.workshops.length}</strong></p>
  </header>
  <nav class="stage-bar" aria-label="스테이지">
    ${stages.list.map(s => h`<button type="button" class="stage-tab${s.w && !s.open ? ' is-locked' : ''}" data-tab="${s.key}" aria-controls="scene-${s.key}" aria-pressed="${String(s.key === shown)}"><b>${stageNo(s.key)}</b><span class="tab-name">${s.spot.tab}</span><i class="tab-mark" aria-hidden="true"></i>${s.w && !s.open ? h`<span class="sr-only"> (잠김)</span>` : ''}</button>`)}
  </nav>
  <div class="quest-world" data-map data-default="${shown}">
    ${all.map((s, i) => scene(s, i, stages, content, shown))}
  </div>
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
  return h`<section class="lesson-step" id="step-${m.id}" data-step="${m.id}" data-task-slides="${taskSlidesOf(m)}" ${i ? raw('hidden') : ''}>
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
  ${w.apply ? h`<div class="finish-apply">
    <h3>${w.apply.title}</h3>
    <p>${w.apply.body}</p>
    ${w.apply.prompt ? copyBlock(w.apply.prompt, '빈칸을 내 아이디어로 바꿔 쓰세요') : ''}
  </div>` : ''}
  ${locked ? h`<p class="finish-next">다음 수업 Workshop ${pad(next.number)}는 ${next.opensLabel}에 열려요.</p>` : ''}
  <div class="finish-actions">
    <a class="btn btn-fill" href="/learn/">지도로 돌아가기</a>
    ${next && !locked ? h`<a class="btn btn-ghost" href="${lessonPath(next)}">Workshop ${pad(next.number)}로 →</a>` : ''}
    <button type="button" class="btn btn-ghost" data-restart>단계 다시 보기</button>
  </div>
</section>`;
}

// 슬라이드 보기: 처음에는 지금 단계의 과제 페이지(taskSlides)만 넘겨 보고, '강의 전체'를 누르면 모든 슬라이드를 순서대로 봅니다.
// 넘기기·보기 전환·크게 보기는 learn.js가 맡습니다. 과제 페이지에는 어느 과제인지 표시가 붙고,
// 글이 있는 페이지(content/practice-pages.mjs)는 아래 '이 페이지 글로 읽기'로 읽을 수 있어요.
function slideViewer(content, w) {
  const id = deckId(slidesOf(w).url);
  const deck = deckOf(content, w);
  const pages = deck.pages.map((p, i) => ({ id: p.id, src: `/slides/${id}/${p.file}`, no: i + 1, ...(content.transcripts?.[p.id] ?? {}) }));
  const tasks = {};
  w.missions.forEach((m, i) => {
    for (const item of [m, ...(m.options ?? [])]) for (const page of item.taskSlides ?? []) tasks[page] = `과제 ${i + 1}${item === m ? '' : ` · ${item.label.split(' — ')[0]}`}`;
  });
  const first = pages.find(p => p.id === taskSlidesOf(w.missions[0]).split(' ')[0]) ?? pages[0];
  return h`<div class="deck" data-deck data-pages="${JSON.stringify(pages)}" data-tasks="${JSON.stringify(tasks)}">
  <div class="deck-stage">
    <img data-deck-img src="${first.src}" alt="Workshop ${w.number} 슬라이드 ${first.no}" width="1920" height="1080">
    <span class="deck-chip" data-deck-chip hidden></span>
  </div>
  <div class="deck-bar">
    <button type="button" class="deck-nav" data-deck-prev aria-label="이전 슬라이드">‹</button>
    <span class="deck-count" data-deck-count aria-live="polite">1 / ${taskSlidesOf(w.missions[0]).split(' ').length}</span>
    <button type="button" class="deck-nav" data-deck-next aria-label="다음 슬라이드">›</button>
    <div class="deck-mode" role="group" aria-label="슬라이드 보기">
      <button type="button" data-deck-mode="task" aria-pressed="true">이 과제만</button>
      <button type="button" data-deck-mode="all" aria-pressed="false">강의 전체</button>
    </div>
    <button type="button" class="deck-nav" data-deck-full aria-label="크게 보기" title="크게 보기">⛶</button>
  </div>
  <details class="deck-text" data-deck-text${first.text ? '' : raw(' hidden')}><summary>이 페이지 글로 읽기</summary><p data-deck-text-body>${first.text ?? ''}</p></details>
</div>`;
}

// 수업 화면: 위 머리말(목록으로·제목·진도) + 단계 탭 줄 + 왼쪽 슬라이드(고정)와 오른쪽 지금 단계 설명.
// 좁은 화면(900px 이하)에서는 슬라이드가 위, 설명이 아래로 쌓입니다. 탭 표시는 learn.js가 바꿉니다.
// 모든 단계를 끝내면 슬라이드·설명 자리에 완료 화면이 나오고, 탭 줄 끝에 "완료" 탭이 생깁니다.
export function lessonPage(content, w) {
  const slides = slidesOf(w);
  const total = w.missions.length;
  return h`${loginCard({ kicker: `Workshop ${pad(w.number)}`, title: w.title, lead: '로그인하면 슬라이드를 보며 단계별로 따라 하고, 막힌 부분을 바로 질문할 수 있어요.' })}
<div class="lesson c-${w.color}" data-learn-content data-lesson="${w.number}" hidden>
  <header class="lesson-head">
    <a class="lesson-back" href="/learn/">← 수업 지도</a>
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
      ${slideViewer(content, w)}
      <p class="hint">${link(slides.url, '원본 슬라이드 새 창으로 열기')} · <a href="/workshops/${w.slug}/#materials">예제·자료 모음</a></p>
    </div>
    <div class="lesson-steps">${w.missions.map((m, i) => lessonStep(m, i, total))}</div>
  </div>
  ${finishScreen(content, w)}
</div>`;
}
