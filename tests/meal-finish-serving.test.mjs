import assert from 'node:assert/strict';
import test from 'node:test';
import { parse, stringify } from 'yaml';
import { readMealFiles } from '../scripts/load-meal-data.mjs';
import { parseMealFiles } from '../src/data/mealParser.mjs';
import {
  aggregateSelection,
  checkoutUnitsForSelection,
  defaultMealState,
  optionalGroupsForRecipe,
  reconcileMealState,
  resolvedRecipeName,
} from '../src/lib/mealEngine.ts';
import {
  applyCheckoutComposition,
  createCurrentMealFromInventory,
  defaultCheckoutRecipeDrafts,
  queueCurrentMealForCheckout,
} from '../src/lib/household.ts';

const ingredients = [
  { id: 'beef', inventoryTracking: 'counted' },
  { id: 'rice', inventoryTracking: 'counted' },
  { id: 'noodles', inventoryTracking: 'presence-only' },
  { id: 'tomato', inventoryTracking: 'counted' },
];

const recipe = {
  id: 'served-recipe',
  order: 1,
  nameZh: '基础牛肉',
  fitScore: 4,
  contribution: { protein: 1, vegetable: 0, staple: 0 },
  childCoverage: { protein: true, vegetable: false },
  requirements: [{ anyOf: ['beef'], role: 'main-protein' }],
  optionalGroupIds: ['first-group', 'second-group'],
  finishOptions: [
    { id: 'plain', labelZh: '原味', default: true, displayNameZh: '原味牛肉', cookIngredientLines: [], steps: [] },
    { id: 'scallion', labelZh: '葱香', default: false, displayNameZh: '葱香牛肉', cookIngredientLines: ['葱'], steps: ['出锅前加入葱。'] },
  ],
  servingOptions: ['rice', 'noodles'],
  checkoutUnits: {},
  mealWindowMinutes: '30',
  elapsedMinutes: '30',
  advanceStartRequired: false,
};

const optionalGroups = [
  {
    id: 'first-group',
    labelZh: '第一组',
    ingredients: [{ ingredientId: 'tomato', contribution: { protein: 0, vegetable: 1, staple: 0 }, checkoutUnits: 1 }],
  },
  {
    id: 'second-group',
    labelZh: '第二组',
    ingredients: [
      { ingredientId: 'tomato', contribution: { protein: 0, vegetable: 1, staple: 0 }, checkoutUnits: 1 },
      { ingredientId: 'beef', contribution: { protein: 0.5, vegetable: 0, staple: 0 }, checkoutUnits: 1 },
    ],
  },
];

function cookingState(meal) {
  return {
    inventory: { beef: 1, rice: 1, noodles: true },
    inventoryBatches: {},
    freezerInventory: {},
    thawingItems: {},
    discardedStock: {},
    currentMeal: meal,
    pendingCheckoutMeals: [],
    activeStep: 'checkout',
    recentMeals: [],
  };
}

function selectedState(serving = 'rice', finish = 'scallion') {
  return {
    ...defaultMealState(),
    availableIngredientIds: ['beef', 'rice', 'noodles', 'tomato'],
    selectedRecipeIds: [recipe.id],
    recipeIngredientBindings: { [recipe.id]: ['beef'] },
    recipeFinishSelections: { [recipe.id]: finish },
    recipeServingSelections: { [recipe.id]: serving },
  };
}

test('Meal Builder parser requires exactly one default Finish', async () => {
  const files = await readMealFiles();
  const path = 'recipe/pork/beijing-sauce-pork-strips.yaml';
  const record = parse(files[path]);
  record.finish_options[1].default = true;
  assert.throws(() => parseMealFiles({ ...files, [path]: stringify(record) }), /finish_options requires exactly one default/);
});

