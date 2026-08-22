import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  LEGACY_FIFO_MIGRATION_DATE,
  applyCheckout,
  createCurrentMealFromInventory,
  normalizeHouseholdState,
  reconcileInventoryBatchState,
} from '../src/lib/household.ts';
import {
  STALE_INGREDIENT_PRIORITY_DAYS,
  freshnessAgeDays,
  rankCandidates,
} from '../src/lib/mealEngine.ts';

const ingredients = [
  { id: 'old-meat', inventoryTracking: 'counted', inventoryFreshness: 'fifo' },
  { id: 'fresh-meat', inventoryTracking: 'counted', inventoryFreshness: 'fifo' },
  { id: 'old-veg', inventoryTracking: 'counted', inventoryFreshness: 'fifo', childCoverage: { vegetable: false } },
  { id: 'child-veg', inventoryTracking: 'counted', inventoryFreshness: 'fifo', childCoverage: { vegetable: true } },
  { id: 'frozen', inventoryTracking: 'counted' },
  { id: 'eggs', inventoryTracking: 'presence-only' },
];

const recipe = (id, anyOf, contribution, options = {}) => ({
  id,
  order: options.order ?? 10,
  fitScore: options.fitScore ?? 3,
  contribution: { protein: contribution.protein ?? 0, vegetable: contribution.vegetable ?? 0, staple: contribution.staple ?? 0 },
  childCoverage: options.childCoverage ?? { protein: false, vegetable: false },
  requirements: [{ anyOf, role: options.role ?? (contribution.vegetable ? 'vegetable' : 'main-protein') }],
  mealWindowMinutes: '30',
  elapsedMinutes: '30',
  advanceStartRequired: false,
});

const baseMealState = (availableIngredientIds, ingredientFreshnessDates = {}) => ({
  availableIngredientIds,
  ingredientFreshnessDates,
  proteinTarget: 1,
  vegetableTarget: 1,
  stapleRequired: false,
  childMode: false,
  timePreference: 'any',
  selectedRecipeIds: [],
  recipeIngredientBindings: {},
});

test('legacy FIFO inventory migrates to the canonical three-days-ago batch without touching untracked stock', () => {
  const normalized = normalizeHouseholdState({ inventory: { 'old-meat': 1.5, frozen: 2, eggs: true } }, ingredients);
  assert.equal(LEGACY_FIFO_MIGRATION_DATE, '2026-08-18');
  assert.deepEqual(normalized.inventoryBatches, { 'old-meat': { '2026-08-18': 1.5 } });
  assert.deepEqual(normalized.inventory, { 'old-meat': 1.5, frozen: 2, eggs: true });
});

test('new stock merges on the same date, creates a new date batch later, and manual decreases consume FIFO', () => {
  const initial = normalizeHouseholdState({
    inventory: { 'old-meat': 1 },
    inventoryBatches: { 'old-meat': { '2026-08-19': 1 } },
  }, ingredients);

  const plusHalf = reconcileInventoryBatchState(initial, { ...initial, inventory: { 'old-meat': 1.5 } }, ingredients, '2026-08-21');
  assert.deepEqual(plusHalf.inventoryBatches['old-meat'], { '2026-08-19': 1, '2026-08-21': 0.5 });

  const plusSameDay = reconcileInventoryBatchState(plusHalf, { ...plusHalf, inventory: { 'old-meat': 2 } }, ingredients, '2026-08-21');
  assert.deepEqual(plusSameDay.inventoryBatches['old-meat'], { '2026-08-19': 1, '2026-08-21': 1 });

  const plusNextDay = reconcileInventoryBatchState(plusSameDay, { ...plusSameDay, inventory: { 'old-meat': 2.5 } }, ingredients, '2026-08-22');
  assert.deepEqual(plusNextDay.inventoryBatches['old-meat'], { '2026-08-19': 1, '2026-08-21': 1, '2026-08-22': 0.5 });

  const minus = reconcileInventoryBatchState(plusNextDay, { ...plusNextDay, inventory: { 'old-meat': 1.5 } }, ingredients, '2026-08-22');
  assert.deepEqual(minus.inventoryBatches['old-meat'], { '2026-08-21': 1, '2026-08-22': 0.5 });
});

test('checkout consumes freshness batches FIFO in the same atomic state transition', () => {
  const inventory = { 'old-meat': 2 };
  const inventoryBatches = { 'old-meat': { '2026-08-17': 1, '2026-08-21': 1 } };
  const meal = {
    ...createCurrentMealFromInventory(inventory, { mealId: 'meal-fifo' }, ingredients, inventoryBatches),
    status: 'cooking',
    selectedRecipeIds: ['meat-recipe'],
    recipeIngredientBindings: { 'meat-recipe': ['old-meat'] },
  };
  const state = { inventory, inventoryBatches, currentMeal: meal, activeStep: 'checkout', recentMeals: [] };
  const result = applyCheckout(state, meal.mealId, { 'old-meat': 1.5 }, ingredients, { nextMealId: 'next', completedAt: 2 });
  assert.equal(result.committed, true);
  assert.deepEqual(result.state.inventory, { 'old-meat': 0.5 });
  assert.deepEqual(result.state.inventoryBatches, { 'old-meat': { '2026-08-21': 0.5 } });
});

