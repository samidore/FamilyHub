import assert from 'node:assert/strict';
import test from 'node:test';
import {
  addNotebookItem,
  notebookItemsForSection,
  notebookUrgentActiveItems,
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

test('board reorder rewrites dense shared order', () => {
  const state = reorderNotebookBoards(baseState(), ['b', 'a'], 10);
  assert.deepEqual(orderedNotebookBoards(state).map((entry) => entry.id), ['b', 'a']);
  assert.equal(state.boards.b.order, 0);
  assert.equal(state.boards.a.order, 1);
});
