import assert from 'node:assert/strict';
import test from 'node:test';
import { loadMealData } from '../scripts/load-meal-data.mjs';
import { defaultFinishId, resolvedRecipeName } from '../src/lib/mealEngine.ts';

// Audited wet meat routes, including pressure bases that predated this task.
const wetMeatPressureRecipeIds = [
  'vietnamese-thit-kho-eggs',
  'clear-braised-lions-head-meatballs',
  'hong-shao-rou',
  'mille-feuille-nabe-pork-napa',
  'shanghai-sweet-sour-ribs',
  'shanghai-braised-pork-chops',
  'red-braised-pork-trotters',
  'cantonese-pork-feet-ginger-vinegar',
  'oyster-sauce-braised-chicken',
  'coca-cola-chicken-wings',
  'white-cut-chicken',
  'cantonese-soy-sauce-chicken',
  'hainanese-chicken-rice',
  'soy-braised-chicken-gizzards',
  'soy-braised-chicken-liver',
  'soy-braised-duck-wings',
  'nikujaga',
  'chinese-braised-beef-shank',
  'galbijjim',
  'japanese-daikon-braised-boneless-short-ribs',
  'red-braised-lamb-meatballs',
  'western-braised-lamb-shanks',
  'hong-kong-yuba-lamb-casserole',
  'red-braised-lamb-riblets',
  'winter-melon-pork-meatball-soup',
  'winter-melon-pork-rib-soup',
  'tomato-fatty-beef-soup',
  'clear-lamb-daikon-soup',
  'clear-lamb-spine-soup',
  'clear-braised-lamb-leg-chunks',
  'taiwanese-braised-minced-pork-rice',
  'oyakodon',
  'chicken-shiitake-udon-soup',
  'gyudon',
  'sukiyaki-don',
  'red-braised-beef-noodle-soup',
  'xinjiang-lamb-pilaf',
  'instant-pot-red-braised-duck-legs',
  'chinese-red-braised-beef',
  'instant-pot-oxtail-soup',
  'red-braised-lamb',
];

const finishRecipeIds = [
  'hong-shao-rou',
  'shanghai-sweet-sour-ribs',
  'oyster-sauce-braised-chicken',
  'coca-cola-chicken-wings',
];

test('audited active wet meat routes keep their Instant Pot pressure base', async () => {
  const { recipes } = await loadMealData();
  const byId = new Map(recipes.map((recipe) => [recipe.id, recipe]));

  assert.equal(new Set(wetMeatPressureRecipeIds).size, wetMeatPressureRecipeIds.length);
  for (const id of wetMeatPressureRecipeIds) {
    const recipe = byId.get(id);
    assert.ok(recipe, `${id} must remain an active indexed Recipe`);
    assert.ok(recipe.tags.includes('instant-pot'), `${id} must retain its Instant Pot tag`);
    assert.ok(recipe.equipment.some((item) => /instant pot|pressure cooker/i.test(item)), `${id} must list its pressure cooker`);
    assert.ok(recipe.steps.some((step) => /High Pressure|高压/i.test(step)), `${id} must pressure-cook the shared meat base`);
    assert.equal(
      recipe.equipment.some((item) => /covered pot|braiser|oven|soup pot/i.test(item)),
      false,
      `${id} must not list a stovetop or oven braiser for its meat-tenderizing route`,
    );
  }
});

test('pressure-based Finish choices stay after the shared pressure stage', async () => {
  const { recipes } = await loadMealData();
  const byId = new Map(recipes.map((recipe) => [recipe.id, recipe]));

  for (const id of finishRecipeIds) {
    const recipe = byId.get(id);
    assert.ok(recipe, `${id} must remain an active Recipe`);
    assert.ok(recipe.steps.some((step) => /High Pressure|高压/i.test(step)), `${id} must pressure-cook before Finish`);
    assert.ok(recipe.finishOptions.length > 0, `${id} must retain its Finish choices`);
    for (const finish of recipe.finishOptions) {
      assert.ok(finish.steps.length > 0, `${id}.${finish.id} must describe its late Finish`);
      assert.equal(
        finish.steps.some((step) => /High Pressure|自然泄压|快速泄压|natural release|quick release/i.test(step)),
        false,
        `${id}.${finish.id} must not move the shared pressure cook into Finish`,
      );
    }
  }
});

test('Shanghai sweet-sour ribs retain the shared identity and resolve both Finish names', async () => {
  const { recipes } = await loadMealData();
  const ribs = recipes.find((recipe) => recipe.id === 'shanghai-sweet-sour-ribs');

  assert.ok(ribs);
  assert.deepEqual(ribs.finishOptions.map((finish) => finish.id), ['sweet-sour', 'red-braise']);
  assert.equal(defaultFinishId(ribs), 'sweet-sour');
  assert.equal(resolvedRecipeName(ribs, 'sweet-sour'), '糖醋排骨');
  assert.equal(ribs.finishOptions.find((finish) => finish.id === 'red-braise')?.displayNameZh, '红烧排骨');
  assert.equal(resolvedRecipeName(ribs, 'red-braise'), '红烧排骨');
});
