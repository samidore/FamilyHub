import {
  NOTEBOOK_PRIORITIES,
  cloneNotebookState,
  normalizeNotebookState,
  type NotebookBoard,
  type NotebookCompletionEvent,
  type NotebookItem,
  type NotebookPriority,
  type NotebookRecurrence,
  type NotebookState,
  type NotebookViewFilter,
} from './notebookDomain.ts';
import {
  advanceNotebookDueDate as advanceNotebookDueDateForRecurrence,
  nextNotebookRecurringDueDate,
  notebookCalendarDayDifference,
} from './notebookRecurrence.ts';

export const NOTEBOOK_PRIORITY_LABELS: Record<NotebookPriority, string> = {
  urgent: '紧急',
  high: '高',
  normal: '普通',
  low: '低',
};

export const NOTEBOOK_COMPLETION_GRACE_MS = 60 * 60 * 1000;

export interface NotebookCompletedEntry {
  kind: 'item' | 'recurrence';
  item: NotebookItem;
  completedAt: number;
  event?: NotebookCompletionEvent;
}

export interface NotebookSectionEntry {
  kind: 'item' | 'recurrence';
  item: NotebookItem;
  completedAt?: number;
  event?: NotebookCompletionEvent;
}

export const NOTEBOOK_RECURRING_GROUPS = [
  { key: 'overdue', label: '过期' },
  { key: 'today', label: '今天' },
  { key: 'soon', label: '马上' },
  { key: 'week', label: '这周' },
  { key: 'near', label: '近期' },
  { key: 'later', label: '以后' },
  { key: 'unknown', label: '未定日期' },
] as const;
export type NotebookRecurringGroupKey = (typeof NOTEBOOK_RECURRING_GROUPS)[number]['key'];
const recurringGroupOrder = new Map<NotebookRecurringGroupKey, number>(NOTEBOOK_RECURRING_GROUPS.map((group, index) => [group.key, index]));
const priorityOrder = new Map<NotebookPriority, number>(NOTEBOOK_PRIORITIES.map((priority, index) => [priority, index]));

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

export function isNotebookCompletionInGrace(item: NotebookItem, now = Date.now()): boolean {
  return item.status === 'completed'
    && !item.recurrence
    && typeof item.completedAt === 'number'
    && item.completedAt > 0
    && item.completedAt + NOTEBOOK_COMPLETION_GRACE_MS > now;
}

export function notebookNextGraceExpiry(state: NotebookState, now = Date.now()): number | null {
  let next: number | null = null;
  for (const item of Object.values(state.items)) {
    if (!isNotebookCompletionInGrace(item, now) || item.completedAt === undefined) continue;
    const expiry = item.completedAt + NOTEBOOK_COMPLETION_GRACE_MS;
    if (next === null || expiry < next) next = expiry;
  }
  return next;
}

