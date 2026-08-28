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
  freshnessAgeDays,
  freshnessPriorityAgeDays,
  rankCandidates,
} from '../src/lib/mealEngine.ts';

const ingredients = [
  { id: 'old-meat', inventoryTracking: 'counted', inventoryFreshness: 'fifo', freshnessPriorityDays: 3 },
  { id: 'fresh-meat', inventoryTracking: 'counted', inventoryFreshness: 'fifo', freshnessPriorityDays: 3 },
  { id: 'old-veg', inventoryTracking: 'counted', inventoryFreshness: 'fifo', freshnessPriorityDays: 5, childCoverage: { vegetable: false } },
  { id: 'child-veg', inventoryTracking: 'counted', inventoryFreshness: 'fifo', freshnessPriorityDays: 5, childCoverage: { vegetable: true } },
  { id: 'old-tofu', inventoryTracking: 'counted', inventoryFreshness: 'fifo', freshnessPriorityDays: 7 },
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

test('freshness priority uses strict per-Ingredient thresholds for meat, vegetables, and tofu', () => {
  assert.equal(freshnessAgeDays('2026-08-18', '2026-08-21'), 3);
  assert.equal(freshnessPriorityAgeDays(['old-meat'], { 'old-meat': '2026-08-18' }, ingredients, '2026-08-21'), 0);
  assert.equal(freshnessPriorityAgeDays(['old-meat'], { 'old-meat': '2026-08-17' }, ingredients, '2026-08-21'), 4);
  assert.equal(freshnessPriorityAgeDays(['old-veg'], { 'old-veg': '2026-08-16' }, ingredients, '2026-08-21'), 0);
  assert.equal(freshnessPriorityAgeDays(['old-veg'], { 'old-veg': '2026-08-15' }, ingredients, '2026-08-21'), 6);
  assert.equal(freshnessPriorityAgeDays(['old-tofu'], { 'old-tofu': '2026-08-14' }, ingredients, '2026-08-21'), 0);
  assert.equal(freshnessPriorityAgeDays(['old-tofu'], { 'old-tofu': '2026-08-13' }, ingredients, '2026-08-21'), 8);

  const thresholdMeat = recipe('threshold-meat', ['old-meat'], { protein: 1 }, { order: 20 });
  const fresh = recipe('fresh', ['fresh-meat'], { protein: 1 }, { order: 10 });
  const stateAtThreeDays = baseMealState(['old-meat', 'fresh-meat'], { 'old-meat': '2026-08-18', 'fresh-meat': '2026-08-21' });
  assert.deepEqual(rankCandidates([thresholdMeat, fresh], stateAtThreeDays, ingredients, {}, [], '2026-08-21').map((item) => item.id), ['fresh', 'threshold-meat']);

  const stateAtFourDays = baseMealState(['old-meat', 'fresh-meat'], { 'old-meat': '2026-08-17', 'fresh-meat': '2026-08-21' });
  assert.deepEqual(rankCandidates([thresholdMeat, fresh], stateAtFourDays, ingredients, {}, [], '2026-08-21').map((item) => item.id), ['threshold-meat', 'fresh']);
});

test('stale candidates rank before otherwise stronger fresh candidates and before repetition', () => {
  const staleVegetableOnly = recipe('stale-veg', ['old-veg'], { vegetable: 1 }, { order: 20 });
  const freshMixed = recipe('fresh-mixed', ['fresh-meat'], { protein: 1, vegetable: 1 }, { order: 30 });
  const correctnessState = baseMealState(['old-veg', 'fresh-meat'], { 'old-veg': '2026-08-15', 'fresh-meat': '2026-08-21' });
  assert.deepEqual(rankCandidates([staleVegetableOnly, freshMixed], correctnessState, ingredients, {}, [], '2026-08-21').map((item) => item.id), ['stale-veg', 'fresh-mixed']);

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

test('Recipes freshness badges show ingredient names and frozen stock ages in red outlined hourglass controls', async () => {
  const page = await readFile('src/pages/meal-builder.astro', 'utf8');
  const enhancement = await readFile('src/components/MealBuilderFreshnessEnhancements.astro', 'utf8');
  const layout = await readFile('src/layouts/BaseLayout.astro', 'utf8');
  assert.match(page, /data-selected-freshness-badge/);
  assert.match(page, /data-candidate-freshness-badge/);
  assert.match(layout, /MealBuilderFreshnessEnhancements/);
  assert.match(enhancement, /freshnessAgeDays\(meal\.ingredientFreshnessDates\[ingredientId\]/);
  assert.match(enhancement, /document\.createTextNode\(`\$\{signal\.label\} \$\{signal\.ageDays\}天`\)/);
  assert.match(enhancement, /for \(const signal of signals\)/);
  assert.match(enhancement, /svg\.dataset\.freshnessIcon = 'hourglass'/);
  assert.match(enhancement, /\.meal-freshness-item \{/);
  assert.match(enhancement, /border: 1px solid #b53a3a;/);
  assert.match(enhancement, /border-radius: 6px;/);
  assert.match(enhancement, /color: #a12f2f;/);
  assert.match(enhancement, /> span:not\(\.meal-freshness-item\) \{ display: none; \}/);
  assert.doesNotMatch(enhancement, /textContent\s*=\s*['"]临期/);
  assert.match(page, /freshnessPriorityDays: ingredient\.freshnessPriorityDays/);
  assert.match(page, /freshnessPriorityAgeDays\(binding, state\.ingredientFreshnessDates, ingredients\)/);
  assert.doesNotMatch(page, /STALE_INGREDIENT_PRIORITY_DAYS/);
  assert.doesNotMatch(page, /优先消耗/);
  assert.doesNotMatch(page, /超过 3 天的鲜肉、蔬菜和豆腐/);
});
