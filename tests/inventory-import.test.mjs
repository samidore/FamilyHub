import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  INVENTORY_IMPORT_SCHEMA,
  INVENTORY_IMPORT_VERSION,
  applyInventoryImport,
  isValidInventoryImportDate,
  parseInventoryImport,
} from '../src/lib/inventoryImport.ts';

const ingredients = [
  { id: 'whole-pork-tenderloin', nameZh: '猪里脊', inventoryTracking: 'counted', inventoryFreshness: 'fifo', freezerBehavior: 'thaw-required', visible: true },
  { id: 'broccoli', nameZh: '西兰花', inventoryTracking: 'counted', inventoryFreshness: 'fifo', visible: true },
  { id: 'eggs', nameZh: '鸡蛋', inventoryTracking: 'presence-only', visible: true },
  { id: 'frozen-beef-patties', nameZh: '冷冻牛肉饼', inventoryTracking: 'counted', freezerBehavior: 'direct', visible: true },
  { id: 'steamed-buns', nameZh: '包子', inventoryTracking: 'presence-only', freezerBehavior: 'direct', visible: true },
  { id: 'hidden-pantry', nameZh: '隐藏调料', inventoryTracking: 'presence-only', visible: false },
];

const json = (overrides = {}) => JSON.stringify({
  schema: INVENTORY_IMPORT_SCHEMA,
  version: INVENTORY_IMPORT_VERSION,
  stocked_on: '2026-08-24',
  items: [],
  unmatched: [],
  ...overrides,
});

test('inventory import parses storage, merges only matching ingredient/storage rows, and surfaces unknown or hidden IDs as unmatched', () => {
  const result = parseInventoryImport(json({
    items: [
      { ingredient_id: 'whole-pork-tenderloin', quantity: 1, storage: 'inventory' },
      { ingredient_id: 'whole-pork-tenderloin', quantity: 0.5, storage: 'freezer' },
      { ingredient_id: 'whole-pork-tenderloin', quantity: 0.5, storage: 'freezer' },
      { ingredient_id: 'broccoli', quantity: 1 },
      { ingredient_id: 'broccoli', quantity: 0.5, storage: 'inventory' },
      { ingredient_id: 'frozen-beef-patties', quantity: 1 },
      { ingredient_id: 'missing-id', quantity: 1, storage: 'freezer' },
      { ingredient_id: 'hidden-pantry', quantity: 1 },
    ],
    unmatched: ['上海青苗'],
  }), ingredients, '2026-08-24');
  assert.equal(result.ok, true);
  assert.deepEqual(result.draft.items, [
    { ingredientId: 'whole-pork-tenderloin', quantity: 1, storage: 'inventory' },
    { ingredientId: 'whole-pork-tenderloin', quantity: 1, storage: 'freezer' },
    { ingredientId: 'broccoli', quantity: 1.5, storage: 'inventory' },
    { ingredientId: 'frozen-beef-patties', quantity: 1, storage: 'freezer' },
  ]);
  assert.deepEqual(result.draft.unmatched, [
    { label: '上海青苗', reason: 'producer-unmatched' },
    { label: 'missing-id', reason: 'invalid-ingredient-id' },
    { label: 'hidden-pantry', reason: 'invalid-ingredient-id' },
  ]);
});

test('inventory import validates storage against canonical freezer behavior while keeping legacy omitted storage compatible', () => {
  assert.equal(parseInventoryImport('{bad', ingredients, '2026-08-24').ok, false);
  assert.equal(parseInventoryImport(json({ schema: 'other' }), ingredients, '2026-08-24').ok, false);
  assert.equal(parseInventoryImport(json({ version: 2 }), ingredients, '2026-08-24').ok, false);
  assert.equal(parseInventoryImport(json({ items: [{ ingredient_id: 'broccoli', quantity: 0.25 }] }), ingredients, '2026-08-24').ok, false);
  assert.equal(parseInventoryImport(json({ items: [{ ingredient_id: 'broccoli', quantity: 1, storage: 'cold' }] }), ingredients, '2026-08-24').ok, false);
  assert.equal(parseInventoryImport(json({ items: [{ ingredient_id: 'broccoli', quantity: 1, storage: 'freezer' }] }), ingredients, '2026-08-24').ok, false);
  assert.equal(parseInventoryImport(json({ items: [{ ingredient_id: 'frozen-beef-patties', quantity: 1, storage: 'inventory' }] }), ingredients, '2026-08-24').ok, false);

  const thawRequiredDefault = parseInventoryImport(json({ items: [{ ingredient_id: 'whole-pork-tenderloin', quantity: 1 }] }), ingredients, '2026-08-24');
  assert.equal(thawRequiredDefault.ok, true);
  assert.equal(thawRequiredDefault.draft.items[0].storage, 'inventory');

  const directDefault = parseInventoryImport(json({ items: [{ ingredient_id: 'frozen-beef-patties', quantity: 1 }] }), ingredients, '2026-08-24');
  assert.equal(directDefault.ok, true);
  assert.equal(directDefault.draft.items[0].storage, 'freezer');

  assert.equal(parseInventoryImport(json({ stocked_on: '2026-02-31' }), ingredients, '2026-08-24').ok, false);
  assert.equal(parseInventoryImport(json({ stocked_on: '2026-08-25' }), ingredients, '2026-08-24').ok, false);
  assert.equal(isValidInventoryImportDate('2026-08-24', '2026-08-24'), true);
  assert.equal(isValidInventoryImportDate('2024-02-29', '2026-08-24'), true);
  assert.equal(isValidInventoryImportDate('2026-02-29', '2026-08-24'), false);
});

