import {
  cloneNotebookState,
  normalizeNotebookState,
  type NotebookBoard,
  type NotebookItem,
  type NotebookPriority,
  type NotebookState,
  type NotebookViewFilter,
} from './notebookDomain.ts';

export const NOTEBOOK_PRIORITY_LABELS: Record<NotebookPriority, string> = {
  urgent: '紧急',
  high: '高',
  normal: '普通',
  low: '低',
};

export function orderedNotebookBoards(state: NotebookState, visibleOnly = false): NotebookBoard[] {
  return Object.values(state.boards)
    .filter((board) => !visibleOnly || board.visible)
    .sort((left, right) => left.order - right.order || left.createdAt - right.createdAt || left.id.localeCompare(right.id));
}

export function notebookBoardIdsForItem(state: NotebookState, itemId: string): string[] {
  return orderedNotebookBoards(state)
    .filter((board) => Boolean(state.memberships[board.id]?.[itemId]))
    .map((board) => board.id);
}

function activeSectionIds(state: NotebookState, boardId: string, priority: NotebookPriority, excludeId?: string): string[] {
  const memberships = state.memberships[boardId] ?? {};
  return Object.keys(memberships)
    .filter((itemId) => itemId !== excludeId && state.items[itemId]?.status === 'active' && state.items[itemId]?.priority === priority)
    .sort((leftId, rightId) => {
      const leftOrder = memberships[leftId]?.order ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = memberships[rightId]?.order ?? Number.MAX_SAFE_INTEGER;
      if (leftOrder !== rightOrder) return leftOrder - rightOrder;
      const left = state.items[leftId];
      const right = state.items[rightId];
      return (right?.createdAt ?? 0) - (left?.createdAt ?? 0) || leftId.localeCompare(rightId);
    });
}

function rewriteActiveSection(next: NotebookState, boardId: string, priority: NotebookPriority, orderedIds?: string[]) {
  const ids = orderedIds ?? activeSectionIds(next, boardId, priority);
  const memberships = { ...(next.memberships[boardId] ?? {}) };
  ids.forEach((itemId, index) => { memberships[itemId] = { order: index }; });
  if (Object.keys(memberships).length > 0) next.memberships[boardId] = memberships;
  else delete next.memberships[boardId];
}

function insertAtSectionTop(next: NotebookState, boardId: string, itemId: string, priority: NotebookPriority) {
  if (!next.boards[boardId] || !next.items[itemId]) return;
  const ids = activeSectionIds(next, boardId, priority, itemId);
  const memberships = { ...(next.memberships[boardId] ?? {}) };
  memberships[itemId] = { order: 0 };
  ids.forEach((id, index) => { memberships[id] = { order: index + 1 }; });
  next.memberships[boardId] = memberships;
}

export function notebookItemsForSection(state: NotebookState, boardId: string, priority: NotebookPriority, filter: NotebookViewFilter): NotebookItem[] {
  const memberships = state.memberships[boardId] ?? {};
  const items = Object.keys(memberships)
    .map((itemId) => state.items[itemId])
    .filter((item): item is NotebookItem => Boolean(item && item.priority === priority));
  const active = items
    .filter((item) => item.status === 'active')
    .sort((left, right) => (memberships[left.id]?.order ?? Number.MAX_SAFE_INTEGER) - (memberships[right.id]?.order ?? Number.MAX_SAFE_INTEGER) || right.createdAt - left.createdAt || left.id.localeCompare(right.id));
  const completed = items
    .filter((item) => item.status === 'completed')
    .sort((left, right) => (right.completedAt ?? 0) - (left.completedAt ?? 0) || right.updatedAt - left.updatedAt || left.id.localeCompare(right.id));
  if (filter === 'active') return active;
  if (filter === 'completed') return completed;
  return [...active, ...completed];
}

export function notebookUrgentActiveItems(state: NotebookState): NotebookItem[] {
  return Object.values(state.items)
    .filter((item) => item.status === 'active' && item.priority === 'urgent')
    .sort((left, right) => right.createdAt - left.createdAt || right.updatedAt - left.updatedAt || left.id.localeCompare(right.id));
}

