import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { attributeNewNotebookItems } from '../src/lib/notebookAttribution.ts';
import { NOTEBOOK_COMPLETION_GRACE_MS } from '../src/lib/notebookActions.ts';
import {
  defaultNotebookState,
  normalizeNotebookState,
} from '../src/lib/notebookDomain.ts';
import {
  NOTEBOOK_LEGACY_AUTHOR_NAME,
  NOTEBOOK_LEGACY_COMPLETER_NAME,
  notebookAuthorIconKind,
  notebookCommentWindow,
  notebookCompletedByName,
  notebookItemAuthorName,
} from '../src/lib/notebookCardPresentation.ts';
import { renderNotebookBoards } from '../src/lib/notebookView.ts';

const item = (id, authorName) => ({
  id,
  title: id,
  details: '',
  priority: 'normal',
  status: 'active',
  ...(authorName ? { authorName } : {}),
  createdAt: 1,
  updatedAt: 1,
});
const comment = (id, createdAt) => ({ id, itemId: 'i', body: id, authorName: '猫猫', createdAt });

test('legacy items fall back to 猫猫 while explicit authors select the intended icon', () => {
  assert.equal(NOTEBOOK_LEGACY_AUTHOR_NAME, '猫猫');
  assert.equal(notebookItemAuthorName(item('legacy')), '猫猫');
  assert.equal(notebookAuthorIconKind(notebookItemAuthorName(item('legacy'))), 'cat');
  assert.equal(notebookAuthorIconKind(notebookItemAuthorName(item('dog', '呜哇'))), 'dog');
  assert.equal(notebookAuthorIconKind(notebookItemAuthorName(item('other', 'Sami'))), 'generic');
});

test('legacy completion attribution falls back to 呜哇', () => {
  assert.equal(NOTEBOOK_LEGACY_COMPLETER_NAME, '呜哇');
  assert.equal(notebookCompletedByName({}), '呜哇');
  assert.equal(notebookCompletedByName({ completedByName: '猫猫' }), '猫猫');
});

test('item authorName and completion names are normalized and invalid identity-like values are rejected', () => {
  const valid = normalizeNotebookState({
    items: {
      i: { ...item('i', '  呜哇  '), status: 'completed', completedAt: 2, completedByName: '  猫猫  ', updatedAt: 2 },
      active: { ...item('active'), completedByName: '呜哇' },
    },
    completionEvents: {
      e1: { id: 'e1', itemId: 'i', completedAt: 2, completedByName: '  呜哇  ', priority: 'normal', boardIds: ['b'] },
    },
  });
  assert.equal(valid.items.i.authorName, '呜哇');
  assert.equal(valid.items.i.completedByName, '猫猫');
  assert.equal(valid.items.active.completedByName, undefined);
  assert.equal(valid.completionEvents.e1.completedByName, '呜哇');
  const invalid = normalizeNotebookState({ items: { i: { ...item('i'), authorName: 'person@example.com' } } });
  assert.deepEqual(invalid.items, {});
});

test('repository attribution snapshots item authors and the member who completed one-time or recurring work', () => {
  const current = defaultNotebookState();
  current.items.old = item('old', '猫猫');
  current.items.task = item('task', '猫猫');
  current.items.legacyDone = { ...item('legacyDone', '猫猫'), status: 'completed', completedAt: 5, updatedAt: 5 };
  current.completionEvents.legacy = { id: 'legacy', itemId: 'task', completedAt: 4, priority: 'normal', boardIds: ['b'] };

  const next = structuredClone(current);
  next.items.old = { ...next.items.old, title: 'edited' };
  next.items.new = item('new');
  next.items.task = { ...next.items.task, status: 'completed', completedAt: 10, updatedAt: 10 };
  next.completionEvents.newEvent = { id: 'newEvent', itemId: 'old', completedAt: 11, priority: 'normal', boardIds: ['b'] };

  const attributed = attributeNewNotebookItems(current, next, '呜哇');
  assert.equal(attributed.items.old.authorName, '猫猫');
  assert.equal(attributed.items.new.authorName, '呜哇');
  assert.equal(attributed.items.task.completedByName, '呜哇');
  assert.equal(attributed.completionEvents.newEvent.completedByName, '呜哇');
  assert.equal(attributed.items.legacyDone.completedByName, undefined);
  assert.equal(attributed.completionEvents.legacy.completedByName, undefined);

  const withoutName = attributeNewNotebookItems(current, { ...next, items: { ...next.items, another: item('another') } }, null);
  assert.equal(withoutName.items.another.authorName, undefined);
});

