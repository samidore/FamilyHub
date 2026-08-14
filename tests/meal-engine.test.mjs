import assert from 'node:assert/strict';
import test from 'node:test';
import { loadMealData, readMealFiles } from '../scripts/load-meal-data.mjs';
import { parseMealFiles } from '../src/data/mealParser.mjs';
import { addSelectedAddon, aggregateMeal, bindRecipeIngredients, defaultMealState, isFeasible, isMealComplete, rankAddons, rankCandidates, recentRecipePenalty, reconcileMealState, removeSelectedAddon, resolveRecipeChildCoverage, timeFit, unmetCompletionRequirements } from '../src/lib/mealEngine.ts';

const recipe = (id, contribution, childCoverage = { protein: false, vegetable: false }, requirements = []) => ({ id, order: Number(id.replace(/\D/g, '')) || 0, fitScore: 4, contribution, childCoverage, requirements, mealWindowMinutes: '30–45', elapsedMinutes: '30–45', advanceStartRequired: false });

test('required and one-of ingredients determine feasibility', () => {
  const item = recipe('r1', { protein: 1, vegetable: 0, staple: 0 }, undefined, [{ anyOf: ['pork'] }, { anyOf: ['mushroom-a', 'mushroom-b'] }]);
  assert.equal(isFeasible(item, new Set(['pork', 'mushroom-b'])), true);
  assert.equal(isFeasible(item, new Set(['pork'])), false);
});

test('mixed contributions aggregate and complete a meal', () => {
  const mixed = recipe('r1', { protein: .5, vegetable: 1, staple: 0 }, { protein: true, vegetable: true });
  const staple = recipe('r2', { protein: .5, vegetable: 1, staple: 1 }, { protein: false, vegetable: false });
  const state = defaultMealState(); state.selectedRecipeIds = ['r1', 'r2'];
  const totals = aggregateMeal([mixed, staple]);
  assert.deepEqual(totals, { protein: 1, vegetable: 2, staple: 1, childProtein: true, childVegetable: true });
  assert.equal(isMealComplete(state, totals), true);
});

test('completion gaps are reported in stable order', () => {
  const state = defaultMealState();
  assert.deepEqual(unmetCompletionRequirements(state, { protein: 0, vegetable: 2, staple: 0, childProtein: false, childVegetable: false }), ['Protein', 'Staple', '孩子蛋白', '孩子蔬菜']);
  state.childMode = false;
  assert.deepEqual(unmetCompletionRequirements(state, { protein: 1, vegetable: 2, staple: 1, childProtein: false, childVegetable: false }), []);
});

test('child gap ranks efficient mixed filler before half protein and full fallback', () => {
  const steak = recipe('r1', { protein: 1, vegetable: 0, staple: 0 });
  const mixed = recipe('r2', { protein: .5, vegetable: 1, staple: 0 }, { protein: true, vegetable: true });
  const half = recipe('r3', { protein: .5, vegetable: 0, staple: 0 }, { protein: true, vegetable: false });
  const full = recipe('r4', { protein: 1, vegetable: 0, staple: 0 }, { protein: true, vegetable: false });
  const adult = recipe('r5', { protein: 1, vegetable: 0, staple: 0 });
  const state = defaultMealState(); state.stapleRequired = false; state.availableIngredientIds = ['all']; state.selectedRecipeIds = ['r1'];
  const ranked = rankCandidates([steak, mixed, half, full, adult], state).map((item) => item.id);
  assert.deepEqual(ranked, ['r2', 'r3', 'r4']);
  state.childMode = false;
  assert.deepEqual(rankCandidates([steak, mixed, half, full, adult], state).map((item) => item.id), ['r2']);
});

test('time preference ranks without hiding and flags borderline ranges', () => {
  const item = recipe('r1', { protein: 1, vegetable: 0, staple: 0 });
  assert.deepEqual(timeFit(item, '30'), { rank: 1, label: '时间偏紧' });
  item.advanceStartRequired = true;
  assert.deepEqual(timeFit(item, '60'), { rank: 2, label: '需提前开始' });
});

test('recent Recipes rank after unseen choices with the newest meal last', () => {
  const newest = recipe('r1', { protein: 1, vegetable: 0, staple: 0 });
  const oldest = recipe('r2', { protein: 1, vegetable: 0, staple: 0 });
  const unseen = recipe('r3', { protein: 1, vegetable: 0, staple: 0 });
  const state = { ...defaultMealState(), availableIngredientIds: ['all'], proteinTarget: 3, stapleRequired: false, childMode: false };
  const history = [['r1'], ['other'], ['other-2'], ['r2']];
  assert.equal(recentRecipePenalty('r1', history), 4);
  assert.equal(recentRecipePenalty('r2', history), 1);
  assert.deepEqual(rankCandidates([newest, oldest, unseen], state, [], {}, history).map((item) => item.id), ['r3', 'r2', 'r1']);
});

