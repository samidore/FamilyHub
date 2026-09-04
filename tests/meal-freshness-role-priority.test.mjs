import assert from 'node:assert/strict';
import test from 'node:test';
import { rankCandidates } from '../src/lib/mealEngine.ts';

const ingredients = [
  { id: 'required-younger', inventoryTracking: 'counted', inventoryFreshness: 'fifo', freshnessPriorityDays: 3 },
  { id: 'required-older', inventoryTracking: 'counted', inventoryFreshness: 'fifo', freshnessPriorityDays: 3 },
  { id: 'oneof-fresh', inventoryTracking: 'counted', inventoryFreshness: 'fifo', freshnessPriorityDays: 3 },
  { id: 'oneof-stale', inventoryTracking: 'counted', inventoryFreshness: 'fifo', freshnessPriorityDays: 3 },
  { id: 'optional-base', inventoryTracking: 'counted' },
  { id: 'optional-stale', inventoryTracking: 'counted', inventoryFreshness: 'fifo', freshnessPriorityDays: 3 },
];

const recipe = (id, anyOf, order, optionalGroupIds = []) => ({
  id,
  order,
  fitScore: 3,
  contribution: { protein: 1, vegetable: 0, staple: 0 },
  childCoverage: { protein: false, vegetable: false },
  requirements: [{ anyOf, role: 'main-protein' }],
  optionalGroupIds,
  mealWindowMinutes: '30',
  elapsedMinutes: '30',
  advanceStartRequired: false,
});

const optionalGroups = [{
  id: 'oily',
  labelZh: '加点油水',
  ingredients: [{
    ingredientId: 'optional-stale',
    contribution: { protein: 0, vegetable: 0, staple: 0 },
    checkoutUnits: 1,
  }],
}];

const state = {
  availableIngredientIds: ingredients.map((item) => item.id),
  ingredientFreshnessDates: {
    'required-younger': '2026-08-31',
    'required-older': '2026-08-30',
    'oneof-fresh': '2026-09-04',
    'oneof-stale': '2026-08-29',
    'optional-stale': '2026-08-27',
  },
  proteinTarget: 1,
  vegetableTarget: 1,
  stapleRequired: false,
  childMode: false,
  timePreference: 'any',
  selectedRecipeIds: [],
  recipeIngredientBindings: {},
};

test('freshness ranking prefers required then current one_of then optional before comparing age', () => {
  const requiredYounger = recipe('required-younger-recipe', ['required-younger'], 3);
  const requiredOlder = recipe('required-older-recipe', ['required-older'], 4);
  const oneOf = recipe('one-of-recipe', ['oneof-fresh', 'oneof-stale'], 2);
  const optional = recipe('optional-recipe', ['optional-base'], 1, ['oily']);

  const ranked = rankCandidates(
    [optional, oneOf, requiredYounger, requiredOlder],
    state,
    ingredients,
    {},
    [],
    '2026-09-04',
    optionalGroups,
  );

  assert.deepEqual(ranked.map((item) => item.id), [
    'required-older-recipe',
    'required-younger-recipe',
    'one-of-recipe',
    'optional-recipe',
  ]);
});
