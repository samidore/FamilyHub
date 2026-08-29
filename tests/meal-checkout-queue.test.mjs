import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyQueuedCheckoutComposition,
  createCurrentMealFromInventory,
  inventoryAfterQueuedReservations,
  inventoryBatchesAfterQueuedReservations,
  normalizeHouseholdState,
  queueCurrentMealForCheckout,
  queuedReservationUnits,
} from '../src/lib/household.ts';

const ingredients = [
  { id: 'pork', inventoryTracking: 'counted', inventoryFreshness: 'fifo', freshnessPriorityDays: 3 },
  { id: 'beef', inventoryTracking: 'counted' },
  { id: 'tofu', inventoryTracking: 'counted' },
  { id: 'rice', inventoryTracking: 'presence-only' },
];
const optionalGroups = [{ id: 'extras', labelZh: '加料', ingredients: [{ ingredientId: 'tofu', contribution: { protein: 0.5, vegetable: 0, staple: 0 }, checkoutUnits: 1 }] }];
const recipes = [
  { id: 'r1', requirements: [{ anyOf: ['pork', 'beef'], role: 'main-protein' }, { anyOf: ['rice'], role: 'staple' }], optionalGroupIds: ['extras'], checkoutUnits: {}, contribution: { protein: 1, vegetable: 0, staple: 1 }, childCoverage: { protein: true, vegetable: false }, order: 1, fitScore: 1, mealWindowMinutes: '30', elapsedMinutes: '30', advanceStartRequired: false },
  { id: 'r2', requirements: [{ anyOf: ['pork'], role: 'main-protein' }], optionalGroupIds: [], checkoutUnits: {}, contribution: { protein: 1, vegetable: 0, staple: 0 }, childCoverage: { protein: true, vegetable: false }, order: 2, fitScore: 1, mealWindowMinutes: '30', elapsedMinutes: '30', advanceStartRequired: false },
];

function cookingMeal(mealId = 'meal-1') {
  return {
    ...createCurrentMealFromInventory({ pork: 3, beef: 1, tofu: 2, rice: true }, { mealId }, ingredients, { pork: { '2026-08-20': 1, '2026-08-25': 2 } }),
    status: 'cooking',
    selectedRecipeIds: ['r1', 'r2'],
    recipeIngredientBindings: { r1: ['pork', 'rice'], r2: ['pork'] },
    selectedAddons: [{ mainRecipeId: 'r1', addonType: 'extras', ingredientId: 'tofu' }],
  };
}

test('legacy household state normalizes with an empty checkout queue', () => {
  const state = normalizeHouseholdState({ inventory: { pork: 1 } }, ingredients);
  assert.deepEqual(state.pendingCheckoutMeals, []);
});

test('queue reserves exactly one counted unit per hard/one_of binding occurrence only', () => {
  const meal = cookingMeal();
  const state = normalizeHouseholdState({ inventory: { pork: 3, beef: 1, tofu: 2, rice: true }, inventoryBatches: { pork: { '2026-08-20': 1, '2026-08-25': 2 } }, currentMeal: meal, activeStep: 'cook' }, ingredients);
  const queued = queueCurrentMealForCheckout(state, ingredients, { nextMealId: 'meal-2', queuedAt: 10 });
  assert.equal(queued.pendingCheckoutMeals.length, 1);
  assert.deepEqual(queuedReservationUnits(queued, ingredients), { pork: 2 });
  assert.deepEqual(queued.inventory, state.inventory, 'queueing must not decrement real inventory');
  assert.equal(queued.currentMeal?.mealId, 'meal-2');
  assert.deepEqual(queued.currentMeal?.availableIngredientIds.sort(), ['beef', 'pork', 'rice', 'tofu']);
  assert.equal(queued.currentMeal?.ingredientFreshnessDates.pork, '2026-08-25');
  assert.deepEqual(inventoryAfterQueuedReservations(queued, ingredients), { pork: 1, beef: 1, tofu: 2, rice: true });
  assert.deepEqual(inventoryBatchesAfterQueuedReservations(queued, ingredients).pork, { '2026-08-25': 1 });
});

test('queued and current meals validate and commit atomically as one checkout', () => {
  const first = { ...cookingMeal('meal-1'), selectedRecipeIds: ['r1'], recipeIngredientBindings: { r1: ['pork', 'rice'] }, checkoutRecipeDrafts: { r1: { bindings: ['pork', 'rice'], optionalAddons: [{ addonType: 'extras', ingredientId: 'tofu' }], consumption: { pork: 1, rice: false, tofu: 1 } } } };
  const current = { ...cookingMeal('meal-2'), selectedRecipeIds: ['r2'], recipeIngredientBindings: { r2: ['pork'] }, selectedAddons: [], checkoutRecipeDrafts: { r2: { bindings: ['pork'], optionalAddons: [], consumption: { pork: 1 } } } };
  const state = normalizeHouseholdState({ inventory: { pork: 3, tofu: 2, rice: true }, inventoryBatches: { pork: { '2026-08-20': 1, '2026-08-25': 2 } }, pendingCheckoutMeals: [{ ...first, queuedAt: 10 }], currentMeal: current, activeStep: 'checkout' }, ingredients);
  const draftsByMealId = { 'meal-1': first.checkoutRecipeDrafts, 'meal-2': current.checkoutRecipeDrafts };
  const result = applyQueuedCheckoutComposition(state, 'meal-2', draftsByMealId, ingredients, { recipes, optionalGroups, nextMealId: 'meal-3', completedAt: 20 });
  assert.equal(result.committed, true);
  assert.deepEqual(result.state.inventory, { pork: 1, tofu: 1, rice: true });
  assert.deepEqual(result.state.inventoryBatches.pork, { '2026-08-25': 1 });
  assert.deepEqual(result.state.pendingCheckoutMeals, []);
  assert.equal(result.state.currentMeal?.mealId, 'meal-3');
  assert.deepEqual(result.state.recentMeals.map((meal) => meal.mealId), ['meal-1', 'meal-2']);

  const excessive = structuredClone(state);
  excessive.inventory.pork = 1;
  excessive.inventoryBatches.pork = { '2026-08-20': 1 };
  const rejected = applyQueuedCheckoutComposition(excessive, 'meal-2', draftsByMealId, ingredients, { recipes, optionalGroups });
  assert.equal(rejected.committed, false);
  assert.deepEqual(rejected.state.inventory, excessive.inventory, 'failed aggregate validation must not partially consume inventory');
  assert.equal(rejected.state.pendingCheckoutMeals.length, 1);
});
