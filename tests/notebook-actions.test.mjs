import assert from 'node:assert/strict';
import test from 'node:test';
import {
  NOTEBOOK_COMPLETION_GRACE_MS,
  addNotebookItem,
  notebookItemsForSection,
  notebookNextGraceExpiry,
  notebookSectionEntries,
  notebookUrgentActiveItems,
  notebookUrgentVisibleItems,
  orderedNotebookBoards,
  reorderNotebookBoards,
  reorderNotebookSection,
  setNotebookItemBoards,
  setNotebookItemPriority,
  setNotebookItemStatus,
} from '../src/lib/notebookActions.ts';
import { defaultNotebookState } from '../src/lib/notebookDomain.ts';

const board = (id, order) => ({ id, title: id, kind: 'task', visible: true, collapsed: false, order, createdAt: order + 1, updatedAt: order + 1 });
const item = (id, priority = 'normal', createdAt = 1) => ({ id, title: id, details: '', priority, status: 'active', createdAt, updatedAt: createdAt });

function baseState() {
  const state = defaultNotebookState();
  state.boards = { a: board('a', 0), b: board('b', 1) };
  return state;
}

test('new items enter the top of every selected board priority section', () => {
  let state = baseState();
  state = addNotebookItem(state, item('old', 'normal', 1), ['a']);
  state = addNotebookItem(state, item('new', 'normal', 2), ['a', 'b']);
  assert.deepEqual(notebookItemsForSection(state, 'a', 'normal', 'active').map((entry) => entry.id), ['new', 'old']);
  assert.deepEqual(notebookItemsForSection(state, 'b', 'normal', 'active').map((entry) => entry.id), ['new']);
});

test('manual ordering persists and completion views sort newest completion first within priority', () => {
  let state = baseState();
  state = addNotebookItem(state, item('a1', 'high', 1), ['a']);
  state = addNotebookItem(state, item('a2', 'high', 2), ['a']);
  state = reorderNotebookSection(state, 'a', 'high', ['a1', 'a2']);
  assert.deepEqual(notebookItemsForSection(state, 'a', 'high', 'active').map((entry) => entry.id), ['a1', 'a2']);
  state = setNotebookItemStatus(state, 'a1', 'completed', 10);
  state = setNotebookItemStatus(state, 'a2', 'completed', 20);
  assert.deepEqual(notebookItemsForSection(state, 'a', 'high', 'completed').map((entry) => entry.id), ['a2', 'a1']);
});

test('one-time completion stays visible in Active for one hour and then expires', () => {
  let state = baseState();
  state = addNotebookItem(state, item('old', 'normal', 1), ['a']);
  state = addNotebookItem(state, item('done', 'normal', 2), ['a']);
  state = setNotebookItemStatus(state, 'done', 'completed', 1000);
  assert.equal(state.items.done.status, 'completed');
  assert.equal(state.items.done.completedAt, 1000);
  assert.deepEqual(notebookSectionEntries(state, 'a', 'normal', 'active', 1001).map((entry) => entry.item.id), ['done', 'old']);
  assert.equal(notebookNextGraceExpiry(state, 1001), 1000 + NOTEBOOK_COMPLETION_GRACE_MS);
  assert.deepEqual(notebookSectionEntries(state, 'a', 'normal', 'active', 1000 + NOTEBOOK_COMPLETION_GRACE_MS).map((entry) => entry.item.id), ['old']);
  assert.deepEqual(notebookSectionEntries(state, 'a', 'normal', 'completed', 1001).map((entry) => entry.item.id), ['done']);
});

test('changing active priority moves an item to the top in every board', () => {
  let state = baseState();
  state = addNotebookItem(state, item('high-old', 'high', 1), ['a', 'b']);
  state = addNotebookItem(state, item('moving', 'normal', 2), ['a', 'b']);
  state = setNotebookItemPriority(state, 'moving', 'high', 3);
  assert.deepEqual(notebookItemsForSection(state, 'a', 'high', 'active').map((entry) => entry.id), ['moving', 'high-old']);
  assert.deepEqual(notebookItemsForSection(state, 'b', 'high', 'active').map((entry) => entry.id), ['moving', 'high-old']);
});

test('restoring a completed item puts it back at the top', () => {
  let state = baseState();
  state = addNotebookItem(state, item('old', 'normal', 1), ['a']);
  state = addNotebookItem(state, item('restore', 'normal', 2), ['a']);
  state = setNotebookItemStatus(state, 'restore', 'completed', 3);
  state = addNotebookItem(state, item('newer', 'normal', 4), ['a']);
  state = setNotebookItemStatus(state, 'restore', 'active', 5);
  assert.deepEqual(notebookItemsForSection(state, 'a', 'normal', 'active').map((entry) => entry.id), ['restore', 'newer', 'old']);
});

test('restoring a completed item is allowed only before the one-hour grace expires', () => {
  let completed = baseState();
  completed = addNotebookItem(completed, item('done', 'normal', 1), ['a']);
  completed = setNotebookItemStatus(completed, 'done', 'completed', 1000);

  const withinGrace = setNotebookItemStatus(completed, 'done', 'active', 1000 + NOTEBOOK_COMPLETION_GRACE_MS - 1);
  assert.equal(withinGrace.items.done.status, 'active');
  assert.equal(withinGrace.items.done.completedAt, undefined);

  const expired = setNotebookItemStatus(completed, 'done', 'active', 1000 + NOTEBOOK_COMPLETION_GRACE_MS);
  assert.equal(expired.items.done.status, 'completed');
  assert.equal(expired.items.done.completedAt, 1000);
});

test('board membership can change without duplicating an item and new memberships enter at the top', () => {
  let state = baseState();
  state = addNotebookItem(state, item('other', 'normal', 1), ['b']);
  state = addNotebookItem(state, item('moving', 'normal', 2), ['a']);
  state = setNotebookItemBoards(state, 'moving', ['a', 'b'], 3);
  assert.deepEqual(notebookItemsForSection(state, 'b', 'normal', 'active').map((entry) => entry.id), ['moving', 'other']);
});

test('smart urgent board deduplicates by item and orders newly added first', () => {
  let state = baseState();
  state = addNotebookItem(state, item('u1', 'urgent', 1), ['a', 'b']);
  state = addNotebookItem(state, item('u2', 'urgent', 2), ['a']);
  assert.deepEqual(notebookUrgentActiveItems(state).map((entry) => entry.id), ['u2', 'u1']);
});

test('recently completed urgent item stays in Smart Urgent during grace', () => {
  let state = baseState();
  state = addNotebookItem(state, item('urgent-done', 'urgent', 1), ['a']);
  state = setNotebookItemStatus(state, 'urgent-done', 'completed', 1000);
  assert.deepEqual(notebookUrgentVisibleItems(state, 1001).map((entry) => entry.id), ['urgent-done']);
  assert.deepEqual(notebookUrgentVisibleItems(state, 1000 + NOTEBOOK_COMPLETION_GRACE_MS).map((entry) => entry.id), []);
});

test('board reorder rewrites dense shared order', () => {
  const state = reorderNotebookBoards(baseState(), ['b', 'a'], 10);
  assert.deepEqual(orderedNotebookBoards(state).map((entry) => entry.id), ['b', 'a']);
  assert.equal(state.boards.b.order, 0);
  assert.equal(state.boards.a.order, 1);
});