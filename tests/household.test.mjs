import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  COUNTED_INVENTORY_STEP,
  RECENT_MEAL_LIMIT,
  adjustInventoryItem,
  applyCheckout,
  applyCheckoutComposition,
  checkoutDraftForMeal,
  checkoutRecipeDraftsForMeal,
  createCurrentMealFromInventory,
  defaultCheckoutConsumption,
  normalizeHouseholdState,
  resetRecipeSelection,
  setCurrentMealStatus,
  toggleInventoryItem,
  toggleRecipeOptionalAddon,
  trackingForIngredient,
  updateCheckoutDraft,
  updateCheckoutRecipeDrafts,
  usedIngredientIds,
} from '../src/lib/household.ts';
import { LocalHouseholdRepository, createHouseholdRepository, googleIdentity, shouldUseRedirectFallback } from '../src/lib/householdRepository.ts';

const ingredients = [
  { id: 'pork', inventoryTracking: 'counted' },
  { id: 'beef', inventoryTracking: 'counted' },
  { id: 'eggs', inventoryTracking: 'presence-only' },
  { id: 'potato', inventoryTracking: 'presence-only' },
  { id: 'tofu', inventoryTracking: 'counted', inventoryFreshness: 'fifo', freshnessPriorityDays: 7, tags: ['child-eaten'] },
  { id: 'other', inventoryTracking: 'counted' },
];
const optionalGroups = [{
  id: 'one-pot-mix', labelZh: '一锅乱炖', ingredients: [
    { ingredientId: 'tofu', contribution: { protein: 0.5, vegetable: 0, staple: 0 }, checkoutUnits: 1 },
    { ingredientId: 'potato', contribution: { protein: 0, vegetable: 0, staple: 1 }, checkoutUnits: 1 },
  ],
}];
const compositionRecipe = {
  id: 'compose', order: 1, fitScore: 4, contribution: { protein: 1, vegetable: 0, staple: 0 }, childCoverage: { protein: true, vegetable: false },
  requirements: [{ anyOf: ['pork', 'beef'], role: 'main-protein' }], optionalGroupIds: ['one-pot-mix'], checkoutUnits: {}, mealWindowMinutes: '30', elapsedMinutes: '30', advanceStartRequired: false, tags: ['child-all-ingredients-eaten'],
};

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

test('household numeric policy keeps half-unit inventory and four recent meals', () => {
  assert.equal(COUNTED_INVENTORY_STEP, 0.5);
  assert.equal(RECENT_MEAL_LIMIT, 4);
});

test('counted inventory uses configured steps and turns off at zero', () => {
  let inventory = {};
  inventory = toggleInventoryItem(inventory, 'pork', 'counted');
  assert.deepEqual(inventory, { pork: 1 });
  inventory = adjustInventoryItem(inventory, 'pork', COUNTED_INVENTORY_STEP, 'counted');
  assert.equal(inventory.pork, 1 + COUNTED_INVENTORY_STEP);
  inventory = adjustInventoryItem(inventory, 'pork', -(1 + COUNTED_INVENTORY_STEP), 'counted');
  assert.deepEqual(inventory, {});
});

test('presence-only inventory stores only true', () => {
  let inventory = toggleInventoryItem({}, 'eggs', 'presence-only');
  assert.deepEqual(inventory, { eggs: true });
  inventory = adjustInventoryItem(inventory, 'eggs', -COUNTED_INVENTORY_STEP, 'presence-only');
  assert.deepEqual(inventory, {});
});

test('inventory tracking comes from Ingredient records rather than ID whitelists', () => {
  const custom = [{ id: 'eggs', inventoryTracking: 'counted' }, { id: 'custom-presence', inventoryTracking: 'presence-only' }];
  assert.equal(trackingForIngredient('eggs', custom), 'counted');
  assert.equal(trackingForIngredient('custom-presence', custom), 'presence-only');
  assert.deepEqual(normalizeHouseholdState({ inventory: { eggs: true, 'custom-presence': 1 } }, custom).inventory, { 'custom-presence': true });
});

