import assert from 'node:assert/strict';
import test from 'node:test';
import { completeThaw, normalizeHouseholdState, reconcileDueThawing, startThaw, THAW_DURATION_MS } from '../src/lib/household.ts';

const ingredients = [{ id: 'chicken-thighs', inventoryTracking: 'counted', inventoryFreshness: 'fifo', freezerBehavior: 'thaw-required' }, { id: 'steamed-buns', inventoryTracking: 'presence-only', freezerBehavior: 'direct' }];

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
