import assert from 'node:assert/strict';
import test from 'node:test';
import { defaultNotebookState } from '../src/lib/notebookDomain.ts';
import {
  applyNotebookPatch,
  createNotebookInboxChatPrompt,
  createNotebookInboxCopyPayload,
  createNotebookPatchPreview,
  parseNotebookPatchJson,
  prepareNotebookPatchItemIds,
  validateNotebookPatch,
} from '../src/lib/notebookPatch.ts';
import { createNotebookExport, serializeNotebookExport } from '../src/lib/notebookExport.ts';

const board = (id, kind, order, title = id) => ({ id, title, kind, visible: true, collapsed: false, order, createdAt: order + 1, updatedAt: order + 1 });
const ticket = (id, text, createdAt) => ({ id, text, createdAt, updatedAt: createdAt });
const item = (id, priority = 'normal', createdAt = 1) => ({ id, title: id, details: '', priority, status: 'active', createdAt, updatedAt: createdAt });

function stateWithInbox() {
  const state = defaultNotebookState();
  state.boards = { todo: board('todo', 'task', 0, '开干'), movies: board('movies', 'media', 1, '电影') };
  state.inbox = { a: ticket('a', 'first', 10), b: ticket('b', 'second', 20), c: ticket('c', 'third', 30) };
  state.items.existing = item('existing', 'normal', 5);
  state.memberships.todo = { existing: { order: 0 } };
  return state;
}

const patch = (items) => ({ patchVersion: 1, items });
const patchItem = (ticketId, overrides = {}) => ({ ticketId, title: `Title ${ticketId}`, details: '', boardIds: ['todo'], priority: 'normal', ...overrides });

test('Copy all exposes only protocol boards and inbox', () => {
  const state = stateWithInbox();
  state.comments.secret = { id: 'secret', itemId: 'existing', body: 'private', authorName: 'Sami', createdAt: 1 };
  const payload = createNotebookInboxCopyPayload(state);
  assert.deepEqual(Object.keys(payload), ['protocolVersion', 'boards', 'inbox']);
  assert.deepEqual(payload.boards.map((entry) => Object.keys(entry)), [['id', 'title', 'kind'], ['id', 'title', 'kind']]);
  assert.equal(JSON.stringify(payload).includes('private'), false);
});

test('Copy all ChatGPT prompt requires live IMDb lookup and allows unique Board titles', () => {
  const state = stateWithInbox();
  state.inbox.a.text = '看 The Godfather';
  const prompt = createNotebookInboxChatPrompt(state, '2026-08-22');
  assert.match(prompt, /联网查找并核实对应作品的 IMDb 页面/);
  assert.match(prompt, /必须把当前 IMDb 评分填入 imdbRating/);
  assert.match(prompt, /myRating 只在 Inbox 原文明示/);
  assert.match(prompt, /只返回纯 JSON/);
  assert.match(prompt, /唯一的精确 Board 标题/);
  assert.match(prompt, /电影 — movies — kind=media/);
  assert.match(prompt, /看 The Godfather/);
  assert.match(prompt, /2026-08-22/);
  assert.equal(prompt.includes('createdAt'), false);
});

test('valid patch applies atomically, deletes only referenced tickets, and preserves patch order at section top', () => {
  const state = stateWithInbox();
  const value = patch([patchItem('a'), patchItem('b'), patchItem('c', { boardIds: ['movies'], platform: 'Max', imdbRating: 8.1, myRating: 9 })]);
  const validation = validateNotebookPatch(value, state);
  assert.equal(validation.ok, true);
  const ids = prepareNotebookPatchItemIds(validation.patch, (() => { let n = 0; return () => `new-${++n}`; })());
  const next = applyNotebookPatch(state, validation.patch, ids, 100);
  assert.deepEqual(Object.keys(next.inbox), []);
  assert.deepEqual(Object.entries(next.memberships.todo).sort((a, b) => a[1].order - b[1].order).map(([id]) => id), ['new-1', 'new-2', 'existing']);
  assert.equal(next.items['new-3'].myRating, 9);
  assert.equal(next.items['new-3'].platform, 'Max');
});

test('direct item patch creates items without requiring or deleting Inbox tickets', () => {
  const state = stateWithInbox();
  const value = patch([{ title: 'Direct movie', details: '', boardIds: ['电影'], priority: 'normal', platform: 'Paramount+', imdbRating: 7.6 }]);
  const validation = validateNotebookPatch(value, state);
  assert.equal(validation.ok, true);
  assert.deepEqual(validation.patch.items[0].boardIds, ['movies']);
  const preview = createNotebookPatchPreview(validation.patch, state);
  assert.equal(preview.itemCount, 1);
  assert.equal(preview.ticketCount, 0);
  const ids = prepareNotebookPatchItemIds(validation.patch, () => 'direct-1');
  const next = applyNotebookPatch(state, validation.patch, ids, 100);
  assert.deepEqual(Object.keys(next.inbox).sort(), ['a', 'b', 'c']);
  assert.equal(next.items['direct-1'].title, 'Direct movie');
  assert.equal(next.items['direct-1'].platform, 'Paramount+');
  assert.equal(next.items['direct-1'].imdbRating, 7.6);
  assert.equal(next.memberships.movies['direct-1'].order, 0);
});

