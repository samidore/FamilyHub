import assert from 'node:assert/strict';
import test from 'node:test';
import { defaultNotebookState } from '../src/lib/notebookDomain.ts';
import {
  applyNotebookItemUpdatePatch,
  createNotebookItemUpdatePreview,
  parseNotebookItemUpdatePatchJson,
  validateNotebookItemUpdatePatch,
} from '../src/lib/notebookItemUpdatePatch.ts';

const board = (id, kind, order) => ({ id, title: id, kind, visible: true, collapsed: false, order, createdAt: order + 1, updatedAt: order + 1 });
const item = (id, title = id) => ({ id, title, details: '', priority: 'normal', status: 'active', createdAt: 1, updatedAt: 1 });

function stateWithMedia() {
  const state = defaultNotebookState();
  state.boards = { todo: board('todo', 'task', 0), movies: board('movies', 'media', 1) };
  state.items.movie = item('movie', 'Movie');
  state.items.task = item('task', 'Task');
  state.memberships.movies = { movie: { order: 0 } };
  state.memberships.todo = { task: { order: 0 } };
  return state;
}

const patch = (itemUpdates) => ({ patchVersion: 1, itemUpdates });

test('existing media item safe fields update without changing lifecycle or membership', () => {
  const state = stateWithMedia();
  const value = patch([{ itemId: 'movie', details: 'Plot', platform: 'Max', imdbRating: 8.5, myRating: 9, notes: 'note', review: 'review' }]);
  const result = validateNotebookItemUpdatePatch(value, state);
  assert.equal(result.ok, true);
  const next = applyNotebookItemUpdatePatch(state, result.patch, 100);
  assert.equal(next.items.movie.details, 'Plot');
  assert.equal(next.items.movie.platform, 'Max');
  assert.equal(next.items.movie.imdbRating, 8.5);
  assert.equal(next.items.movie.myRating, 9);
  assert.equal(next.items.movie.notes, 'note');
  assert.equal(next.items.movie.review, 'review');
  assert.equal(next.items.movie.status, 'active');
  assert.equal(next.items.movie.priority, 'normal');
  assert.deepEqual(next.memberships, state.memberships);
  assert.equal(state.items.movie.platform, undefined);
});

test('empty optional strings clear existing media text fields while details can be cleared', () => {
  const state = stateWithMedia();
  state.items.movie = { ...state.items.movie, details: 'old', platform: 'Max', notes: 'old', review: 'old' };
  const result = validateNotebookItemUpdatePatch(patch([{ itemId: 'movie', details: '', platform: '', notes: '', review: '' }]), state);
  assert.equal(result.ok, true);
  const next = applyNotebookItemUpdatePatch(state, result.patch, 100);
  assert.equal(next.items.movie.details, '');
  assert.equal(next.items.movie.platform, undefined);
  assert.equal(next.items.movie.notes, undefined);
  assert.equal(next.items.movie.review, undefined);
});

test('validation rejects unknown, duplicate, unsafe, non-media and malformed updates', () => {
  const state = stateWithMedia();
  assert.equal(validateNotebookItemUpdatePatch(patch([{ itemId: 'missing', details: 'x' }]), state).ok, false);
  assert.equal(validateNotebookItemUpdatePatch(patch([{ itemId: 'movie', details: 'a' }, { itemId: 'movie', details: 'b' }]), state).ok, false);
  assert.equal(validateNotebookItemUpdatePatch(patch([{ itemId: 'movie', status: 'completed' }]), state).ok, false);
  assert.equal(validateNotebookItemUpdatePatch(patch([{ itemId: 'task', platform: 'Max' }]), state).ok, false);
  assert.equal(validateNotebookItemUpdatePatch(patch([{ itemId: 'movie', imdbRating: 11 }]), state).ok, false);
  assert.equal(validateNotebookItemUpdatePatch(patch([{ itemId: 'movie' }]), state).ok, false);
});

test('apply revalidates current state and leaves caller unchanged on failure', () => {
  const state = stateWithMedia();
  const before = structuredClone(state);
  assert.throws(() => applyNotebookItemUpdatePatch(state, patch([{ itemId: 'task', platform: 'Max' }]), 100));
  assert.deepEqual(state, before);
});

test('preview names the exact existing items and parser rejects malformed JSON', () => {
  const state = stateWithMedia();
  const result = validateNotebookItemUpdatePatch(patch([{ itemId: 'movie', details: 'Plot' }]), state);
  assert.equal(result.ok, true);
  assert.deepEqual(createNotebookItemUpdatePreview(result.patch, state), { updateCount: 1, items: [{ itemId: 'movie', title: 'Movie' }] });
  assert.equal(parseNotebookItemUpdatePatchJson('{', state).ok, false);
});
