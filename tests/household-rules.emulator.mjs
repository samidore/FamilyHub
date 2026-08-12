import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';

const rules = await readFile('database.rules.json', 'utf8');
const env = await initializeTestEnvironment({
  projectId: 'family-hub-rules',
  database: { host: '127.0.0.1', port: 9000, rules },
});

test.after(async () => env.cleanup());

test('Realtime Database rules enforce member allowlist and state shape', async () => {
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.database();
    await db.ref('households/test-household/members/approved-member').set(true);
  });

  const member = env.authenticatedContext('approved-member').database();
  const nonMember = env.authenticatedContext('unapproved-member').database();
  const statePath = 'households/test-household/state';

  await assertSucceeds(member.ref(`${statePath}/inventory/pork`).set(1));
  await assertSucceeds(member.ref(`${statePath}/currentMeal`).set({
    mealId: 'meal-1', status: 'selecting', proteinTarget: 1, vegetableTarget: 2, stapleRequired: true, childMode: true, timePreference: 'any', availableIngredientIds: ['pork'], selectedRecipeIds: [], recipeIngredientBindings: {}, selectedAddons: [],
  }));
  await assertFails(nonMember.ref(statePath).get());
  await assertFails(nonMember.ref(`${statePath}/inventory/pork`).set(1));
  await assertFails(member.ref('households/test-household/members/unapproved-member').set(true));
  await assertFails(member.ref(`${statePath}/inventory/pork`).set(0.25));
  await assertFails(member.ref(`${statePath}/inventory/pork`).set(false));
  await assertFails(member.ref(`${statePath}/currentMeal`).set({ mealId: 'meal-1', status: 'finished', proteinTarget: 1, vegetableTarget: 2, stapleRequired: true, childMode: true, timePreference: 'any' }));
});