test('v1.8 structured data keeps migrated counts, Vegetable structures, and controlled add-ons', async () => {
  const kb = await loadMealData();
  assert.equal(kb.ingredients.length, 132);
  assert.equal(kb.ingredients.filter((item) => item.visible).length, 129);
  assert.equal(kb.recipes.length, 162);
  assert.equal(kb.recipes.filter((item) => item.vegetableCentered).length, 23);
  assert.deepEqual(kb.recipes.filter((item) => item.mealAddons.length).map((item) => item.id).sort(), [
    'chicken-teriyaki-thighs', 'chinese-red-braised-beef', 'coca-cola-chicken-wings', 'hong-kong-swiss-chicken-wings',
    'hong-shao-rou', 'oyster-sauce-braised-chicken', 'shanghai-sweet-sour-ribs',
  ]);
  assert.deepEqual(kb.ingredients.filter((item) => item.tags?.includes('finish-wilt-compatible')).map((item) => item.id).sort(), ['baby-napa-cabbage', 'chinese-greens', 'choy-sum', 'lettuce', 'youmai-cai']);
  assert.equal(kb.recipes.find((item) => item.id === 'instant-pot-soy-chicken-thighs').mealAddons.length, 0);
  const porkGreens = kb.recipes.find((item) => item.id === 'ground-pork-chinese-greens-stir-fry');
  assert.deepEqual(porkGreens.contribution, { protein: 1, vegetable: 1, staple: 1 });
  assert.deepEqual(porkGreens.requirements.find((item) => item.role === 'integral-staple')?.anyOf, ['rice']);
  const everyIngredient = new Set(kb.ingredients.map((item) => item.id));
  for (const item of kb.recipes) {
    for (const [index, requirement] of item.requirements.entries()) {
      for (const alternative of requirement.anyOf) {
        if (requirement.anyOf.length < 2) continue;
        const binding = bindRecipeIngredients(item, everyIngredient);
        binding[index] = alternative;
        assert.equal(isFeasible(item, everyIngredient, binding), true, `${item.id} one_of alternative ${alternative} is not feasible`);
      }
    }
  }
});

test('Meal Builder manifests reject unindexed files and broken references', async () => {
  const files = await readMealFiles();
  assert.throws(() => parseMealFiles({ ...files, 'recipe/chicken/unindexed.yaml': files['recipe/chicken/chicken-teriyaki-thighs.yaml'] }), /unindexed active file/);
  const broken = { ...files, 'recipe/chicken/chicken-teriyaki-thighs.yaml': files['recipe/chicken/chicken-teriyaki-thighs.yaml'].replace('ingredient_id: boneless-skinless-chicken-thighs', 'ingredient_id: missing-ingredient') };
  assert.throws(() => parseMealFiles(broken), /references missing ingredient/);
});

test('one-of bindings auto-select one available ingredient', () => {
  const item = recipe('r1', { protein: 0, vegetable: 1, staple: 0 }, { protein: false, vegetable: 'ingredient-dependent' }, [{ anyOf: ['leaf-a', 'leaf-b'], role: 'vegetable' }]);
  assert.deepEqual(bindRecipeIngredients(item, new Set(['leaf-b'])), ['leaf-b']);
  assert.equal(isFeasible(item, new Set(['leaf-b']), ['leaf-b']), true);
});

