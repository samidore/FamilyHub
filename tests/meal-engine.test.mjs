import assert from 'node:assert/strict';
import test from 'node:test';
import { loadMealData, readMealFiles } from '../scripts/load-meal-data.mjs';
import { parseMealFiles } from '../src/data/mealParser.mjs';
import { aggregateMeal, bindRecipeIngredients, defaultMealState, isFeasible, isMealComplete, optionalIngredientChildCoverage, rankCandidates, recentRecipePenalty, resolveRecipeChildCoverage, timeFit, unmetCompletionRequirements } from '../src/lib/mealEngine.ts';

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

test('selected optional ingredients add planning contribution but only safe child-eaten combinations add child coverage', () => {
  const groups = [{ id: 'extras', labelZh: '加料', ingredients: [{ ingredientId: 'pork', contribution: { protein: .5, vegetable: 0, staple: 0 }, checkoutUnits: 1 }] }];
  const ingredients = [{ id: 'pork', inventoryTracking: 'counted', tags: ['child-eaten'] }];
  const unsafe = { ...recipe('r1', { protein: 0, vegetable: 1, staple: 0 }), optionalGroupIds: ['extras'] };
  const safe = { ...recipe('r2', { protein: 0, vegetable: 1, staple: 0 }), optionalGroupIds: ['extras'], tags: ['child-all-ingredients-eaten'] };
  const selectedAddons = [{ mainRecipeId: 'r1', addonType: 'extras', ingredientId: 'pork' }];
  assert.deepEqual(aggregateMeal([unsafe], { selectedAddons, optionalGroups: groups, ingredients }), { protein: .5, vegetable: 1, staple: 0, childProtein: false, childVegetable: false });
  assert.deepEqual(optionalIngredientChildCoverage(unsafe, groups[0].ingredients[0], ingredients), { protein: false, vegetable: false });
  assert.deepEqual(optionalIngredientChildCoverage(safe, groups[0].ingredients[0], ingredients), { protein: true, vegetable: false });
  assert.deepEqual(aggregateMeal([safe], { selectedAddons: [{ ...selectedAddons[0], mainRecipeId: 'r2' }], optionalGroups: groups, ingredients }), { protein: .5, vegetable: 1, staple: 0, childProtein: true, childVegetable: false });
});

test('optional potential keeps a candidate visible without counting it as already selected', () => {
  const groups = [{ id: 'tomato-mode', labelZh: '改头换面', ingredients: [{ ingredientId: 'tomato', contribution: { protein: 0, vegetable: 1, staple: 0 }, checkoutUnits: 1 }] }];
  const beef = { ...recipe('r1', { protein: 1, vegetable: 0, staple: 0 }, { protein: false, vegetable: false }, [{ anyOf: ['beef'], role: 'main-protein' }]), optionalGroupIds: ['tomato-mode'] };
  const state = { ...defaultMealState(), proteinTarget: 1, vegetableTarget: 1, stapleRequired: false, childMode: false, availableIngredientIds: ['beef', 'tomato'] };
  assert.deepEqual(rankCandidates([beef], state, [{ id: 'beef', inventoryTracking: 'counted' }, { id: 'tomato', inventoryTracking: 'counted' }], {}, [], '2026-08-27', groups).map((item) => item.id), ['r1']);
  assert.deepEqual(aggregateMeal([beef], { availableIngredientIds: state.availableIngredientIds, optionalGroups: groups }).vegetable, 0);
});

test('expiring feasible candidates sort before otherwise stronger candidates, oldest first', () => {
  const staleOld = { ...recipe('r1', { protein: 1, vegetable: 0, staple: 0 }, { protein: false, vegetable: false }, [{ anyOf: ['old'], role: 'main-protein' }]), fitScore: 1 };
  const staleNewer = { ...recipe('r2', { protein: 1, vegetable: 0, staple: 0 }, { protein: false, vegetable: false }, [{ anyOf: ['newer'], role: 'main-protein' }]), fitScore: 2 };
  const fresh = { ...recipe('r3', { protein: 1, vegetable: 0, staple: 0 }, { protein: false, vegetable: false }, [{ anyOf: ['fresh'], role: 'main-protein' }]), fitScore: 5 };
  const ingredients = [
    { id: 'old', inventoryTracking: 'counted', inventoryFreshness: 'fifo', freshnessPriorityDays: 3 },
    { id: 'newer', inventoryTracking: 'counted', inventoryFreshness: 'fifo', freshnessPriorityDays: 3 },
    { id: 'fresh', inventoryTracking: 'counted', inventoryFreshness: 'fifo', freshnessPriorityDays: 3 },
  ];
  const state = { ...defaultMealState(), proteinTarget: 3, stapleRequired: false, childMode: false, availableIngredientIds: ['old', 'newer', 'fresh'], ingredientFreshnessDates: { old: '2026-08-18', newer: '2026-08-21', fresh: '2026-08-26' } };
  assert.deepEqual(rankCandidates([fresh, staleNewer, staleOld], state, ingredients, {}, [], '2026-08-27').map((item) => item.id), ['r1', 'r2', 'r3']);
});

