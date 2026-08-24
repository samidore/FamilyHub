import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { defaultNotebookState } from '../src/lib/notebookDomain.ts';
import { deleteNotebookItem } from '../src/lib/notebookItemDelete.ts';
import { NOTEBOOK_CAT_ICON_DATA_URI } from '../src/lib/notebookAuthorAssets.ts';

const board = (id) => ({ id, title: id, kind: 'task', visible: true, collapsed: false, order: 0, createdAt: 1, updatedAt: 1 });
const item = (id, order) => ({ id, title: id, details: '', priority: 'normal', status: 'active', createdAt: order + 1, updatedAt: order + 1 });

test('deleting an item removes memberships, comments, recurring history and closes active-order gaps', () => {
  const state = defaultNotebookState();
  state.boards.a = board('a');
  state.items.first = item('first', 0);
  state.items.target = item('target', 1);
  state.items.last = item('last', 2);
  state.memberships.a = { first: { order: 0 }, target: { order: 1 }, last: { order: 2 } };
  state.comments.c1 = { id: 'c1', itemId: 'target', body: 'remove me', authorName: '猫猫', createdAt: 10 };
  state.comments.c2 = { id: 'c2', itemId: 'last', body: 'keep me', authorName: '猫猫', createdAt: 11 };
  state.completionEvents.e1 = { id: 'e1', itemId: 'target', completedAt: 12, priority: 'normal', boardIds: ['a'] };

  const next = deleteNotebookItem(state, 'target');
  assert.equal(next.items.target, undefined);
  assert.equal(next.memberships.a.target, undefined);
  assert.equal(next.comments.c1, undefined);
  assert.equal(next.completionEvents.e1, undefined);
  assert.equal(next.comments.c2.body, 'keep me');
  assert.deepEqual(Object.entries(next.memberships.a).sort((a, b) => a[1].order - b[1].order), [['first', { order: 0 }], ['last', { order: 1 }]]);
  assert.ok(state.items.target);
});

test('cat author icon uses the supplied compact image asset and cards do not render board-name metadata', () => {
  assert.match(NOTEBOOK_CAT_ICON_DATA_URI, /^data:image\/webp;base64,/);
  const view = readFileSync(new URL('../src/lib/notebookView.ts', import.meta.url), 'utf8');
  assert.match(view, /NOTEBOOK_CAT_ICON_DATA_URI/);
  assert.doesNotMatch(view, /boardNames/);
  assert.doesNotMatch(view, /notebookBoardIdsForItem/);
});

test('item editor exposes deletion and mobile board header keeps add action on the title row', () => {
  const page = readFileSync(new URL('../src/pages/sami-notebook.astro', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/styles/notebook.css', import.meta.url), 'utf8');
  assert.match(page, /id="notebook-delete-item"/);
  assert.match(page, /class="danger-button"/);
  assert.match(css, /\.notebook-board__header \{ grid-template-columns: auto minmax\(0, 1fr\) auto; \}/);
  assert.doesNotMatch(css, /grid-column: 2; justify-self: start/);
});
