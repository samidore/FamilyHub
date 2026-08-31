export function setupNotebookQuickAddEnhancements() {
  const dialog = document.querySelector<HTMLDialogElement>('#notebook-item-dialog');
  const form = document.querySelector<HTMLFormElement>('#notebook-item-form');
  const detailsInput = form?.elements.namedItem('details') as HTMLTextAreaElement | null;
  const boardPicker = document.querySelector<HTMLDetailsElement>('#notebook-board-picker');
  const boardSummary = document.querySelector<HTMLElement>('#notebook-board-summary');
  const boardChoices = document.querySelector<HTMLElement>('#notebook-item-board-choices');
  if (!dialog || !form || !detailsInput || !boardPicker || !boardSummary || !boardChoices) return;

  const refreshBoardSummary = () => {
    const titles = [...boardChoices.querySelectorAll<HTMLInputElement>('input[name="boardIds"]:checked')]
      .map((input) => input.closest('label')?.querySelector('span')?.textContent?.trim() ?? '')
      .filter(Boolean);
    const createMode = form.classList.contains('notebook-item-form--create');
    if (!titles.length) {
      boardSummary.textContent = '选择 Board';
      return;
    }
    const label = titles.length === 1 ? `Board：${titles[0]}` : `Boards：${titles.join('、')}`;
    boardSummary.textContent = createMode ? `${label} · 修改` : label;
  };

  const setMode = (mode: 'create' | 'edit') => {
    const createMode = mode === 'create';
    form.classList.toggle('notebook-item-form--create', createMode);
    form.classList.toggle('notebook-item-form--edit', !createMode);
    detailsInput.rows = createMode ? 2 : 5;
    boardPicker.open = !createMode;
    refreshBoardSummary();
  };

  document.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return;
    const add = event.target.closest('[data-new-item]');
    const edit = event.target.closest('[data-edit-item]');
    if (!add && !edit) return;
    queueMicrotask(() => setMode(edit ? 'edit' : 'create'));
  });

  dialog.addEventListener('click', (event) => {
    if (!form.classList.contains('notebook-item-form--create')) return;
    const rect = dialog.getBoundingClientRect();
    const clickedBackdrop = event.clientX < rect.left
      || event.clientX > rect.right
      || event.clientY < rect.top
      || event.clientY > rect.bottom;
    if (clickedBackdrop) dialog.close();
  });

  boardChoices.addEventListener('change', refreshBoardSummary);
  dialog.addEventListener('close', () => setMode('create'));
  setMode('create');
}
