import assert from 'node:assert/strict';
import test from 'node:test';
import { addNotebookItem, setNotebookItemStatus } from '../src/lib/notebookActions.ts';
import { defaultNotebookState } from '../src/lib/notebookDomain.ts';
import {
  getNotebookDueSoonState,
  notebookDueSoonItems,
  notebookDueSoonLabel,
} from '../src/lib/notebookDueSoon.ts';
import { renderNotebookBoards } from '../src/lib/notebookView.ts';

const board = (id, order = 0) => ({ id, title: id, kind: 'task', visible: true, collapsed: false, order, createdAt: order + 1, updatedAt: order + 1 });
const item = (id, dueDate, priority = 'normal', createdAt = 1) => ({ id, title: id, details: '', priority, status: 'active', dueDate, createdAt, updatedAt: createdAt });

function baseState() {
  const state = defaultNotebookState();
  state.boards.a = board('a');
  return state;
}

test('due-soon is a derived active-only state for tomorrow, today, and overdue', () => {
  assert.equal(getNotebookDueSoonState(item('tomorrow', '2026-08-24'), '2026-08-23'), 'tomorrow');
  assert.equal(getNotebookDueSoonState(item('today', '2026-08-23'), '2026-08-23'), 'today');
  assert.equal(getNotebookDueSoonState(item('overdue', '2026-08-22'), '2026-08-23'), 'overdue');
  assert.equal(getNotebookDueSoonState(item('later', '2026-08-25'), '2026-08-23'), null);
  assert.equal(getNotebookDueSoonState({ ...item('done', '2026-08-24'), status: 'completed', completedAt: 1 }, '2026-08-23'), null);
  assert.equal(notebookDueSoonLabel('tomorrow'), '明天截止');
  assert.equal(notebookDueSoonLabel('today'), '今天截止');
  assert.equal(notebookDueSoonLabel('overdue'), '已逾期');
});

test('due-soon items are collected independently of stored priority', () => {
  let state = baseState();
  state = addNotebookItem(state, item('tomorrow', '2026-08-24', 'low', 1), ['a']);
  state = addNotebookItem(state, item('later', '2026-08-25', 'urgent', 2), ['a']);
  assert.deepEqual(notebookDueSoonItems(state, '2026-08-23').map((entry) => entry.id), ['tomorrow']);
  assert.equal(state.items.tomorrow.priority, 'low');
});

test('Smart Urgent includes due-soon items without moving them into the ordinary Urgent section', () => {
  let state = baseState();
  state = addNotebookItem(state, item('deadline', '2026-08-24', 'normal', 2), ['a']);
  const now = new Date(2026, 7, 23, 12, 0, 0).getTime();
  const html = renderNotebookBoards(state, null, now);
  assert.match(html, /data-smart-urgent/);
  assert.match(html, /aria-label="明天截止"/);
  assert.match(html, /#c83f4d/);
  assert.match(html, /data-priority="normal"/);
  assert.equal(state.items.deadline.priority, 'normal');
});

test('completed due-soon item leaves Smart Urgent immediately while normal completion grace remains elsewhere', () => {
  let state = baseState();
  state = addNotebookItem(state, item('deadline', '2026-08-24', 'normal', 2), ['a']);
  const now = new Date(2026, 7, 23, 12, 0, 0).getTime();
  state = setNotebookItemStatus(state, 'deadline', 'completed', now);
  const html = renderNotebookBoards(state, null, now + 1);
  assert.doesNotMatch(html, /data-smart-urgent/);
  assert.match(html, /还会在这里保留/);
  assert.doesNotMatch(html, /aria-label="明天截止"/);
});
