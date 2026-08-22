import assert from 'node:assert/strict';
import test from 'node:test';
import { defaultNotebookState, normalizeNotebookState } from '../src/lib/notebookDomain.ts';
import {
  addNotebookItem,
  advanceNotebookDueDate,
  completeRecurringNotebookItem,
  notebookCompletedEntriesForSection,
  notebookSectionEntries,
  setNotebookItemBoards,
  setNotebookItemPriority,
  setNotebookItemStatus,
} from '../src/lib/notebookActions.ts';
import { renderNotebookBoards } from '../src/lib/notebookView.ts';

const board = (id, order = 0, kind = 'task') => ({ id, title: id, kind, visible: true, collapsed: false, order, createdAt: order + 1, updatedAt: order + 1 });
const item = (id, priority = 'normal', createdAt = 1) => ({ id, title: id, details: '', priority, status: 'active', createdAt, updatedAt: createdAt });
const baseState = () => {
  const state = defaultNotebookState();
  state.boards = { a: board('a', 0), b: board('b', 1) };
  return state;
};

test('recurrence date advancement preserves calendar intent and clamps month ends', () => {
  assert.equal(advanceNotebookDueDate('2026-01-31', { unit: 'month', interval: 1 }), '2026-02-28');
  assert.equal(advanceNotebookDueDate('2024-02-29', { unit: 'year', interval: 1 }), '2025-02-28');
  assert.equal(advanceNotebookDueDate('2026-08-22', { unit: 'week', interval: 1 }), '2026-08-29');
  assert.equal(advanceNotebookDueDate('2026-08-22', { unit: 'day', interval: 3 }), '2026-08-25');
});

test('recurring completion creates history, stays active, advances due date, and snapshots boards/priority', () => {
  let state = baseState();
  state = addNotebookItem(state, { ...item('repeat', 'urgent', 2), dueDate: '2026-01-31', recurrence: { unit: 'month', interval: 1 } }, ['a', 'b']);
  state = completeRecurringNotebookItem(state, 'repeat', 'event-1', 100, '2026-01-31');
  assert.equal(state.items.repeat.status, 'active');
  assert.equal(state.items.repeat.completedAt, undefined);
  assert.equal(state.items.repeat.dueDate, '2026-02-28');
  assert.deepEqual(state.completionEvents['event-1'], { id: 'event-1', itemId: 'repeat', completedAt: 100, priority: 'urgent', boardIds: ['a', 'b'] });
  state = setNotebookItemPriority(state, 'repeat', 'low', 110);
  state = setNotebookItemBoards(state, 'repeat', ['b'], 120);
  assert.equal(notebookCompletedEntriesForSection(state, 'a', 'urgent').length, 1);
  assert.equal(notebookCompletedEntriesForSection(state, 'a', 'low').length, 0);
});

test('All keeps active rows before one-time and recurring completion history', () => {
  let state = baseState();
  state = addNotebookItem(state, item('active', 'normal', 1), ['a']);
  state = addNotebookItem(state, item('done', 'normal', 2), ['a']);
  state = setNotebookItemStatus(state, 'done', 'completed', 20);
  state = addNotebookItem(state, { ...item('repeat', 'normal', 3), recurrence: { unit: 'week', interval: 1 } }, ['a']);
  state = completeRecurringNotebookItem(state, 'repeat', 'event-1', 30, '2026-08-22');
  const entries = notebookSectionEntries(state, 'a', 'normal', 'all');
  assert.deepEqual(entries.map((entry) => entry.kind), ['item', 'item', 'recurrence', 'item']);
  assert.deepEqual(entries.map((entry) => entry.item.id), ['repeat', 'active', 'repeat', 'done']);
});

test('media ratings are independent 0-10 fields and mediaType remains unsupported', () => {
  const base = { ...item('movie-1'), platform: 'Max', imdbRating: 8.2, myRating: 9.5, mediaType: 'movie' };
  const normalized = normalizeNotebookState({ items: { 'movie-1': base } });
  assert.equal(normalized.items['movie-1'].imdbRating, 8.2);
  assert.equal(normalized.items['movie-1'].myRating, 9.5);
  assert.equal(normalized.items['movie-1'].mediaType, undefined);
  assert.deepEqual(normalizeNotebookState({ items: { bad: { ...item('bad'), id: 'bad', myRating: 11 } } }).items, {});
});

test('media metadata and recurrence history render from authenticated state', () => {
  let state = defaultNotebookState();
  state.boards.movies = board('movies', 0, 'media');
  state = addNotebookItem(state, { ...item('m1'), title: 'Movie', platform: 'Max', imdbRating: 8.2, myRating: 9, notes: 'watch later', review: 'great', recurrence: { unit: 'year', interval: 1 } }, ['movies']);
  let html = renderNotebookBoards(state, 'Sami');
  assert.match(html, /IMDb 8\.2\/10/);
  assert.match(html, /我的评分 9\/10/);
  assert.match(html, /完成本次/);
  state = completeRecurringNotebookItem(state, 'm1', 'e1', 10, '2026-08-22');
  state.settings.viewFilter = 'completed';
  html = renderNotebookBoards(state, 'Sami');
  assert.match(html, /循环记录/);
  assert.doesNotMatch(html, /mediaType/);
});
