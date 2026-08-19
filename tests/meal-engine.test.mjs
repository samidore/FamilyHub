import assert from 'node:assert/strict';
import test from 'node:test';
import { loadMealData, readMealFiles } from '../scripts/load-meal-data.mjs';
import { parseMealFiles } from '../src/data/mealParser.mjs';
import { aggregateMeal, bindRecipeIngredients, defaultMealState, easyBraiseAddonIngredientIds, isFeasible, isMealComplete, rankCandidates, recentRecipePenalty, resolveRecipeChildCoverage, timeFit, unmetCompletionRequirements } from '../src/lib/mealEngine.ts';

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

test('structured data keeps key Ingredient, Recipe, and capability relationships', async () => {
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
  const wholeBrisketRecipeIds = new Set(kb.recipes
    .filter((item) => item.requirements.some((requirement) => requirement.anyOf.includes('whole-beef-brisket')))
    .map((item) => item.id));
  for (const id of ['daikon-braised-beef', 'potato-braised-beef', 'chinese-red-braised-beef', 'red-braised-beef-noodle-soup']) assert.equal(wholeBrisketRecipeIds.has(id), true, `${id} must support whole-beef-brisket`);
  assert.equal(kb.ingredients.find((item) => item.id === 'fried-tofu-puffs')?.tags?.includes('easy-braise-addon'), true);
  assert.equal(kb.recipes.find((item) => item.id === 'minced-pork-tofu')?.tags?.includes('iron-pan-braise'), true);
  assert.equal(kb.ingredients.some((item) => item.tags?.includes('finish-wilt-compatible')), false);
  assert.equal(kb.recipes.find((item) => item.id === 'instant-pot-soy-chicken-thighs').tags.includes('iron-pan-braise'), false);
  assert.equal(kb.recipes.find((item) => item.id === 'instant-pot-thirteen-spice-soy-party-wings').tags.includes('iron-pan-braise'), false);
  assert.equal(kb.recipes.find((item) => item.id === 'instant-pot-oxtail-soup').tags.includes('iron-pan-braise'), false);
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

test('active Meal Builder source excludes retired leafy add-on fields and tags', async () => {
  const files = await readMealFiles();
  const active = Object.entries(files).filter(([path]) => !path.startsWith('archive/')).map(([, text]) => text).join('\n');
  assert.equal(active.includes('finish-with-leafy-vegetable'), false);
  assert.equal(active.includes('finish-wilt-compatible'), false);
  assert.equal(active.includes('meal_addons:'), false);
});

test('one-of bindings auto-select one available ingredient', () => {
  const item = recipe('r1', { protein: 0, vegetable: 1, staple: 0 }, { protein: false, vegetable: 'ingredient-dependent' }, [{ anyOf: ['leaf-a', 'leaf-b'], role: 'vegetable' }]);
  assert.deepEqual(bindRecipeIngredients(item, new Set(['leaf-b'])), ['leaf-b']);
  assert.equal(isFeasible(item, new Set(['leaf-b']), ['leaf-b']), true);
});

test('easy-braise checkout candidates require an iron-pan meal and exclude bound Ingredients', () => {
  const recipes = [
    recipe('r1', { protein: 1, vegetable: 0, staple: 0 }, undefined, [{ anyOf: ['lettuce'] }]),
    { ...recipe('r2', { protein: 1, vegetable: 0, staple: 0 }), tags: ['iron-pan-braise'] },
  ];
  const ingredients = [{ id: 'lettuce', inventoryTracking: 'counted', tags: ['easy-braise-addon'] }, { id: 'onion', inventoryTracking: 'counted', tags: ['easy-braise-addon'] }];
  const state = { ...defaultMealState(), selectedRecipeIds: ['r1', 'r2'], recipeIngredientBindings: { r1: ['lettuce'] } };
  assert.deepEqual(easyBraiseAddonIngredientIds(recipes, state, ['lettuce', 'onion', 'onion'], ingredients), ['onion']);
  assert.deepEqual(easyBraiseAddonIngredientIds([recipes[0]], state, ['onion'], ingredients), []);
});

test('ingredient-dependent child coverage follows the bound Ingredient and keeps unknown false', () => {
  const item = recipe('dependent', { protein: 0, vegetable: 1, staple: 0 }, { protein: false, vegetable: 'ingredient-dependent' }, [{ anyOf: ['known', 'unknown'], role: 'vegetable' }]);
  const ingredients = [{ id: 'known', childCoverage: { vegetable: true } }, { id: 'unknown', childCoverage: { vegetable: 'unknown' } }];
  assert.deepEqual(resolveRecipeChildCoverage(item, ['known'], ingredients), { protein: false, vegetable: true });
  assert.deepEqual(resolveRecipeChildCoverage(item, ['unknown'], ingredients), { protein: false, vegetable: false });
  assert.deepEqual(resolveRecipeChildCoverage(item, ['missing'], ingredients), { protein: false, vegetable: false });
});
