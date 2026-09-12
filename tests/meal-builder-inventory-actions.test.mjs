import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { discardStock, reconcileInventoryBatchState, toggleInventoryItem, undoDiscard } from '../src/lib/household.ts';

const ingredients = [
  { id: 'zongzi', inventoryTracking: 'presence-only' },
  { id: 'tofu', inventoryTracking: 'counted', inventoryFreshness: 'fifo' },
];

test('presence-only inventory action toggles existing stock off', () => {
  assert.deepEqual(toggleInventoryItem({ zongzi: true }, 'zongzi', 'presence-only'), {});
  assert.deepEqual(toggleInventoryItem({}, 'zongzi', 'presence-only'), { zongzi: true });
});

test('FIFO discard survives repository batch reconciliation and undo restores the batch', () => {
  const previous = {
    inventory: { tofu: 1 },
    inventoryBatches: { tofu: { '2026-09-11': 1 } },
    freezerInventory: {}, thawingItems: {}, discardedStock: {}, currentMeal: null,
    pendingCheckoutMeals: [], activeStep: 'inventory', recentMeals: [],
  };
  const discarded = discardStock(previous, 'tofu', 'inventory', 1000, '2026-09-11', ingredients);
  const reconciled = reconcileInventoryBatchState(previous, discarded, ingredients, '2026-09-11');
  assert.deepEqual(reconciled.inventory, {});
  assert.deepEqual(reconciled.inventoryBatches, {});
  const recordId = Object.keys(reconciled.discardedStock)[0];
  assert.ok(recordId);
  assert.deepEqual(reconciled.discardedStock[recordId], {
    ingredientId: 'tofu', storage: 'inventory', quantity: 1, batchKey: '2026-09-11', discardedAt: 1000, undoUntil: 301000,
  });
  const restored = undoDiscard(reconciled, recordId, 1001, ingredients);
  assert.equal(restored.inventory.tofu, 1);
  assert.deepEqual(restored.inventoryBatches.tofu, { '2026-09-11': 1 });
  assert.deepEqual(restored.discardedStock, {});
});

test('Meal Builder presence-only click path uses toggleInventoryItem', async () => {
  const source = await readFile('src/pages/meal-builder.astro', 'utf8');
  assert.match(source, /else if \(toggle\).*toggleInventoryItem\(state\.inventory, id, item\.inventoryTracking\)/s);
});