test('inventory import writes refrigerated, thaw-required freezer, and direct freezer stock atomically while preserving current meal', () => {
  const currentMeal = {
    mealId: 'meal-1', status: 'selecting', availableIngredientIds: ['broccoli'], ingredientFreshnessDates: { broccoli: '2026-08-20' },
    proteinTarget: 1, vegetableTarget: 1, stapleRequired: false, childMode: false, timePreference: 'any', selectedRecipeIds: [], recipeIngredientBindings: {}, selectedAddons: [], excludedIngredientIds: [], checkoutDraft: {}, checkoutRecipeDrafts: {},
  };
  const state = {
    inventory: { 'whole-pork-tenderloin': 1, broccoli: 1, eggs: true },
    inventoryBatches: {
      'whole-pork-tenderloin': { '2026-08-20': 1 },
      broccoli: { '2026-08-20': 1 },
    },
    freezerInventory: { 'whole-pork-tenderloin': 0.5 },
    freezerBatches: { 'whole-pork-tenderloin': { '2026-08-18': 0.5 } },
    thawingItems: {},
    discardedStock: {},
    currentMeal,
    pendingCheckoutMeals: [],
    activeStep: 'inventory',
    recentMeals: [],
  };
  const next = applyInventoryImport(state, {
    stockedOn: '2026-08-24',
    items: [
      { ingredientId: 'whole-pork-tenderloin', quantity: 1, storage: 'inventory' },
      { ingredientId: 'whole-pork-tenderloin', quantity: 2, storage: 'freezer' },
      { ingredientId: 'broccoli', quantity: 0.5, storage: 'inventory' },
      { ingredientId: 'eggs', quantity: 4, storage: 'inventory' },
      { ingredientId: 'frozen-beef-patties', quantity: 1.5, storage: 'freezer' },
      { ingredientId: 'steamed-buns', quantity: 1, storage: 'freezer' },
    ],
  }, ingredients, '2026-08-24');

  assert.deepEqual(next.inventory, {
    'whole-pork-tenderloin': 2,
    broccoli: 1.5,
    eggs: true,
    'frozen-beef-patties': 1.5,
    'steamed-buns': true,
  });
  assert.deepEqual(next.inventoryBatches, {
    'whole-pork-tenderloin': { '2026-08-20': 1, '2026-08-24': 1 },
    broccoli: { '2026-08-20': 1, '2026-08-24': 0.5 },
  });
  assert.deepEqual(next.freezerInventory, { 'whole-pork-tenderloin': 2.5 });
  assert.deepEqual(next.freezerBatches, {
    'whole-pork-tenderloin': { '2026-08-18': 0.5, '2026-08-24': 2 },
    'frozen-beef-patties': { '2026-08-24': 1.5 },
  });
  assert.deepEqual(next.currentMeal, currentMeal);
  assert.equal(next.activeStep, 'inventory');
});

test('inventory import protocol documents storage-aware review and Meal Builder mounts review confirmation UI', async () => {
  const [protocol, layout, component] = await Promise.all([
    readFile('docs/modules/meal-builder/inventory-import.md', 'utf8'),
    readFile('src/layouts/BaseLayout.astro', 'utf8'),
    readFile('src/components/MealInventoryImport.astro', 'utf8'),
  ]);
  assert.match(protocol, /whole-pork-tenderloin[^\n]*2 inventory units/);
  assert.match(protocol, /storage/);
  assert.match(protocol, /freezer/);
  assert.match(layout, /MealInventoryImport/);
  assert.match(layout, /meal-builder-page/);
  assert.match(component, /meal-inventory-import-json/);
  assert.match(component, /meal-inventory-import-review/);
  assert.match(component, /dataset\.importStorage/);
  assert.match(component, /meal-inventory-import-dialog/);
  assert.match(component, /applyInventoryImport/);
  assert.match(component, /repository\.transaction/);
});
