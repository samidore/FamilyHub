import { expect, test, type Page } from '@playwright/test';

const LOCAL_HOUSEHOLD_KEY = 'family-hub-household-local-household';

async function inventoryItem(page: Page, id: string) {
  const row = page.locator(`[data-inventory-item="${id}"]`);
  const group = row.locator('xpath=ancestor::details');
  if (await group.count() && await group.getAttribute('open') === null) await group.locator('summary').click();
  return row;
}

async function setInventory(page: Page, ids: string[]) {
  const showAll = page.locator('#meal-show-all');
  if (!(await showAll.isChecked())) await showAll.check();
  for (const id of ids) {
    const action = (await inventoryItem(page, id)).locator('[data-stock-add], [data-stock-toggle]').first();
    await action.click();
  }
}

async function removeLiveInventoryOutsideMealSnapshot(page: Page, id: string) {
  await page.evaluate(({ key, ingredientId }) => {
    const stored = localStorage.getItem(key);
    if (!stored) throw new Error('Local household state is missing.');
    const state = JSON.parse(stored) as {
      inventory?: Record<string, unknown>;
      inventoryBatches?: Record<string, unknown>;
    };
    if (!state.inventory || !(ingredientId in state.inventory)) throw new Error(`Live inventory is missing ${ingredientId}.`);
    delete state.inventory[ingredientId];
    if (state.inventoryBatches) delete state.inventoryBatches[ingredientId];
    const serialized = JSON.stringify(state);
    localStorage.setItem(key, serialized);
    window.dispatchEvent(new StorageEvent('storage', { key, newValue: serialized }));
  }, { key: LOCAL_HOUSEHOLD_KEY, ingredientId: id });
}

test('Optional draft cannot confirm an Ingredient that leaves live inventory after selection', async ({ page }) => {
  await page.goto('meal-builder/');
  await setInventory(page, ['ground-pork', 'soft-tofu', 'fried-tofu-puffs']);
  await page.locator('#meal-start-current').click();
  await expect(page.locator('#meal-builder-view')).toBeVisible();

  const recipe = page.locator('[data-meal-recipe="minced-pork-tofu"]');
  await expect(recipe).toBeVisible();
  await recipe.locator('[data-select-recipe]').click();
  const puff = recipe.locator('[data-recipe-draft-optional-ingredient="fried-tofu-puffs"]');
  await expect(puff).toBeVisible();
  await puff.click();
  await expect(puff).toHaveAttribute('aria-pressed', 'true');

  await removeLiveInventoryOutsideMealSnapshot(page, 'fried-tofu-puffs');
  await expect(puff).toBeHidden();

  await recipe.locator('[data-confirm-recipe-draft]').click();
  await expect(page.locator('[data-selected-recipe="minced-pork-tofu"]')).toHaveCount(0);
  await expect(page.locator('#meal-live')).toContainText('库存里现在没有油豆腐 / 豆泡，不能选。');
});

test('One of draft cannot confirm a binding that leaves live inventory after selection', async ({ page }) => {
  await page.goto('meal-builder/');
  await setInventory(page, ['chicken-drumsticks', 'chicken-thighs']);
  await page.locator('#meal-start-current').click();
  await expect(page.locator('#meal-builder-view')).toBeVisible();

  const recipe = page.locator('[data-meal-recipe="oyster-sauce-braised-chicken"]');
  await expect(recipe).toBeVisible();
  await recipe.locator('[data-select-recipe]').click();
  const thigh = recipe.locator('[data-recipe-draft-binding-ingredient="chicken-thighs"]');
  await expect(thigh).toBeVisible();
  await thigh.click();
  await expect(thigh).toHaveAttribute('aria-pressed', 'true');

  await removeLiveInventoryOutsideMealSnapshot(page, 'chicken-thighs');
  await expect(thigh).toBeHidden();

  await recipe.locator('[data-confirm-recipe-draft]').click();
  await expect(page.locator('[data-selected-recipe="oyster-sauce-braised-chicken"]')).toHaveCount(0);
  await expect(page.locator('#meal-live')).toContainText('库存里现在没有鸡腿，不能选。');
});