function activeSectionIds(state: NotebookState, boardId: string, priority: NotebookPriority, excludeId?: string): string[] {
  const memberships = state.memberships[boardId] ?? {};
  return Object.keys(memberships)
    .filter((itemId) => itemId !== excludeId && state.items[itemId]?.status === 'active' && !state.items[itemId]?.recurrence && state.items[itemId]?.priority === priority)
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

function insertHiddenRecurringMembership(next: NotebookState, boardId: string, itemId: string) {
  const memberships = { ...(next.memberships[boardId] ?? {}) };
  memberships[itemId] = { order: Object.keys(memberships).length };
  next.memberships[boardId] = memberships;
}

export function notebookItemsForSection(state: NotebookState, boardId: string, priority: NotebookPriority, filter: NotebookViewFilter): NotebookItem[] {
  const memberships = state.memberships[boardId] ?? {};
  const items = Object.keys(memberships)
    .map((itemId) => state.items[itemId])
    .filter((item): item is NotebookItem => Boolean(item && !item.recurrence && item.priority === priority));
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

function notebookActiveEntriesWithGrace(state: NotebookState, boardId: string, priority: NotebookPriority, now: number): NotebookSectionEntry[] {
  const memberships = state.memberships[boardId] ?? {};
  return Object.keys(memberships)
    .map((itemId) => state.items[itemId])
    .filter((item): item is NotebookItem => Boolean(item && !item.recurrence && item.priority === priority && (item.status === 'active' || isNotebookCompletionInGrace(item, now))))
    .sort((left, right) => {
      const leftOrder = memberships[left.id]?.order ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = memberships[right.id]?.order ?? Number.MAX_SAFE_INTEGER;
      if (leftOrder !== rightOrder) return leftOrder - rightOrder;
      if (left.status !== right.status) return left.status === 'completed' ? -1 : 1;
      return right.createdAt - left.createdAt || left.id.localeCompare(right.id);
    })
    .map((item) => ({ kind: 'item', item }));
}

export function notebookCompletedEntriesForSection(state: NotebookState, boardId: string, priority: NotebookPriority): NotebookCompletedEntry[] {
  return notebookItemsForSection(state, boardId, priority, 'completed').map((item) => ({
    kind: 'item',
    item,
    completedAt: item.completedAt ?? 0,
  }));
}

export function notebookSectionEntries(state: NotebookState, boardId: string, priority: NotebookPriority, filter: NotebookViewFilter, now = Date.now()): NotebookSectionEntry[] {
  if (filter === 'active') return notebookActiveEntriesWithGrace(state, boardId, priority, now);
  const active = notebookItemsForSection(state, boardId, priority, 'active').map((item): NotebookSectionEntry => ({ kind: 'item', item }));
  const completed = notebookCompletedEntriesForSection(state, boardId, priority);
  if (filter === 'completed') return completed;
  return [...active, ...completed];
}

export function notebookUrgentActiveItems(state: NotebookState): NotebookItem[] {
  return Object.values(state.items)
    .filter((item) => item.status === 'active' && item.priority === 'urgent')
    .sort((left, right) => right.createdAt - left.createdAt || right.updatedAt - left.updatedAt || left.id.localeCompare(right.id));
}

export function notebookUrgentVisibleItems(state: NotebookState, now = Date.now()): NotebookItem[] {
  return Object.values(state.items)
    .filter((item) => item.priority === 'urgent' && (item.status === 'active' || isNotebookCompletionInGrace(item, now)))
    .sort((left, right) => right.createdAt - left.createdAt || right.updatedAt - left.updatedAt || left.id.localeCompare(right.id));
}

export function notebookRecurringRemainingDays(item: NotebookItem, today: string): number | null {
  if (!item.recurrence || !item.dueDate) return null;
  return notebookCalendarDayDifference(today, item.dueDate);
}

export function notebookRecurringGroupKey(remainingDays: number | null): NotebookRecurringGroupKey {
  if (remainingDays === null) return 'unknown';
  if (remainingDays < 0) return 'overdue';
  if (remainingDays === 0) return 'today';
  if (remainingDays <= 3) return 'soon';
  if (remainingDays <= 7) return 'week';
  if (remainingDays <= 14) return 'near';
  return 'later';
}

export function notebookRecurringActiveItems(state: NotebookState, today: string): NotebookItem[] {
  return Object.values(state.items)
    .filter((item) => item.status === 'active' && Boolean(item.recurrence))
    .sort((left, right) => {
      const leftDays = notebookRecurringRemainingDays(left, today);
      const rightDays = notebookRecurringRemainingDays(right, today);
      const leftGroup = recurringGroupOrder.get(notebookRecurringGroupKey(leftDays)) ?? Number.MAX_SAFE_INTEGER;
      const rightGroup = recurringGroupOrder.get(notebookRecurringGroupKey(rightDays)) ?? Number.MAX_SAFE_INTEGER;
      if (leftGroup !== rightGroup) return leftGroup - rightGroup;
      const leftPriority = priorityOrder.get(left.priority) ?? Number.MAX_SAFE_INTEGER;
      const rightPriority = priorityOrder.get(right.priority) ?? Number.MAX_SAFE_INTEGER;
      if (leftPriority !== rightPriority) return leftPriority - rightPriority;
      const leftSortDays = leftDays ?? Number.MAX_SAFE_INTEGER;
      const rightSortDays = rightDays ?? Number.MAX_SAFE_INTEGER;
      return leftSortDays - rightSortDays || left.createdAt - right.createdAt || left.id.localeCompare(right.id);
    });
}

export function notebookRecurringCompletionEntries(state: NotebookState): NotebookSectionEntry[] {
  return Object.values(state.completionEvents)
    .filter((event) => Boolean(state.items[event.itemId]))
    .sort((left, right) => right.completedAt - left.completedAt || left.id.localeCompare(right.id))
    .map((event) => ({ kind: 'recurrence', item: state.items[event.itemId], completedAt: event.completedAt, event }));
}

export function addNotebookItem(state: NotebookState, item: NotebookItem, boardIds: string[]): NotebookState {
  const next = cloneNotebookState(state);
  const validBoardIds = [...new Set(boardIds)].filter((boardId) => Boolean(next.boards[boardId]));
  if (validBoardIds.length === 0) return state;
  next.items[item.id] = item;
  for (const boardId of validBoardIds) {
    if (item.recurrence) insertHiddenRecurringMembership(next, boardId, item.id);
    else insertAtSectionTop(next, boardId, item.id, item.priority);
  }
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
    if (existing.status === 'active' && !existing.recurrence) rewriteActiveSection(next, boardId, existing.priority);
  }
  for (const boardId of desired) {
    if (current.has(boardId)) continue;
    if (existing.status === 'active' && !existing.recurrence) insertAtSectionTop(next, boardId, itemId, existing.priority);
    else insertHiddenRecurringMembership(next, boardId, itemId);
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
  if (existing.status === 'active' && !existing.recurrence) {
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
  if (status === 'active' && !isNotebookCompletionInGrace(existing, now)) return state;
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

export function advanceNotebookDueDate(dueDate: string, recurrence: NotebookRecurrence): string | null {
  return advanceNotebookDueDateForRecurrence(dueDate, recurrence);
}

export function completeRecurringNotebookItem(state: NotebookState, itemId: string, eventId: string, completedAt: number, completedOn: string): NotebookState {
  const existing = state.items[itemId];
  if (!existing || existing.status !== 'active' || !existing.recurrence || state.completionEvents[eventId]) return state;
  const boardIds = notebookBoardIdsForItem(state, itemId);
  if (boardIds.length === 0) return state;
  const nextDueDate = nextNotebookRecurringDueDate(existing.dueDate, existing.recurrence, completedOn);
  if (!nextDueDate) return state;
  const next = cloneNotebookState(state);
  next.completionEvents[eventId] = { id: eventId, itemId, completedAt, priority: existing.priority, boardIds };
  next.items[itemId] = { ...existing, dueDate: nextDueDate, updatedAt: completedAt };
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
