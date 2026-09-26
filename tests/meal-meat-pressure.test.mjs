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
  'instant-pot-red-braised-duck-legs',
  'soy-braised-duck-wings',
  'chinese-red-braised-beef',
  'red-braised-lamb',
  'red-braised-pork-trotters',
];

const expandedFinishSets = {
  'shanghai-sweet-sour-ribs': ['sweet-sour', 'red-braise', 'thirteen-spice', 'adobo'],
  'oyster-sauce-braised-chicken': ['red-braise', 'teriyaki', 'adobo', 'cola', 'thirteen-spice'],
  'coca-cola-chicken-wings': ['cola', 'swiss', 'thirteen-spice', 'red-braise', 'teriyaki', 'adobo'],
  'instant-pot-red-braised-duck-legs': ['red-braise', 'adobo', 'thirteen-spice', 'cola', 'teriyaki'],
  'soy-braised-duck-wings': ['red-braise', 'adobo', 'thirteen-spice', 'cola', 'teriyaki'],
  'chinese-red-braised-beef': ['red-braise', 'thirteen-spice', 'adobo', 'black-pepper'],
  'red-braised-lamb': ['red-braise', 'thirteen-spice', 'cumin', 'adobo'],
  'red-braised-pork-trotters': ['red-braise', 'ginger-vinegar', 'thirteen-spice', 'adobo'],
};

const expectedResolvedFinishNames = {
  'shanghai-sweet-sour-ribs': {
    'sweet-sour': '糖醋排骨',
    'red-braise': '红烧排骨',
    'thirteen-spice': '十三香排骨',
    adobo: '醋香排骨',
  },
  'oyster-sauce-braised-chicken': {
    'red-braise': '红烧鸡腿 / 鸡小腿',
    teriyaki: '照烧鸡腿',
    adobo: '醋香焖鸡',
    cola: '可乐鸡腿',
    'thirteen-spice': '十三香鸡腿',
  },
  'coca-cola-chicken-wings': {
    cola: '可乐鸡翅',
    swiss: '瑞士鸡翼',
    'thirteen-spice': '十三香鸡翅',
    'red-braise': '红烧鸡翅',
    teriyaki: '照烧鸡翅',
    adobo: '醋香鸡翅',
  },
  'instant-pot-red-braised-duck-legs': {
    'red-braise': '红烧鸭腿',
    adobo: '醋香鸭腿',
    'thirteen-spice': '十三香鸭腿',
    cola: '可乐鸭腿',
    teriyaki: '照烧鸭腿',
  },
  'soy-braised-duck-wings': {
    'red-braise': '红烧鸭翅膀',
    adobo: '醋香鸭翅',
    'thirteen-spice': '十三香鸭翅',
    cola: '可乐鸭翅',
    teriyaki: '照烧鸭翅',
  },
  'chinese-red-braised-beef': {
    'red-braise': '红烧牛肉',
    'thirteen-spice': '十三香牛肉',
    adobo: '醋香牛肉',
    'black-pepper': '黑椒牛肉',
  },
  'red-braised-lamb': {
    'red-braise': '红烧羊肉',
    'thirteen-spice': '十三香羊肉',
    cumin: '孜然羊肉',
    adobo: '醋香羊肉',
  },
  'red-braised-pork-trotters': {
    'red-braise': '红烧猪蹄',
    'ginger-vinegar': '姜醋猪脚',
    'thirteen-spice': '十三香猪蹄',
    adobo: '醋香猪蹄',
  },
};

