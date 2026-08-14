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
  await assert.doesNotReject(async () => parseMealFiles(await withCookableRecipe((record) => { record.evidence.sources = []; })));
});

test('operational Recipe requirements reject obsolete tracking fields', async () => {
  for (const field of ['availability', 'pantry_core', 'amount', 'preparation']) {
    await assert.rejects(async () => parseMealFiles(await withCookableRecipe((record) => { record.ingredients[0][field] = field === 'availability' ? 'required' : 'legacy'; })), /unknown fields/);
  }
});

test('all migrated Recipes keep Cook View text separate from operational requirements', async () => {
  const files = await readMealFiles();
  const data = parseMealFiles(files);
  assert.equal(data.recipes.length, 163);
  assert.equal(data.recipes.every((recipe) => recipe.detailLevel === 'cookable'), true);
  assert.equal(data.recipes.every((recipe) => recipe.cookIngredientLines.length > 0), true);
  assert.equal(data.recipes.find((recipe) => recipe.id === 'hainanese-chicken-rice').cookIngredientLines.includes('整鸡：1只，约1.5 kg（3–3.5 lb）'), true);
  assert.equal(Object.entries(files).filter(([file]) => file.startsWith('recipe/') && !file.endsWith('index.yaml')).every(([, text]) => {
    const recipe = parse(text);
    return recipe.ingredients.every((entry) => !('availability' in entry) && !('amount' in entry) && !('preparation' in entry) && !('pantry_core' in entry));
  }), true);
});

test('read-only maintenance helper inspects names, references, ordering, and validation', async () => {
  assert.equal((await inspect('chicken teriyaki'))[0].id, 'chicken-teriyaki-thighs');
  assert((await references('chicken-teriyaki-thighs')).some((hit) => hit.path === 'recipe/chicken/index.yaml'));
  assert.equal((await nextOrder('ingredient', 'chicken')).order % 10, 0);
  assert.equal((await nextOrder('recipe', 'chicken')).after_id, 'hainanese-chicken-rice');
  assert.equal((await verifyItem('chicken-teriyaki-thighs')).valid, true);
});