test('current meal freezes oldest freshness dates independently from later inventory edits', () => {
  const meal = createCurrentMealFromInventory(
    { 'old-meat': 2 },
    { mealId: 'snapshot' },
    ingredients,
    { 'old-meat': { '2026-08-17': 1, '2026-08-21': 1 } },
  );
  assert.deepEqual(meal.ingredientFreshnessDates, { 'old-meat': '2026-08-17' });

  const changed = reconcileInventoryBatchState(
    normalizeHouseholdState({ inventory: { 'old-meat': 2 }, inventoryBatches: { 'old-meat': { '2026-08-17': 1, '2026-08-21': 1 } } }, ingredients),
    normalizeHouseholdState({ inventory: { 'old-meat': 1 }, inventoryBatches: { 'old-meat': { '2026-08-17': 1, '2026-08-21': 1 } } }, ingredients),
    ingredients,
    '2026-08-21',
  );
  assert.deepEqual(changed.inventoryBatches, { 'old-meat': { '2026-08-21': 1 } });
  assert.deepEqual(meal.ingredientFreshnessDates, { 'old-meat': '2026-08-17' });
});

test('freshness priority is strictly older than three calendar days', () => {
  assert.equal(STALE_INGREDIENT_PRIORITY_DAYS, 3);
  assert.equal(freshnessAgeDays('2026-08-18', '2026-08-21'), 3);
  assert.equal(freshnessAgeDays('2026-08-17', '2026-08-21'), 4);

  const threeDay = recipe('three-day', ['old-meat'], { protein: 1 }, { order: 20 });
  const fresh = recipe('fresh', ['fresh-meat'], { protein: 1 }, { order: 10 });
  const stateAtThreeDays = baseMealState(['old-meat', 'fresh-meat'], { 'old-meat': '2026-08-18', 'fresh-meat': '2026-08-21' });
  assert.deepEqual(rankCandidates([threeDay, fresh], stateAtThreeDays, ingredients, {}, [], '2026-08-21').map((item) => item.id), ['fresh', 'three-day']);

  const stateAtFourDays = baseMealState(['old-meat', 'fresh-meat'], { 'old-meat': '2026-08-17', 'fresh-meat': '2026-08-21' });
  assert.deepEqual(rankCandidates([threeDay, fresh], stateAtFourDays, ingredients, {}, [], '2026-08-21').map((item) => item.id), ['three-day', 'fresh']);
});

test('meal correctness outranks stale inventory, then stale inventory outranks repetition', () => {
  const staleVegetableOnly = recipe('stale-veg', ['old-veg'], { vegetable: 1 }, { order: 20 });
  const freshMixed = recipe('fresh-mixed', ['fresh-meat'], { protein: 1, vegetable: 1 }, { order: 30 });
  const correctnessState = baseMealState(['old-veg', 'fresh-meat'], { 'old-veg': '2026-08-17', 'fresh-meat': '2026-08-21' });
  assert.deepEqual(rankCandidates([staleVegetableOnly, freshMixed], correctnessState, ingredients, {}, [], '2026-08-21').map((item) => item.id), ['fresh-mixed', 'stale-veg']);

  const staleProtein = recipe('stale-protein', ['old-meat'], { protein: 1 }, { order: 20 });
  const freshProtein = recipe('fresh-protein', ['fresh-meat'], { protein: 1 }, { order: 10 });
  const freshnessState = baseMealState(['old-meat', 'fresh-meat'], { 'old-meat': '2026-08-17', 'fresh-meat': '2026-08-21' });
  assert.deepEqual(rankCandidates([staleProtein, freshProtein], freshnessState, ingredients, {}, [['stale-protein']], '2026-08-21').map((item) => item.id), ['stale-protein', 'fresh-protein']);
});

test('one_of prefers older stock only when that does not lose required child coverage', () => {
  const chooseVegetable = recipe('choose-veg', ['child-veg', 'old-veg'], { vegetable: 1 }, {
    childCoverage: { protein: false, vegetable: 'ingredient-dependent' },
    role: 'vegetable',
  });
  const state = {
    ...baseMealState(['child-veg', 'old-veg'], { 'child-veg': '2026-08-21', 'old-veg': '2026-08-17' }),
    proteinTarget: 1,
    vegetableTarget: 1,
    childMode: true,
  };
  const draftBindings = {};
  const ranked = rankCandidates([chooseVegetable], state, ingredients, draftBindings, [], '2026-08-21');
  assert.deepEqual(ranked.map((item) => item.id), ['choose-veg']);
  assert.deepEqual(draftBindings['choose-veg'], ['child-veg']);
});

test('Recipes shows only compact hourglass 临期 freshness badges', async () => {
  const page = await readFile('src/pages/meal-builder.astro', 'utf8');
  assert.match(page, /data-selected-freshness-badge/);
  assert.match(page, /data-candidate-freshness-badge/);
  assert.equal(page.match(/data-freshness-icon="hourglass"/g)?.length, 2);
  assert.equal(page.match(/<span>临期<\/span>/g)?.length, 2);
  assert.match(page, /freshnessAgeDays\(state\.ingredientFreshnessDates/);
  assert.match(page, /> STALE_INGREDIENT_PRIORITY_DAYS/);
  assert.doesNotMatch(page, /优先消耗/);
  assert.doesNotMatch(page, /最老\s*\d+\s*天/);
});
