import assert from 'node:assert/strict';
import test from 'node:test';
import {
  adjustInventoryItem,
  applyCheckout,
  createCurrentMealFromInventory,
  defaultCheckoutConsumption,
  normalizeHouseholdState,
  resetRecipeSelection,
  setCurrentMealStatus,
  toggleInventoryItem,
} from '../src/lib/household.ts';
import { LocalHouseholdRepository, createHouseholdRepository } from '../src/lib/householdRepository.ts';

const ingredients = [
  { id: 'pork', inventoryTracking: 'counted' },
  { id: 'eggs', inventoryTracking: 'presence-only' },
];

test('counted inventory uses half steps and turns off at zero', () => {
  let inventory = {};
  inventory = toggleInventoryItem(inventory, 'pork', 'counted');
  assert.deepEqual(inventory, { pork: 1 });
  inventory = adjustInventoryItem(inventory, 'pork', 0.5, 'counted');
  assert.equal(inventory.pork, 1.5);
  inventory = adjustInventoryItem(inventory, 'pork', -1.5, 'counted');
  assert.deepEqual(inventory, {});
});

test('presence-only inventory stores only true', () => {
  let inventory = toggleInventoryItem({}, 'eggs', 'presence-only');
  assert.deepEqual(inventory, { eggs: true });
  inventory = adjustInventoryItem(inventory, 'eggs', -0.5, 'presence-only');
  assert.deepEqual(inventory, {});
});

test('current meal copies inventory once and recipe reset keeps availability', () => {
  const meal = createCurrentMealFromInventory({ pork: 1, eggs: true }, { mealId: 'meal-1' }, ingredients);
  assert.deepEqual(meal.availableIngredientIds, ['eggs', 'pork']);
  const changed = resetRecipeSelection({ ...meal, selectedRecipeIds: ['r1'], recipeIngredientBindings: { r1: ['pork'] }, selectedAddons: [{ mainRecipeId: 'r1', addonType: 'a', ingredientId: 'eggs' }], status: 'ready' });
  assert.deepEqual(changed.availableIngredientIds, meal.availableIngredientIds);
  assert.deepEqual(changed.selectedRecipeIds, []);
  assert.equal(changed.status, 'selecting');
});

test('Realtime Database round-trip restores omitted empty collections and safe scalar defaults', () => {
  const normalized = normalizeHouseholdState({
    inventory: { pork: 1 },
    currentMeal: { mealId: 'meal-1', status: 'bad-status', proteinTarget: 99, vegetableTarget: 0, selectedRecipeIds: undefined },
  }, ingredients);
  assert.deepEqual(normalized.currentMeal?.availableIngredientIds, []);
  assert.deepEqual(normalized.currentMeal?.selectedRecipeIds, []);
  assert.deepEqual(normalized.currentMeal?.recipeIngredientBindings, {});
  assert.deepEqual(normalized.currentMeal?.selectedAddons, []);
  assert.equal(normalized.currentMeal?.status, 'selecting');
  assert.equal(normalized.currentMeal?.proteinTarget, 1);
  assert.equal(normalized.currentMeal?.vegetableTarget, 2);
});

test('current-meal status transitions are transaction-safe and reject stale jumps', () => {
  const meal = createCurrentMealFromInventory({ pork: 1 }, { mealId: 'meal-status' }, ingredients);
  assert.equal(setCurrentMealStatus(meal, 'cooking').status, 'selecting');
  const ready = setCurrentMealStatus(meal, 'ready');
  assert.equal(ready.status, 'ready');
  assert.equal(setCurrentMealStatus(ready, 'selecting').status, 'selecting');
  const cooking = setCurrentMealStatus(ready, 'cooking');
  assert.equal(cooking.status, 'cooking');
  assert.equal(setCurrentMealStatus(cooking, 'ready').status, 'cooking');
  assert.equal(setCurrentMealStatus(cooking, 'selecting').status, 'cooking');
});

test('inventory normalization keeps only known KB ingredient IDs', () => {
  const normalized = normalizeHouseholdState({ inventory: { pork: 1, eggs: true, unknown: 2 } }, ingredients);
  assert.deepEqual(normalized.inventory, { pork: 1, eggs: true });
});

test('partial Firebase configuration is an error and all-empty configuration stays local', async () => {
  const partial = createHouseholdRepository({ apiKey: 'public-key' }, { ingredients, broadcast: false });
  assert.equal(partial.kind, 'firebase');
  assert.equal(partial.getStatus().connection, 'error');
  await assert.rejects(partial.updateInventory((inventory) => ({ ...inventory, pork: 1 })));
  partial.dispose();

  const local = createHouseholdRepository({}, { ingredients, broadcast: false });
  assert.equal(local.kind, 'local');
  assert.equal(local.getStatus().connection, 'local');
  await local.updateInventory((inventory) => ({ ...inventory, pork: 1 }));
  assert.equal(local.getSnapshot().inventory.pork, 1);
  local.dispose();
});

test('starting a current meal is conditional and never overwrites an existing meal', async () => {
  const storage = new Map();
  const storageAdapter = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key) };
  const first = new LocalHouseholdRepository('start-race', { storage: storageAdapter, broadcast: false, ingredients });
  const second = new LocalHouseholdRepository('start-race', { storage: storageAdapter, broadcast: false, ingredients });
  await first.setInventory({ pork: 1 });
  const [a, b] = await Promise.all([first.startCurrentMeal(), second.startCurrentMeal()]);
  assert.equal(a.currentMeal?.mealId, b.currentMeal?.mealId);
  assert.equal(first.getSnapshot().currentMeal?.mealId, second.getSnapshot().currentMeal?.mealId);
  first.dispose(); second.dispose();
});

test('checkout is stale-safe and consumes counted/presence-only values once', () => {
  const meal = createCurrentMealFromInventory({ pork: 1, eggs: true }, { mealId: 'meal-1' }, ingredients);
  const cooking = { ...meal, status: 'cooking', recipeIngredientBindings: { r1: ['pork'] }, selectedRecipeIds: ['r1'], selectedAddons: [{ mainRecipeId: 'r1', addonType: 'a', ingredientId: 'eggs' }] };
  const state = { inventory: { pork: 1, eggs: true }, currentMeal: cooking };
  assert.deepEqual(defaultCheckoutConsumption(cooking, state.inventory, ingredients), { eggs: false, pork: 1 });
  const first = applyCheckout(state, 'meal-1', { eggs: true, pork: 0.5 }, ingredients);
  assert.equal(first.committed, true);
  assert.deepEqual(first.state, { inventory: { pork: 0.5 }, currentMeal: null });
  const second = applyCheckout(first.state, 'meal-1', { pork: 0.5 }, ingredients);
  assert.equal(second.committed, false);
  assert.equal(second.reason, 'stale-meal');
});