test('current meal copies inventory once and recipe reset keeps availability', () => {
  const meal = createCurrentMealFromInventory({ pork: 1, eggs: true }, { mealId: 'meal-1' }, ingredients);
  assert.deepEqual(meal.availableIngredientIds, ['eggs', 'pork']);
  const changed = resetRecipeSelection({ ...meal, selectedRecipeIds: ['r1'], recipeIngredientBindings: { r1: ['pork'] }, selectedAddons: [{ mainRecipeId: 'r1', addonType: 'a', ingredientId: 'eggs' }], checkoutRecipeDrafts: { r1: { bindings: ['pork'], optionalAddons: [], consumption: { pork: 1 } } }, status: 'ready' });
  assert.deepEqual(changed.availableIngredientIds, meal.availableIngredientIds);
  assert.deepEqual(changed.selectedRecipeIds, []);
  assert.deepEqual(changed.checkoutRecipeDrafts, {});
  assert.equal(changed.status, 'selecting');
});

test('Realtime Database round-trip restores omitted empty collections and safe scalar defaults', () => {
  const normalized = normalizeHouseholdState({ inventory: { pork: 1 }, currentMeal: { mealId: 'meal-1', status: 'bad-status', proteinTarget: 1.5, vegetableTarget: 2.5, selectedRecipeIds: undefined } }, ingredients);
  assert.deepEqual(normalized.currentMeal?.availableIngredientIds, []);
  assert.deepEqual(normalized.currentMeal?.selectedRecipeIds, []);
  assert.deepEqual(normalized.currentMeal?.recipeIngredientBindings, {});
  assert.deepEqual(normalized.currentMeal?.selectedAddons, []);
  assert.deepEqual(normalized.currentMeal?.checkoutRecipeDrafts, {});
  assert.equal(normalized.currentMeal?.status, 'selecting');
  assert.equal(normalized.currentMeal?.proteinTarget, 1);
  assert.equal(normalized.currentMeal?.vegetableTarget, 2);
  assert.equal(normalized.activeStep, 'inventory');
});

test('shared active step and legacy checkout draft normalize safe values', () => {
  const meal = createCurrentMealFromInventory({ pork: 1, eggs: true }, { mealId: 'meal-draft' }, ingredients);
  const normalized = normalizeHouseholdState({ inventory: { pork: 1, eggs: true }, activeStep: 'checkout', currentMeal: { ...meal, excludedIngredientIds: ['pork', 'unknown'], checkoutDraft: { pork: 0, eggs: false, unknown: 1 } } }, ingredients);
  assert.equal(normalized.activeStep, 'checkout');
  assert.deepEqual(normalized.currentMeal?.excludedIngredientIds, ['pork']);
  assert.deepEqual(normalized.currentMeal?.checkoutDraft, { pork: 0, eggs: false });
  const draft = updateCheckoutDraft({ ...meal, recipeIngredientBindings: { r1: ['pork'] }, selectedRecipeIds: ['r1'] }, { pork: COUNTED_INVENTORY_STEP, eggs: true }, { pork: 1, eggs: true }, ingredients);
  assert.deepEqual(checkoutDraftForMeal(draft, { pork: 1, eggs: true }, ingredients), { pork: COUNTED_INVENTORY_STEP });
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
  const meal = { ...createCurrentMealFromInventory({ pork: 2, other: 1 }, { mealId: 'reconciled-checkout' }, ingredients), status: 'cooking', selectedRecipeIds: ['known', 'archived-recipe'], recipeIngredientBindings: { known: ['pork'], 'archived-recipe': ['other'] } };
  const state = { inventory: { pork: 2, other: 1 }, currentMeal: meal, activeStep: 'checkout', recentMeals: [] };
  assert.deepEqual(usedIngredientIds(meal, recipes), ['pork']);
  assert.deepEqual(defaultCheckoutConsumption(meal, state.inventory, ingredients, recipes), { pork: 1 });
  assert.equal(applyCheckout(state, meal.mealId, { pork: 1 }, ingredients, { recipes, nextMealId: 'next', completedAt: 2 }).committed, true);
  assert.equal(applyCheckout(state, meal.mealId, { other: 1 }, ingredients, { recipes }).committed, false);
});