test('add-on state is conceptual, exclusive, and removed when its ingredient disappears', () => {
  const addon = { id: 'finish-with-leafy-vegetable', acceptsIngredientTag: 'finish-wilt-compatible', contribution: { protein: 0, vegetable: 1, staple: 0 }, childCoverage: { protein: false, vegetable: 'ingredient-dependent' } };
  const main = { ...recipe('main', { protein: 1, vegetable: 0, staple: 0 }, { protein: true, vegetable: false }, [{ anyOf: ['pork'], role: 'main-protein' }]), mealAddons: [addon] };
  const second = { ...recipe('second', { protein: 0, vegetable: 1, staple: 0 }, { protein: false, vegetable: true }, [{ anyOf: ['leaf-a'], role: 'vegetable' }]), mealAddons: [addon] };
  const ingredients = [{ id: 'pork', tags: [] }, { id: 'leaf-a', tags: ['finish-wilt-compatible'], childCoverage: { vegetable: true } }, { id: 'leaf-b', tags: ['finish-wilt-compatible'], childCoverage: { vegetable: true } }];
  let state = { ...defaultMealState(), availableIngredientIds: ['pork', 'leaf-a', 'leaf-b'], selectedRecipeIds: ['main'], recipeIngredientBindings: { main: ['pork'] } };
  assert.equal(rankAddons([main], state, ingredients)[0].selectedIngredientId, 'leaf-a');
  state = addSelectedAddon(state, main, addon.id, 'leaf-a', ingredients);
  assert.deepEqual(state.selectedAddons, [{ mainRecipeId: 'main', addonType: addon.id, ingredientId: 'leaf-a' }]);
  const blocked = addSelectedAddon({ ...state, selectedRecipeIds: ['main', 'second'], recipeIngredientBindings: { main: ['pork'], second: ['leaf-a'] } }, second, addon.id, 'leaf-a', ingredients);
  assert.deepEqual(blocked.selectedAddons, state.selectedAddons);
  const removed = reconcileMealState({ ...state, availableIngredientIds: ['pork', 'leaf-b'] }, [main, second], ingredients);
  assert.deepEqual(removed.selectedAddons, []);
  assert.deepEqual(removeSelectedAddon(state, 'main', addon.id).selectedAddons, []);
});

test('unselected add-ons surface only when they fill vegetable or child-vegetable gaps', () => {
  const addon = { id: 'finish-with-leafy-vegetable', acceptsIngredientTag: 'finish-wilt-compatible', contribution: { protein: 0, vegetable: 1, staple: 0 }, childCoverage: { protein: false, vegetable: 'ingredient-dependent' } };
  const main = { ...recipe('main', { protein: 1, vegetable: 0, staple: 0 }, { protein: true, vegetable: false }, [{ anyOf: ['pork'], role: 'main-protein' }]), mealAddons: [addon] };
  const ingredients = [{ id: 'pork', tags: [] }, { id: 'leaf-a', tags: ['finish-wilt-compatible'], childCoverage: { vegetable: true } }, { id: 'leaf-b', tags: ['finish-wilt-compatible'], childCoverage: { vegetable: false } }];
  const state = { ...defaultMealState(), availableIngredientIds: ['pork', 'leaf-a', 'leaf-b'], selectedRecipeIds: ['main'], recipeIngredientBindings: { main: ['pork'] }, vegetableTarget: 0, childMode: false };
  assert.equal(rankAddons([main], state, ingredients).length, 0);
  state.childMode = true;
  assert.equal(rankAddons([main], state, ingredients).length, 1);
  assert.deepEqual(rankAddons([main], state, ingredients)[0].ingredientIds, ['leaf-a']);
  state.selectedAddons = [{ mainRecipeId: 'main', addonType: addon.id, ingredientId: 'leaf-a' }];
  assert.equal(rankAddons([main], state, ingredients).length, 1);
  const withoutAddon = aggregateMeal([main], { recipeIngredientBindings: state.recipeIngredientBindings, selectedAddons: [], availableIngredientIds: state.availableIngredientIds, ingredients });
  const withAddon = aggregateMeal([main], { recipeIngredientBindings: state.recipeIngredientBindings, selectedAddons: state.selectedAddons, availableIngredientIds: state.availableIngredientIds, ingredients });
  assert.equal(withAddon.vegetable - withoutAddon.vegetable, 1);
  const removedState = removeSelectedAddon(state, 'main', addon.id);
  const afterRemoval = aggregateMeal([main], { recipeIngredientBindings: removedState.recipeIngredientBindings, selectedAddons: removedState.selectedAddons, availableIngredientIds: removedState.availableIngredientIds, ingredients });
  assert.equal(afterRemoval.vegetable, withoutAddon.vegetable);
});

test('ingredient-dependent child coverage follows the bound Ingredient and keeps unknown false', () => {
  const item = recipe('dependent', { protein: 0, vegetable: 1, staple: 0 }, { protein: false, vegetable: 'ingredient-dependent' }, [{ anyOf: ['known', 'unknown'], role: 'vegetable' }]);
  const ingredients = [{ id: 'known', childCoverage: { vegetable: true } }, { id: 'unknown', childCoverage: { vegetable: 'unknown' } }];
  assert.deepEqual(resolveRecipeChildCoverage(item, ['known'], ingredients), { protein: false, vegetable: true });
  assert.deepEqual(resolveRecipeChildCoverage(item, ['unknown'], ingredients), { protein: false, vegetable: false });
  assert.deepEqual(resolveRecipeChildCoverage(item, ['missing'], ingredients), { protein: false, vegetable: false });
});
