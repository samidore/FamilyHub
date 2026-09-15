import assert from 'node:assert/strict';
import test from 'node:test';
import { readMealFiles } from '../scripts/load-meal-data.mjs';
import { parseMealFiles } from '../src/data/mealParser.mjs';

test('central optional groups replace per-Recipe optional protein allow-lists without replacing required supporting metadata', async () => {
  const files = await readMealFiles();
  const data = parseMealFiles(files);
  const richness = data.optionalGroups.find((group) => group.id === 'add-some-richness');
  assert(richness);
  for (const id of ['whole-pork-tenderloin', 'pork-chops', 'thin-sliced-pork-belly', 'ground-pork', 'ground-beef', 'peeled-shrimp']) {
    assert(richness.ingredients.some((entry) => entry.ingredientId === id), `${id} should be centrally available in add-some-richness`);
  }

  const compatibleRecipeIds = [
    'simple-stir-fried-leafy-greens',
    'basic-egg-drop-soup',
    'homestyle-tofu-family',
    'shepherds-purse-soft-tofu-soup',
  ];
  for (const id of compatibleRecipeIds) {
    const recipe = data.recipes.find((candidate) => candidate.id === id);
    assert(recipe, `${id} is missing`);
    assert(recipe.optionalGroupIds.includes('add-some-richness'), `${id} should reference add-some-richness`);
    assert.equal(recipe.supportingProteinIngredientIds.length, 0);
  }

  const requiredSupporting = data.recipes.find((recipe) => recipe.id === 'ground-pork-chinese-greens-stir-fry');
  assert(requiredSupporting);
  assert.deepEqual(requiredSupporting.requiredSupportingProteinIngredientIds, []);
  assert.equal(requiredSupporting.supportingProteinIngredientIds.length, 0);

  assert.equal(files['recipe/vegetable/simple-stir-fried-leafy-greens.yaml'].includes('optional_supporting_protein_ingredient_ids'), false);
});

test('leafy greens one-of remains complete after optional-group migration', async () => {
  const data = parseMealFiles(await readMealFiles());
  const choySum = data.ingredients.find((ingredient) => ingredient.id === 'choy-sum');
  assert.equal(choySum?.nameZh, '油菜苗');
  assert.equal(choySum?.tags.includes('easy-braise-addon'), false);

  const leafy = data.recipes.find((recipe) => recipe.id === 'simple-stir-fried-leafy-greens');
  assert(leafy);
  assert.deepEqual(leafy.optionalGroupIds, ['add-some-richness']);
  assert.deepEqual(leafy.requirements[0].anyOf, [
    'chinese-greens',
    'spinach',
    'lettuce',
    'youmai-cai',
    'choy-sum',
    'water-spinach',
    'pea-shoots',
    'amaranth-greens',
    'tong-hao',
    'mustard-greens',
    'green-cabbage',
    'broccoli',
    'cauliflower',
    'celery',
    'chinese-celery',
    'garlic-chives',
    'garlic-scapes',
    'yellow-chives',
    'luffa',
    'zucchini',
    'sugar-snap-peas',
    'bean-sprouts',
    'celtuce',
    'water-chestnuts',
  ]);
});

test('homestyle tofu is indexed and accepts the canonical fresh tofu choices', async () => {
  const data = parseMealFiles(await readMealFiles());
  const tofu = data.recipes.find((recipe) => recipe.id === 'homestyle-tofu-family');
  assert(tofu);
  assert.deepEqual(tofu.contribution, { protein: 0.5, vegetable: 0, staple: 0 });
  assert.deepEqual(tofu.childCoverage, { protein: true, vegetable: false });
  assert.deepEqual(tofu.requirements[0].anyOf, ['soft-tofu', 'firm-tofu', 'egg-tofu']);
  assert.deepEqual(tofu.optionalGroupIds, ['add-some-richness', 'one-pot-mix']);
});
