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
  { id: 'whole-pork-tenderloin', nameZh: '猪里脊', inventoryTracking: 'counted', inventoryFreshness: 'fifo', visible: true },
  { id: 'broccoli', nameZh: '西兰花', inventoryTracking: 'counted', inventoryFreshness: 'fifo', visible: true },
  { id: 'eggs', nameZh: '鸡蛋', inventoryTracking: 'presence-only', visible: true },
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

test('inventory import parses, merges duplicate IDs, and surfaces unknown or hidden IDs as unmatched', () => {
  const result = parseInventoryImport(json({
    items: [
      { ingredient_id: 'whole-pork-tenderloin', quantity: 2 },
      { ingredient_id: 'broccoli', quantity: 1 },
      { ingredient_id: 'broccoli', quantity: 0.5 },
      { ingredient_id: 'missing-id', quantity: 1 },
      { ingredient_id: 'hidden-pantry', quantity: 1 },
    ],
    unmatched: ['上海青苗'],
  }), ingredients, '2026-08-24');
  assert.equal(result.ok, true);
  assert.deepEqual(result.draft.items, [
    { ingredientId: 'whole-pork-tenderloin', quantity: 2 },
    { ingredientId: 'broccoli', quantity: 1.5 },
  ]);
  assert.deepEqual(result.draft.unmatched, [
    { label: '上海青苗', reason: 'producer-unmatched' },
    { label: 'missing-id', reason: 'invalid-ingredient-id' },
    { label: 'hidden-pantry', reason: 'invalid-ingredient-id' },
  ]);
});

test('inventory import rejects malformed contracts, invalid quantities, impossible dates, and future dates', () => {
  assert.equal(parseInventoryImport('{bad', ingredients, '2026-08-24').ok, false);
  assert.equal(parseInventoryImport(json({ schema: 'other' }), ingredients, '2026-08-24').ok, false);
  assert.equal(parseInventoryImport(json({ version: 2 }), ingredients, '2026-08-24').ok, false);
  assert.equal(parseInventoryImport(json({ items: [{ ingredient_id: 'broccoli', quantity: 0.25 }] }), ingredients, '2026-08-24').ok, false);
  assert.equal(parseInventoryImport(json({ stocked_on: '2026-02-31' }), ingredients, '2026-08-24').ok, false);
  assert.equal(parseInventoryImport(json({ stocked_on: '2026-08-25' }), ingredients, '2026-08-24').ok, false);
  assert.equal(isValidInventoryImportDate('2026-08-24', '2026-08-24'), true);
  assert.equal(isValidInventoryImportDate('2024-02-29', '2026-08-24'), true);
  assert.equal(isValidInventoryImportDate('2026-02-29', '2026-08-24'), false);
});

test('inventory import is additive, uses reviewed FIFO date, keeps presence-only idempotent, and preserves the current meal', () => {
  const currentMeal = {
    mealId: 'meal-1', status: 'selecting', availableIngredientIds: ['broccoli'], ingredientFreshnessDates: { broccoli: '2026-08-20' },
    proteinTarget: 1, vegetableTarget: 1, stapleRequired: false, childMode: false, timePreference: 'any', selectedRecipeIds: [], recipeIngredientBindings: {}, selectedAddons: [], excludedIngredientIds: [], checkoutDraft: {},
  };
  const state = {
    inventory: { 'whole-pork-tenderloin': 1, broccoli: 1, eggs: true },
    inventoryBatches: {
      'whole-pork-tenderloin': { '2026-08-20': 1 },
      broccoli: { '2026-08-20': 1 },
    },
    currentMeal,
    activeStep: 'inventory',
    recentMeals: [],
  };
  const next = applyInventoryImport(state, {
    stockedOn: '2026-08-24',
    items: [
      { ingredientId: 'whole-pork-tenderloin', quantity: 2 },
      { ingredientId: 'broccoli', quantity: 0.5 },
      { ingredientId: 'eggs', quantity: 4 },
    ],
  }, ingredients, '2026-08-24');
  assert.deepEqual(next.inventory, { 'whole-pork-tenderloin': 3, broccoli: 1.5, eggs: true });
  assert.deepEqual(next.inventoryBatches, {
    'whole-pork-tenderloin': { '2026-08-20': 1, '2026-08-24': 2 },
    broccoli: { '2026-08-20': 1, '2026-08-24': 0.5 },
  });
  assert.deepEqual(next.currentMeal, currentMeal);
  assert.equal(next.activeStep, 'inventory');
});

test('inventory import protocol keeps the only current quantity exception and page integrates review confirmation UI', async () => {
  const [protocol, page] = await Promise.all([
    readFile('docs/modules/meal-builder/inventory-import.md', 'utf8'),
    readFile('src/pages/meal-builder.astro', 'utf8'),
  ]);
  assert.match(protocol, /whole-pork-tenderloin[^\n]*2 inventory units/);
  assert.match(page, /meal-inventory-import-json/);
  assert.match(page, /meal-inventory-import-review/);
  assert.match(page, /meal-inventory-import-dialog/);
  assert.match(page, /applyInventoryImport/);
});
