import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  adjustInventoryItem,
  applyCheckout,
  createCurrentMealFromInventory,
  defaultCheckoutConsumption,
  checkoutDraftForMeal,
  normalizeHouseholdState,
  resetRecipeSelection,
  setCurrentMealStatus,
  toggleInventoryItem,
  updateCheckoutDraft,
  usedIngredientIds,
} from '../src/lib/household.ts';
import { LocalHouseholdRepository, createHouseholdRepository, googleIdentity, shouldUseRedirectFallback } from '../src/lib/householdRepository.ts';

const ingredients = [
  { id: 'pork', inventoryTracking: 'counted' },
  { id: 'eggs', inventoryTracking: 'presence-only' },
  { id: 'potato', inventoryTracking: 'presence-only', tags: ['easy-braise-addon'] },
  { id: 'tofu', inventoryTracking: 'counted', tags: ['easy-braise-addon'] },
  { id: 'other', inventoryTracking: 'counted' },
];

test('authentication errors keep an appropriate recovery action visible', async () => {
  const page = await readFile('src/pages/meal-builder.astro', 'utf8');
  assert.match(page, /connection === 'error' && !repositoryStatus\.email/);
  assert.match(page, /connection === 'error' && Boolean\(repositoryStatus\.email\)/);
});

test('Google identity requires a verified Google provider and popup fallback is narrow', () => {
  const googleUser = { uid: 'uid-1', email: 'person@gmail.com', emailVerified: true, providerData: [{ providerId: 'google.com' }] };
  assert.deepEqual(googleIdentity(googleUser), { uid: 'uid-1', email: 'person@gmail.com' });
  assert.equal(googleIdentity({ ...googleUser, emailVerified: false }), null);
  assert.equal(googleIdentity({ ...googleUser, providerData: [{ providerId: 'password' }] }), null);
  assert.equal(shouldUseRedirectFallback({ code: 'auth/popup-blocked' }), true);
  assert.equal(shouldUseRedirectFallback({ code: 'auth/popup-closed-by-user' }), false);
});

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
  assert.equal(normalized.activeStep, 'inventory');
});

test('shared active step and checkout draft normalize legacy-safe values', () => {
  const meal = createCurrentMealFromInventory({ pork: 1, eggs: true }, { mealId: 'meal-draft' }, ingredients);
  const normalized = normalizeHouseholdState({ inventory: { pork: 1, eggs: true }, activeStep: 'checkout', currentMeal: { ...meal, excludedIngredientIds: ['pork', 'unknown'], checkoutDraft: { pork: 0, eggs: false, unknown: 1 } } }, ingredients);
  assert.equal(normalized.activeStep, 'checkout');
  assert.deepEqual(normalized.currentMeal?.excludedIngredientIds, ['pork']);
  assert.deepEqual(normalized.currentMeal?.checkoutDraft, { pork: 0, eggs: false });
  const draft = updateCheckoutDraft({ ...meal, recipeIngredientBindings: { r1: ['pork'] }, selectedRecipeIds: ['r1'], selectedAddons: [{ mainRecipeId: 'r1', addonType: 'a', ingredientId: 'eggs' }] }, { pork: 0.5, eggs: true }, { pork: 1, eggs: true }, ingredients);
  assert.deepEqual(checkoutDraftForMeal(draft, { pork: 1, eggs: true }, ingredients), { pork: 0.5 });
});

test('checkout defaults use declared units, fallback bindings, and cross-recipe sums', () => {
  const meal = { ...createCurrentMealFromInventory({ pork: 4, eggs: true }, { mealId: 'units' }, ingredients), selectedRecipeIds: ['declared', 'fallback-a', 'fallback-b'], recipeIngredientBindings: { declared: ['pork', 'eggs'], 'fallback-a': ['pork', 'eggs'], 'fallback-b': ['pork'] } };
  const recipes = [
    { id: 'declared', checkoutUnits: { pork: 1.5, unused: 8 }, requirements: [], contribution: { protein: 0, vegetable: 0, staple: 0 }, childCoverage: { protein: false, vegetable: false } },
    { id: 'fallback-a', requirements: [], contribution: { protein: 0, vegetable: 0, staple: 0 }, childCoverage: { protein: false, vegetable: false } },
    { id: 'fallback-b', requirements: [], contribution: { protein: 0, vegetable: 0, staple: 0 }, childCoverage: { protein: false, vegetable: false } },
  ];
  assert.deepEqual(defaultCheckoutConsumption(meal, { pork: 3, eggs: true }, ingredients, recipes), { pork: 3, eggs: false });
});