const pressureNeutralFinishRecipeIds = [
  'instant-pot-red-braised-duck-legs',
  'soy-braised-duck-wings',
  'chinese-red-braised-beef',
  'red-braised-lamb',
  'red-braised-pork-trotters',
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

test('expanded meat Recipes keep their exact local Finish sets and resolved names', async () => {
  const { recipes } = await loadMealData();
  const byId = new Map(recipes.map((recipe) => [recipe.id, recipe]));

  for (const [id, expectedIds] of Object.entries(expandedFinishSets)) {
    const recipe = byId.get(id);
    assert.ok(recipe, `${id} must remain active`);
    assert.deepEqual(recipe.finishOptions.map((finish) => finish.id), expectedIds, `${id} Finish IDs`);
    assert.equal(recipe.finishOptions.filter((finish) => finish.default).length, 1, `${id} must have one default`);
    for (const [finishId, expectedName] of Object.entries(expectedResolvedFinishNames[id])) {
      assert.equal(resolvedRecipeName(recipe, finishId), expectedName, `${id}.${finishId} resolved name`);
    }
  }

  const chicken = byId.get('oyster-sauce-braised-chicken');
  assert.equal(defaultFinishId(chicken), 'red-braise');
  assert.equal(chicken.finishOptions.some((finish) => ['oyster', 'soy'].includes(finish.id)), false);
});

test('shared-base red-braise Finish choices use soy and oyster sauce together', async () => {
  const { recipes } = await loadMealData();
  const recipeIds = [...Object.keys(expandedFinishSets), 'hong-shao-rou'];

  for (const id of recipeIds) {
    const recipe = recipes.find((entry) => entry.id === id);
    const redBraise = recipe?.finishOptions.find((finish) => finish.id === 'red-braise');
    assert.ok(redBraise, `${id} must have a red-braise Finish`);
    const ingredients = redBraise.cookIngredientLines.join(' ');
    assert.match(ingredients, /生抽|酱油/, `${id}.red-braise must include soy sauce`);
    assert.match(ingredients, /蚝油/, `${id}.red-braise must include oyster sauce`);
  }
});

test('duck, beef, lamb, and pork-feet pressure bases stay flavor-neutral before Finish', async () => {
  const { recipes } = await loadMealData();
  const byId = new Map(recipes.map((recipe) => [recipe.id, recipe]));
  const directionMarkers = /生抽|老抽|蚝油|酱油|红烧汁|绍兴酒|黑醋|米醋|照烧|可乐|十三香|孜然/;

  for (const id of pressureNeutralFinishRecipeIds) {
    const recipe = byId.get(id);
    assert.ok(recipe, `${id} must remain active`);
    assert.doesNotMatch(recipe.cookIngredientLines.join(' '), directionMarkers, `${id} shared pressure ingredients`);
    const pressureIndex = recipe.steps.findIndex((step) => /High Pressure|高压/i.test(step));
    assert.notEqual(pressureIndex, -1, `${id} must retain its pressure stage`);
    assert.doesNotMatch(recipe.steps.slice(0, pressureIndex + 1).join(' '), directionMarkers, `${id} pre-Finish pressure steps`);
    const finishIndex = recipe.steps.findIndex((step) => /按所选 Finish|所选 Finish 选项/.test(step));
    assert.ok(finishIndex > pressureIndex, `${id} Finish must follow pressure cooking`);
  }
});

test('lamb-leg coverage, standalone pork-feet composition, and red-braised pork base line remain intact', async () => {
  const { recipes } = await loadMealData();
  const byId = new Map(recipes.map((recipe) => [recipe.id, recipe]));
  const lamb = byId.get('red-braised-lamb');
  const cantonesePorkFeet = byId.get('cantonese-pork-feet-ginger-vinegar');
  const hongShaoRou = byId.get('hong-shao-rou');

  assert.ok(lamb?.requirements.some((requirement) => requirement.anyOf.includes('lamb-leg-chunks')));
  assert.ok(cantonesePorkFeet, 'the distinct Cantonese pork-feet Recipe must remain active');
  assert.ok(cantonesePorkFeet.requirements.some((requirement) => requirement.anyOf.includes('eggs')));
  assert.equal(hongShaoRou.cookIngredientLines.filter((line) => line.includes('基础焖煮液')).length, 1);
});

test('Shanghai sweet-sour ribs retain the shared identity and resolve both Finish names', async () => {
  const { recipes } = await loadMealData();
  const ribs = recipes.find((recipe) => recipe.id === 'shanghai-sweet-sour-ribs');

  assert.ok(ribs);
  assert.deepEqual(ribs.finishOptions.map((finish) => finish.id), ['sweet-sour', 'red-braise', 'thirteen-spice', 'adobo']);
  assert.equal(defaultFinishId(ribs), 'sweet-sour');
  assert.equal(resolvedRecipeName(ribs, 'sweet-sour'), '糖醋排骨');
  assert.equal(ribs.finishOptions.find((finish) => finish.id === 'red-braise')?.displayNameZh, '红烧排骨');
  assert.equal(resolvedRecipeName(ribs, 'red-braise'), '红烧排骨');
});
