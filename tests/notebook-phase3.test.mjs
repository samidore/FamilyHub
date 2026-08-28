import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { defaultNotebookState, normalizeNotebookState } from '../src/lib/notebookDomain.ts';
import {
  addNotebookItem,
  advanceNotebookDueDate,
  completeRecurringNotebookItem,
  notebookCompletedEntriesForSection,
  notebookRecurringActiveItems,
  notebookSectionEntries,
  setNotebookItemBoards,
  setNotebookItemPriority,
  setNotebookItemStatus,
} from '../src/lib/notebookActions.ts';
import { firstNotebookScheduledDueDate, nextNotebookScheduledDueDate } from '../src/lib/notebookRecurrence.ts';
import { renderNotebookBoards } from '../src/lib/notebookView.ts';

const board = (id, order = 0, kind = 'task') => ({ id, title: id, kind, visible: true, collapsed: false, order, createdAt: order + 1, updatedAt: order + 1 });
const item = (id, priority = 'normal', createdAt = 1) => ({ id, title: id, details: '', priority, status: 'active', createdAt, updatedAt: createdAt });
const baseState = () => {
  const state = defaultNotebookState();
  state.boards = { a: board('a', 0), b: board('b', 1) };
  return state;
};

test('legacy recurrence remains readable and date advancement preserves calendar intent', () => {
  assert.equal(advanceNotebookDueDate('2026-01-31', { unit: 'month', interval: 1 }), '2026-02-28');
  assert.equal(advanceNotebookDueDate('2024-02-29', { unit: 'year', interval: 1 }), '2025-02-28');
  assert.equal(advanceNotebookDueDate('2026-08-22', { unit: 'week', interval: 1 }), '2026-08-29');
  assert.equal(advanceNotebookDueDate('2026-08-22', { unit: 'day', interval: 3 }), '2026-08-25');
});