export function addNotebookItem(state: NotebookState, item: NotebookItem, boardIds: string[]): NotebookState {
  const next = cloneNotebookState(state);
  const validBoardIds = [...new Set(boardIds)].filter((boardId) => Boolean(next.boards[boardId]));
  if (validBoardIds.length === 0) return state;
  next.items[item.id] = item;
  for (const boardId of validBoardIds) insertAtSectionTop(next, boardId, item.id, item.priority);
  return normalizeNotebookState(next);
}

export function setNotebookItemBoards(state: NotebookState, itemId: string, boardIds: string[], now: number): NotebookState {
  const existing = state.items[itemId];
  if (!existing) return state;
  const next = cloneNotebookState(state);
  const desired = new Set([...new Set(boardIds)].filter((boardId) => Boolean(next.boards[boardId])));
  if (desired.size === 0) return state;
  const current = new Set(notebookBoardIdsForItem(next, itemId));
  for (const boardId of current) {
    if (desired.has(boardId)) continue;
    const memberships = { ...(next.memberships[boardId] ?? {}) };
    delete memberships[itemId];
    if (Object.keys(memberships).length > 0) next.memberships[boardId] = memberships;
    else delete next.memberships[boardId];
    if (existing.status === 'active') rewriteActiveSection(next, boardId, existing.priority);
  }
  for (const boardId of desired) {
    if (current.has(boardId)) continue;
    if (existing.status === 'active') insertAtSectionTop(next, boardId, itemId, existing.priority);
    else next.memberships[boardId] = { ...(next.memberships[boardId] ?? {}), [itemId]: { order: 0 } };
  }
  next.items[itemId] = { ...next.items[itemId], updatedAt: now };
  return normalizeNotebookState(next);
}

export function setNotebookItemPriority(state: NotebookState, itemId: string, priority: NotebookPriority, now: number): NotebookState {
  const existing = state.items[itemId];
  if (!existing || existing.priority === priority) return state;
  const next = cloneNotebookState(state);
  const boardIds = notebookBoardIdsForItem(next, itemId);
  const previousPriority = existing.priority;
  next.items[itemId] = { ...existing, priority, updatedAt: now };
  if (existing.status === 'active') {
    for (const boardId of boardIds) {
      rewriteActiveSection(next, boardId, previousPriority);
      insertAtSectionTop(next, boardId, itemId, priority);
    }
  }
  return normalizeNotebookState(next);
}

export function setNotebookItemStatus(state: NotebookState, itemId: string, status: 'active' | 'completed', now: number): NotebookState {
  const existing = state.items[itemId];
  if (!existing || existing.status === status || existing.recurrence) return state;
  const next = cloneNotebookState(state);
  const boardIds = notebookBoardIdsForItem(next, itemId);
  if (status === 'completed') {
    next.items[itemId] = { ...existing, status: 'completed', completedAt: now, updatedAt: now };
    for (const boardId of boardIds) rewriteActiveSection(next, boardId, existing.priority);
  } else {
    const restored = { ...existing, status: 'active' as const, updatedAt: now };
    delete restored.completedAt;
    next.items[itemId] = restored;
    for (const boardId of boardIds) insertAtSectionTop(next, boardId, itemId, existing.priority);
  }
  return normalizeNotebookState(next);
}

export function reorderNotebookSection(state: NotebookState, boardId: string, priority: NotebookPriority, orderedItemIds: string[]): NotebookState {
  const expected = activeSectionIds(state, boardId, priority);
  if (orderedItemIds.length !== expected.length || new Set(orderedItemIds).size !== expected.length || expected.some((id) => !orderedItemIds.includes(id))) return state;
  const next = cloneNotebookState(state);
  rewriteActiveSection(next, boardId, priority, orderedItemIds);
  return normalizeNotebookState(next);
}

export function reorderNotebookBoards(state: NotebookState, orderedBoardIds: string[], now: number): NotebookState {
  const expected = Object.keys(state.boards);
  if (orderedBoardIds.length !== expected.length || new Set(orderedBoardIds).size !== expected.length || expected.some((id) => !orderedBoardIds.includes(id))) return state;
  const next = cloneNotebookState(state);
  orderedBoardIds.forEach((boardId, index) => {
    const board = next.boards[boardId];
    next.boards[boardId] = { ...board, order: index, updatedAt: board.order === index ? board.updatedAt : now };
  });
  return normalizeNotebookState(next);
}
