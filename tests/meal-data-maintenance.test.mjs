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
  record.ingredients.find((entry) => entry.availability === 'required').amount = '500 g';
  record.ingredients.find((entry) => entry.availability === 'required').preparation = 'cut into bite-size pieces';
  record.ingredients.find((entry) => entry.availability === 'assumed').amount = '60 mL';
  record.evidence.sources.push('https://www.justonecookbook.com/chicken-teriyaki/');
  change(record);
  return { ...files, [recipePath]: stringify(record) };
}

test('cookable Recipe preserves amount and preparation at runtime', async () => {
  const data = parseMealFiles(await withCookableRecipe());
  const requirement = data.recipes.find((recipe) => recipe.id === 'chicken-teriyaki-thighs').requirements[0];
  assert.equal(requirement.amount, '500 g');
  assert.equal(requirement.preparation, 'cut into bite-size pieces');
  assert.equal(data.recipes.find((recipe) => recipe.id === 'chicken-teriyaki-thighs').cookIngredients[1].amount, '60 mL');
});

test('cookable Recipe rejects missing amount, steps, equipment, or direct source', async () => {
  await assert.rejects(async () => parseMealFiles(await withCookableRecipe((record) => { delete record.ingredients[0].amount; })), /require amounts/);
  await assert.rejects(async () => parseMealFiles(await withCookableRecipe((record) => { record.steps = []; })), /requires executable steps/);
  await assert.rejects(async () => parseMealFiles(await withCookableRecipe((record) => { record.equipment = []; })), /requires equipment/);
  await assert.rejects(async () => parseMealFiles(await withCookableRecipe((record) => { record.evidence.sources = ['Source title']; })), /direct HTTPS/);
});

test('discoverable Recipes remain compatible without amounts or URL sources', async () => {
  const data = parseMealFiles(await readMealFiles());
  assert.equal(data.recipes.length, 162);
  assert.equal(data.recipes.every((recipe) => recipe.detailLevel === 'discoverable'), true);
});

test('read-only maintenance helper inspects names, references, ordering, and validation', async () => {
  assert.equal((await inspect('chicken teriyaki'))[0].id, 'chicken-teriyaki-thighs');
  assert((await references('chicken-teriyaki-thighs')).some((hit) => hit.path === 'recipe/chicken/index.yaml'));
  assert.equal((await nextOrder('ingredient', 'chicken')).order % 10, 0);
  assert.equal((await nextOrder('recipe', 'chicken')).after_id, 'hainanese-chicken-rice');
  assert.equal((await verifyItem('chicken-teriyaki-thighs')).valid, true);
});
