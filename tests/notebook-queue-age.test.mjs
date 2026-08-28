import assert from 'node:assert/strict';
import test from 'node:test';
import { addNotebookItem, completeRecurringNotebookItem, notebookItemsForSection } from '../src/lib/notebookActions.ts';
import { defaultNotebookState, normalizeNotebookState } from '../src/lib/notebookDomain.ts';
import { notebookBoardShowsQueueAge, notebookQueueAgeDays } from '../src/lib/notebookQueueAge.ts';
import { renderNotebookBoards } from '../src/lib/notebookView.ts';

const atLocalNoon = (year, month, day) => new Date(year, month - 1, day, 12, 0, 0, 0).getTime();
const board = (id, kind = 'task', showQueueAge) => ({
  id,
  title: id,
  kind,
  ...(showQueueAge === undefined ? {} : { showQueueAge }),
  visible: true,
  collapsed: false,
  order: 0,
  createdAt: 1,
  updatedAt: 1,
});
const item = (id, createdAt, extra = {}) => ({ id, title: id, details: '', priority: 'normal', status: 'active', createdAt, updatedAt: createdAt, ...extra });

test('legacy task boards show queue age by default while legacy media boards do not', () => {
  const normalized = normalizeNotebookState({ boards: { task: board('task', 'task'), media: board('media', 'media') } });
  assert.equal(normalized.boards.task.showQueueAge, undefined);
  assert.equal(normalized.boards.media.showQueueAge, undefined);
  assert.equal(notebookBoardShowsQueueAge(normalized.boards.task), true);
  assert.equal(notebookBoardShowsQueueAge(normalized.boards.media), false);
  assert.equal(notebookBoardShowsQueueAge({ ...normalized.boards.task, showQueueAge: false }), false);
  assert.equal(notebookBoardShowsQueueAge({ ...normalized.boards.media, showQueueAge: true }), true);
  assert.deepEqual(normalizeNotebookState({ boards: { bad: { ...board('bad'), showQueueAge: 'yes' } } }).boards, {});
});

test('queue age still resets on recurring completion while recurring items stay out of ordinary Board ordering', () => {
  const aug20 = atLocalNoon(2026, 8, 20);
  const aug21 = atLocalNoon(2026, 8, 21);
  const aug22 = atLocalNoon(2026, 8, 22);
  const aug23 = atLocalNoon(2026, 8, 23);
  let state = defaultNotebookState();
  state.boards = { a: board('a', 'task', true), b: { ...board('b', 'task', true), order: 1 } };
  state = addNotebookItem(state, item('older', aug20), ['a', 'b']);
  state = addNotebookItem(state, item('repeat', aug21, { dueDate: '2026-08-23', recurrence: { unit: 'week', interval: 1 } }), ['a', 'b']);
  state = addNotebookItem(state, item('newer', aug22), ['a', 'b']);

  assert.equal(notebookQueueAgeDays(state, state.items.repeat, aug23), 2);
  assert.deepEqual(notebookItemsForSection(state, 'a', 'normal', 'active').map((entry) => entry.id), ['newer', 'older']);

  state = completeRecurringNotebookItem(state, 'repeat', 'event-1', aug23, '2026-08-23');
  assert.equal(state.items.repeat.status, 'active');
  assert.equal(state.items.repeat.dueDate, '2026-08-30');
  assert.equal(notebookQueueAgeDays(state, state.items.repeat, aug23), 0);
  assert.deepEqual(notebookItemsForSection(state, 'a', 'normal', 'active').map((entry) => entry.id), ['newer', 'older']);
  assert.deepEqual(notebookItemsForSection(state, 'b', 'normal', 'active').map((entry) => entry.id), ['newer', 'older']);
});

test('Smart Urgent always shows queue age, with the red hourglass before the day count, while a media board may hide it', () => {
  const aug20 = atLocalNoon(2026, 8, 20);
  const aug23 = atLocalNoon(2026, 8, 23);
  let state = defaultNotebookState();
  state.boards.media = board('media', 'media');
  state = addNotebookItem(state, item('urgent-media', aug20, { priority: 'urgent', dueDate: '2026-08-24' }), ['media']);
  const html = renderNotebookBoards(state, 'Sami', aug23);
  assert.equal((html.match(/>3天<\/span>/g) ?? []).length, 1);
  assert.ok(html.indexOf('aria-label="明天截止"') < html.indexOf('>3天</span>'));
});

test('enabled normal boards show queue age and completed/history views do not manufacture queue ages', () => {
  const aug20 = atLocalNoon(2026, 8, 20);
  const aug23 = atLocalNoon(2026, 8, 23);
  let state = defaultNotebookState();
  state.boards.tasks = board('tasks', 'task', true);
  state = addNotebookItem(state, item('normal-task', aug20), ['tasks']);
  let html = renderNotebookBoards(state, 'Sami', aug23);
  assert.match(html, />3天<\/span>/);
  state.items['normal-task'] = { ...state.items['normal-task'], status: 'completed', completedAt: aug23, updatedAt: aug23 };
  state.settings.viewFilter = 'completed';
  html = renderNotebookBoards(state, 'Sami', aug23);
  assert.doesNotMatch(html, />3天<\/span>/);
});
