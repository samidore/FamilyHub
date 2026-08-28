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
  delete ingredient.freshness_priority_days;
  ingredient.inventory_tracking = 'presence-only';
  const data = parseMealFiles({ ...files, 'ingredients/chicken.yaml': stringify(chicken) });
  assert.equal(data.ingredients.find((item) => item.id === ingredient.id)?.inventoryTracking, 'presence-only');
});

test('FIFO freshness requires an explicit positive integer priority threshold', async () => {
  const files = await readMealFiles();
  const chicken = parse(files['ingredients/chicken.yaml']);
  const tracked = chicken.ingredients.find((item) => item.inventory_freshness === 'fifo');
  delete tracked.freshness_priority_days;
  await assert.rejects(async () => parseMealFiles({ ...files, 'ingredients/chicken.yaml': stringify(chicken) }), /freshness_priority_days/);

  const chickenWithDetachedThreshold = parse(files['ingredients/chicken.yaml']);
  const untracked = chickenWithDetachedThreshold.ingredients.find((item) => item.inventory_freshness === undefined);
  untracked.freshness_priority_days = 5;
  await assert.rejects(async () => parseMealFiles({ ...files, 'ingredients/chicken.yaml': stringify(chickenWithDetachedThreshold) }), /requires inventory_freshness/);
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

test('optional-group membership is centralized and data-driven rather than count-gated', async () => {
  const files = await readMealFiles();
  const registry = parse(files['optional-groups.yaml']);
  registry.optional_groups.find((group) => group.id === 'change-it-up').ingredients.push({ ingredient_id: 'eggs', meal_contribution: { protein: 0.5, vegetable: 0, staple: 0 }, checkout_units: 1 });
  const recipe = parse(files['recipe/chicken/instant-pot-soy-chicken-thighs.yaml']);
  recipe.optional_groups = [...(recipe.optional_groups ?? []), 'change-it-up'];
  const data = parseMealFiles({ ...files, 'optional-groups.yaml': stringify(registry), 'recipe/chicken/instant-pot-soy-chicken-thighs.yaml': stringify(recipe) });
  assert.equal(data.optionalGroups.find((group) => group.id === 'change-it-up').ingredients.some((entry) => entry.ingredientId === 'eggs'), true);
  assert.equal(data.recipes.find((item) => item.id === 'instant-pot-soy-chicken-thighs').optionalGroupIds.includes('change-it-up'), true);
});

test('archived optional-group references do not change the active Recipe scope', async () => {
  const files = await readMealFiles();
  const before = parseMealFiles(files);
  const archived = parse(files[recipePath]);
  archived.id = 'archived-one-pot-recipe';
  archived.status = 'archived';
  archived.optional_groups = ['one-pot-mix'];
  const data = parseMealFiles({ ...files, 'archive/recipe/archived-one-pot-recipe.yaml': stringify(archived) });
  const activeOnePot = (value) => value.recipes.filter((item) => item.optionalGroupIds.includes('one-pot-mix')).map((item) => item.id).sort();
  assert.deepEqual(activeOnePot(data), activeOnePot(before));
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