test('structured data keeps key Ingredient, Recipe, and unified optional-group relationships', async () => {
  const kb = await loadMealData();
  assert.equal(kb.ingredients.find((item) => item.id === 'zongzi')?.inventoryTracking, 'presence-only');
  const steamedZongzi = kb.recipes.find((item) => item.id === 'steamed-zongzi');
  assert.equal(steamedZongzi?.requirements[0]?.anyOf[0], 'zongzi');
  assert.equal(steamedZongzi?.tags.includes('instant-pot'), true);
  assert.equal(steamedZongzi?.steps.some((step) => step.includes('15分钟')), true);
  assert.equal(kb.ingredients.find((item) => item.id === 'bean-sprouts')?.visible, true);
  const beanSprouts = kb.recipes.find((item) => item.id === 'simple-stir-fried-bean-sprouts');
  assert.equal(beanSprouts?.requirements[0]?.anyOf[0], 'bean-sprouts');
  assert.deepEqual(beanSprouts?.contribution, { protein: 0, vegetable: 1, staple: 0 });
  const wholeBrisketRecipeIds = new Set(kb.recipes.filter((item) => item.requirements.some((requirement) => requirement.anyOf.includes('whole-beef-brisket'))).map((item) => item.id));
  for (const id of ['daikon-braised-beef', 'potato-braised-beef', 'chinese-red-braised-beef', 'red-braised-beef-noodle-soup']) assert.equal(wholeBrisketRecipeIds.has(id), true, `${id} must support whole-beef-brisket`);

  assert.deepEqual(kb.optionalGroups.map((group) => group.id), ['add-some-richness', 'change-it-up', 'one-pot-mix']);
  assert.equal(kb.optionalGroups.find((group) => group.id === 'add-some-richness')?.ingredients.some((entry) => entry.ingredientId === 'ground-pork' && entry.contribution.protein === .5), true);
  assert.equal(kb.optionalGroups.find((group) => group.id === 'change-it-up')?.ingredients.some((entry) => entry.ingredientId === 'tomato' && entry.contribution.vegetable === 1), true);
  assert.equal(kb.optionalGroups.find((group) => group.id === 'one-pot-mix')?.ingredients.length, 23);
  assert.equal(kb.recipes.filter((item) => item.optionalGroupIds?.includes('one-pot-mix')).length, 40);
  assert.equal(kb.recipes.filter((item) => item.optionalGroupIds?.includes('add-some-richness')).length, 6);
  assert.equal(kb.recipes.filter((item) => item.optionalGroupIds?.includes('change-it-up')).length, 3);
  assert.equal(kb.ingredients.some((item) => item.tags?.includes('easy-braise-addon')), false);
  assert.equal(kb.recipes.some((item) => item.tags?.includes('iron-pan-braise')), false);
  assert.equal(kb.ingredients.find((item) => item.id === 'ground-pork')?.tags?.includes('child-eaten'), true);
  assert.equal(kb.ingredients.find((item) => item.id === 'pork-feet')?.tags?.includes('child-eaten'), false);
  assert.equal(kb.recipes.find((item) => item.id === 'minced-pork-tofu')?.optionalGroupIds?.includes('one-pot-mix'), true);
  assert.equal(kb.recipes.find((item) => item.id === 'instant-pot-soy-chicken-thighs')?.optionalGroupIds?.includes('one-pot-mix'), false);

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

test('active Meal Builder source excludes retired add-on schemas and capability tags', async () => {
  const files = await readMealFiles();
  const active = Object.entries(files).filter(([path]) => !path.startsWith('archive/')).map(([, text]) => text).join('\n');
  for (const retired of ['finish-with-leafy-vegetable', 'finish-wilt-compatible', 'meal_addons:', 'optional_supporting_protein_ingredient_ids:', 'easy-braise-addon', 'iron-pan-braise']) assert.equal(active.includes(retired), false, `${retired} must not remain active`);
});

test('one-of bindings auto-select one available ingredient', () => {
  const item = recipe('r1', { protein: 0, vegetable: 1, staple: 0 }, { protein: false, vegetable: 'ingredient-dependent' }, [{ anyOf: ['leaf-a', 'leaf-b'], role: 'vegetable' }]);
  assert.deepEqual(bindRecipeIngredients(item, new Set(['leaf-b'])), ['leaf-b']);
  assert.equal(isFeasible(item, new Set(['leaf-b']), ['leaf-b']), true);
});

test('ingredient-dependent child coverage follows the bound Ingredient and keeps unknown false', () => {
  const item = recipe('dependent', { protein: 0, vegetable: 1, staple: 0 }, { protein: false, vegetable: 'ingredient-dependent' }, [{ anyOf: ['known', 'unknown'], role: 'vegetable' }]);
  const ingredients = [{ id: 'known', childCoverage: { vegetable: true } }, { id: 'unknown', childCoverage: { vegetable: 'unknown' } }];
  assert.deepEqual(resolveRecipeChildCoverage(item, ['known'], ingredients), { protein: false, vegetable: true });
  assert.deepEqual(resolveRecipeChildCoverage(item, ['unknown'], ingredients), { protein: false, vegetable: false });
  assert.deepEqual(resolveRecipeChildCoverage(item, ['missing'], ingredients), { protein: false, vegetable: false });
});
