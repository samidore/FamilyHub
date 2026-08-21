import assert from 'node:assert/strict';
import test from 'node:test';
import { defaultMealState, reconcileMealState } from '../src/lib/mealEngine.ts';

const recipe = {
  id: 'selected-one-of',
  order: 1,
  fitScore: 4,
  contribution: { protein: 1, vegetable: 0, staple: 0 },
  childCoverage: { protein: true, vegetable: false },
  requirements: [{ anyOf: ['ground-pork', 'tofu'], role: 'protein' }],
  mealWindowMinutes: '30–45',
  elapsedMinutes: '30–45',
  advanceStartRequired: false,
};

test('ingredient availability filters do not rewrite an existing selected recipe binding', () => {
  const state = {
    ...defaultMealState(),
    availableIngredientIds: ['ground-pork', 'tofu'],
    selectedRecipeIds: [recipe.id],
    recipeIngredientBindings: { [recipe.id]: ['ground-pork'] },
  };

  const filtered = reconcileMealState({ ...state, availableIngredientIds: ['tofu'] }, [recipe]);

  assert.deepEqual(filtered.availableIngredientIds, ['tofu']);
  assert.deepEqual(filtered.selectedRecipeIds, [recipe.id]);
  assert.deepEqual(filtered.recipeIngredientBindings, { [recipe.id]: ['ground-pork'] });
});

test('reconciliation still removes unknown recipe IDs', () => {
  const state = {
    ...defaultMealState(),
    availableIngredientIds: ['tofu'],
    selectedRecipeIds: [recipe.id, 'archived-recipe'],
    recipeIngredientBindings: { [recipe.id]: ['ground-pork'], 'archived-recipe': ['tofu'] },
  };

  const reconciled = reconcileMealState(state, [recipe]);

  assert.deepEqual(reconciled.selectedRecipeIds, [recipe.id]);
  assert.deepEqual(reconciled.recipeIngredientBindings, { [recipe.id]: ['ground-pork'] });
});