test('checkout ignores bindings retained for unknown or archived Recipes', () => {
  const recipes = [{ id: 'known', requirements: [], contribution: { protein: 0, vegetable: 0, staple: 0 }, childCoverage: { protein: false, vegetable: false } }];
  const meal = {
    ...createCurrentMealFromInventory({ pork: 2, other: 1 }, { mealId: 'reconciled-checkout' }, ingredients),
    status: 'cooking', selectedRecipeIds: ['known', 'archived-recipe'], recipeIngredientBindings: { known: ['pork'], 'archived-recipe': ['other'] },
  };
  const state = { inventory: { pork: 2, other: 1 }, currentMeal: meal, activeStep: 'checkout', recentMeals: [] };
  assert.deepEqual(usedIngredientIds(meal, recipes), ['pork']);
  assert.deepEqual(defaultCheckoutConsumption(meal, state.inventory, ingredients, recipes), { pork: 1 });
  assert.equal(applyCheckout(state, meal.mealId, { pork: 1 }, ingredients, { recipes, nextMealId: 'next', completedAt: 2 }).committed, true);
  assert.equal(applyCheckout(state, meal.mealId, { other: 1 }, ingredients, { recipes }).committed, false);
});

test('easy-braise checkout defaults to zero and atomically authorizes only eligible snapshot Ingredients', () => {
  const recipes = [{ id: 'braise', tags: ['iron-pan-braise'], requirements: [], contribution: { protein: 1, vegetable: 0, staple: 0 }, childCoverage: { protein: true, vegetable: false } }];
  const meal = {
    ...createCurrentMealFromInventory({ pork: 2, tofu: 2, potato: true, other: 1 }, { mealId: 'easy-braise' }, ingredients),
    status: 'cooking', selectedRecipeIds: ['braise'], recipeIngredientBindings: { braise: ['pork'] },
  };
  assert.deepEqual(defaultCheckoutConsumption(meal, { pork: 2, tofu: 2, potato: true, other: 1 }, ingredients, recipes), { pork: 1, tofu: 0, potato: false });

  const state = { inventory: { pork: 2, tofu: 2, potato: true, other: 1 }, currentMeal: meal, activeStep: 'checkout', recentMeals: [] };
  const rejected = applyCheckout(state, meal.mealId, { pork: 1, other: 1 }, ingredients, { recipes });
  assert.equal(rejected.committed, false);
  assert.deepEqual(rejected.state.inventory, state.inventory);

  const accepted = applyCheckout(state, meal.mealId, { pork: 1, tofu: 1.5, potato: true }, ingredients, { recipes, nextMealId: 'next', completedAt: 2 });
  assert.equal(accepted.committed, true);
  assert.deepEqual(accepted.state.inventory, { pork: 1, tofu: 0.5, other: 1 });
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
  const normalized = normalizeHouseholdState({ inventory: { pork: 1, eggs: true, potato: 1.5, unknown: 2 } }, ingredients);
  assert.deepEqual(normalized.inventory, { pork: 1, eggs: true, potato: true });
});

test('recent meal history normalizes newest-first and keeps only four valid meals', () => {
  const recentMeals = Array.from({ length: 6 }, (_, index) => ({ mealId: `meal-${index}`, completedAt: 100 - index, recipeIds: [`r${index}`] }));
  const normalized = normalizeHouseholdState({ recentMeals: [...recentMeals, { mealId: '', completedAt: 0, recipeIds: [] }] }, ingredients);
  assert.deepEqual(normalized.recentMeals, recentMeals.slice(0, 4));
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
  const state = { inventory: { pork: 1, eggs: true }, currentMeal: cooking, activeStep: 'checkout', recentMeals: [{ mealId: 'older', completedAt: 1, recipeIds: ['r0'] }] };
  assert.deepEqual(defaultCheckoutConsumption(cooking, state.inventory, ingredients), { pork: 1 });
  const first = applyCheckout(state, 'meal-1', { pork: 0.5 }, ingredients, { nextMealId: 'meal-2', completedAt: 2 });
  assert.equal(first.committed, true);
  assert.deepEqual(first.state.inventory, { pork: 0.5, eggs: true });
  assert.equal(first.state.activeStep, 'recipes');
  assert.equal(first.state.currentMeal?.mealId, 'meal-2');
  assert.deepEqual(first.state.currentMeal?.availableIngredientIds, ['eggs', 'pork']);
  assert.deepEqual(first.state.currentMeal?.selectedRecipeIds, []);
  assert.deepEqual(first.state.recentMeals, [{ mealId: 'meal-1', completedAt: 2, recipeIds: ['r1'] }, { mealId: 'older', completedAt: 1, recipeIds: ['r0'] }]);
  const second = applyCheckout(first.state, 'meal-1', { pork: 0.5 }, ingredients);
  assert.equal(second.committed, false);
  assert.equal(second.reason, 'stale-meal');
});
