import assert from 'node:assert/strict';
import test from 'node:test';
import { parse, stringify } from 'yaml';
import { readMealFiles } from '../scripts/load-meal-data.mjs';
import { inspect, nextOrder, references, verifyItem } from '../.agents/skills/manage-meal-data/scripts/meal-data.mjs';
import { parseMealFiles } from '../src/data/mealParser.mjs';

const recipePath = 'recipe/chicken/chicken-teriyaki-thighs.yaml';

async function withCookableRecipe(change = () => {}) {
  const files = await readMealFiles();
  const record = parse(files[recipePath]);
  record.detail_level = 'cookable';
  record.cook_ingredients = ['鸡腿肉：500 g', '照烧汁：60 mL'];
  change(record);
  return { ...files, [recipePath]: stringify(record) };
}

test('cookable Recipe preserves display-only Cook View lines at runtime', async () => {
  const data = parseMealFiles(await withCookableRecipe());
  assert.deepEqual(data.recipes.find((recipe) => recipe.id === 'chicken-teriyaki-thighs').cookIngredientLines, ['鸡腿肉：500 g', '照烧汁：60 mL']);
});

test('cookable Recipe rejects missing Cook View lines, steps, or equipment', async () => {
  await assert.rejects(async () => parseMealFiles(await withCookableRecipe((record) => { record.cook_ingredients = []; })), /cook_ingredients/);
  await assert.rejects(async () => parseMealFiles(await withCookableRecipe((record) => { record.steps = []; })), /requires executable steps/);
  await assert.rejects(async () => parseMealFiles(await withCookableRecipe((record) => { record.equipment = []; })), /requires equipment/);
  await assert.rejects(async () => parseMealFiles(await withCookableRecipe((record) => { record.fit_score = 6; })), /fit_score/);
});

test('operational Recipe requirements reject obsolete tracking fields', async () => {
  for (const field of ['availability', 'pantry_core', 'amount', 'preparation']) {
    await assert.rejects(async () => parseMealFiles(await withCookableRecipe((record) => { record.ingredients[0][field] = field === 'availability' ? 'required' : 'legacy'; })), /unknown fields/);
  }
});

test('Ingredient inventory tracking is data-driven rather than ID-whitelisted', async () => {
  const files = await readMealFiles();
  const chicken = parse(files['ingredients/chicken.yaml']);
  const ingredient = chicken.ingredients.find((item) => item.inventory_tracking === 'counted');
  delete ingredient.inventory_freshness;
  ingredient.inventory_tracking = 'presence-only';
  const data = parseMealFiles({ ...files, 'ingredients/chicken.yaml': stringify(chicken) });
  assert.equal(data.ingredients.find((item) => item.id === ingredient.id)?.inventoryTracking, 'presence-only');
});

test('all migrated Recipes keep Cook View text separate from operational requirements', async () => {
  const files = await readMealFiles();
  const data = parseMealFiles(files);
  assert.equal(data.recipes.every((recipe) => recipe.detailLevel === 'cookable'), true);
  assert.equal(data.recipes.every((recipe) => recipe.cookIngredientLines.length > 0), true);
  assert.equal(data.recipes.find((recipe) => recipe.id === 'hainanese-chicken-rice').cookIngredientLines.includes('整鸡：1只，约1.5 kg（3–3.5 lb）'), true);
  assert.equal(Object.entries(files).filter(([file]) => file.startsWith('recipe/') && !file.endsWith('index.yaml')).every(([, text]) => {
    const recipe = parse(text);
    return recipe.ingredients.every((entry) => !('availability' in entry) && !('amount' in entry) && !('preparation' in entry) && !('pantry_core' in entry));
  }), true);
});

test('vegetable-centered is an explicit Recipe tag', async () => {
  const data = parseMealFiles(await readMealFiles());
  const vegetable = data.recipes.find((item) => item.id === 'simple-stir-fried-leafy-greens');
  const chicken = data.recipes.find((item) => item.id === 'chicken-teriyaki-thighs');
  assert.equal(vegetable?.tags.includes('vegetable-centered'), true);
  assert.equal(vegetable?.vegetableCentered, true);
  assert.equal(chicken?.vegetableCentered, false);
});

test('active Meal Builder records exclude retired metadata', async () => {
  const files = await readMealFiles();
  for (const [path, text] of Object.entries(files)) {
    if (!path.startsWith('ingredients/') && !(path.startsWith('recipe/') && !path.endsWith('index.yaml'))) continue;
    const record = parse(text);
    for (const field of ['fit', 'evidence', 'notes']) assert.equal(field in record, false, `${path} retains ${field}`);
  }
});

test('active capability tags are data-driven rather than count-gated', async () => {
  const files = await readMealFiles();
  const chicken = parse(files['ingredients/chicken.yaml']);
  const ingredient = chicken.ingredients.find((item) => !item.tags?.includes('easy-braise-addon'));
  ingredient.tags = [...(ingredient.tags ?? []), 'easy-braise-addon'];
  const recipe = parse(files['recipe/chicken/instant-pot-soy-chicken-thighs.yaml']);
  recipe.tags = [...(recipe.tags ?? []), 'iron-pan-braise'];
  assert.doesNotThrow(() => parseMealFiles({
    ...files,
    'ingredients/chicken.yaml': stringify(chicken),
    'recipe/chicken/instant-pot-soy-chicken-thighs.yaml': stringify(recipe),
  }));
});

test('archived tagged records do not change active easy-braise or iron-pan membership', async () => {
  const files = await readMealFiles();
  const before = parseMealFiles(files);
  const ingredient = parse(files['ingredients/chicken.yaml']).ingredients[0];
  ingredient.id = 'archived-easy-braise'; ingredient.status = 'archived'; ingredient.starter.order = 9999; ingredient.tags = ['easy-braise-addon'];
  const recipe = parse(files[recipePath]);
  recipe.id = 'archived-iron-pan'; recipe.status = 'archived'; recipe.tags = ['iron-pan-braise'];
  const data = parseMealFiles({
    ...files,
    'archive/ingredients/archived-easy-braise.yaml': stringify(ingredient),
    'archive/recipe/archived-iron-pan.yaml': stringify(recipe),
  });
  const easyBraiseIds = (value) => value.ingredients.filter((item) => item.tags.includes('easy-braise-addon')).map((item) => item.id).sort();
  const ironPanIds = (value) => value.recipes.filter((item) => item.tags.includes('iron-pan-braise')).map((item) => item.id).sort();
  assert.deepEqual(easyBraiseIds(data), easyBraiseIds(before));
  assert.deepEqual(ironPanIds(data), ironPanIds(before));
});

test('read-only maintenance helper inspects names, references, ordering, and validation', async () => {
  const files = await readMealFiles();
  const chickenRecipes = parse(files['recipe/chicken/index.yaml']).recipes;
  const recipeOrder = await nextOrder('recipe', 'chicken');
  assert.equal((await inspect('chicken teriyaki'))[0].id, 'chicken-teriyaki-thighs');
  assert((await references('chicken-teriyaki-thighs')).some((hit) => hit.path === 'recipe/chicken/index.yaml'));
  assert.equal((await nextOrder('ingredient', 'chicken')).order % 10, 0);
  assert.equal(recipeOrder.after_id, chickenRecipes.at(-1));
  assert.equal(recipeOrder.append_position, chickenRecipes.length + 1);
  assert.equal((await verifyItem('chicken-teriyaki-thighs')).valid, true);
});
