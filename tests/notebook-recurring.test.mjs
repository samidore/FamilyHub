import assert from 'node:assert/strict';
import test from 'node:test';
import { defaultNotebookState } from '../src/lib/notebookDomain.ts';
import { addNotebookItem, notebookRecurringActiveItems, notebookSectionEntries } from '../src/lib/notebookActions.ts';
import { renderNotebookBoards } from '../src/lib/notebookView.ts';

const board = { id: 'home', title: '家里', kind: 'task', visible: true, collapsed: false, order: 0, createdAt: 1, updatedAt: 1 };
const item = (id, dueDate, priority, createdAt) => ({
  id,
  title: id,
  details: '',
  priority,
  status: 'active',
  dueDate,
  recurrence: { kind: 'afterCompletion', intervalDays: 30 },
  createdAt,
  updatedAt: createdAt,
});

test('反复干 groups by remaining days, then orders each group by priority and remaining days', () => {
  let state = defaultNotebookState();
  state.boards.home = board;
  state = addNotebookItem(state, item('later-low', '2026-08-31', 'low', 1), ['home']);
  state = addNotebookItem(state, item('soon-normal', '2026-08-30', 'normal', 2), ['home']);
  state = addNotebookItem(state, item('soon-high-later', '2026-08-31', 'high', 3), ['home']);
  state = addNotebookItem(state, item('soon-high-earlier', '2026-08-29', 'high', 4), ['home']);
  state = addNotebookItem(state, item('overdue', '2026-08-20', 'normal', 5), ['home']);
  state = addNotebookItem(state, item('today', '2026-08-28', 'normal', 6), ['home']);

  assert.deepEqual(
    notebookRecurringActiveItems(state, '2026-08-28').map((entry) => entry.id),
    ['overdue', 'today', 'soon-high-earlier', 'soon-high-later', 'soon-normal', 'later-low'],
  );
  assert.deepEqual(notebookSectionEntries(state, 'home', 'high', 'active'), []);
});

test('反复干 renders all day groups with matching remaining-day color classes and no drag controls', () => {
  let state = defaultNotebookState();
  state.boards.home = board;
  const dates = [
    ['overdue', '2026-08-27'],
    ['today', '2026-08-28'],
    ['soon', '2026-08-29'],
    ['week', '2026-09-02'],
    ['near', '2026-09-08'],
    ['later', '2026-09-20'],
  ];
  for (let index = 0; index < dates.length; index += 1) {
    const [id, dueDate] = dates[index];
    state = addNotebookItem(state, item(id, dueDate, 'normal', index + 1), ['home']);
  }

  const now = new Date(2026, 7, 28, 12).getTime();
  const html = renderNotebookBoards(state, 'Sami', now);
  for (const key of ['overdue', 'today', 'soon', 'week', 'near', 'later']) {
    assert.match(html, new RegExp(`data-recurring-group="${key}"`));
    assert.match(html, new RegExp(`notebook-remaining-badge--${key}`));
  }
  assert.match(html, /已过期 1 天/);
  assert.match(html, />今天</);
  assert.match(html, />明天</);
  assert.match(html, /还有 5 天/);
  const recurringBoard = html.slice(html.indexOf('data-recurring-board'), html.indexOf('data-board-id="home"'));
  assert.doesNotMatch(recurringBoard, /data-move-item|data-item-drag-handle/);
});
