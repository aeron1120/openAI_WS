// 운영진 화면 (질문 답변·진도·자료 공개). learn.js·questions.js 위에서 동작합니다.
// - 질문 탭: 상태·회차로 거른 목록과, 고른 질문의 대화·답변 칸·상태 버튼. 주소 ?q=<id>로 오면 그 질문을 바로 엽니다.
// - 진도 탭: 회차별 단계마다 완료한 학생 수.
// 운영진이 아니면 learn.js가 막으므로 여기서는 운영진만 가정합니다. 서버에서 온 글은 textContent로만 넣습니다.
(() => {
  const Learn = window.Learn;
  if (!Learn) return;
  const { el, button } = Learn;

  const pad = n => String(n).padStart(2, '0');
  const MODES = { example: '예제 그대로', own: '내 아이디어로' };
  const AUTHORS = { student: '학생', operator: '운영진', ai: 'AI' };
  // 상태 거르기: 답변 대기가 기본, 빈 값은 전체입니다.
  const FILTERS = [['escalated', '답변 대기'], ['answered', '답변 옴'], ['resolved', '해결됨'], ['', '전체']];
  const studentName = student => (student?.name ?? '').split(' / ')[0] || student?.email || '학생';

  // 질문 상세 주소(새 탭으로 열기·새로고침용)
  const questionHref = id => `${location.pathname}?q=${encodeURIComponent(id)}`;

  function init(content) {
    // data-steps: [{ number, title, steps: [{ id, title }] }] (열린 회차만)
    let workshops = [];
    try { workshops = JSON.parse(content.dataset.steps || '[]'); } catch { workshops = []; }
    if (!Array.isArray(workshops)) workshops = [];
    const byNumber = new Map(workshops.map(w => [w.number, w]));
    const stepTitle = (workshop, step) => byNumber.get(workshop)?.steps?.find(s => s.id === step)?.title || step;
    const stepLabel = q => `Workshop ${pad(q.workshop)} · ${stepTitle(q.workshop, q.step)}`;

    // 질문·진도·자료 공개
    const tabs = el('div', 'admin-tabs');
    tabs.setAttribute('role', 'tablist');
    tabs.setAttribute('aria-label', '운영진 화면');
    const panels = {};
    const tabButtons = {};
    for (const [key, label] of [['questions', '질문'], ['progress', '진도'], ['materials', '자료 공개']]) {
      const tab = button(label, 'admin-tab', () => select(key, { focus: false }));
      tab.id = `admin-tab-${key}`;
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-controls', `admin-panel-${key}`);
      const panel = el('section', 'admin-panel');
      panel.id = `admin-panel-${key}`;
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', tab.id);
      tabButtons[key] = tab;
      panels[key] = panel;
      tabs.append(tab);
    }
    // 화살표 키로 탭을 옮깁니다.
    tabs.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const keys = Object.keys(tabButtons);
      const current = keys.findIndex(key => tabButtons[key].getAttribute('aria-selected') === 'true');
      const next = event.key === 'Home' ? keys[0] : event.key === 'End' ? keys.at(-1) : keys[(current + (event.key === 'ArrowRight' ? 1 : -1) + keys.length) % keys.length];
      select(next, { focus: true });
    });
    let progressLoaded = false;
    let materialsLoaded = false;
    function select(key, { focus }) {
      for (const [name, tab] of Object.entries(tabButtons)) {
        const on = name === key;
        tab.setAttribute('aria-selected', String(on));
        tab.tabIndex = on ? 0 : -1;
        panels[name].hidden = !on;
      }
      if (focus) tabButtons[key].focus();
      if (key === 'progress' && !progressLoaded) {
        progressLoaded = true;
        loadProgress();
      }
      if (key === 'materials' && !materialsLoaded) {
        materialsLoaded = true;
        loadMaterials();
      }
    }

    // ── 질문 탭 ──
    const filters = el('form', 'admin-filters');
    filters.addEventListener('submit', event => event.preventDefault());
    const selectBox = (label, options) => {
      const wrap = el('label', 'admin-filter');
      const node = el('select');
      for (const [value, text] of options) {
        const option = el('option', null, text);
        option.value = value;
        node.append(option);
      }
      wrap.append(el('span', 'composer-label', label), node);
      filters.append(wrap);
      return node;
    };
    const statusSelect = selectBox('상태', FILTERS);
    const workshopSelect = selectBox('회차', [['', '전체'], ...workshops.map(w => [String(w.number), `Workshop ${pad(w.number)} · ${w.title}`])]);
    filters.append(button('새로고침', 'btn btn-ghost', () => loadList()));
    statusSelect.addEventListener('change', () => loadList());
    workshopSelect.addEventListener('change', () => loadList());

    const listBox = el('div', 'admin-list');
    const detail = el('section', 'admin-detail');
    detail.setAttribute('aria-label', '질문 상세');
    detail.append(el('p', 'empty', '왼쪽(폰에서는 위쪽) 목록에서 질문을 고르면 대화와 답변 칸이 여기에 나와요.'));
    const split = el('div', 'admin-split');
    split.append(listBox, detail);
    panels.questions.append(filters, split);

    let current = null; // 열려 있는 질문 id
    let listToken = 0;
    let detailToken = 0;

    function markCurrent() {
      for (const link of listBox.querySelectorAll('[data-q]')) {
        if (link.dataset.q === current) link.setAttribute('aria-current', 'true');
        else link.removeAttribute('aria-current');
      }
    }

    async function loadList({ quiet = false } = {}) {
      const token = ++listToken;
      const params = new URLSearchParams();
      if (statusSelect.value) params.set('status', statusSelect.value);
      if (workshopSelect.value) params.set('workshop', workshopSelect.value);
      if (!quiet) listBox.replaceChildren(el('p', 'learn-status', '질문을 불러오는 중이에요…'));
      let data;
      try {
        data = await Learn.call(`/api/admin/questions${params.toString() ? `?${params}` : ''}`, { fallback: '질문 목록을 불러오지 못했어요.' });
      } catch (error) {
        if (token !== listToken) return;
        return listBox.replaceChildren(el('p', 'learn-error', error.message), button('다시 시도', 'btn btn-ghost', () => loadList()));
      }
      if (token !== listToken) return; // 그 사이 거르기를 바꿨으면 늦게 온 결과는 버립니다.
      const questions = data.questions ?? [];
      const count = el('p', 'hint admin-count', questions.length >= 200 ? '최근 200개까지 보여줘요.' : `${questions.length}개`);
      if (!questions.length) return listBox.replaceChildren(count, el('p', 'empty', '조건에 맞는 질문이 없어요.'));
      const list = el('ul', 'q-list');
      for (const q of questions) {
        const item = el('a', 'q-item');
        item.href = questionHref(q.id);
        item.dataset.q = q.id;
        const top = el('span', 'q-top');
        top.append(el('strong', null, studentName(q.student)), Learn.statusBadge(q.status));
        const meta = [`${Learn.when(q.updatedAt)} 갱신`];
        if (AUTHORS[q.lastAuthor]) meta.push(`마지막 글: ${AUTHORS[q.lastAuthor]}`);
        item.append(
          top,
          el('span', 'hint', q.student?.email ?? ''),
          el('span', 'admin-step', stepLabel(q)),
          el('span', 'q-preview', q.preview || '(내용 없음)'),
          el('span', 'hint', meta.join(' · '))
        );
        const row = el('li');
        row.append(item);
        list.append(row);
      }
      listBox.replaceChildren(count, list);
      markCurrent();
    }

    // 목록 항목을 누르면 상세를 엽니다. 새 탭으로 여는 클릭(Ctrl·가운데 버튼 등)은 그대로 둡니다.
    listBox.addEventListener('click', event => {
      const link = event.target.closest('[data-q]');
      if (!link || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      openDetail(link.dataset.q, { focus: true });
    });

    // 질문 하나: 학생·단계 정보, 대화, 상태 버튼, 답변 칸. quiet면 불러오는 중 문구 없이 바꿉니다.
    async function openDetail(id, { quiet = false, notice = '', focus = false } = {}) {
      const token = ++detailToken;
      current = id;
      markCurrent();
      if (new URLSearchParams(location.search).get('q') !== id) history.replaceState(null, '', questionHref(id));
      if (!quiet) detail.replaceChildren(el('p', 'learn-status', '대화를 불러오는 중이에요…'));
      let question;
      try {
        ({ question } = await Learn.call(`/api/admin/questions/${encodeURIComponent(id)}`, { fallback: '질문을 불러오지 못했어요.' }));
      } catch (error) {
        if (token !== detailToken) return;
        const nodes = [el('p', 'learn-error', error.message)];
        if (error.status !== 404) nodes.push(button('다시 시도', 'btn btn-ghost', () => openDetail(id)));
        return detail.replaceChildren(...nodes);
      }
      if (token !== detailToken) return; // 그 사이 다른 질문을 골랐으면 버립니다.
      // 답변·상태 변경 뒤에는 목록과 상세를 함께 다시 불러옵니다.
      const after = text => {
        loadList({ quiet: true });
        if (current === id) openDetail(id, { quiet: true, notice: text }); // 그 사이 다른 질문을 열었으면 그대로 둡니다.
      };

      const toList = button('← 목록으로', 'btn btn-ghost admin-back', () => {
        const link = listBox.querySelector('[aria-current="true"]') ?? listBox.querySelector('[data-q]') ?? statusSelect;
        link.focus();
      });
      const heading = el('h2', null, stepLabel(question));
      heading.tabIndex = -1;
      const head = el('div', 'q-head');
      head.append(heading, Learn.statusBadge(question.status));
      const workshopTitle = byNumber.get(question.workshop)?.title;
      const info = el('dl', 'admin-info');
      const row = (label, value) => {
        if (!value) return;
        const wrap = el('div');
        wrap.append(el('dt', null, label), el('dd', null, value));
        info.append(wrap);
      };
      row('학생', studentName(question.student));
      row('이메일', question.student?.email);
      row('회차', workshopTitle ? `Workshop ${pad(question.workshop)} · ${workshopTitle}` : `Workshop ${pad(question.workshop)}`);
      row('단계', stepTitle(question.workshop, question.step) === question.step ? question.step : `${stepTitle(question.workshop, question.step)} (${question.step})`);
      row('진행 방식', MODES[question.mode]);
      row('처음 질문', Learn.when(question.createdAt));

      const talk = el('div', 'q-thread');
      Learn.thread(talk, question, { operator: true });

      const actions = el('div', 'q-actions');
      const problem = el('p', 'composer-status is-error');
      problem.setAttribute('role', 'status');
      const statusButton = (next, label, done) => {
        const node = button(label, 'btn btn-ghost', async () => {
          node.disabled = true;
          problem.textContent = '';
          try {
            await Learn.call(`/api/admin/questions/${encodeURIComponent(id)}`, { method: 'PATCH', json: { status: next }, fallback: '상태를 바꾸지 못했어요. 잠시 후 다시 시도해 주세요.' });
            after(done);
          } catch (error) {
            problem.textContent = error.message;
            node.disabled = false;
          }
        });
        return node;
      };
      if (question.status !== 'resolved') actions.append(statusButton('resolved', '해결됨으로', '해결됨으로 바꿨어요.'));
      if (question.status !== 'escalated') actions.append(statusButton('escalated', '답변 대기로', '답변 대기로 바꿨어요.'));

      const reply = el('section', 'q-more');
      reply.append(el('h3', null, '답변 쓰기'), Learn.composer({
        submitLabel: '답변 보내기',
        maxLength: 4000,
        bodyLabel: '답변 내용',
        withErrorText: false,
        draftKey: `admin-reply:${id}`,
        placeholder: '학생이 다음에 무엇을 해 보면 되는지 적어 주세요.',
        async onSubmit(input) {
          await Learn.call(`/api/admin/questions/${encodeURIComponent(id)}/messages`, {
            method: 'POST', json: { body: input.body, attachmentIds: input.attachmentIds },
            fallback: '답변을 보내지 못했어요. 잠시 후 다시 시도해 주세요.'
          });
          after('답변을 보냈어요. 상태가 답변 옴으로 바뀌었어요.');
        }
      }));

      const nodes = [toList, head, info, talk];
      const note = notice ? el('p', 'ask-sent', notice) : null;
      if (note) {
        note.setAttribute('role', 'status');
        note.tabIndex = -1;
        nodes.push(note);
      }
      const hadFocus = detail.contains(document.activeElement);
      nodes.push(actions, problem, reply);
      detail.replaceChildren(...nodes);
      // 폰에서는 상세가 목록 아래에 있어서, 고르면 제목으로 옮겨 보여줍니다.
      if (focus) heading.focus();
      // 답변·상태 변경 뒤 다시 그리면 누른 버튼이 사라지므로, 안내 문구로 초점을 옮깁니다.
      else if (note && (hadFocus || document.activeElement === document.body)) note.focus({ preventScroll: true });
    }

    // ── 진도 탭 ──
    let progressToken = 0;
    async function loadProgress() {
      const token = ++progressToken;
      const box = panels.progress;
      box.replaceChildren(el('p', 'learn-status', '진도를 불러오는 중이에요…'));
      let data;
      try {
        data = await Learn.call('/api/admin/progress', { fallback: '진도를 불러오지 못했어요.' });
      } catch (error) {
        if (token !== progressToken) return;
        return box.replaceChildren(el('p', 'learn-error', error.message), button('다시 시도', 'btn btn-ghost', loadProgress));
      }
      if (token !== progressToken) return; // 새로고침을 또 눌렀으면 늦게 온 결과는 버립니다.
      const counts = new Map((data.progress ?? []).map(row => [`${row.workshop}\n${row.step}`, row.count]));
      const nodes = [el('div', 'admin-progress-head')];
      nodes[0].append(el('p', 'hint', '단계마다 끝낸 학생 수예요. 중간 단계는 "다음 →", 마지막 단계는 "실습 완료"를 누르면 끝낸 것으로 셉니다.'), button('새로고침', 'btn btn-ghost', loadProgress));
      if (!workshops.length) nodes.push(el('p', 'empty', '지금 열린 회차가 없어요.'));
      for (const w of workshops) {
        const table = el('table', 'admin-table');
        table.append(el('caption', null, `Workshop ${pad(w.number)} · ${w.title}`));
        const thead = el('thead');
        const headRow = el('tr');
        for (const label of ['단계', '완료 학생 수']) {
          const th = el('th', null, label);
          th.scope = 'col';
          headRow.append(th);
        }
        thead.append(headRow);
        const tbody = el('tbody');
        (w.steps ?? []).forEach((step, i) => {
          const tr = el('tr');
          const th = el('th', null, `${i + 1}. ${step.title}`);
          th.scope = 'row';
          tr.append(th, el('td', null, `${counts.get(`${w.number}\n${step.id}`) ?? 0}명`));
          tbody.append(tr);
        });
        table.append(thead, tbody);
        const wrap = el('div', 'admin-table-wrap');
        wrap.append(table);
        nodes.push(wrap);
      }
      box.replaceChildren(...nodes);
    }

    // ── 자료 공개 탭 ── 날짜 입력은 브라우저 시간대와 관계없이 한국 시간입니다.
    const koreaTime = value => new Intl.DateTimeFormat('ko-KR', {
      timeZone: 'Asia/Seoul', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).format(new Date(value));
    const inputTime = value => value ? new Date(Date.parse(value) + 9 * 60 * 60 * 1000).toISOString().slice(0, 16) : '';
    let materialsToken = 0;
    async function loadMaterials() {
      const token = ++materialsToken;
      const box = panels.materials;
      box.replaceChildren(el('p', 'learn-status', '자료 공개 설정을 불러오는 중이에요…'));
      try {
        const data = await Learn.call('/api/admin/materials', { fallback: '자료 공개 설정을 불러오지 못했어요.' });
        if (token !== materialsToken) return;
        const head = el('div', 'admin-progress-head');
        head.append(el('p', 'hint', '슬라이드·실습·예제의 공개를 함께 관리해요. 모든 시간은 한국 시간이며, 행사 일정은 바뀌지 않아요.'), button('새로고침', 'btn btn-ghost', loadMaterials));
        const list = el('div', 'admin-materials');
        for (const setting of data.materials ?? []) list.append(materialCard(setting, Boolean(data.preview)));
        if (!list.children.length) list.append(el('p', 'empty', '관리할 자료가 아직 등록되지 않았어요.'));
        box.replaceChildren(head, list);
        if (data.preview) head.prepend(el('p', 'hint', '미리보기입니다. 설정은 저장되지 않습니다.'));
      } catch (error) {
        if (token !== materialsToken) return;
        box.replaceChildren(el('p', 'learn-error', error.message), button('다시 시도', 'btn btn-ghost', loadMaterials));
      }
    }

    function materialCard(setting, preview) {
      const form = el('form', 'admin-material-card');
      const title = byNumber.get(setting.workshop)?.title;
      form.append(el('h2', null, `Workshop ${pad(setting.workshop)}${title ? ` · ${title}` : ''}`));
      const state = setting.open ? '공개 중' : setting.mode === 'scheduled' ? `${koreaTime(setting.opensAt)} 공개 예정` : '비공개';
      form.append(el('p', 'admin-material-state', state));
      const controls = el('div', 'admin-filters');
      const modeLabel = el('label', 'admin-filter');
      const mode = el('select');
      for (const [value, text] of [['scheduled', '예약 공개'], ['open', '즉시 공개'], ['closed', '비공개']]) {
        const option = el('option', null, text);
        option.value = value;
        mode.append(option);
      }
      mode.value = setting.mode;
      modeLabel.append(el('span', 'composer-label', '공개 방식'), mode);
      const timeLabel = el('label', 'admin-filter');
      const time = el('input');
      time.type = 'datetime-local';
      time.min = '2000-01-01T00:00';
      time.value = inputTime(setting.opensAt);
      timeLabel.append(el('span', 'composer-label', '공개 날짜·시간 (한국 시간)'), time);
      const syncMode = () => {
        timeLabel.hidden = mode.value !== 'scheduled';
        time.required = mode.value === 'scheduled';
        time.disabled = mode.value !== 'scheduled';
      };
      mode.addEventListener('change', syncMode);
      syncMode();
      const save = el('button', 'btn btn-fill', '설정 저장');
      save.type = 'submit';
      save.disabled = preview;
      controls.append(modeLabel, timeLabel, save);
      const notice = el('p', 'composer-status');
      notice.setAttribute('role', 'status');
      form.append(controls, el('p', 'hint', '저장 후 새로 여는 페이지부터 반영돼요. 이미 열어 둔 수업 화면은 새로고침해 주세요. 지난 시각을 예약하면 바로 공개돼요.'), notice);
      if (setting.updatedAt) form.append(el('p', 'hint', `마지막 저장: ${koreaTime(setting.updatedAt)}${setting.updatedBy ? ` · ${setting.updatedBy}` : ''}`));
      form.addEventListener('submit', async event => {
        event.preventDefault();
        if (preview || !form.reportValidity()) return;
        const json = { mode: mode.value, opensAt: mode.value === 'scheduled' ? `${time.value}:00+09:00` : null };
        mode.disabled = time.disabled = save.disabled = true;
        notice.classList.remove('is-error');
        notice.textContent = '저장하는 중이에요…';
        try {
          const data = await Learn.call(`/api/admin/materials/${setting.workshop}`, { method: 'PUT', json, fallback: '저장하지 못했어요. 다시 시도해 주세요.' });
          const saved = data.materials?.find(w => w.workshop === setting.workshop);
          if (!saved) throw new Error('저장 결과를 확인하지 못했어요. 새로고침해서 확인해 주세요.');
          const updated = materialCard(saved, false);
          const message = updated.querySelector('[role="status"]');
          message.textContent = '저장했어요. 새로 여는 페이지에 반영됩니다.';
          message.tabIndex = -1;
          form.replaceWith(updated);
          message.focus({ preventScroll: true });
        } catch (error) {
          notice.classList.add('is-error');
          notice.textContent = error.message;
          mode.disabled = save.disabled = false;
          syncMode();
        }
      });
      return form;
    }

    // 알림 메일 시험: 눌러서 메일 설정이 되어 있는지, 안 되면 왜 안 되는지 봅니다.
    const mailBox = el('div', 'admin-mail');
    const mailStatus = el('p', 'admin-mail-status');
    mailStatus.setAttribute('role', 'status');
    const mailButton = button('알림 메일 시험 보내기', 'admin-mail-button', async () => {
      mailButton.disabled = true;
      mailStatus.textContent = '보내는 중이에요…';
      try {
        const result = await Learn.call('/api/admin/notify-test', { method: 'POST' });
        mailStatus.textContent = result?.ok ? '시험 메일을 보냈어요. 받은 편지함(스팸함 포함)을 확인해 주세요.' : `보내지 못했어요: ${result?.reason || '이유를 알 수 없어요.'}`;
      } catch (error) {
        mailStatus.textContent = `보내지 못했어요: ${error.message}`;
      } finally {
        mailButton.disabled = false;
      }
    });
    mailBox.append(mailButton, mailStatus);

    content.replaceChildren(mailBox, tabs, panels.questions, panels.progress, panels.materials);
    select(paramsTab(), { focus: false });
    loadList();
    // 메일 링크(/admin/?q=<id>)로 왔으면 그 질문을 바로 엽니다.
    const fromLink = new URLSearchParams(location.search).get('q');
    if (fromLink) openDetail(fromLink, { focus: true });
    function paramsTab() {
      const params = new URLSearchParams(location.search);
      return !params.has('q') && params.get('tab') === 'materials' ? 'materials' : 'questions';
    }
  }

  Learn.register('admin', init);
})();
