// 질문 칸·대화·이미지 올리기 (학생·운영진 공용). learn.js 위에서 동작합니다.
// - Learn.openAsk(단계 section, { workshop, step }): 수업 화면 단계 아래 질문 칸을 열고 닫습니다.
// - Learn.composer({ submitLabel, maxLength, onSubmit }): 입력 칸(내용·오류 문구·이미지 3장)을 만듭니다.
// - Learn.thread(container, question, { operator }): 대화를 그립니다.
// - register('questions'): 내 질문(/learn/questions/) 목록과 대화.
// 서버에서 온 글은 모두 textContent로만 넣습니다.
(() => {
  const Learn = window.Learn;
  if (!Learn) return;
  const { el, button } = Learn;

  const TYPES = ['image/png', 'image/jpeg', 'image/webp'];
  const MAX_IMAGES = 3;
  const MAX_BYTES = 5 * 1024 * 1024;
  const STATUS = {
    escalated: ['답변 대기', 'badge-tbd'],
    answered: ['답변 옴', 'badge-open'],
    resolved: ['해결됨', 'badge-done'],
    ai_answered: ['AI 답변', 'badge-presenter']
  };
  const MODES = { example: '예제 그대로', own: '내 아이디어로' };
  const pad = n => String(n).padStart(2, '0');
  const when = iso => {
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('ko-KR');
  };
  const statusBadge = status => {
    const [label, tone] = STATUS[status] ?? [String(status ?? ''), 'badge-done'];
    return el('span', `badge ${tone}`, label);
  };
  // 단계 이름: 화면의 data-steps에서 찾고, 없으면 단계 id를 보여줍니다.
  let stepNames = new Map();
  const loadStepNames = content => {
    try {
      const list = JSON.parse(content.dataset.steps || '[]');
      stepNames = new Map((Array.isArray(list) ? list : []).flatMap(w => (w.steps ?? []).map(s => [`${w.number}
${s.id}`, s.title])));
    } catch { stepNames = new Map(); }
  };
  const stepLabel = q => `Workshop ${pad(q.workshop)} · ${stepNames.get(`${q.workshop}
${q.step}`) || q.step}`;
  const link = (href, text) => {
    const node = el('a', null, text);
    node.href = href;
    return node;
  };
  // 서명된 이미지 주소만 씁니다(http·https).
  const safeUrl = url => {
    try { return ['https:', 'http:'].includes(new URL(url).protocol) ? url : null; } catch { return null; }
  };
  let uid = 0;

  // 임시 저장: localStorage가 막혀 있어도(사생활 보호 창 등) 질문은 보낼 수 있어요.
  const store = {
    get(key) { try { return JSON.parse(localStorage.getItem(key) ?? 'null'); } catch { return null; } },
    set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* 저장 못 해도 괜찮아요. */ } },
    remove(key) { try { localStorage.removeItem(key); } catch { /* 무시 */ } }
  };

  // 이미지 1장 올리기 → 첨부 id
  async function upload(file) {
    const data = await Learn.call('/api/uploads', {
      method: 'POST', headers: { 'content-type': file.type }, body: file,
      signal: AbortSignal.timeout(60000), fallback: '이미지를 올리지 못했어요. 잠시 후 다시 시도해 주세요.'
    });
    return data.attachment.id;
  }

  // 질문·추가 질문 보내기: 30초 안에 답이 없거나 연결이 끊기면, 이미 보내졌을 수 있어 확인을 안내합니다.
  async function send(path, options) {
    try {
      return await Learn.call(path, { ...options, signal: AbortSignal.timeout(30000) });
    } catch (error) {
      if (error.code === 'NETWORK') error.message = "응답이 늦어요. '내 질문'에서 보내졌는지 확인한 뒤 다시 보내 주세요.";
      throw error;
    }
  }

  // 입력 칸. 보내기를 누르면 이미지를 먼저 올리고 onSubmit({ body, errorText, attachmentIds, mode })를 부릅니다.
  // onSubmit이 Error를 던지면 그 문구를 보여주고 입력은 그대로 둡니다. 성공하면 칸을 비웁니다.
  // 더 고를 수 있는 것: bodyLabel(내용 칸 이름), withMode(진행 방식), withErrorText(오류 문구 칸, 기본 켬),
  // draftKey(임시 저장 이름), placeholder.
  function composer({ submitLabel = '보내기', maxLength = 2000, onSubmit, bodyLabel = '질문 내용', withMode = false, withErrorText = true, draftKey = null, placeholder = '' } = {}) {
    const id = `composer-${++uid}`;
    const form = el('form', 'composer');
    form.noValidate = true;
    const fields = el('fieldset', 'composer-fields');

    let modes = [];
    if (withMode) {
      const set = el('fieldset', 'composer-mode');
      set.append(el('legend', null, '어떻게 진행하고 있나요? (선택)'));
      modes = Object.entries(MODES).map(([value, label]) => {
        const input = el('input');
        input.type = 'radio';
        input.name = `${id}-mode`;
        input.value = value;
        const wrap = el('label', 'composer-radio');
        wrap.append(input, el('span', null, label));
        set.append(wrap);
        return input;
      });
      fields.append(set);
    }

    const textarea = (className, max, rows, hint) => {
      const node = el('textarea', className);
      node.maxLength = max;
      node.rows = rows;
      if (hint) node.placeholder = hint;
      return node;
    };
    const field = (label, input) => {
      const wrap = el('label', 'composer-field');
      wrap.append(el('span', 'composer-label', label), input);
      return wrap;
    };
    const body = textarea('', maxLength, 4, placeholder);
    body.required = true;
    const left = el('span', 'hint composer-count');
    const countLeft = () => { left.textContent = `남은 글자 ${maxLength - body.value.length}자`; };
    fields.append(field(`${bodyLabel} (필수)`, body), left);
    const errorText = withErrorText ? textarea('composer-code', 4000, 3, '터미널이나 화면에 나온 오류 문구를 그대로 붙여 넣어 주세요.') : null;
    if (errorText) fields.append(field('오류 문구 (선택)', errorText));

    // 이미지: 파일 고르기·칸에 끌어다 놓기·붙여넣기(Ctrl+V). 올리는 건 보낼 때 합니다.
    const items = []; // { file, url(미리보기), id(올린 뒤 첨부 id) }
    const picker = el('input');
    picker.type = 'file';
    picker.accept = TYPES.join(',');
    picker.multiple = true;
    picker.hidden = true;
    const pick = button('이미지 고르기', 'btn btn-ghost', () => picker.click());
    const counter = el('span', 'hint');
    const previews = el('ul', 'composer-images');
    const drop = el('div', 'composer-drop');
    const pickRow = el('div', 'composer-pick');
    pickRow.append(pick, counter, picker);
    drop.append(
      el('p', 'composer-label', '오류 화면 이미지 (선택)'),
      el('p', 'hint', `PNG·JPEG·WebP, 최대 ${MAX_IMAGES}장, 장당 5MB. 이 칸에 끌어다 놓거나 붙여 넣어도 돼요.`),
      el('p', 'composer-warn', 'API 키·비밀번호·개인정보가 보이면 가린 뒤 올려 주세요.'),
      pickRow, previews
    );
    fields.append(drop);

    const status = el('p', 'composer-status');
    status.setAttribute('role', 'status');
    const say = (text, error = false) => {
      status.textContent = text;
      status.classList.toggle('is-error', error);
    };
    const submit = el('button', 'btn btn-fill', submitLabel);
    submit.type = 'submit';
    const actions = el('div', 'composer-actions');
    actions.append(submit);
    form.append(fields, actions, status);

    function drawImages() {
      previews.replaceChildren(...items.map((item, i) => {
        const row = el('li');
        const img = el('img');
        img.src = item.url;
        img.alt = `붙인 이미지 ${i + 1}`;
        const remove = button('빼기', 'btn btn-ghost', () => {
          URL.revokeObjectURL(item.url);
          items.splice(items.indexOf(item), 1);
          drawImages();
          pick.focus();
        });
        remove.setAttribute('aria-label', `이미지 ${i + 1} 빼기`);
        row.append(img, remove);
        return row;
      }));
      previews.hidden = !items.length;
      pick.disabled = items.length >= MAX_IMAGES;
      counter.textContent = `${items.length} / ${MAX_IMAGES}장`;
    }
    let busy = false;
    function addFiles(list) {
      if (busy) return;
      const problems = new Set();
      for (const file of list) {
        if (!TYPES.includes(file.type)) problems.add('PNG·JPEG·WebP 이미지만 올릴 수 있어요.');
        else if (file.size > MAX_BYTES) problems.add('이미지는 5MB 이하로 올려 주세요.');
        else if (items.length >= MAX_IMAGES) problems.add(`이미지는 ${MAX_IMAGES}장까지 붙일 수 있어요.`);
        else items.push({ file, url: URL.createObjectURL(file), id: null });
      }
      say([...problems].join(' '), problems.size > 0);
      drawImages();
    }
    picker.addEventListener('change', () => {
      addFiles([...picker.files]);
      picker.value = ''; // 같은 파일을 다시 고를 수 있게 비웁니다.
    });
    const hasFiles = event => [...(event.dataTransfer?.types ?? [])].includes('Files');
    form.addEventListener('dragover', event => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      form.classList.add('is-dragging');
    });
    form.addEventListener('dragleave', event => {
      if (!form.contains(event.relatedTarget)) form.classList.remove('is-dragging');
    });
    form.addEventListener('drop', event => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      form.classList.remove('is-dragging');
      addFiles([...event.dataTransfer.files]);
    });
    // 칸 밖에 이미지를 떨어뜨리면 브라우저가 그 파일을 열어 버려요(쓰던 내용이 사라짐). 칸이 열려 있는 동안 막습니다.
    // 칸이 화면에서 없어지면(닫힘·다시 그림) 다음 드래그 때 스스로 떼어 냅니다.
    const guard = event => {
      if (!form.isConnected) {
        document.removeEventListener('dragover', guard);
        document.removeEventListener('drop', guard);
        return;
      }
      if (form.getClientRects().length && hasFiles(event)) event.preventDefault(); // 접어 둔 칸이면 막지 않습니다.
    };
    document.addEventListener('dragover', guard);
    document.addEventListener('drop', guard);
    // 붙여넣기: 이미지가 있을 때만 가로채고, 글자는 평소처럼 붙여 넣습니다.
    // Word·PowerPoint에서 복사하면 글자와 함께 그림도 들어오므로, 글자가 있으면 글자로 붙여 넣습니다.
    form.addEventListener('paste', event => {
      const images = [...(event.clipboardData?.files ?? [])].filter(file => file.type.startsWith('image/'));
      if (!images.length) return;
      if ([...(event.clipboardData?.types ?? [])].includes('text/plain') && event.target.matches?.('textarea')) return;
      event.preventDefault();
      addFiles(images);
    });

    // 임시 저장(이미지는 빼고): 입력할 때마다 저장하고, 보내면 지웁니다.
    const mode = () => modes.find(input => input.checked)?.value;
    function saveDraft() {
      if (!draftKey) return;
      const draft = { body: body.value, errorText: errorText?.value ?? '', mode: mode() ?? null };
      if (draft.body || draft.errorText || draft.mode) store.set(draftKey, draft);
      else store.remove(draftKey);
    }
    form.addEventListener('input', saveDraft);
    form.addEventListener('change', saveDraft);
    const draft = draftKey ? store.get(draftKey) : null;
    if (draft && typeof draft === 'object') {
      if (typeof draft.body === 'string') body.value = draft.body.slice(0, maxLength);
      if (errorText && typeof draft.errorText === 'string') errorText.value = draft.errorText.slice(0, 4000);
      for (const input of modes) input.checked = input.value === draft.mode;
      if (body.value || errorText?.value || mode()) say('임시 저장한 내용을 불러왔어요. 이미지는 다시 붙여 주세요.');
    }
    body.addEventListener('input', countLeft);
    countLeft();
    drawImages();

    function clear() {
      body.value = '';
      if (errorText) errorText.value = '';
      for (const input of modes) input.checked = false;
      for (const item of items) URL.revokeObjectURL(item.url);
      items.length = 0;
      if (draftKey) store.remove(draftKey);
      countLeft();
      drawImages();
    }

    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (busy) return;
      const text = body.value.trim();
      if (!text) {
        say('내용을 적어 주세요.', true);
        body.focus();
        return;
      }
      busy = true;
      fields.disabled = true;
      submit.disabled = true;
      try {
        if (items.some(item => !item.id)) say('이미지를 올리는 중이에요…');
        // 이미 올린 이미지는 다시 올리지 않습니다(다시 보내기를 눌렀을 때).
        for (const item of items) item.id ??= await upload(item.file);
        say('보내는 중이에요…');
        await onSubmit({ body: text, errorText: errorText?.value.trim() || undefined, attachmentIds: items.map(item => item.id), mode: mode() });
        clear();
        say('');
      } catch (error) {
        // 서버가 첨부를 쓸 수 없다고 하면(시간이 지남 등) 다음에 다시 올립니다.
        const expired = error.code === 'ATTACHMENT_INVALID';
        if (expired) for (const item of items) item.id = null;
        say(expired ? '이미지를 새로 올려야 해요. 보내기를 한 번 더 누르면 다시 올라가요.' : error.message || '보내지 못했어요. 잠시 후 다시 시도해 주세요.', true);
      } finally {
        busy = false;
        fields.disabled = false;
        submit.disabled = false;
      }
    });
    return form;
  }

  // 대화: 말풍선마다 쓴 사람·시각·내용·오류 문구·이미지. 학생 화면에는 운영진 이메일을 보여주지 않습니다.
  function thread(container, question, { operator = false } = {}) {
    const student = operator ? ((question.student?.name ?? '').split(' / ')[0] || question.student?.email || '학생') : '나';
    const who = m => m.author === 'student' ? student
      : m.author === 'ai' ? 'AI'
      : operator && m.operatorEmail ? `운영진 · ${m.operatorEmail}` : '운영진';
    const list = el('ol', 'thread');
    for (const m of question.messages ?? []) {
      const author = ['student', 'operator', 'ai'].includes(m.author) ? m.author : 'operator';
      const item = el('li', `msg msg-${author}`);
      const head = el('p', 'msg-head');
      const time = el('time', 'hint', when(m.createdAt));
      if (m.createdAt) time.dateTime = m.createdAt;
      head.append(el('strong', null, who(m)), time);
      item.append(head, el('p', 'msg-body', m.body ?? ''));
      if (m.errorText) {
        const pre = el('pre', 'msg-error', m.errorText);
        pre.setAttribute('aria-label', '오류 문구');
        item.append(el('p', 'msg-label', '오류 문구'), pre);
      }
      if (m.images?.length) {
        const row = el('div', 'msg-images');
        m.images.forEach((image, i) => {
          const url = safeUrl(image.url);
          if (!url) return row.append(el('span', 'hint', '이미지를 불러오지 못했어요.'));
          const open = link(url, '');
          open.target = '_blank';
          open.rel = 'noopener noreferrer';
          const img = el('img');
          img.src = url;
          img.alt = `첨부 이미지 ${i + 1} (누르면 새 창에서 원본을 봐요)`;
          img.loading = 'lazy';
          open.append(img);
          row.append(open);
        });
        item.append(row);
      }
      list.append(item);
    }
    container.replaceChildren(list);
    return list;
  }

  // 수업 화면: 단계 아래 질문 칸을 열고(이미 열려 있으면 닫기) 질문을 보냅니다.
  function openAsk(section, { workshop, step }) {
    const box = section?.querySelector('[data-ask]');
    if (!box) return;
    const opener = section.querySelector('[data-ask-open]');
    if (!box.hidden) {
      box.hidden = true;
      opener?.setAttribute('aria-expanded', 'false');
      return;
    }
    section.querySelector('.ask-sent')?.remove();
    if (!box.firstChild) {
      const form = composer({
        submitLabel: '질문 보내기',
        withMode: true,
        draftKey: `learn-ask:${workshop}:${step}`,
        placeholder: '무엇을 하려다 어디서 막혔는지 적어 주세요.',
        async onSubmit(input) {
          const data = await send('/api/questions', {
            method: 'POST', json: { workshop, step, ...input }, fallback: '질문을 보내지 못했어요. 잠시 후 다시 시도해 주세요.'
          });
          const { id, status } = data.question;
          // 칸을 닫고, 다음에 열면 새 칸을 만듭니다.
          box.hidden = true;
          box.replaceChildren();
          opener?.setAttribute('aria-expanded', 'false');
          const note = el('p', 'ask-sent');
          note.setAttribute('role', 'status');
          const mine = link(`/learn/questions/?id=${encodeURIComponent(id)}`, '내 질문');
          if (status === 'ai_answered') note.append('AI가 먼저 답했어요. ', mine, '에서 확인해 주세요.');
          else note.append('질문을 보냈어요. 답변은 ', mine, '에서 볼 수 있어요.');
          box.after(note);
          opener?.focus();
        }
      });
      box.append(el('h3', 'ask-title', '막힌 부분 질문하기'), form);
    }
    box.hidden = false;
    opener?.setAttribute('aria-expanded', 'true');
    box.querySelector('textarea')?.focus();
  }

  const failed = (container, message, retry, ...before) =>
    container.replaceChildren(...before, el('p', 'learn-error', message), button('다시 시도', 'btn btn-ghost', retry));

  // 내 질문 목록
  async function showList(content) {
    content.replaceChildren(el('p', 'learn-status', '질문을 불러오는 중이에요…'));
    let data;
    try {
      data = await Learn.call('/api/questions', { fallback: '질문 목록을 불러오지 못했어요.' });
    } catch (error) {
      return failed(content, error.message, () => showList(content));
    }
    const questions = data.questions ?? [];
    if (!questions.length) {
      return content.replaceChildren(el('p', 'empty', "아직 질문이 없어요. 수업 화면에서 막힌 단계의 '막혔어요 · 질문하기'를 눌러 보세요."));
    }
    const list = el('ul', 'q-list');
    for (const q of questions) {
      const item = link(`/learn/questions/?id=${encodeURIComponent(q.id)}`, '');
      item.className = 'q-item';
      const top = el('span', 'q-top');
      top.append(el('strong', null, stepLabel(q)), statusBadge(q.status));
      item.append(top, el('span', 'q-preview', q.preview || '(내용 없음)'), el('span', 'hint', `${when(q.updatedAt)} 갱신`));
      const row = el('li');
      row.append(item);
      list.append(row);
    }
    content.replaceChildren(list);
  }

  // 질문 하나의 대화와 추가 질문 칸. 보낸 뒤에는 대화를 다시 불러옵니다(quiet: 불러오는 중 문구 없이).
  async function showQuestion(content, id, { quiet = false, notice = '' } = {}) {
    const back = () => link('/learn/questions/', '← 내 질문 목록');
    const reload = text => showQuestion(content, id, { quiet: true, notice: text });
    if (!quiet) content.replaceChildren(back(), el('p', 'learn-status', '대화를 불러오는 중이에요…'));
    let question;
    try {
      ({ question } = await Learn.call(`/api/questions/${encodeURIComponent(id)}`, { fallback: '질문을 불러오지 못했어요.' }));
    } catch (error) {
      if (error.status === 404) return content.replaceChildren(back(), el('p', 'learn-error', error.message));
      return failed(content, error.message, () => showQuestion(content, id), back());
    }

    const head = el('div', 'q-head');
    head.append(el('h2', null, stepLabel(question)), statusBadge(question.status));
    const meta = [`처음 질문 ${when(question.createdAt)}`];
    if (MODES[question.mode]) meta.push(MODES[question.mode]);
    const talk = el('div', 'q-thread');
    thread(talk, question);

    const actions = el('div', 'q-actions');
    const problem = el('p', 'composer-status is-error');
    problem.setAttribute('role', 'status');
    const statusButton = (next, label, className, done) => {
      const node = button(label, className, async () => {
        node.disabled = true;
        try {
          await Learn.call(`/api/questions/${encodeURIComponent(id)}`, { method: 'PATCH', json: { status: next }, fallback: '상태를 바꾸지 못했어요. 잠시 후 다시 시도해 주세요.' });
          reload(done);
        } catch (error) {
          problem.textContent = error.message;
          node.disabled = false;
        }
      });
      return node;
    };
    if (question.status === 'ai_answered') actions.append(statusButton('escalated', '운영진에게 물어보기', 'btn btn-fill', '운영진에게 물어봤어요.'));
    if (question.status !== 'resolved') actions.append(statusButton('resolved', '해결됐어요', 'btn btn-ghost', '해결됨으로 표시했어요.'));

    const more = el('section', 'q-more');
    more.append(el('h3', null, '추가로 묻기'), composer({
      submitLabel: '추가 질문 보내기',
      placeholder: '더 궁금한 점이나 해 본 것을 적어 주세요.',
      async onSubmit(input) {
        await send(`/api/questions/${encodeURIComponent(id)}/messages`, {
          method: 'POST', json: { body: input.body, errorText: input.errorText, attachmentIds: input.attachmentIds },
          fallback: '보내지 못했어요. 잠시 후 다시 시도해 주세요.'
        });
        reload('추가 질문을 보냈어요.');
      }
    }));

    const nodes = [back(), head, el('p', 'hint', meta.join(' · ')), talk];
    if (notice) {
      const note = el('p', 'ask-sent', notice);
      note.setAttribute('role', 'status');
      nodes.push(note);
    }
    if (actions.childElementCount) nodes.push(actions, problem);
    nodes.push(more);
    content.replaceChildren(...nodes);
  }

  Object.assign(Learn, { openAsk, composer, thread, statusBadge, statusLabels: Object.fromEntries(Object.entries(STATUS).map(([key, [label]]) => [key, label])), when });

  Learn.register('questions', content => {
    loadStepNames(content);
    const id = new URLSearchParams(location.search).get('id');
    if (id) showQuestion(content, id);
    else showList(content);
  });
})();