test('planned optional composition is snapshot-limited and remains separate from Actual checkout edits', () => {
  let meal = { ...createCurrentMealFromInventory({ pork: 2, tofu: 2 }, { mealId: 'compose' }, ingredients), selectedRecipeIds: ['compose'], recipeIngredientBindings: { compose: ['pork'] } };
  meal = toggleRecipeOptionalAddon(meal, 'compose', 'one-pot-mix', 'tofu', true, [compositionRecipe], optionalGroups);
  assert.deepEqual(meal.selectedAddons, [{ mainRecipeId: 'compose', addonType: 'one-pot-mix', ingredientId: 'tofu' }]);
  assert.equal(toggleRecipeOptionalAddon(meal, 'compose', 'one-pot-mix', 'potato', true, [compositionRecipe], optionalGroups), meal, 'Plan cannot select an Ingredient outside its frozen meal snapshot');

  const liveInventory = { pork: 2, beef: 2, tofu: 2, potato: true };
  const defaults = checkoutRecipeDraftsForMeal(meal, liveInventory, ingredients, [compositionRecipe], optionalGroups);
  assert.deepEqual(defaults.compose.bindings, ['pork']);
  assert.deepEqual(defaults.compose.optionalAddons, [{ addonType: 'one-pot-mix', ingredientId: 'tofu' }]);
  assert.deepEqual(defaults.compose.consumption, { pork: 1, tofu: 1 });

  const actual = structuredClone(defaults);
  actual.compose.bindings[0] = 'beef';
  actual.compose.optionalAddons = [{ addonType: 'one-pot-mix', ingredientId: 'potato' }];
  actual.compose.consumption = { beef: 1, potato: true };
  const saved = updateCheckoutRecipeDrafts(meal, actual, ingredients);
  assert.deepEqual(saved.recipeIngredientBindings, { compose: ['pork'] });
  assert.deepEqual(saved.selectedAddons, [{ mainRecipeId: 'compose', addonType: 'one-pot-mix', ingredientId: 'tofu' }]);
  assert.deepEqual(saved.checkoutRecipeDrafts, actual);
});

test('Actual checkout may change one-of and add an unplanned live optional without rewriting Plan', () => {
  const meal = {
    ...createCurrentMealFromInventory({ pork: 2, tofu: 2 }, { mealId: 'actual' }, ingredients), status: 'cooking',
    selectedRecipeIds: ['compose'], recipeIngredientBindings: { compose: ['pork'] }, selectedAddons: [{ mainRecipeId: 'compose', addonType: 'one-pot-mix', ingredientId: 'tofu' }],
  };
  const state = { inventory: { pork: 2, beef: 2, tofu: 2, potato: true }, inventoryBatches: { tofu: { '2026-08-20': 2 } }, currentMeal: meal, activeStep: 'checkout', recentMeals: [] };
  const actual = { compose: { bindings: ['beef'], optionalAddons: [{ addonType: 'one-pot-mix', ingredientId: 'potato' }], consumption: { beef: 1, potato: true } } };
  const result = applyCheckoutComposition(state, meal.mealId, actual, ingredients, { recipes: [compositionRecipe], optionalGroups, nextMealId: 'next', completedAt: 2 });
  assert.equal(result.committed, true);
  assert.deepEqual(result.state.inventory, { pork: 2, beef: 1, tofu: 2 });
  assert.deepEqual(meal.recipeIngredientBindings, { compose: ['pork'] });
  assert.deepEqual(meal.selectedAddons, [{ mainRecipeId: 'compose', addonType: 'one-pot-mix', ingredientId: 'tofu' }]);
});

test('Actual checkout aggregates the same Ingredient across Recipes and consumes FIFO atomically', () => {
  const second = { ...compositionRecipe, id: 'compose-2', order: 2 };
  const meal = {
    ...createCurrentMealFromInventory({ pork: 2, beef: 2, tofu: 2.5 }, { mealId: 'aggregate' }, ingredients, { tofu: { '2026-08-18': 1.5, '2026-08-20': 1 } }), status: 'cooking',
    selectedRecipeIds: ['compose', 'compose-2'], recipeIngredientBindings: { compose: ['pork'], 'compose-2': ['beef'] },
  };
  const state = { inventory: { pork: 2, beef: 2, tofu: 2.5 }, inventoryBatches: { tofu: { '2026-08-18': 1.5, '2026-08-20': 1 } }, currentMeal: meal, activeStep: 'checkout', recentMeals: [] };
  const drafts = {
    compose: { bindings: ['pork'], optionalAddons: [{ addonType: 'one-pot-mix', ingredientId: 'tofu' }], consumption: { pork: 0.5, tofu: 1 } },
    'compose-2': { bindings: ['beef'], optionalAddons: [{ addonType: 'one-pot-mix', ingredientId: 'tofu' }], consumption: { beef: 0.5, tofu: 1 } },
  };
  const result = applyCheckoutComposition(state, meal.mealId, drafts, ingredients, { recipes: [compositionRecipe, second], optionalGroups, nextMealId: 'next', completedAt: 3 });
  assert.equal(result.committed, true);
  assert.deepEqual(result.state.inventory, { pork: 1.5, beef: 1.5, tofu: 0.5 });
  assert.deepEqual(result.state.inventoryBatches.tofu, { '2026-08-20': 0.5 });
});

