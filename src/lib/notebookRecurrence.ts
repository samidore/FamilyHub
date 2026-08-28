import {
  NOTEBOOK_WEEKDAYS,
  isAfterCompletionNotebookRecurrence,
  isLegacyNotebookRecurrence,
  isScheduledNotebookRecurrence,
  type NotebookLegacyRecurrence,
  type NotebookRecurrence,
  type NotebookScheduledRecurrence,
  type NotebookWeekday,
} from './notebookDomain.ts';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const weekdayOffsets = new Map<NotebookWeekday, number>(NOTEBOOK_WEEKDAYS.map((weekday, index) => [weekday, index]));

function parseCalendarDate(value: string) {
  if (!DATE_PATTERN.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return { year, month, day, date };
}

function formatCalendarDate(year: number, month: number, day: number) {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function formatDate(date: Date) {
  return formatCalendarDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function addNotebookCalendarDays(value: string, days: number): string | null {
  const parsed = parseCalendarDate(value);
  if (!parsed || !Number.isInteger(days)) return null;
  const date = new Date(parsed.date);
  date.setUTCDate(date.getUTCDate() + days);
  return formatDate(date);
}

export function notebookCalendarDayDifference(from: string, to: string): number | null {
  const left = parseCalendarDate(from);
  const right = parseCalendarDate(to);
  if (!left || !right) return null;
  return Math.round((right.date.getTime() - left.date.getTime()) / MS_PER_DAY);
}

function mondayOfWeek(value: string): Date | null {
  const parsed = parseCalendarDate(value);
  if (!parsed) return null;
  const date = new Date(parsed.date);
  const mondayOffset = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - mondayOffset);
  return date;
}

function weekdayOffset(weekday: NotebookWeekday) {
  return weekdayOffsets.get(weekday) ?? 0;
}

function orderedWeekdayOffsets(recurrence: NotebookScheduledRecurrence) {
  return [...(recurrence.weekdays ?? [])].map(weekdayOffset).sort((a, b) => a - b);
}

function weeklyCandidate(anchorMonday: Date, weekOffset: number, weekday: number) {
  const date = new Date(anchorMonday);
  date.setUTCDate(date.getUTCDate() + weekOffset * 7 + weekday);
  return formatDate(date);
}

export function firstNotebookScheduledDueDate(recurrence: NotebookScheduledRecurrence): string | null {
  const start = parseCalendarDate(recurrence.startDate);
  if (!start) return null;
  if (recurrence.unit !== 'week') return recurrence.startDate;
  const anchorMonday = mondayOfWeek(recurrence.startDate);
  if (!anchorMonday) return null;
  for (const weekday of orderedWeekdayOffsets(recurrence)) {
    const candidate = weeklyCandidate(anchorMonday, 0, weekday);
    if (candidate >= recurrence.startDate) return candidate;
  }
  const firstWeekday = orderedWeekdayOffsets(recurrence)[0];
  return firstWeekday === undefined ? null : weeklyCandidate(anchorMonday, recurrence.interval, firstWeekday);
}

function nextDayOccurrence(currentDueDate: string, recurrence: NotebookScheduledRecurrence): string | null {
  const diff = notebookCalendarDayDifference(recurrence.startDate, currentDueDate);
  if (diff === null) return null;
  const nextIndex = Math.max(1, Math.floor(diff / recurrence.interval) + 1);
  return addNotebookCalendarDays(recurrence.startDate, nextIndex * recurrence.interval);
}

function nextMonthOccurrence(currentDueDate: string, recurrence: NotebookScheduledRecurrence): string | null {
  const start = parseCalendarDate(recurrence.startDate);
  const current = parseCalendarDate(currentDueDate);
  if (!start || !current) return null;
  const monthDiff = (current.year - start.year) * 12 + current.month - start.month;
  let index = Math.max(1, Math.floor(monthDiff / recurrence.interval) + 1);
  while (index < 100000) {
    const absolute = start.year * 12 + (start.month - 1) + index * recurrence.interval;
    const year = Math.floor(absolute / 12);
    const month = (absolute % 12) + 1;
    const candidate = formatCalendarDate(year, month, Math.min(start.day, daysInMonth(year, month)));
    if (candidate > currentDueDate) return candidate;
    index += 1;
  }
  return null;
}

function nextYearOccurrence(currentDueDate: string, recurrence: NotebookScheduledRecurrence): string | null {
  const start = parseCalendarDate(recurrence.startDate);
  const current = parseCalendarDate(currentDueDate);
  if (!start || !current) return null;
  let index = Math.max(1, Math.floor((current.year - start.year) / recurrence.interval) + 1);
  while (index < 100000) {
    const year = start.year + index * recurrence.interval;
    const candidate = formatCalendarDate(year, start.month, Math.min(start.day, daysInMonth(year, start.month)));
    if (candidate > currentDueDate) return candidate;
    index += 1;
  }
  return null;
}

function nextWeekOccurrence(currentDueDate: string, recurrence: NotebookScheduledRecurrence): string | null {
  const anchorMonday = mondayOfWeek(recurrence.startDate);
  const current = parseCalendarDate(currentDueDate);
  if (!anchorMonday || !current) return null;
  const weekdays = orderedWeekdayOffsets(recurrence);
  if (!weekdays.length) return null;
  const weeksFromAnchor = Math.floor((current.date.getTime() - anchorMonday.getTime()) / (7 * MS_PER_DAY));
  let cycleWeek = Math.max(0, Math.floor(weeksFromAnchor / recurrence.interval) * recurrence.interval);
  for (let attempts = 0; attempts < 10000; attempts += 1) {
    for (const weekday of weekdays) {
      const candidate = weeklyCandidate(anchorMonday, cycleWeek, weekday);
      if (candidate >= recurrence.startDate && candidate > currentDueDate) return candidate;
    }
    cycleWeek += recurrence.interval;
  }
  return null;
}

export function nextNotebookScheduledDueDate(currentDueDate: string, recurrence: NotebookScheduledRecurrence): string | null {
  if (recurrence.unit === 'day') return nextDayOccurrence(currentDueDate, recurrence);
  if (recurrence.unit === 'week') return nextWeekOccurrence(currentDueDate, recurrence);
  if (recurrence.unit === 'month') return nextMonthOccurrence(currentDueDate, recurrence);
  return nextYearOccurrence(currentDueDate, recurrence);
}

function advanceLegacyNotebookDueDate(dueDate: string, recurrence: NotebookLegacyRecurrence): string | null {
  const parsed = parseCalendarDate(dueDate);
  if (!parsed) return null;
  if (recurrence.unit === 'day' || recurrence.unit === 'week') {
    return addNotebookCalendarDays(dueDate, recurrence.interval * (recurrence.unit === 'week' ? 7 : 1));
  }
  if (recurrence.unit === 'month') {
    const absolute = parsed.year * 12 + (parsed.month - 1) + recurrence.interval;
    const year = Math.floor(absolute / 12);
    const month = (absolute % 12) + 1;
    return formatCalendarDate(year, month, Math.min(parsed.day, daysInMonth(year, month)));
  }
  const year = parsed.year + recurrence.interval;
  return formatCalendarDate(year, parsed.month, Math.min(parsed.day, daysInMonth(year, parsed.month)));
}

export function advanceNotebookDueDate(dueDate: string, recurrence: NotebookRecurrence): string | null {
  if (isLegacyNotebookRecurrence(recurrence)) return advanceLegacyNotebookDueDate(dueDate, recurrence);
  if (isScheduledNotebookRecurrence(recurrence)) return nextNotebookScheduledDueDate(dueDate, recurrence);
  return isAfterCompletionNotebookRecurrence(recurrence) ? addNotebookCalendarDays(dueDate, recurrence.intervalDays) : null;
}

export function nextNotebookRecurringDueDate(currentDueDate: string | undefined, recurrence: NotebookRecurrence, completedOn: string): string | null {
  if (isAfterCompletionNotebookRecurrence(recurrence)) return addNotebookCalendarDays(completedOn, recurrence.intervalDays);
  if (isScheduledNotebookRecurrence(recurrence)) {
    const current = currentDueDate ?? firstNotebookScheduledDueDate(recurrence);
    return current ? nextNotebookScheduledDueDate(current, recurrence) : null;
  }
  return advanceLegacyNotebookDueDate(currentDueDate ?? completedOn, recurrence);
}