test('Board references resolve exact IDs first and otherwise require a unique exact title', () => {
  const state = stateWithInbox();
  state.boards.other = board('other', 'task', 2, 'movies');
  const byId = validateNotebookPatch(patch([{ title: 'By ID', details: '', boardIds: ['movies'], priority: 'normal' }]), state);
  assert.equal(byId.ok, true);
  assert.deepEqual(byId.patch.items[0].boardIds, ['movies']);

  const byTitle = validateNotebookPatch(patch([{ title: 'By title', details: '', boardIds: ['开干'], priority: 'normal' }]), state);
  assert.equal(byTitle.ok, true);
  assert.deepEqual(byTitle.patch.items[0].boardIds, ['todo']);

  state.boards.todo2 = board('todo2', 'task', 3, '开干');
  const ambiguous = validateNotebookPatch(patch([{ title: 'Ambiguous', details: '', boardIds: ['开干'], priority: 'normal' }]), state);
  assert.equal(ambiguous.ok, false);
  assert.match(ambiguous.error, /Board 名称不唯一：开干/);
});

test('Board references reject unknown names and duplicate aliases for the same Board', () => {
  const state = stateWithInbox();
  const unknown = validateNotebookPatch(patch([{ title: 'Unknown', details: '', boardIds: ['不存在'], priority: 'normal' }]), state);
  assert.equal(unknown.ok, false);
  assert.match(unknown.error, /Board 不存在：不存在/);
  const duplicateAlias = validateNotebookPatch(patch([{ title: 'Duplicate', details: '', boardIds: ['movies', '电影'], priority: 'normal' }]), state);
  assert.equal(duplicateAlias.ok, false);
  assert.match(duplicateAlias.error, /不同引用指向同一个 Board/);
});

test('unreferenced Inbox tickets remain untouched', () => {
  const state = stateWithInbox();
  const value = patch([patchItem('a')]);
  const result = validateNotebookPatch(value, state);
  assert.equal(result.ok, true);
  const next = applyNotebookPatch(state, result.patch, { a: 'new-a' }, 100);
  assert.deepEqual(Object.keys(next.inbox).sort(), ['b', 'c']);
});

test('patch validation rejects duplicate tickets, unknown boards, invalid date/time, recurrence and ratings', () => {
  const state = stateWithInbox();
  assert.equal(validateNotebookPatch(patch([patchItem('a'), patchItem('a')]), state).ok, false);
  assert.equal(validateNotebookPatch(patch([patchItem('a', { boardIds: ['missing'] })]), state).ok, false);
  assert.equal(validateNotebookPatch(patch([patchItem('a', { dueDate: '2026-02-30' })]), state).ok, false);
  assert.equal(validateNotebookPatch(patch([patchItem('a', { dueTime: '09:00' })]), state).ok, false);
  assert.equal(validateNotebookPatch(patch([patchItem('a', { recurrence: { unit: 'week', interval: 2 } })]), state).ok, false);
  assert.equal(validateNotebookPatch(patch([patchItem('a', { boardIds: ['movies'], imdbRating: 11 })]), state).ok, false);
  assert.equal(validateNotebookPatch(patch([patchItem('a', { boardIds: ['movies'], myRating: -1 })]), state).ok, false);
});

test('media fields require a media board and myRating is accepted for media items', () => {
  const state = stateWithInbox();
  assert.equal(validateNotebookPatch(patch([patchItem('a', { myRating: 8 })]), state).ok, false);
  const accepted = validateNotebookPatch(patch([patchItem('a', { boardIds: ['电影'], myRating: 8 })]), state);
  assert.equal(accepted.ok, true);
  assert.equal(accepted.patch.items[0].myRating, 8);
  assert.deepEqual(accepted.patch.items[0].boardIds, ['movies']);
});

test('parser rejects malformed JSON and unknown fields', () => {
  const state = stateWithInbox();
  assert.equal(parseNotebookPatchJson('{', state).ok, false);
  assert.equal(validateNotebookPatch({ ...patch([patchItem('a')]), arbitrary: true }, state).ok, false);
  assert.equal(validateNotebookPatch(patch([{ ...patchItem('a'), arbitrary: true }]), state).ok, false);
});

test('failed apply leaves the caller state unchanged', () => {
  const state = stateWithInbox();
  const before = structuredClone(state);
  assert.throws(() => applyNotebookPatch(state, patch([patchItem('missing')]), { missing: 'new' }, 100));
  assert.deepEqual(state, before);
});

test('export contains complete notebook business state and no identity/config envelope', () => {
  const state = stateWithInbox();
  state.comments.c1 = { id: 'c1', itemId: 'existing', body: 'note', authorName: 'Sami', createdAt: 12 };
  state.completionEvents.e1 = { id: 'e1', itemId: 'existing', completedAt: 13, priority: 'normal', boardIds: ['todo'] };
  const exported = createNotebookExport(state, 999);
  assert.deepEqual(Object.keys(exported), ['schemaVersion', 'exportedAt', 'boards', 'items', 'memberships', 'comments', 'completionEvents', 'inbox', 'settings']);
  const text = serializeNotebookExport(state, 999);
  assert.equal(text.includes('email'), false);
  assert.equal(text.includes('uid'), false);
  assert.equal(text.includes('firebase'), false);
  assert.equal(JSON.parse(text).comments.c1.body, 'note');
});
