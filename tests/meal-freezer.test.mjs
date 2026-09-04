import assert from 'node:assert/strict';
import test from 'node:test';
import { adjustFrozenAggregate, adjustInventoryBatch, cancelThaw, completeThaw, discardStock, normalizeDiscardedStock, normalizeHouseholdState, reconcileDueThawing, startThaw, undoDiscard, STOCK_UNDO_WINDOW_MS, THAW_DURATION_MS } from '../src/lib/household.ts';

const ingredients = [{ id: 'chicken-thighs', inventoryTracking: 'counted', inventoryFreshness: 'fifo', freezerBehavior: 'thaw-required' }, { id: 'frozen-patties', inventoryTracking: 'counted', freezerBehavior: 'direct' }, { id: 'steamed-buns', inventoryTracking: 'presence-only', freezerBehavior: 'direct' }];

test('refrigerated batch +/- changes only the selected date and aggregate', () => {
  const state = normalizeHouseholdState({ inventory: { 'chicken-thighs': 2 }, inventoryBatches: { 'chicken-thighs': { '2026-08-20': 1, '2026-08-21': 1 } } }, ingredients);
  const minus = adjustInventoryBatch(state, 'chicken-thighs', '2026-08-21', -0.5, ingredients);
  assert.deepEqual(minus.inventoryBatches['chicken-thighs'], { '2026-08-20': 1, '2026-08-21': 0.5 }); assert.equal(minus.inventory['chicken-thighs'], 1.5);
  const plus = adjustInventoryBatch(minus, 'chicken-thighs', '2026-08-20', 0.5, ingredients);
  assert.deepEqual(plus.inventoryBatches['chicken-thighs'], { '2026-08-20': 1.5, '2026-08-21': 0.5 });
});

test('frozen +/- is aggregate-only for direct and thaw-required stock', () => {
  const state = normalizeHouseholdState({ inventory: { 'frozen-patties': 1 }, freezerInventory: { 'chicken-thighs': 1 } }, ingredients);
  const direct = adjustFrozenAggregate(state, 'frozen-patties', -0.5, ingredients);
  const thaw = adjustFrozenAggregate(direct, 'chicken-thighs', 0.5, ingredients);
  assert.equal(direct.inventory['frozen-patties'], 0.5); assert.equal(thaw.freezerInventory['chicken-thighs'], 1.5); assert.equal(thaw.freezerBatches, undefined);
});

test('freezer reserve starts a half-unit thaw atomically and completes once', () => {
  const initial = normalizeHouseholdState({ freezerInventory: { 'chicken-thighs': 0.5 }, inventory: {} }, ingredients);
  const started = startThaw(initial, 'chicken-thighs', ingredients, 1000, 'job-1');
  assert.equal(started.freezerInventory['chicken-thighs'], undefined);
  assert.deepEqual(started.thawingItems['job-1'], { ingredientId: 'chicken-thighs', quantity: 0.5, startedAt: 1000, readyAt: 1000 + THAW_DURATION_MS });
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

test('discard normalization keeps the canonical mutually-exclusive shape', () => {
  const now = 1000;
  const valid = { good: { ingredientId: 'frozen-patties', storage: 'freezer', quantity: 0.5, discardedAt: now, undoUntil: now + STOCK_UNDO_WINDOW_MS } };
  assert.deepEqual(normalizeDiscardedStock(valid), valid);
  for (const invalid of [
    { ...valid.good, presence: true },
    { ...valid.good, undoUntil: now + 1 },
    { ...valid.good, extra: true },
    { ...valid.good, discardedAt: 0 },
  ]) assert.deepEqual(normalizeDiscardedStock({ invalid }), {});
});