test('Actual checkout rejects invalid group members and over-consumption atomically', () => {
  const meal = { ...createCurrentMealFromInventory({ pork: 1, tofu: 1 }, { mealId: 'reject' }, ingredients), status: 'cooking', selectedRecipeIds: ['compose'], recipeIngredientBindings: { compose: ['pork'] } };
  const state = { inventory: { pork: 1, tofu: 1, other: 1 }, inventoryBatches: { tofu: { '2026-08-20': 1 } }, currentMeal: meal, activeStep: 'checkout', recentMeals: [] };
  const invalidOptional = { compose: { bindings: ['pork'], optionalAddons: [{ addonType: 'one-pot-mix', ingredientId: 'other' }], consumption: { pork: 1, other: 1 } } };
  const invalid = applyCheckoutComposition(state, meal.mealId, invalidOptional, ingredients, { recipes: [compositionRecipe], optionalGroups });
  assert.equal(invalid.committed, false);
  assert.deepEqual(invalid.state.inventory, state.inventory);
  const tooMuch = { compose: { bindings: ['pork'], optionalAddons: [{ addonType: 'one-pot-mix', ingredientId: 'tofu' }], consumption: { pork: 1, tofu: 1.5 } } };
  const excessive = applyCheckoutComposition(state, meal.mealId, tooMuch, ingredients, { recipes: [compositionRecipe], optionalGroups });
  assert.equal(excessive.committed, false);
  assert.deepEqual(excessive.state.inventory, state.inventory);
});

test('composition enhancement uses live inventory at Checkout and has no mutation-observer render loop', async () => {
  const component = await readFile('src/components/MealBuilderCompositionEnhancements.astro', 'utf8');
  assert.match(component, /inventoryIsOn\(household\.inventory\[entry\.ingredientId\]/);
  assert.doesNotMatch(component, /removeLegacyCompositionControls/);
  assert.doesNotMatch(component, /new MutationObserver/);
  assert.match(component, /applyCheckoutComposition/);
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

test('recent meal history normalizes newest-first and keeps only the configured limit', () => {
  const recentMeals = Array.from({ length: RECENT_MEAL_LIMIT + 2 }, (_, index) => ({ mealId: `meal-${index}`, completedAt: 100 - index, recipeIds: [`r${index}`] }));
  const normalized = normalizeHouseholdState({ recentMeals: [...recentMeals, { mealId: '', completedAt: 0, recipeIds: [] }] }, ingredients);
  assert.deepEqual(normalized.recentMeals, recentMeals.slice(0, RECENT_MEAL_LIMIT));
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

test('legacy flat checkout remains stale-safe and consumes counted values once', () => {
  const meal = createCurrentMealFromInventory({ pork: 1, eggs: true }, { mealId: 'meal-1' }, ingredients);
  const cooking = { ...meal, status: 'cooking', recipeIngredientBindings: { r1: ['pork'] }, selectedRecipeIds: ['r1'] };
  const state = { inventory: { pork: 1, eggs: true }, currentMeal: cooking, activeStep: 'checkout', recentMeals: [{ mealId: 'older', completedAt: 1, recipeIds: ['r0'] }] };
  assert.deepEqual(defaultCheckoutConsumption(cooking, state.inventory, ingredients), { pork: 1 });
  const first = applyCheckout(state, 'meal-1', { pork: COUNTED_INVENTORY_STEP }, ingredients, { nextMealId: 'meal-2', completedAt: 2 });
  assert.equal(first.committed, true);
  assert.deepEqual(first.state.inventory, { pork: COUNTED_INVENTORY_STEP, eggs: true });
  assert.equal(first.state.activeStep, 'recipes');
  assert.equal(first.state.currentMeal?.mealId, 'meal-2');
  assert.deepEqual(first.state.currentMeal?.availableIngredientIds, ['eggs', 'pork']);
  assert.deepEqual(first.state.currentMeal?.selectedRecipeIds, []);
  const second = applyCheckout(first.state, 'meal-1', { pork: COUNTED_INVENTORY_STEP }, ingredients);
  assert.equal(second.committed, false);
  assert.equal(second.reason, 'stale-meal');
});