test('undated legacy recurrence editor does not invent a scheduled anchor on an unrelated save', async () => {
  const source = await readFile('src/lib/notebookItemUi.ts', 'utf8');
  assert.match(source, /preserveLegacyWithoutDueDate = Boolean\(item\?\.recurrence/);
  assert.match(source, /!scheduledStartDate\.value && !preserveLegacyWithoutDueDate/);
  assert.match(source, /kind === 'scheduled' && preserveLegacyWithoutDueDate/);
});

test('scheduled recurrence supports every N weeks, weekdays, and does not skip overdue occurrences', () => {
  const recurrence = { kind: 'scheduled', startDate: '2026-09-07', unit: 'week', interval: 2, weekdays: ['mon', 'thu'] };
  assert.equal(firstNotebookScheduledDueDate(recurrence), '2026-09-07');
  assert.equal(nextNotebookScheduledDueDate('2026-09-07', recurrence), '2026-09-10');
  assert.equal(nextNotebookScheduledDueDate('2026-09-10', recurrence), '2026-09-21');

  let state = baseState();
  state = addNotebookItem(state, { ...item('repeat', 'urgent', 2), dueDate: '2026-09-07', recurrence }, ['a', 'b']);
  state = completeRecurringNotebookItem(state, 'repeat', 'event-1', 100, '2026-09-25');
  assert.equal(state.items.repeat.dueDate, '2026-09-10');
});

test('after-completion recurrence restarts from actual completion date and stays active', () => {
  let state = baseState();
  state = addNotebookItem(state, { ...item('bucket', 'normal', 2), dueDate: '2026-08-01', recurrence: { kind: 'afterCompletion', intervalDays: 30 } }, ['a']);
  state = completeRecurringNotebookItem(state, 'bucket', 'event-1', 100, '2026-08-28');
  assert.equal(state.items.bucket.status, 'active');
  assert.equal(state.items.bucket.dueDate, '2026-09-27');
  assert.equal(notebookRecurringActiveItems(state, '2026-08-28')[0].id, 'bucket');
});

test('recurring items are exclusive to 反复干 while ordinary memberships stay for fallback and history snapshots', () => {
  let state = baseState();
  state = addNotebookItem(state, { ...item('repeat', 'urgent', 2), dueDate: '2026-01-31', recurrence: { unit: 'month', interval: 1 } }, ['a', 'b']);
  assert.deepEqual(notebookSectionEntries(state, 'a', 'urgent', 'active'), []);
  state = completeRecurringNotebookItem(state, 'repeat', 'event-1', 100, '2026-01-31');
  assert.deepEqual(state.completionEvents['event-1'], { id: 'event-1', itemId: 'repeat', completedAt: 100, priority: 'urgent', boardIds: ['a', 'b'] });
  assert.equal(notebookCompletedEntriesForSection(state, 'a', 'urgent').length, 0);
  state = setNotebookItemPriority(state, 'repeat', 'low', 110);
  state = setNotebookItemBoards(state, 'repeat', ['b'], 120);
  assert.equal(Boolean(state.memberships.b.repeat), true);
  assert.equal(state.memberships.a, undefined);
});

test('All keeps ordinary rows in ordinary Boards and recurring rows/history in 反复干', () => {
  let state = baseState();
  state = addNotebookItem(state, item('active', 'normal', 1), ['a']);
  state = addNotebookItem(state, item('done', 'normal', 2), ['a']);
  state = setNotebookItemStatus(state, 'done', 'completed', 20);
  state = addNotebookItem(state, { ...item('repeat', 'normal', 3), dueDate: '2026-08-29', recurrence: { kind: 'afterCompletion', intervalDays: 7 } }, ['a']);
  state = completeRecurringNotebookItem(state, 'repeat', 'event-1', 30, '2026-08-22');
  state.settings.viewFilter = 'all';
  const entries = notebookSectionEntries(state, 'a', 'normal', 'all');
  assert.deepEqual(entries.map((entry) => entry.item.id), ['active', 'done']);
  const html = renderNotebookBoards(state, 'Sami', new Date(2026, 7, 22, 12).getTime());
  assert.match(html, /data-recurring-board/);
  assert.match(html, /反复干/);
  assert.match(html, /data-completion-event-id="event-1"/);
});

test('media ratings are independent 0-10 fields and mediaType remains unsupported', () => {
  const base = { ...item('movie-1'), platform: 'Max', imdbRating: 8.2, myRating: 9.5, mediaType: 'movie' };
  const normalized = normalizeNotebookState({ items: { 'movie-1': base } });
  assert.equal(normalized.items['movie-1'].imdbRating, 8.2);
  assert.equal(normalized.items['movie-1'].myRating, 9.5);
  assert.equal(normalized.items['movie-1'].mediaType, undefined);
  assert.deepEqual(normalizeNotebookState({ items: { bad: { ...item('bad'), id: 'bad', myRating: 11 } } }).items, {});
});

test('media metadata and recurring completion render from authenticated state', () => {
  let state = defaultNotebookState();
  state.boards.movies = board('movies', 0, 'media');
  state = addNotebookItem(state, { ...item('m1'), title: 'Movie', dueDate: '2026-08-22', platform: 'Max', imdbRating: 8.2, myRating: 9, notes: 'watch later', review: 'great', recurrence: { kind: 'afterCompletion', intervalDays: 365 } }, ['movies']);
  let html = renderNotebookBoards(state, 'Sami', new Date(2026, 7, 22, 12).getTime());
  assert.match(html, /IMDb 8\.2\/10/);
  assert.match(html, /我的评分 9\/10/);
  assert.match(html, /完成本次/);
  state = completeRecurringNotebookItem(state, 'm1', 'e1', 10, '2026-08-22');
  state.settings.viewFilter = 'completed';
  html = renderNotebookBoards(state, 'Sami');
  assert.match(html, /循环记录/);
  assert.doesNotMatch(html, /mediaType/);
});
