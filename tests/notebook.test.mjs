import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { defaultNotebookState, isSupportedRecurrence, normalizeMemberDisplayName, normalizeNotebookState } from '../src/lib/notebookDomain.ts';
import { LocalNotebookRepository, createNotebookRepository } from '../src/lib/notebookRepository.ts';

const board = { id: 'todo', title: 'Todo', kind: 'task', visible: true, collapsed: false, order: 0, createdAt: 1, updatedAt: 1 };
const item = { id: 'task-1', title: 'Call contractor', details: '', priority: 'high', status: 'active', createdAt: 2, updatedAt: 2 };

test('notebook defaults are empty shared state with Active filter', () => {
  assert.deepEqual(defaultNotebookState(), {
    boards: {}, items: {}, memberships: {}, comments: {}, completionEvents: {}, inbox: {}, settings: { viewFilter: 'active' },
  });
});

test('notebook normalization keeps valid records, strips unknown fields, and removes orphan memberships/comments', () => {
  const normalized = normalizeNotebookState({
    boards: { todo: { ...board, extra: 'ignored' } },
    items: { 'task-1': { ...item, mediaType: 'movie' } },
    memberships: { todo: { 'task-1': { order: 0 }, missing: { order: 1 } }, missing: { 'task-1': { order: 0 } } },
    comments: {
      c1: { id: 'c1', itemId: 'task-1', body: 'Quoted $500', authorName: 'Sami', createdAt: 3 },
      c2: { id: 'c2', itemId: 'missing', body: 'orphan', authorName: 'Sami', createdAt: 3 },
    },
    settings: { viewFilter: 'completed', ignored: true },
  });
  assert.deepEqual(normalized.memberships, { todo: { 'task-1': { order: 0 } } });
  assert.deepEqual(Object.keys(normalized.comments), ['c1']);
  assert.equal(normalized.items['task-1'].mediaType, undefined);
  assert.equal(normalized.settings.viewFilter, 'completed');
});

test('completion and recurrence invariants reject malformed items while legacy recurrence remains readable', () => {
  const recurringCompleted = { ...item, id: 'bad-1', status: 'completed', completedAt: 10, recurrence: { unit: 'month', interval: 3 } };
  const completedWithoutDate = { ...item, id: 'bad-2', status: 'completed' };
  const activeWithCompletionDate = { ...item, id: 'bad-3', completedAt: 10 };
  const normalized = normalizeNotebookState({ items: { 'bad-1': recurringCompleted, 'bad-2': completedWithoutDate, 'bad-3': activeWithCompletionDate } });
  assert.deepEqual(normalized.items, {});
  assert.equal(isSupportedRecurrence({ unit: 'day', interval: 3 }), true);
  assert.equal(isSupportedRecurrence({ unit: 'month', interval: 6 }), true);
  assert.equal(isSupportedRecurrence({ unit: 'week', interval: 2 }), false);
  assert.equal(isSupportedRecurrence({ unit: 'year', interval: 1 }), true);
  assert.equal(isSupportedRecurrence({ kind: 'scheduled', startDate: '2026-09-07', unit: 'week', interval: 2, weekdays: ['mon', 'thu'] }), true);
  assert.equal(isSupportedRecurrence({ kind: 'scheduled', startDate: '2026-09-07', unit: 'week', interval: 2, weekdays: [] }), false);
  assert.equal(isSupportedRecurrence({ kind: 'afterCompletion', intervalDays: 30 }), true);
  assert.equal(isSupportedRecurrence({ kind: 'afterCompletion', intervalDays: 0 }), false);
});

test('item editor Enter does not implicitly submit from an input', async () => {
  const ui = await readFile('src/lib/notebookUi.ts', 'utf8');
  assert.match(ui, /itemForm\.addEventListener\('keydown'/);
  assert.match(ui, /event\.key === 'Enter'/);
  assert.match(ui, /event\.target instanceof HTMLInputElement/);
  assert.match(ui, /event\.preventDefault\(\)/);
});

test('display names are private names, not email addresses', () => {
  assert.equal(normalizeMemberDisplayName(' Sami '), 'Sami');
  assert.equal(normalizeMemberDisplayName('sami@example.com'), null);
  assert.equal(normalizeMemberDisplayName('   '), null);
});

test('local notebook repository is explicit and transaction-normalized', async () => {
  const repository = new LocalNotebookRepository('test', { displayName: 'Sami' });
  await repository.transaction((state) => ({ ...state, boards: { todo: board }, items: { 'task-1': item }, memberships: { todo: { 'task-1': { order: 0 } } } }));
  assert.equal(repository.getSnapshot().items['task-1'].title, 'Call contractor');
  assert.equal(repository.getCurrentMemberDisplayName(), 'Sami');
  repository.dispose();
});

test('repository factory never silently falls back to local state', () => {
  const missing = createNotebookRepository({});
  assert.equal(missing.kind, 'firebase');
  assert.equal(missing.getStatus().connection, 'error');
  missing.dispose();

  const partial = createNotebookRepository({ apiKey: 'public-key' });
  assert.equal(partial.kind, 'firebase');
  assert.equal(partial.getStatus().connection, 'error');
  partial.dispose();

  const explicitLocal = createNotebookRepository({}, { allowLocal: true, displayName: 'Sami' });
  assert.equal(explicitLocal.kind, 'local');
  explicitLocal.dispose();
});
