import assert from 'node:assert/strict';
import test from 'node:test';
import { parse, stringify } from 'yaml';
import { readMealFiles } from '../scripts/load-meal-data.mjs';
import { parseMealFiles } from '../src/data/mealParser.mjs';

test('central optional groups replace per-Recipe optional protein allow-lists without replacing required supporting metadata', async () => {
  const files = await readMealFiles();
  const data = parseMealFiles(files);
  const richness = data.optionalGroups.find((group) => group.id === 'add-some-richness');
  assert(richness);
  for (const id of ['pork-chops', 'thin-sliced-pork-belly', 'ground-pork', 'ground-beef', 'peeled-shrimp']) {
    assert(richness.ingredients.some((entry) => entry.ingredientId === id), `${id} should be centrally available in add-some-richness`);
  }

  const compatibleRecipeIds = [
    'simple-stir-fried-leafy-greens',
    'simple-stir-fried-green-cabbage',
    'simple-stir-fried-bean-sprouts',
    'simple-stir-fried-broccoli',
    'simple-stir-fried-celery',
    'simple-stir-fried-luffa-zucchini',
  ];
  for (const id of compatibleRecipeIds) {
    const recipe = data.recipes.find((candidate) => candidate.id === id);
    assert(recipe, `${id} is missing`);
    assert(recipe.optionalGroupIds.includes('add-some-richness'), `${id} should reference add-some-richness`);
    assert.equal(recipe.supportingProteinIngredientIds.length, 0);
  }

  const requiredSupporting = data.recipes.find((recipe) => recipe.id === 'pressed-tofu-pork-strips');
  assert(requiredSupporting);
  assert(requiredSupporting.requiredSupportingProteinIngredientIds.includes('pressed-tofu'));
  assert.equal(requiredSupporting.supportingProteinIngredientIds.length, 0);

  const retired = parse(files['recipe/vegetable/simple-stir-fried-leafy-greens.yaml']);
  retired.optional_supporting_protein_ingredient_ids = ['pork-chops'];
  await assert.rejects(
    async () => parseMealFiles({
      ...files,
      'recipe/vegetable/simple-stir-fried-leafy-greens.yaml': stringify(retired),
    }),
    /unknown fields|optional_supporting_protein_ingredient_ids/,
  );
});

test('leafy greens one-of remains complete after optional-group migration', async () => {
  const data = parseMealFiles(await readMealFiles());
  const choySum = data.ingredients.find((ingredient) => ingredient.id === 'choy-sum');
  assert.equal(choySum?.nameZh, '油菜心 / 菜心');
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
  ]);
});

test('mushroom soft tofu soup is indexed and fills half protein plus one vegetable', async () => {
  const data = parseMealFiles(await readMealFiles());
  const soup = data.recipes.find((recipe) => recipe.id === 'mushroom-soft-tofu-soup');
  assert(soup);
  assert.deepEqual(soup.contribution, { protein: 0.5, vegetable: 1, staple: 0 });
  assert.deepEqual(soup.childCoverage, { protein: true, vegetable: true });
  assert.deepEqual(soup.requirements[0].anyOf, ['soft-tofu']);
  assert.deepEqual(soup.requirements[1].anyOf, [
    'fresh-shiitake',
    'oyster-mushrooms',
    'shimeji-mushrooms',
    'enoki-mushrooms',
    'maitake',
  ]);
});
