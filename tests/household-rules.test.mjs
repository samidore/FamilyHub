import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('Realtime Database rules require Google identity, matching email, and scoped enrollment', async () => {
  const rules = JSON.parse(await readFile('database.rules.json', 'utf8'));
  const household = rules.rules.households.$householdId;
  assert.equal(household.settings.enrollmentOpen['.write'], false);
  assert.match(household.members.$uid['.write'], /enrollmentOpen/);
  assert.match(household.members.$uid['.write'], /auth\.token\.email/);
  assert.match(household.members.$uid['.write'], /google\.com/);
  assert.match(household.accessRequests.$uid['.write'], /auth\.uid == \$uid/);
  assert.match(household.accessRequests.$uid['.write'], /enrollmentOpen.*!= true/);
  assert.match(household.state['.read'], /child\('email'\).*auth\.token\.email/);
  assert.match(household.state['.write'], /google\.com/);
  assert.match(household.state.inventory.$ingredientId['.validate'], /0\.5/);
  assert.match(household.state.currentMeal['.validate'], /mealId/);
  assert.match(household.state.currentMeal.checkoutDraft.$ingredientId['.validate'], />= 0/);
  assert.match(household.state.currentMeal.excludedIngredientIds.$index['.validate'], /isString/);
  assert.match(household.state.activeStep['.validate'], /checkout/);
});
