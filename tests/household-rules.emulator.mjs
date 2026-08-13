import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';

const rules = await readFile('database.rules.json', 'utf8');
const env = await initializeTestEnvironment({ projectId: 'family-hub-rules', database: { host: '127.0.0.1', port: 9000, rules } });
const google = (uid, email) => env.authenticatedContext(uid, { email, email_verified: true, firebase: { sign_in_provider: 'google.com' } }).database();
const password = (uid, email) => env.authenticatedContext(uid, { email, email_verified: true, firebase: { sign_in_provider: 'password' } }).database();
const household = 'households/test-household';
const meal = { mealId: 'meal-1', status: 'selecting', proteinTarget: 1, vegetableTarget: 2, stapleRequired: true, childMode: true, timePreference: 'any', availableIngredientIds: ['pork'], selectedRecipeIds: [], recipeIngredientBindings: {}, selectedAddons: [] };

test.after(async () => env.cleanup());

test('Google users self-enroll only while open and retain access after closure', async () => {
  await env.withSecurityRulesDisabled(async (context) => { await context.database().ref().set(null); await context.database().ref(`${household}/settings/enrollmentOpen`).set(true); });
  const alice = google('alice', 'alice@gmail.com');
  await assertSucceeds(alice.ref(`${household}/members/alice`).set({ email: 'alice@gmail.com' }));
  await assertFails(alice.ref(`${household}/members/alice`).update({ email: 'other@gmail.com' }));
  await assertFails(alice.ref(`${household}/members/bob`).set({ email: 'alice@gmail.com' }));
  await assertSucceeds(alice.ref(`${household}/state/inventory/pork`).set(1));
  await env.withSecurityRulesDisabled(async (context) => context.database().ref(`${household}/settings/enrollmentOpen`).set(false));
  await assertSucceeds(alice.ref(`${household}/state/currentMeal`).set(meal));
});

test('closed enrollment isolates requests and denies non-members', async () => {
  await env.withSecurityRulesDisabled(async (context) => { await context.database().ref().set(null); await context.database().ref(`${household}/settings/enrollmentOpen`).set(false); });
  const bob = google('bob', 'bob@gmail.com');
  const charlie = google('charlie', 'charlie@gmail.com');
  await assertSucceeds(bob.ref(`${household}/accessRequests/bob`).set({ email: 'bob@gmail.com' }));
  await assertFails(bob.ref(`${household}/accessRequests/charlie`).set({ email: 'bob@gmail.com' }));
  await assertFails(bob.ref(`${household}/accessRequests/charlie`).get());
  await assertFails(bob.ref(`${household}/members/bob`).set({ email: 'bob@gmail.com' }));
  await assertFails(bob.ref(`${household}/state`).get());
  await assertFails(charlie.ref(`${household}/accessRequests/charlie`).set({ email: 'bob@gmail.com' }));
});

test('non-Google and mismatched token email cannot access household state', async () => {
  await env.withSecurityRulesDisabled(async (context) => { await context.database().ref().set(null); await context.database().ref(`${household}/members/dana`).set({ email: 'dana@gmail.com' }); });
  await assertFails(password('dana', 'dana@gmail.com').ref(`${household}/state`).get());
  await assertFails(google('dana', 'wrong@gmail.com').ref(`${household}/state`).get());
  await assertSucceeds(google('dana', 'dana@gmail.com').ref(`${household}/state`).get());
});

test('existing inventory and current meal validation remains enforced', async () => {
  await env.withSecurityRulesDisabled(async (context) => { await context.database().ref().set(null); await context.database().ref(`${household}/members/alice`).set({ email: 'alice@gmail.com' }); });
  const alice = google('alice', 'alice@gmail.com');
  await assertFails(alice.ref(`${household}/state/inventory/pork`).set(0.25));
  await assertFails(alice.ref(`${household}/state/inventory/pork`).set(false));
  await assertFails(alice.ref(`${household}/state/currentMeal`).set({ ...meal, status: 'finished' }));
});

test('shared step, exclusions, and checkout draft accept only supported values', async () => {
  await env.withSecurityRulesDisabled(async (context) => { await context.database().ref().set(null); await context.database().ref(`${household}/members/alice`).set({ email: 'alice@gmail.com' }); });
  const alice = google('alice', 'alice@gmail.com');
  await assertSucceeds(alice.ref(`${household}/state`).set({ activeStep: 'recipes', currentMeal: meal }));
  await assertFails(alice.ref(`${household}/state/activeStep`).set('finished'));
  await assertSucceeds(alice.ref(`${household}/state/currentMeal/excludedIngredientIds`).set(['pork']));
  await assertFails(alice.ref(`${household}/state/currentMeal/excludedIngredientIds`).set([42]));
  await assertSucceeds(alice.ref(`${household}/state/currentMeal/checkoutDraft`).set({ pork: 0, eggs: false }));
  await assertFails(alice.ref(`${household}/state/currentMeal/checkoutDraft`).set({ pork: 0.25 }));
});
