import assert from 'node:assert/strict';
import test from 'node:test';
import { defaultNotebookState, normalizeNotebookState } from '../src/lib/notebookDomain.ts';
import { setNotebookItemStatus } from '../src/lib/notebookActions.ts';
import {
  cancelNotebookPresetInstance,
  deleteNotebookPreset,
  notebookActivePresetItem,
  publishNotebookPreset,
  restoreNotebookItemWithPresetGuard,
  upsertNotebookPreset,
} from '../src/lib/notebookPresets.ts';

const board = (id, kind = 'task') => ({ id, title: id, kind, visible: true, collapsed: false, order: 0, createdAt: 1, updatedAt: 1 });
const preset = (id = 'p1') => ({ id, title: '倒垃圾', details: '门口垃圾桶', priority: 'normal', boardIds: ['tasks'], createdAt: 10, updatedAt: 10 });

function baseState() {
  const state = defaultNotebookState();
  state.boards = { tasks: board('tasks'), media: board('media', 'media') };
  return state;
}

test('preset state and sourcePresetId survive normalization', () => {
  const raw = baseState();
  raw.presets.p1 = preset();
  raw.items.i1 = { id: 'i1', title: '倒垃圾', details: '', priority: 'normal', status: 'active', sourcePresetId: 'p1', createdAt: 20, updatedAt: 20 };
  raw.memberships.tasks = { i1: { order: 0 } };
  const state = normalizeNotebookState(raw);
  assert.equal(state.presets.p1.title, '倒垃圾');
  assert.equal(state.items.i1.sourcePresetId, 'p1');
});

test('saving presets keeps only task board destinations', () => {
  const state = upsertNotebookPreset(baseState(), { ...preset(), boardIds: ['tasks', 'media'] });
  assert.deepEqual(state.presets.p1.boardIds, ['tasks']);
});

test('publishing creates one normal item and blocks a second active instance', () => {
  let state = upsertNotebookPreset(baseState(), preset());
  state = publishNotebookPreset(state, 'p1', 'i1', 20);
  assert.equal(state.items.i1.sourcePresetId, 'p1');
  assert.equal(state.items.i1.status, 'active');
  assert.ok(state.memberships.tasks.i1);
  state = publishNotebookPreset(state, 'p1', 'i2', 21);
  assert.equal(state.items.i2, undefined);
  assert.equal(notebookActivePresetItem(state, 'p1')?.id, 'i1');
});

test('published item is a snapshot and later preset edits do not rewrite it', () => {
  let state = upsertNotebookPreset(baseState(), preset());
  state = publishNotebookPreset(state, 'p1', 'i1', 20);
  state = upsertNotebookPreset(state, { ...preset(), title: '倒厨余', updatedAt: 30 });
  assert.equal(state.presets.p1.title, '倒厨余');
  assert.equal(state.items.i1.title, '倒垃圾');
});

test('completion unlocks a preset and undo within grace locks it again when no newer instance exists', () => {
  let state = upsertNotebookPreset(baseState(), preset());
  state = publishNotebookPreset(state, 'p1', 'i1', 20);
  state = setNotebookItemStatus(state, 'i1', 'completed', 30);
  assert.equal(notebookActivePresetItem(state, 'p1'), null);
  state = restoreNotebookItemWithPresetGuard(state, 'i1', 31);
  assert.equal(notebookActivePresetItem(state, 'p1')?.id, 'i1');
  state = publishNotebookPreset(state, 'p1', 'i2', 32);
  assert.equal(state.items.i2, undefined);
});

test('undo cannot create a second active instance after the preset has been published again', () => {
  let state = upsertNotebookPreset(baseState(), preset());
  state = publishNotebookPreset(state, 'p1', 'i1', 20);
  state = setNotebookItemStatus(state, 'i1', 'completed', 30);
  state = publishNotebookPreset(state, 'p1', 'i2', 31);
  assert.equal(notebookActivePresetItem(state, 'p1')?.id, 'i2');
  state = restoreNotebookItemWithPresetGuard(state, 'i1', 32);
  assert.equal(state.items.i1.status, 'completed');
  assert.equal(notebookActivePresetItem(state, 'p1')?.id, 'i2');
});

test('cancel deletes only the current active instance and preset deletion leaves published items alone', () => {
  let state = upsertNotebookPreset(baseState(), preset());
  state = publishNotebookPreset(state, 'p1', 'i1', 20);
  state.comments.c1 = { id: 'c1', itemId: 'i1', body: 'x', authorName: '猫猫', createdAt: 21 };
  state = cancelNotebookPresetInstance(state, 'p1');
  assert.equal(state.items.i1, undefined);
  assert.equal(state.comments.c1, undefined);
  assert.ok(state.presets.p1);

  state = publishNotebookPreset(state, 'p1', 'i2', 30);
  state = deleteNotebookPreset(state, 'p1');
  assert.equal(state.presets.p1, undefined);
  assert.equal(state.items.i2.sourcePresetId, 'p1');
});