test('comment window shows all of 0-2 comments and only first/middle/last for 3+', () => {
  assert.deepEqual(notebookCommentWindow([]), { leading: [], middle: [], trailing: [] });
  const one = [comment('c1', 1)];
  assert.deepEqual(notebookCommentWindow(one).leading.map((entry) => entry.id), ['c1']);
  const two = [comment('c1', 1), comment('c2', 2)];
  assert.deepEqual(notebookCommentWindow(two).leading.map((entry) => entry.id), ['c1', 'c2']);
  assert.deepEqual(notebookCommentWindow(two).middle, []);
  const four = [comment('c1', 1), comment('c2', 2), comment('c3', 3), comment('c4', 4)];
  const windowed = notebookCommentWindow(four);
  assert.deepEqual(windowed.leading.map((entry) => entry.id), ['c1']);
  assert.deepEqual(windowed.middle.map((entry) => entry.id), ['c2', 'c3']);
  assert.deepEqual(windowed.trailing.map((entry) => entry.id), ['c4']);
});

test('card markup uses the supplied dog portrait and shows completer icons', () => {
  const view = readFileSync(new URL('../src/lib/notebookView.ts', import.meta.url), 'utf8');
  const dogAsset = readFileSync(new URL('../src/lib/notebookDogAuthorAsset.ts', import.meta.url), 'utf8');
  assert.equal(view.includes('内容与评论'), false);
  assert.equal(view.includes('暂无内容。'), false);
  assert.match(view, /NOTEBOOK_DOG_ICON_DATA_URI/);
  assert.equal(view.includes('🐶'), false);
  assert.match(dogAsset, /data:image\/webp;base64,/);

  const state = defaultNotebookState();
  state.boards.b = { id: 'b', title: 'B', kind: 'task', visible: true, collapsed: false, order: 0, createdAt: 1, updatedAt: 1 };
  state.items.done = { ...item('done', '猫猫'), status: 'completed', completedAt: 2, updatedAt: 2 };
  state.memberships.b = { done: { order: 0 } };
  state.settings.viewFilter = 'completed';
  const legacyHtml = renderNotebookBoards(state, '猫猫', 3);
  assert.match(legacyHtml, /aria-label="呜哇完成"/);
  state.items.done.completedByName = '猫猫';
  const explicitHtml = renderNotebookBoards(state, '猫猫', 3);
  assert.match(explicitHtml, /aria-label="猫猫完成"/);
});

test('completed cards show undo only during the one-hour grace period', () => {
  const state = defaultNotebookState();
  state.boards.b = { id: 'b', title: 'B', kind: 'task', visible: true, collapsed: false, order: 0, createdAt: 1, updatedAt: 1 };
  state.items.done = { ...item('done', '猫猫'), status: 'completed', completedAt: 1000, updatedAt: 1000 };
  state.memberships.b = { done: { order: 0 } };
  state.settings.viewFilter = 'completed';

  const duringGrace = renderNotebookBoards(state, '猫猫', 1000 + NOTEBOOK_COMPLETION_GRACE_MS - 1);
  assert.match(duringGrace, /data-restore-item="done"/);

  const expired = renderNotebookBoards(state, '猫猫', 1000 + NOTEBOOK_COMPLETION_GRACE_MS);
  assert.doesNotMatch(expired, /data-restore-item="done"/);
  assert.match(expired, /<span>已完成<\/span>/);
});

test('Firebase rules allow immutable item authors tied to the creating member display name', () => {
  const rules = JSON.parse(readFileSync(new URL('../database.rules.json', import.meta.url), 'utf8'));
  const validation = rules.rules.households.$householdId.notebook.items.$itemId.authorName['.validate'];
  assert.match(validation, /displayName/);
  assert.match(validation, /data\.exists\(\)/);
  assert.match(validation, /newData\.val\(\) == data\.val\(\)/);
});