test('Finish and serving selections reconcile, resolve names, and affect totals', () => {
  const state = selectedState();
  assert.equal(resolvedRecipeName(recipe, state.recipeFinishSelections[recipe.id]), '葱香牛肉');
  assert.deepEqual(optionalGroupsForRecipe(recipe, optionalGroups).map((group) => group.id), ['first-group']);
  assert.deepEqual(optionalGroupsForRecipe(recipe, optionalGroups)[0].ingredients.map((entry) => entry.ingredientId), ['tomato']);
  assert.deepEqual(aggregateSelection([recipe], state, ingredients, optionalGroups), { protein: 1, vegetable: 0, staple: 1, childProtein: true, childVegetable: false });
  assert.deepEqual(checkoutUnitsForSelection([recipe], state), { beef: 1, rice: 1 });

  const reconciled = reconcileMealState({ ...state, recipeFinishSelections: { [recipe.id]: 'unknown' }, recipeServingSelections: { [recipe.id]: 'noodles' } }, [recipe], ingredients, optionalGroups);
  assert.deepEqual(reconciled.recipeFinishSelections, { [recipe.id]: 'plain' });
  assert.deepEqual(reconciled.recipeServingSelections, { [recipe.id]: 'noodles' });
  const unavailableServing = reconcileMealState({ ...state, availableIngredientIds: ['beef'], recipeServingSelections: { [recipe.id]: 'rice' } }, [recipe], ingredients, optionalGroups);
  assert.deepEqual(unavailableServing.recipeServingSelections, {});
});

test('Checkout defaults include planned servings, while queue reservations remain protein-bound', () => {
  const base = createCurrentMealFromInventory({ beef: 1, rice: 1, noodles: true }, { mealId: 'serving-meal' }, ingredients);
  const meal = {
    ...base,
    status: 'cooking',
    selectedRecipeIds: [recipe.id],
    recipeIngredientBindings: { [recipe.id]: ['beef'] },
    recipeFinishSelections: { [recipe.id]: 'scallion' },
    recipeServingSelections: { [recipe.id]: 'rice' },
  };
  const defaults = defaultCheckoutRecipeDrafts(meal, { beef: 1, rice: 1, noodles: true }, ingredients, [recipe], optionalGroups);
  assert.equal(defaults[recipe.id].servingIngredientId, 'rice');
  assert.deepEqual(defaults[recipe.id].consumption, { beef: 1, rice: 1 });

  const queued = queueCurrentMealForCheckout({ ...cookingState(meal), activeStep: 'cook' }, ingredients, { nextMealId: 'next-meal', queuedAt: 123 });
  assert.equal(queued.pendingCheckoutMeals[0].recipeFinishSelections[recipe.id], 'scallion');
  assert.equal(queued.pendingCheckoutMeals[0].recipeServingSelections[recipe.id], 'rice');
  assert.equal(queued.currentMeal.recipeServingSelections[recipe.id], undefined);
  assert.equal(queued.currentMeal.availableIngredientIds.includes('rice'), true);
});

test('Checkout can switch or remove a planned serving and handles presence-only stock', () => {
  const base = createCurrentMealFromInventory({ beef: 1, rice: 1, noodles: true }, { mealId: 'switch-meal' }, ingredients);
  const meal = {
    ...base,
    status: 'cooking',
    selectedRecipeIds: [recipe.id],
    recipeIngredientBindings: { [recipe.id]: ['beef'] },
    recipeServingSelections: { [recipe.id]: 'rice' },
  };
  const switched = applyCheckoutComposition(cookingState(meal), meal.mealId, {
    [recipe.id]: { bindings: ['beef'], optionalAddons: [], servingIngredientId: 'noodles', consumption: { beef: 1, noodles: true } },
  }, ingredients, { recipes: [recipe], optionalGroups });
  assert.equal(switched.committed, true);
  assert.deepEqual(switched.state.inventory, { rice: 1 });

  const removedMeal = { ...meal, mealId: 'remove-meal' };
  const removed = applyCheckoutComposition(cookingState(removedMeal), removedMeal.mealId, {
    [recipe.id]: { bindings: ['beef'], optionalAddons: [], consumption: { beef: 1 } },
  }, ingredients, { recipes: [recipe], optionalGroups });
  assert.equal(removed.committed, true);
  assert.deepEqual(removed.state.inventory, { rice: 1, noodles: true });
});
