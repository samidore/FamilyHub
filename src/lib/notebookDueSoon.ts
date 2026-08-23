import type { NotebookItem, NotebookState } from './notebookDomain.ts';

export type NotebookDueSoonState = 'tomorrow' | 'today' | 'overdue';

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function parseDateKey(value: string) {
  if (!DATE_KEY_PATTERN.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return { year, month, day };
}

function formatDateKey(year: number, month: number, day: number) {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function addCalendarDays(value: string, days: number) {
  const parsed = parseDateKey(value);
  if (!parsed) return null;
  const date = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day));
  date.setUTCDate(date.getUTCDate() + days);
  return formatDateKey(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

export function notebookLocalDateKey(now = Date.now()): string {
  const date = new Date(now);
  return formatDateKey(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

export function notebookNextLocalMidnight(now = Date.now()): number {
  const date = new Date(now);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).getTime();
}

export function getNotebookDueSoonState(item: NotebookItem, today: string): NotebookDueSoonState | null {
  if (item.status !== 'active' || !item.dueDate || !parseDateKey(item.dueDate) || !parseDateKey(today)) return null;
  if (item.dueDate < today) return 'overdue';
  if (item.dueDate === today) return 'today';
  return item.dueDate === addCalendarDays(today, 1) ? 'tomorrow' : null;
}

export function notebookDueSoonLabel(state: NotebookDueSoonState): string {
  if (state === 'tomorrow') return '明天截止';
  if (state === 'today') return '今天截止';
  return '已逾期';
}

export function notebookDueSoonItems(state: NotebookState, today: string): NotebookItem[] {
  return Object.values(state.items)
    .filter((item) => getNotebookDueSoonState(item, today) !== null)
    .sort((left, right) => {
      const leftDue = left.dueDate ?? '';
      const rightDue = right.dueDate ?? '';
      return leftDue.localeCompare(rightDue) || right.createdAt - left.createdAt || left.id.localeCompare(right.id);
    });
}
