import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { freshnessIngredientIdsForRecipe } from '../src/lib/mealEngine.ts';

test('Recipe freshness scope includes available optional members without selecting them', () => {
  const recipe = {
    id: 'soup', order: 1, fitScore: 1,
    contribution: { protein: 0, vegetable: 1, staple: 0 },
    childCoverage: { protein: false, vegetable: false },
    requirements: [{ anyOf: ['mushroom'], role: 'vegetable' }],
    optionalGroupIds: ['change-it-up'],
    mealWindowMinutes: '30', elapsedMinutes: '30', advanceStartRequired: false,
  };
  const groups = [{ id: 'change-it-up', labelZh: '改头换面', ingredients: [{ ingredientId: 'tomato', contribution: { protein: 0, vegetable: 1, staple: 0 }, checkoutUnits: 1 }] }];
  assert.deepEqual(freshnessIngredientIdsForRecipe(recipe, ['mushroom'], ['mushroom', 'tomato'], groups), ['mushroom', 'tomato']);
  assert.deepEqual(freshnessIngredientIdsForRecipe(recipe, ['mushroom'], ['mushroom'], groups), ['mushroom']);
});

test('freshness badges use the same Recipe scope as ranking', async () => {
  const enhancement = await readFile('src/components/MealBuilderFreshnessEnhancements.astro', 'utf8');
  assert.match(enhancement, /const optionalGroups = payload\.optionalGroups \?\? \[\]/);
  assert.match(enhancement, /freshnessIngredientIdsForRecipe\(recipe, binding, meal\.availableIngredientIds, optionalGroups\)/);
  assert.match(enhancement, /signalsForRecipe\(recipe, candidateBinding\(recipe, meal, card\), meal\)/);
});
