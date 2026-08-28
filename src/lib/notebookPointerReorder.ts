import { type NotebookPriority, type NotebookState } from './notebookDomain.ts';
import { notebookItemsForSection, orderedNotebookBoards, reorderNotebookBoards, reorderNotebookSection } from './notebookActions.ts';

export interface NotebookPointerReorderContext {
  getState(): NotebookState;
  mutate(label: string, fn: (current: NotebookState) => NotebookState): Promise<boolean>;
}

type ItemDrag = {
  kind: 'item';
  pointerId: number;
  handle: HTMLElement;
  element: HTMLElement;
  container: HTMLElement;
  boardId: string;
  priority: NotebookPriority;
};

type BoardDrag = {
  kind: 'board';
  pointerId: number;
  handle: HTMLElement;
  element: HTMLElement;
  container: HTMLElement;
};

type ActiveDrag = ItemDrag | BoardDrag;

const elementTarget = (event: Event) => event.target instanceof Element ? event.target : null;
const sameOrder = (left: string[], right: string[]) => left.length === right.length && left.every((id, index) => id === right[index]);

export function setupNotebookPointerReorder(context: NotebookPointerReorderContext) {
  const itemHost = document.querySelector<HTMLElement>('#notebook-boards')!;
  const boardList = document.querySelector<HTMLElement>('#notebook-board-list')!;
  let active: ActiveDrag | null = null;

  const suppressNativeDrag = (event: DragEvent) => {
    const target = elementTarget(event);
    if (!target?.closest('[data-item-drag-handle], [data-board-drag-handle]')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  };
  itemHost.addEventListener('dragstart', suppressNativeDrag, { capture: true });
  boardList.addEventListener('dragstart', suppressNativeDrag, { capture: true });

  const cleanup = (drag: ActiveDrag) => {
    drag.element.classList.remove('is-pointer-dragging');
    drag.container.classList.remove('is-pointer-reordering');
    try {
      if (drag.handle.hasPointerCapture(drag.pointerId)) drag.handle.releasePointerCapture(drag.pointerId);
    } catch {
      // The browser may already have released capture during cancellation.
    }
  };

  const autoScroll = (drag: ActiveDrag, clientY: number) => {
    const edge = 64;
    const amount = 18;
    const dialog = drag.kind === 'board' ? drag.container.closest<HTMLDialogElement>('dialog') : null;
    if (dialog) {
      const rect = dialog.getBoundingClientRect();
      if (clientY < rect.top + edge) dialog.scrollBy(0, -amount);
      else if (clientY > rect.bottom - edge) dialog.scrollBy(0, amount);
      return;
    }
    if (clientY < edge) window.scrollBy(0, -amount);
    else if (clientY > window.innerHeight - edge) window.scrollBy(0, amount);
  };

  const moveItem = (drag: ItemDrag, clientX: number, clientY: number) => {
    const hit = document.elementFromPoint(clientX, clientY);
    const target = hit?.closest<HTMLElement>('[data-item-id]') ?? null;
    if (!target || target === drag.element || target.closest('[data-item-list]') !== drag.container) return;
    const targetId = target.dataset.itemId;
    if (!targetId || context.getState().items[targetId]?.status !== 'active') return;
    const rect = target.getBoundingClientRect();
    drag.container.insertBefore(drag.element, clientY < rect.top + rect.height / 2 ? target : target.nextSibling);
  };

  const moveBoard = (drag: BoardDrag, clientX: number, clientY: number) => {
    const hit = document.elementFromPoint(clientX, clientY);
    const target = hit?.closest<HTMLElement>('[data-board-manager-row]') ?? null;
    if (!target || target === drag.element || target.parentElement !== drag.container) return;
    const rect = target.getBoundingClientRect();
    drag.container.insertBefore(drag.element, clientY < rect.top + rect.height / 2 ? target : target.nextSibling);
  };

  const finish = () => {
    const drag = active;
    if (!drag) return;
    active = null;
    cleanup(drag);
    if (!drag.container.isConnected || !drag.element.isConnected) return;

    if (drag.kind === 'item') {
      const state = context.getState();
      const ids = [...drag.container.children]
        .map((child) => child instanceof HTMLElement ? child.dataset.itemId : undefined)
        .filter((itemId): itemId is string => Boolean(itemId && state.items[itemId]?.status === 'active'));
      const currentIds = notebookItemsForSection(state, drag.boardId, drag.priority, 'active').map((item) => item.id);
      if (sameOrder(ids, currentIds)) return;
      void context.mutate('调整事项顺序', (current) => reorderNotebookSection(current, drag.boardId, drag.priority, ids));
      return;
    }

    const ids = [...drag.container.children]
      .map((child) => child instanceof HTMLElement ? child.dataset.boardId : undefined)
      .filter((boardId): boardId is string => Boolean(boardId));
    const currentIds = orderedNotebookBoards(context.getState()).map((board) => board.id);
    if (sameOrder(ids, currentIds)) return;
    void context.mutate('调整 Board 顺序', (current) => reorderNotebookBoards(current, ids, Date.now()));
  };

  itemHost.addEventListener('pointerdown', (event) => {
    if (active || !event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
    const handle = elementTarget(event)?.closest<HTMLElement>('[data-item-drag-handle]') ?? null;
    const element = handle?.closest<HTMLElement>('[data-item-id]') ?? null;
    const container = element?.closest<HTMLElement>('[data-item-list]') ?? null;
    const itemId = element?.dataset.itemId;
    const boardId = container?.dataset.boardId;
    const priority = container?.dataset.priority as NotebookPriority | undefined;
    if (!handle || !element || !container || !itemId || !boardId || !priority || context.getState().items[itemId]?.status !== 'active') return;

    event.preventDefault();
    handle.draggable = false;
    try { handle.setPointerCapture(event.pointerId); } catch { /* Pointer capture is best-effort. */ }
    element.classList.add('is-pointer-dragging');
    container.classList.add('is-pointer-reordering');
    active = { kind: 'item', pointerId: event.pointerId, handle, element, container, boardId, priority };
  });

  boardList.addEventListener('pointerdown', (event) => {
    if (active || !event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
    const handle = elementTarget(event)?.closest<HTMLElement>('[data-board-drag-handle]') ?? null;
    const element = handle?.closest<HTMLElement>('[data-board-manager-row]') ?? null;
    if (!handle || !element || element.parentElement !== boardList) return;

    event.preventDefault();
    handle.draggable = false;
    try { handle.setPointerCapture(event.pointerId); } catch { /* Pointer capture is best-effort. */ }
    element.classList.add('is-pointer-dragging');
    boardList.classList.add('is-pointer-reordering');
    active = { kind: 'board', pointerId: event.pointerId, handle, element, container: boardList };
  });

  const onPointerMove = (event: PointerEvent) => {
    if (!active || event.pointerId !== active.pointerId) return;
    event.preventDefault();
    if (!active.container.isConnected || !active.element.isConnected) {
      const drag = active;
      active = null;
      cleanup(drag);
      return;
    }
    autoScroll(active, event.clientY);
    if (active.kind === 'item') moveItem(active, event.clientX, event.clientY);
    else moveBoard(active, event.clientX, event.clientY);
  };

  const onPointerEnd = (event: PointerEvent) => {
    if (!active || event.pointerId !== active.pointerId) return;
    event.preventDefault();
    finish();
  };

  window.addEventListener('pointermove', onPointerMove, { passive: false });
  window.addEventListener('pointerup', onPointerEnd, { passive: false });
  window.addEventListener('pointercancel', onPointerEnd, { passive: false });
}
