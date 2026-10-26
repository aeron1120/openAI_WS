// 현재는 실습 요청문 복사만 동작합니다. 로그인·지도·날씨는 아직 구현하지 않았습니다.
// Codex와 기능을 만들 때 이 파일에 추가하세요. 기능이 커지면 별도 파일로 나눠도 됩니다.
// 특정 박스가 삭제되거나 이동되어도 나머지 박스는 독립적으로 동작합니다.
document.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-copy]');
  if (!button) return;
  const field = document.getElementById(button.dataset.copy);
  const status = button.closest('.instruction')?.querySelector('.copy-status');
  if (!field || !status) return;
  try {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
    await navigator.clipboard.writeText(field.value);
    status.textContent = '복사했어요. Codex에 붙여 넣고 내 아이디어에 맞게 바꿔보세요.';
  } catch {
    field.focus();
    field.select();
    status.textContent = '요청문을 선택했어요. Ctrl+C 또는 ⌘C로 복사해주세요.';
  }
});
