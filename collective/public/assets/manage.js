// 중앙 관리 화면 동작: 폼 저장(revision 확인), 파일 올리기, 자료 연결 행, 게시·복원.
// '저장됨'은 서버가 응답한 뒤에만 표시하고, 실패하면 입력을 그대로 둡니다.
(() => {
  const csrf = document.querySelector('meta[name="cms-csrf"]')?.content ?? '';
  const statusBox = document.querySelector('[data-status]');
  const dirtyBadge = document.querySelector('[data-dirty-indicator]');
  let dirty = false;

  function setStatus(message, tone = 'info', html = false) {
    if (!statusBox) return;
    statusBox.className = `m-status m-status-${tone}`;
    if (html) statusBox.innerHTML = message; else statusBox.textContent = message;
    if (message) statusBox.scrollIntoView({ block: 'nearest' });
  }
  function setDirty(value) {
    dirty = value;
    if (dirtyBadge) dirtyBadge.hidden = !value;
  }
  window.addEventListener('beforeunload', event => { if (dirty) { event.preventDefault(); event.returnValue = ''; } });

  async function api(method, url, body, { raw = null, headers = {} } = {}) {
    let response;
    try {
      response = await fetch(url, {
        method,
        credentials: 'same-origin',
        headers: { 'x-cms-csrf': csrf, ...(raw ? headers : { 'content-type': 'application/json' }) },
        body: raw ?? (body === undefined ? undefined : JSON.stringify(body))
      });
    } catch {
      return { ok: false, status: 0, data: { message: '서버에 연결하지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요. 입력한 내용은 그대로 있어요.' } };
    }
    let data = {};
    try { data = await response.json(); } catch {}
    if (response.status === 401) data.message = '로그인이 끝났어요. 새 탭에서 다시 로그인한 뒤 이 화면에서 다시 저장해 주세요. 입력한 내용은 그대로 있어요.';
    return { ok: response.ok, status: response.status, data };
  }

  const KST = value => value ? `${value.length === 16 ? `${value}:00` : value}+09:00` : null;
  const nullable = value => value === '' ? null : value;

  function serialize(form) {
    const data = {};
    for (const input of form.querySelectorAll('[name][data-type]')) {
      const type = input.dataset.type;
      const name = input.name;
      if (type === 'bool') data[name] = input.checked;
      else if (type === 'datetime') data[name] = KST(input.value);
      else if (type === 'list') data[name] = input.value.split('\n').map(line => line.trim()).filter(Boolean);
      else if (['url', 'ref', 'media', 'select', 'date', 'number'].includes(type)) data[name] = nullable(input.value.trim());
      else data[name] = input.value;
    }
    for (const set of form.querySelectorAll('fieldset[data-type="refs"]')) {
      data[set.dataset.name] = [...set.querySelectorAll('.m-ref-row')]
        .filter(row => row.querySelector('input[type="checkbox"]').checked)
        .map((row, index) => ({ id: row.querySelector('input[type="checkbox"]').value, order: Number(row.querySelector('input[type="number"]').value) || 100 + index }))
        .sort((a, b) => a.order - b.order).map(entry => entry.id);
    }
    for (const set of form.querySelectorAll('fieldset[data-type="materials"]')) {
      data.materials = [...set.querySelectorAll('[data-mat-row]')].map(row => ({
        versionId: row.querySelector('[data-mat="versionId"]').value,
        exposeAt: KST(row.querySelector('[data-mat="exposeAt"]').value),
        note: row.querySelector('[data-mat="note"]').value
      }));
    }
    return data;
  }

  function showFieldError(form, field, message) {
    form.querySelectorAll('.m-field-error').forEach(node => node.remove());
    form.querySelectorAll('[aria-invalid]').forEach(node => node.removeAttribute('aria-invalid'));
    if (!field) return;
    const input = form.querySelector(`[name="${CSS.escape(field)}"]`) ?? form.querySelector(`[data-name="${CSS.escape(field)}"]`);
    if (!input) return;
    const error = document.createElement('p');
    error.className = 'm-field-error';
    error.id = `err-${field}`;
    error.textContent = message;
    (input.closest('.m-field') ?? input).append(error);
    input.setAttribute('aria-invalid', 'true');
    input.setAttribute('aria-describedby', error.id);
    input.focus();
  }

  // ---------- 항목 폼 ----------
  for (const form of document.querySelectorAll('[data-item-form]')) {
    form.addEventListener('input', () => setDirty(true));
    form.addEventListener('change', () => setDirty(true));
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const button = form.querySelector('button[type="submit"]');
      const state = form.querySelector('[data-save-state]');
      button.disabled = true;
      state.textContent = '저장하는 중…';
      const data = serialize(form);
      const id = form.dataset.id;
      const result = id
        ? await api('PUT', `/api/manage/items/${encodeURIComponent(id)}`, { data, expectedRevision: Number(form.dataset.revision) })
        : await api('POST', '/api/manage/items', { kind: form.dataset.kind, campusId: form.dataset.campus ?? null, data });
      button.disabled = false;
      if (result.ok) {
        setDirty(false);
        showFieldError(form, null);
        const item = result.data.item;
        if (!id) {
          location.href = item.kind === 'campus' ? `/manage/campuses/${item.id}/` : `/manage/items/${item.id}/?created=1`;
          return;
        }
        form.dataset.revision = item.revision;
        state.textContent = `저장됨 · ${new Date(item.updatedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} · 수정 ${item.revision}번째 (공개하려면 게시하세요)`;
        setStatus('초안을 저장했어요. 공개 사이트는 게시해야 바뀌어요.', 'ok');
        return;
      }
      state.textContent = '저장하지 못했어요';
      if (result.data.error === 'CONFLICT') {
        const current = result.data.current;
        setStatus(`${result.data.message} <button type="button" class="m-btn m-btn-sm" data-reload>최신 내용 불러오기 (내 입력은 사라져요)</button> <button type="button" class="m-btn m-btn-ghost m-btn-sm" data-overwrite>내 입력으로 덮어쓰기</button>`, 'warn', true);
        statusBox.querySelector('[data-reload]').addEventListener('click', () => { setDirty(false); location.reload(); });
        statusBox.querySelector('[data-overwrite]').addEventListener('click', () => {
          if (!confirm(`다른 화면에서 저장한 내용(${new Date(current.updatedAt).toLocaleString('ko-KR')} · ${current.updatedBy})을 지금 입력으로 덮어써요. 계속할까요?`)) return;
          form.dataset.revision = current.revision;
          form.requestSubmit();
        });
        return;
      }
      if (result.data.field) showFieldError(form, result.data.field, result.data.message);
      setStatus(result.data.message ?? '저장하지 못했어요. 잠시 후 다시 시도해 주세요. 입력한 내용은 그대로 있어요.', 'error');
    });
  }
  if (new URLSearchParams(location.search).get('created')) setStatus('만들었어요. 이어서 수정하고 저장할 수 있어요.', 'ok');

  // ---------- 파일 ----------
  for (const field of document.querySelectorAll('[data-media-field]')) {
    const hidden = field.querySelector('input[type="hidden"][data-type="media"]');
    const current = field.querySelector('[data-media-current]');
    const upload = field.querySelector('[data-media-upload]');
    upload?.addEventListener('change', async () => {
      const file = upload.files[0];
      if (!file) return;
      current.textContent = '올리는 중…';
      const result = await api('POST', '/api/manage/media', undefined, { raw: file, headers: { 'content-type': file.type || 'application/octet-stream', 'x-filename': encodeURIComponent(file.name) } });
      upload.value = '';
      if (!result.ok) {
        current.textContent = '올리지 못했어요';
        setStatus(result.data.message ?? '파일을 올리지 못했어요.', 'error');
        return;
      }
      hidden.value = result.data.media.id;
      current.replaceChildren();
      if (result.data.media.mime.startsWith('image/')) {
        const img = new Image(160, 100);
        img.src = `/media/${result.data.media.id}`;
        img.alt = '';
        current.append(img);
      }
      current.append(Object.assign(document.createElement('span'), { textContent: `${result.data.media.filename || '파일'} (저장해야 적용돼요)` }));
      setDirty(true);
    });
    field.querySelector('[data-media-clear]')?.addEventListener('click', () => {
      hidden.value = '';
      current.textContent = '없음 (저장해야 적용돼요)';
      setDirty(true);
    });
  }

  // ---------- 자료 연결 ----------
  function wireMaterialRow(row) {
    const select = row.querySelector('[data-mat="versionId"]');
    const note = row.querySelector('[data-mat-public-note]');
    const update = () => { note.hidden = select.selectedOptions[0]?.dataset.public !== 'true'; };
    select.addEventListener('change', update);
    update();
    row.querySelector('[data-mat-remove]').addEventListener('click', () => { row.remove(); setDirty(true); });
  }
  for (const set of document.querySelectorAll('fieldset[data-type="materials"]')) {
    set.querySelectorAll('[data-mat-row]').forEach(wireMaterialRow);
    set.querySelector('[data-mat-add]')?.addEventListener('click', () => {
      const row = set.querySelector('[data-mat-template]').content.firstElementChild.cloneNode(true);
      set.querySelector('[data-mat-list]').append(row);
      wireMaterialRow(row);
      row.querySelector('select').focus();
      setDirty(true);
    });
  }

  // ---------- 학교 추가 ----------
  document.querySelector('[data-campus-form]')?.addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const value = name => form.elements[name].value.trim();
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    const result = await api('POST', '/api/manage/campuses', { name: value('name'), slug: value('slug'), shortName: value('shortName'), intro: value('intro'), termName: value('termName'), templateCampusId: value('templateCampusId') || null, externalUrl: value('externalUrl') || null, fixture: form.elements.fixture.checked });
    button.disabled = false;
    if (result.ok) { location.href = `/manage/campuses/${result.data.id}/`; return; }
    if (result.data.field) showFieldError(form, result.data.field, result.data.message);
    setStatus(result.data.message ?? '학교를 만들지 못했어요.', 'error');
  });

  // ---------- 게시 ----------
  const publishForm = document.querySelector('[data-publish-form]');
  const planBox = document.querySelector('[data-plan]');
  if (publishForm) {
    const esc = text => String(text).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
    let current = null; // { scopes, revisions, requestId }
    async function loadPlan() {
      const scopes = [...publishForm.querySelectorAll('input[name="scope"]:checked')].map(input => input.value);
      if (!scopes.length) { setStatus('게시할 대상을 하나 이상 골라 주세요.', 'warn'); return; }
      planBox.hidden = false;
      planBox.textContent = '변경 내용을 확인하는 중…';
      const result = await api('POST', '/api/manage/publish/plan', { scopes });
      if (!result.ok) { planBox.textContent = ''; setStatus(result.data.message ?? '확인하지 못했어요.', 'error'); return; }
      const plan = result.data.plan;
      const blocked = plan.some(entry => entry.problems.length);
      current = { scopes, revisions: Object.fromEntries(plan.map(entry => [entry.scope, entry.itemRevisions])), requestId: crypto.randomUUID() };
      const names = plan.map(entry => entry.label).join(', ');
      planBox.innerHTML = `<h2>변경 요약</h2>${plan.map(entry => `<div class="m-plan-entry"><h3>${esc(entry.label)} <span class="m-muted">${entry.currentNumber ? `지금 공개본 ${entry.currentNumber}번 → ${entry.currentNumber + 1}번` : '첫 게시'}</span></h3>
        ${entry.problems.length ? `<ul class="m-problems">${entry.problems.map(problem => `<li>${esc(problem)}</li>`).join('')}</ul>` : ''}
        ${entry.notes?.length ? `<ul class="m-notes">${entry.notes.map(note => `<li>${esc(note)}</li>`).join('')}</ul>` : ''}
        ${entry.diff ? `<ul>${entry.diff.lines.map(line => `<li>${esc(line)}</li>`).join('')}</ul>` : ''}</div>`).join('')}
        ${blocked ? '<p class="m-status-box m-status-error">고칠 내용이 있어 게시할 수 없어요. 위 항목을 고친 뒤 다시 확인해 주세요.</p>' : `<p><button class="m-btn" type="button" data-publish-go>${esc(names)}에 게시</button></p><p class="m-hint">게시하면 공개 사이트의 다음 요청부터 바로 반영돼요.</p>`}`;
      planBox.querySelector('[data-publish-go]')?.addEventListener('click', doPublish);
      planBox.focus?.();
    }
    async function doPublish(event) {
      const button = event.currentTarget;
      button.disabled = true;
      button.textContent = '게시하는 중…';
      const result = await api('POST', '/api/manage/publish', current);
      if (result.ok) {
        const lines = result.data.releases.map(release => `${esc(release.summary?.label ?? release.scope)} ${release.number}번`).join(', ');
        planBox.innerHTML = `<h2>게시했어요</h2><p>${lines}${result.data.duplicate ? ' (이미 처리된 요청이라 새로 만들지 않았어요)' : ''}</p><p><a href="/" target="_blank" rel="noopener">공개 사이트 열기</a> · <a href="/manage/history/">게시 이력</a></p>`;
        setStatus('게시했어요.', 'ok');
        return;
      }
      button.disabled = false;
      if (result.status === 0 || result.status >= 500) {
        // 같은 요청 번호로 다시 보내므로, 이미 반영됐다면 중복 게시되지 않아요.
        button.textContent = '다시 시도';
        setStatus(`${result.data.message ?? '게시하지 못했어요.'} ‘다시 시도’를 눌러도 두 번 게시되지 않아요.`, 'error');
        return;
      }
      button.textContent = '게시';
      setStatus(result.data.message ?? '게시하지 못했어요.', 'error');
      if (result.data.problems) planBox.insertAdjacentHTML('afterbegin', `<ul class="m-problems">${result.data.problems.map(problem => `<li>${esc(problem)}</li>`).join('')}</ul>`);
      if (result.data.error === 'PLAN_CHANGED') loadPlan();
    }
    publishForm.addEventListener('submit', event => { event.preventDefault(); loadPlan(); });
    if (publishForm.querySelector('input[name="scope"]:checked')) loadPlan();
  }

  // ---------- 복원 ----------
  for (const button of document.querySelectorAll('[data-restore]')) {
    button.addEventListener('click', async () => {
      if (!confirm(`${button.dataset.restoreLabel} 게시본으로 되돌려요. 새 게시 이력으로 남고, 초안은 바뀌지 않아요. 계속할까요?`)) return;
      button.dataset.requestId ??= crypto.randomUUID();
      button.disabled = true;
      const result = await api('POST', '/api/manage/restore', { releaseId: button.dataset.restore, requestId: button.dataset.requestId });
      if (result.ok) { setStatus('복원했어요.', 'ok'); location.reload(); return; }
      button.disabled = false;
      setStatus(result.data.message ?? '복원하지 못했어요. 다시 눌러도 두 번 복원되지 않아요.', 'error');
    });
  }
})();
