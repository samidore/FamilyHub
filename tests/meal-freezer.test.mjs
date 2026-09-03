import assert from 'node:assert/strict';
import test from 'node:test';
import { cancelThaw, completeThaw, discardStock, normalizeDiscardedStock, normalizeHouseholdState, reconcileDueThawing, startThaw, undoDiscard, STOCK_UNDO_WINDOW_MS, THAW_DURATION_MS } from '../src/lib/household.ts';

const ingredients = [{ id: 'chicken-thighs', inventoryTracking: 'counted', inventoryFreshness: 'fifo', freezerBehavior: 'thaw-required' }, { id: 'frozen-patties', inventoryTracking: 'counted', freezerBehavior: 'direct' }, { id: 'steamed-buns', inventoryTracking: 'presence-only', freezerBehavior: 'direct' }];

test('freezer reserve starts a half-unit thaw atomically and completes once', () => {
  const initial = normalizeHouseholdState({ freezerInventory: { 'chicken-thighs': 0.5 }, inventory: {} }, ingredients);
  const started = startThaw(initial, 'chicken-thighs', ingredients, 1000, 'job-1');
  assert.equal(started.freezerInventory['chicken-thighs'], undefined);
  assert.deepEqual(started.thawingItems['job-1'], { ingredientId: 'chicken-thighs', quantity: 0.5, startedAt: 1000, readyAt: 1000 + THAW_DURATION_MS, sourceBatchKey: 'unknown' });
  const completed = completeThaw(started, 'job-1', 2000, ingredients);
  assert.equal(completed.inventory['chicken-thighs'], 0.5);
  assert.equal(completed.thawingItems['job-1'], undefined);
  assert.deepEqual(completeThaw(completed, 'job-1', 3000, ingredients), completed);
});

test('due thaw reconciliation is idempotent and uses readyAt for FIFO date', () => {
  const startedAt = Date.UTC(2026, 7, 20); const readyAt = startedAt + THAW_DURATION_MS;
  const state = normalizeHouseholdState({ thawingItems: { job: { ingredientId: 'chicken-thighs', quantity: 1, startedAt, readyAt } } }, ingredients);
  const promoted = reconcileDueThawing(state, Date.UTC(2026, 7, 25), ingredients);
  assert.equal(promoted.inventory['chicken-thighs'], 1);
  assert.deepEqual(promoted.inventoryBatches['chicken-thighs'], { '2026-08-21': 1 });
  assert.deepEqual(reconcileDueThawing(promoted, Date.UTC(2026, 7, 25), ingredients), promoted);
});

test('direct freezer ingredients use ordinary inventory and never freezer reserve', () => {
  const state = normalizeHouseholdState({ inventory: { 'steamed-buns': true }, freezerInventory: { 'steamed-buns': true } }, ingredients);
  assert.equal(state.inventory['steamed-buns'], true);
  assert.equal(state.freezerInventory['steamed-buns'], undefined);
});

test('manual thaw completion transfers one unit at a time with FIFO dates', () => {
  const started = normalizeHouseholdState({ thawingItems: { job: { ingredientId: 'chicken-thighs', quantity: 2, startedAt: 1000, readyAt: 1000 + THAW_DURATION_MS } } }, ingredients);
  const first = completeThaw(started, 'job', Date.UTC(2026, 7, 20, 12), ingredients, 1);
  assert.equal(first.inventory['chicken-thighs'], 1);
  assert.equal(first.thawingItems.job.quantity, 1);
  assert.deepEqual(first.inventoryBatches['chicken-thighs'], { '2026-08-20': 1 });
  const second = completeThaw(first, 'job', Date.UTC(2026, 7, 21, 12), ingredients, 1);
  assert.equal(second.thawingItems.job, undefined);
  assert.equal(second.inventory['chicken-thighs'], 2);
  assert.deepEqual(second.inventoryBatches['chicken-thighs'], { '2026-08-20': 1, '2026-08-21': 1 });
});

test('manual half-unit thaw completion removes the job', () => {
  const started = normalizeHouseholdState({ thawingItems: { job: { ingredientId: 'chicken-thighs', quantity: 0.5, startedAt: 1000, readyAt: 1000 + THAW_DURATION_MS } } }, ingredients);
  const completed = completeThaw(started, 'job', 2000, ingredients, 1);
  assert.equal(completed.inventory['chicken-thighs'], 0.5);
  assert.equal(completed.thawingItems.job, undefined);
});

test('batch-specific thaw removes only the selected later batch and cancel restores it', () => {
  const initial = normalizeHouseholdState({ freezerInventory: { 'chicken-thighs': 2 }, freezerBatches: { 'chicken-thighs': { '2026-08-01': 1, '2026-08-20': 1 } } }, ingredients);
  const started = startThaw(initial, 'chicken-thighs', ingredients, 1000, 'later', '2026-08-20');
  assert.deepEqual(started.freezerBatches['chicken-thighs'], { '2026-08-01': 1 });
  assert.equal(started.thawingItems.later.sourceBatchKey, '2026-08-20');
  const cancelled = cancelThaw(started, 'later');
  assert.deepEqual(cancelled.freezerBatches['chicken-thighs'], { '2026-08-01': 1, '2026-08-20': 1 });
});

test('batch-specific partial thaw completes without touching an earlier batch', () => {
  const initial = normalizeHouseholdState({ freezerInventory: { 'chicken-thighs': 1.5 }, freezerBatches: { 'chicken-thighs': { '2026-08-01': 1, '2026-08-20': 0.5 } } }, ingredients);
  const started = startThaw(initial, 'chicken-thighs', ingredients, 1000, 'partial', '2026-08-20');
  const completed = completeThaw(started, 'partial', 1000, ingredients, 0.5);
  assert.deepEqual(completed.freezerBatches['chicken-thighs'], { '2026-08-01': 1 });
  assert.equal(completed.inventory['chicken-thighs'], 0.5);
});

test('direct frozen discard undo restores the original freezer batch and ordinary aggregate', () => {
  const initial = normalizeHouseholdState({ inventory: { 'frozen-patties': 1 }, freezerBatches: { 'frozen-patties': { '2026-08-20': 1 } } }, ingredients);
  const discarded = discardStock(initial, 'frozen-patties', 'freezer', 1000, '2026-08-20', ingredients);
  const recordId = Object.keys(discarded.discardedStock)[0];
  assert.equal(discarded.inventory['frozen-patties'], undefined);
  const restored = undoDiscard(discarded, recordId, 1001, ingredients);
  assert.equal(restored.inventory['frozen-patties'], 1);
  assert.deepEqual(restored.freezerBatches['frozen-patties'], { '2026-08-20': 1 });
});

test('discard normalization keeps the canonical mutually-exclusive shape', () => {
  const now = 1000;
  const valid = { good: { ingredientId: 'frozen-patties', storage: 'freezer', quantity: 0.5, batchKey: 'unknown', discardedAt: now, undoUntil: now + STOCK_UNDO_WINDOW_MS } };
  assert.deepEqual(normalizeDiscardedStock(valid), valid);
  for (const invalid of [
    { ...valid.good, presence: true },
    { ...valid.good, batchKey: '2026-8-8' },
    { ...valid.good, undoUntil: now + 1 },
    { ...valid.good, extra: true },
    { ...valid.good, discardedAt: 0 },
  ]) assert.deepEqual(normalizeDiscardedStock({ invalid }), {});
});
