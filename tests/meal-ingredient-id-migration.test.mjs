import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { LocalHouseholdRepository } from '../src/lib/householdRepository.ts';
import {
  CANONICAL_CHICKEN_THIGH_ID,
  hasLegacyChickenThighIngredientIds,
  migrateLegacyChickenThighIngredientIds,
} from '../src/lib/mealIngredientIdMigration.ts';

const ingredients = [{
  id: CANONICAL_CHICKEN_THIGH_ID,
  inventoryTracking: 'counted',
  inventoryFreshness: 'fifo',
  freshnessPriorityDays: 3,
}];

function legacyState() {
  return {
    inventory: {
      'boneless-skinless-chicken-thighs': 1.5,
      'bone-in-chicken-thighs': 2,
      'chicken-thighs': 0.5,
    },
    inventoryBatches: {
      'boneless-skinless-chicken-thighs': { '2026-08-20': 1, '2026-08-25': 0.5 },
      'bone-in-chicken-thighs': { '2026-08-20': 0.5, '2026-08-22': 1.5 },
      'chicken-thighs': { '2026-08-27': 0.5 },
    },
    currentMeal: {
      mealId: 'meal-legacy-thighs',
      status: 'selecting',
      availableIngredientIds: ['boneless-skinless-chicken-thighs', 'bone-in-chicken-thighs', 'chicken-thighs'],
      ingredientFreshnessDates: {
        'boneless-skinless-chicken-thighs': '2026-08-20',
        'bone-in-chicken-thighs': '2026-08-22',
        'chicken-thighs': '2026-08-27',
      },
      proteinTarget: 1,
      vegetableTarget: 1,
      stapleRequired: false,
      childMode: true,
      timePreference: 'any',
      selectedRecipeIds: ['r1', 'r2'],
      recipeIngredientBindings: {
        r1: ['boneless-skinless-chicken-thighs'],
        r2: ['bone-in-chicken-thighs'],
      },
      selectedAddons: [],
      excludedIngredientIds: ['bone-in-chicken-thighs'],
      checkoutDraft: {
        'boneless-skinless-chicken-thighs': 0.5,
        'bone-in-chicken-thighs': 1,
      },
      checkoutRecipeDrafts: {
        r1: { bindings: ['boneless-skinless-chicken-thighs'], optionalAddons: [], consumption: { 'boneless-skinless-chicken-thighs': 0.5 } },
        r2: { bindings: ['bone-in-chicken-thighs'], optionalAddons: [], consumption: { 'bone-in-chicken-thighs': 1 } },
      },
    },
    activeStep: 'recipes',
    recentMeals: [],
  };
}

test('legacy chicken thigh IDs merge losslessly into the canonical ingredient', () => {
  const migrated = migrateLegacyChickenThighIngredientIds(legacyState());
  assert.equal(hasLegacyChickenThighIngredientIds(migrated), false);
  assert.deepEqual(migrated.inventory, { 'chicken-thighs': 4 });
  assert.deepEqual(migrated.inventoryBatches['chicken-thighs'], {
    '2026-08-20': 1.5,
    '2026-08-22': 1.5,
    '2026-08-25': 0.5,
    '2026-08-27': 0.5,
  });
  assert.deepEqual(migrated.currentMeal.availableIngredientIds, ['chicken-thighs']);
  assert.deepEqual(migrated.currentMeal.ingredientFreshnessDates, { 'chicken-thighs': '2026-08-20' });
  assert.deepEqual(migrated.currentMeal.recipeIngredientBindings, { r1: ['chicken-thighs'], r2: ['chicken-thighs'] });
  assert.deepEqual(migrated.currentMeal.excludedIngredientIds, ['chicken-thighs']);
  assert.deepEqual(migrated.currentMeal.checkoutDraft, { 'chicken-thighs': 1.5 });
  assert.deepEqual(migrated.currentMeal.checkoutRecipeDrafts.r1.bindings, ['chicken-thighs']);
  assert.deepEqual(migrated.currentMeal.checkoutRecipeDrafts.r2.consumption, { 'chicken-thighs': 1 });
});

test('local repository rewrites legacy chicken thigh storage on read', () => {
  const key = 'family-hub-household-thigh-migration';
  const store = new Map([[key, JSON.stringify(legacyState())]]);
  const storage = {
    getItem: (name) => store.get(name) ?? null,
    setItem: (name, value) => void store.set(name, value),
    removeItem: (name) => void store.delete(name),
  };
  const repository = new LocalHouseholdRepository('thigh-migration', { storage, broadcast: false, ingredients });
  assert.deepEqual(repository.getSnapshot().inventory, { 'chicken-thighs': 4 });
  assert.deepEqual(repository.getSnapshot().inventoryBatches['chicken-thighs'], {
    '2026-08-20': 1.5,
    '2026-08-22': 1.5,
    '2026-08-25': 0.5,
    '2026-08-27': 0.5,
  });
  const persisted = store.get(key) ?? '';
  assert.equal(persisted.includes('boneless-skinless-chicken-thighs'), false);
  assert.equal(persisted.includes('bone-in-chicken-thighs'), false);
  repository.dispose();
});

test('Firebase repository persists legacy chicken thigh migration transactionally on connect', async () => {
  const source = await readFile('src/lib/householdRepository.ts', 'utf8');
  assert.match(source, /hasLegacyChickenThighIngredientIds\(snapshot\.val\(\)\)/);
  assert.match(source, /runTransaction\(this\.stateRef, \(value\) => normalizePersistedState\(value, this\.ingredients\)\)/);
  assert.match(source, /const current = normalizePersistedState\(value, this\.ingredients\)/);
});
