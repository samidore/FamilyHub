import { cloneNotebookState, type NotebookState } from './notebookDomain.ts';
import { orderedNotebookBoards, reorderNotebookBoards } from './notebookActions.ts';
import { renderNotebookBoardManager } from './notebookView.ts';

export interface NotebookBoardManagerContext {
  getState(): NotebookState;
  mutate(label: string, fn: (current: NotebookState) => NotebookState): Promise<void>;
  status(message: string, error?: boolean): void;
}

const makeId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
const stamp = () => Date.now();

export function setupNotebookBoardManager(context: NotebookBoardManagerContext) {
  const dialog = document.querySelector<HTMLDialogElement>('#notebook-board-dialog')!;
  const list = document.querySelector<HTMLElement>('#notebook-board-list')!;
  const createForm = document.querySelector<HTMLFormElement>('#notebook-board-create')!;
  const openButton = document.querySelector<HTMLButtonElement>('#notebook-manage-boards')!;
  let draggedBoardId: string | null = null;

  const render = () => { list.innerHTML = renderNotebookBoardManager(context.getState()); };
  openButton.addEventListener('click', () => { render(); dialog.showModal(); });

  createForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(createForm);
    const title = String(data.get('title') ?? '').trim();
    if (!title) return;
    const kind = data.get('kind') === 'media' ? 'media' : 'task';
    const description = String(data.get('description') ?? '').trim();
    const time = stamp();
    const boardId = makeId('board');
    void context.mutate('创建 Board', (current) => {
      const next = cloneNotebookState(current);
      next.boards[boardId] = {
        id: boardId,
        title,
        kind,
        ...(description ? { description } : {}),
        showQueueAge: kind === 'task',
        visible: true,
        collapsed: false,
        order: orderedNotebookBoards(next).length,
        createdAt: time,
        updatedAt: time,
      };
      return next;
    }).then(() => { createForm.reset(); if (dialog.open) render(); });
  });

  list.addEventListener('change', (event) => {
    const input = (event.target as HTMLElement).closest('[data-board-visible]') as HTMLInputElement | null;
    if (!input) return;
    const boardId = input.closest<HTMLElement>('[data-board-id]')?.dataset.boardId;
    if (!boardId) return;
    void context.mutate('更新 Board', (current) => {
      const board = current.boards[boardId];
      if (!board) return current;
      return { ...current, boards: { ...current.boards, [boardId]: { ...board, visible: input.checked, updatedAt: stamp() } } };
    });
  });

  list.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    const row = target.closest<HTMLElement>('[data-board-manager-row]');
    const boardId = row?.dataset.boardId;
    if (!row || !boardId) return;
    if (target.closest('[data-save-board]')) {
      const title = row.querySelector<HTMLInputElement>('[data-board-title]')!.value.trim();
      if (!title) { context.status('Board 名称不能为空', true); return; }
      const kind = row.querySelector<HTMLSelectElement>('[data-board-kind]')!.value === 'media' ? 'media' : 'task';
      const description = row.querySelector<HTMLInputElement>('[data-board-description]')!.value.trim();
      const showQueueAge = row.querySelector<HTMLInputElement>('[data-board-show-queue-age]')!.checked;
      void context.mutate('保存 Board', (current) => {
        const board = current.boards[boardId];
        if (!board) return current;
        const next = cloneNotebookState(current);
        next.boards[boardId] = { ...board, title, kind, showQueueAge, updatedAt: stamp() };
        if (description) next.boards[boardId].description = description;
        else delete next.boards[boardId].description;
        return next;
      }).then(() => { if (dialog.open) render(); });
      return;
    }
    const move = (target.closest('[data-move-board]') as HTMLButtonElement | null)?.dataset.moveBoard;
    if (!move) return;
    const ids = orderedNotebookBoards(context.getState()).map((board) => board.id);
    const index = ids.indexOf(boardId);
    const swap = move === 'up' ? index - 1 : index + 1;
    if (index < 0 || swap < 0 || swap >= ids.length) return;
    [ids[index], ids[swap]] = [ids[swap], ids[index]];
    void context.mutate('调整 Board 顺序', (current) => reorderNotebookBoards(current, ids, stamp())).then(() => { if (dialog.open) render(); });
  });

  list.addEventListener('dragstart', (event) => {
    const row = (event.target as HTMLElement).closest('[data-board-manager-row]') as HTMLElement | null;
    draggedBoardId = row?.dataset.boardId ?? null;
    if (draggedBoardId && event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  });
  list.addEventListener('dragover', (event) => {
    if (!draggedBoardId) return;
    const target = (event.target as HTMLElement).closest('[data-board-manager-row]') as HTMLElement | null;
    const dragged = [...list.querySelectorAll<HTMLElement>('[data-board-manager-row]')].find((row) => row.dataset.boardId === draggedBoardId);
    if (!target || !dragged || target === dragged) return;
    event.preventDefault();
    const rect = target.getBoundingClientRect();
    list.insertBefore(dragged, event.clientY < rect.top + rect.height / 2 ? target : target.nextSibling);
  });
  list.addEventListener('drop', (event) => {
    if (!draggedBoardId) return;
    event.preventDefault();
    const ids = [...list.querySelectorAll<HTMLElement>('[data-board-manager-row]')].map((row) => row.dataset.boardId!).filter(Boolean);
    draggedBoardId = null;
    void context.mutate('调整 Board 顺序', (current) => reorderNotebookBoards(current, ids, stamp())).then(() => { if (dialog.open) render(); });
  });

  return { render, dialog };
}
