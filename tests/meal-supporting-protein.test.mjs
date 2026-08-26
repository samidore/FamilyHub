import assert from 'node:assert/strict';
import test from 'node:test';
import { parse, stringify } from 'yaml';
import { readMealFiles } from '../scripts/load-meal-data.mjs';
import { parseMealFiles } from '../src/data/mealParser.mjs';

test('supporting protein allow-lists are preserved and validated', async () => {
  const files = await readMealFiles();
  const data = parseMealFiles(files);
  const leafy = data.recipes.find((recipe) => recipe.id === 'simple-stir-fried-leafy-greens');
  assert(leafy);
  assert(leafy.supportingProteinIngredientIds.includes('pork-chops'));
  assert(leafy.supportingProteinIngredientIds.includes('thin-sliced-pork-belly'));
  assert(leafy.supportingProteinIngredientIds.includes('peeled-shrimp'));
  assert.equal(leafy.supportingProteinIngredientIds.includes('ground-pork'), false);

  const bad = parse(files['recipe/vegetable/simple-stir-fried-leafy-greens.yaml']);
  bad.supporting_protein_ingredient_ids = ['missing-supporting-protein'];
  await assert.rejects(
    async () => parseMealFiles({
      ...files,
      'recipe/vegetable/simple-stir-fried-leafy-greens.yaml': stringify(bad),
    }),
    /supporting_protein_ingredient_ids references missing ingredient/,
  );
});

test('leafy greens one-of includes Yu Choy Sum, spinach, and water spinach', async () => {
  const data = parseMealFiles(await readMealFiles());
  const choySum = data.ingredients.find((ingredient) => ingredient.id === 'choy-sum');
  assert.equal(choySum?.nameZh, '油菜心 / 菜心');
  assert.equal(choySum?.tags.includes('easy-braise-addon'), true);

  const leafy = data.recipes.find((recipe) => recipe.id === 'simple-stir-fried-leafy-greens');
  assert(leafy);
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
