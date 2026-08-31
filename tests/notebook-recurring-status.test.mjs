import assert from 'node:assert/strict';
import test from 'node:test';
import { addNotebookItem } from '../src/lib/notebookActions.ts';
import { defaultNotebookState } from '../src/lib/notebookDomain.ts';
import { renderNotebookBoards } from '../src/lib/notebookView.ts';

const atLocalNoon = (year, month, day) => new Date(year, month - 1, day, 12, 0, 0, 0).getTime();
const board = (id) => ({ id, title: id, kind: 'task', showQueueAge: true, visible: true, collapsed: false, order: 0, createdAt: 1, updatedAt: 1 });
const item = (id, createdAt, extra = {}) => ({ id, title: id, details: '', priority: 'normal', status: 'active', createdAt, updatedAt: createdAt, ...extra });

test('recurring cards use remaining days in Smart Urgent instead of queue age', () => {
  const aug24 = atLocalNoon(2026, 8, 24);
  const aug30 = atLocalNoon(2026, 8, 30);
  let state = defaultNotebookState();
  state.boards.tasks = board('tasks');
  state = addNotebookItem(state, item('repeat', aug24, {
    priority: 'urgent',
    dueDate: '2026-08-31',
    recurrence: { kind: 'scheduled', startDate: '2026-08-31', unit: 'week', interval: 1, weekdays: ['mon'] },
  }), ['tasks']);

  const html = renderNotebookBoards(state, 'Sami', aug30);
  assert.equal((html.match(/aria-label="明天"/g) ?? []).length, 2);
  assert.doesNotMatch(html, /aria-label="已排队 6 天"/);
});

test('one-time Smart Urgent cards keep queue age and due-soon status', () => {
  const aug24 = atLocalNoon(2026, 8, 24);
  const aug30 = atLocalNoon(2026, 8, 30);
  let state = defaultNotebookState();
  state.boards.tasks = board('tasks');
  state = addNotebookItem(state, item('once', aug24, { dueDate: '2026-08-31' }), ['tasks']);

  const html = renderNotebookBoards(state, 'Sami', aug30);
  assert.match(html, /aria-label="明天截止"/);
  assert.match(html, /aria-label="已排队 6 天"/);
});
