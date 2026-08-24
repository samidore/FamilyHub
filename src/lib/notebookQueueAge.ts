import type { NotebookBoard, NotebookItem, NotebookState } from './notebookDomain.ts';
import { notebookLocalDateKey } from './notebookDueSoon.ts';

const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function dateKeyEpoch(value: string): number | null {
  if (!DATE_KEY_PATTERN.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date.getTime();
}

export function notebookBoardShowsQueueAge(board: NotebookBoard): boolean {
  return board.showQueueAge ?? board.kind === 'task';
}

export function notebookQueueStartAt(state: NotebookState, item: NotebookItem): number {
  if (!item.recurrence) return item.createdAt;
  let latest = item.createdAt;
  for (const event of Object.values(state.completionEvents)) {
    if (event.itemId === item.id && event.completedAt > latest) latest = event.completedAt;
  }
  return latest;
}

export function notebookQueueAgeDays(state: NotebookState, item: NotebookItem, now = Date.now()): number | null {
  if (item.status !== 'active') return null;
  const start = dateKeyEpoch(notebookLocalDateKey(notebookQueueStartAt(state, item)));
  const today = dateKeyEpoch(notebookLocalDateKey(now));
  if (start === null || today === null) return null;
  return Math.max(0, Math.floor((today - start) / DAY_MS));
}
