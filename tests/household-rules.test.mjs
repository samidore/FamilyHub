import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('Realtime Database rules keep membership operator-managed and state member-only', async () => {
  const rules = JSON.parse(await readFile('database.rules.json', 'utf8'));
  const household = rules.rules.households.$householdId;
  assert.equal(household.members.$uid['.write'], false);
  assert.match(household.state['.read'], /members/);
  assert.match(household.state['.write'], /members/);
  assert.match(household.state.inventory.$ingredientId['.validate'], /0\.5/);
  assert.match(household.state.currentMeal['.validate'], /mealId/);
});
