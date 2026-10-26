// 요청문 복사. 클립보드를 쓸 수 없으면 글을 선택해 두고 직접 복사하도록 안내합니다.
function selectText(element) {
  const range = document.createRange();
  range.selectNodeContents(element);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
}

function legacyCopy(element) {
  try {
    selectText(element);
    return document.execCommand('copy');
  } catch {
    return false;
  }
}

function report(status, message, ok) {
  status.textContent = message;
  status.classList.toggle('is-ok', ok);
  status.classList.toggle('is-error', !ok);
}

for (const button of document.querySelectorAll('[data-copy-target]')) {
  const target = document.getElementById(button.dataset.copyTarget);
  const status = button.closest('.copy-block')?.querySelector('.copy-status');
  if (!target || !status) continue;
  button.hidden = false;
  button.addEventListener('click', async () => {
    const text = target.textContent;
    let copied = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        copied = true;
      }
    } catch {
      copied = false;
    }
    if (!copied) copied = legacyCopy(target);
    if (copied) {
      report(status, '복사했어요. Codex 입력창에 붙여 넣으세요.', true);
      button.textContent = '복사됨';
      setTimeout(() => { button.textContent = '복사'; }, 2000);
    } else {
      selectText(target);
      report(status, '자동 복사가 되지 않았어요. 글을 선택해 두었으니 Ctrl+C(⌘C)를 누르거나 길게 눌러 복사하세요.', false);
    }
  });
}
