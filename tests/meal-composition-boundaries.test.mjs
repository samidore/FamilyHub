import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  defaultCheckoutRecipeDrafts,
  toggleRecipeOptionalAddon,
  createCurrentMealFromInventory,
} from '../src/lib/household.ts';

const ingredients = [
  { id: 'pork', inventoryTracking: 'counted' },
  { id: 'tofu', inventoryTracking: 'counted' },
];
const groups = [{
  id: 'extras',
  labelZh: '加料',
  ingredients: [
    { ingredientId: 'pork', contribution: { protein: 0.5, vegetable: 0, staple: 0 }, checkoutUnits: 1 },
    { ingredientId: 'tofu', contribution: { protein: 0.5, vegetable: 0, staple: 0 }, checkoutUnits: 1 },
  ],
}];
const recipe = (id) => ({
  id,
  order: 1,
  fitScore: 4,
  contribution: { protein: 1, vegetable: 0, staple: 0 },
  childCoverage: { protein: true, vegetable: false },
  requirements: [{ anyOf: ['pork'], role: 'main-protein' }],
  optionalGroupIds: ['extras'],
  mealWindowMinutes: '30',
  elapsedMinutes: '30',
  advanceStartRequired: false,
});

test('a bound Ingredient cannot also be selected as an optional in the same Recipe', () => {
  const r = recipe('r1');
  const meal = {
    ...createCurrentMealFromInventory({ pork: 1, tofu: 1 }, { mealId: 'm1' }, ingredients),
    selectedRecipeIds: ['r1'],
    recipeIngredientBindings: { r1: ['pork'] },
  };
  assert.equal(toggleRecipeOptionalAddon(meal, 'r1', 'extras', 'pork', true, [r], groups), meal);
  const withTofu = toggleRecipeOptionalAddon(meal, 'r1', 'extras', 'tofu', true, [r], groups);
  assert.deepEqual(withTofu.selectedAddons, [{ mainRecipeId: 'r1', addonType: 'extras', ingredientId: 'tofu' }]);
});

test('default Checkout quantities never allocate more than live inventory across Recipes', () => {
  const first = recipe('r1');
  const second = recipe('r2');
  const meal = {
    ...createCurrentMealFromInventory({ pork: 1.5 }, { mealId: 'm2' }, ingredients),
    selectedRecipeIds: ['r1', 'r2'],
    recipeIngredientBindings: { r1: ['pork'], r2: ['pork'] },
  };
  const drafts = defaultCheckoutRecipeDrafts(meal, { pork: 1.5 }, ingredients, [first, second], groups);
  assert.equal(drafts.r1.consumption.pork, 1);
  assert.equal(drafts.r2.consumption.pork, 0.5);
  assert.equal(drafts.r1.consumption.pork + drafts.r2.consumption.pork, 1.5);
});

test('Meal Builder page has no legacy optional-protein or flat Checkout runtime path', async () => {
  const page = await readFile('src/pages/meal-builder.astro', 'utf8');
  for (const legacy of [
    'easyBraiseAddonIngredientIds',
    'OPTIONAL_ADDON_INITIAL_UNITS',
    'selectedSupportingProteinId',
    'setSupportingProteinAddon',
    'supportingProteinIngredientIds',
    'data-supporting-recipe',
    'data-selected-supporting-recipe',
    '顺手加蛋白',
    '可选顺手焖',
    'CheckoutDraftSync',
    'checkoutDraftForMeal',
    'updateCheckoutDraft',
    'usedIngredientIds',
    'data-checkout-step',
    'data-checkout-used-up',
  ]) assert.equal(page.includes(legacy), false, `${legacy} must not return to the active Meal Builder page runtime`);
});
