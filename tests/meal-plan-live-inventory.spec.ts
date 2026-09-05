import { expect, test, type Page } from '@playwright/test';

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

async function removeOneCountedUnit(page: Page, id: string) {
  let row = await inventoryItem(page, id);
  let value = row.locator(`[data-inventory-value="${id}"]`);
  await row.locator('[data-stock-delta="-0.5"][data-stock-storage="inventory"]').first().click();
  await expect(value).toHaveText('0.5');

  row = await inventoryItem(page, id);
  value = row.locator(`[data-inventory-value="${id}"]`);
  await row.locator('[data-stock-delta="-0.5"][data-stock-storage="inventory"]').first().click();
  await expect(value).toHaveCount(0);
}

async function depleteAfterMealSnapshot(page: Page, id: string) {
  await page.locator('[data-step-target="inventory"]').click();
  await expect(page.locator('#meal-inventory-view')).toBeVisible();
  await removeOneCountedUnit(page, id);
  await page.locator('[data-step-target="recipes"]').click();
  await expect(page.locator('#meal-builder-view')).toBeVisible();
}

test('Optional cannot bypass live inventory after the meal snapshot is frozen', async ({ page }) => {
  await page.goto('meal-builder/');
  await setInventory(page, ['ground-pork', 'soft-tofu', 'fried-tofu-puffs']);
  await page.locator('#meal-start-current').click();
  await expect(page.locator('#meal-builder-view')).toBeVisible();

  await depleteAfterMealSnapshot(page, 'fried-tofu-puffs');

  const recipe = page.locator('[data-meal-recipe="minced-pork-tofu"]');
  await expect(recipe).toBeVisible();
  await recipe.locator('[data-select-recipe]').click();
  const puff = recipe.locator('[data-recipe-draft-optional-ingredient="fried-tofu-puffs"]');
  await expect(puff).toBeHidden();

  await puff.evaluate((element) => (element as HTMLButtonElement).click());
  await expect(puff).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#meal-live')).toContainText('库存里现在没有油豆腐 / 豆泡，不能选。');

  await recipe.locator('[data-confirm-recipe-draft]').click();
  const selected = page.locator('[data-selected-recipe="minced-pork-tofu"]');
  await expect(selected).toBeVisible();
  await expect(selected.locator('[data-selected-plan-summary]')).not.toContainText('油豆腐 / 豆泡');
});

test('One of cannot bypass live inventory after the meal snapshot is frozen', async ({ page }) => {
  await page.goto('meal-builder/');
  await setInventory(page, ['chicken-drumsticks', 'chicken-thighs']);
  await page.locator('#meal-start-current').click();
  await expect(page.locator('#meal-builder-view')).toBeVisible();

  await depleteAfterMealSnapshot(page, 'chicken-thighs');

  const recipe = page.locator('[data-meal-recipe="oyster-sauce-braised-chicken"]');
  await expect(recipe).toBeVisible();
  await recipe.locator('[data-select-recipe]').click();

  const drumstick = recipe.locator('[data-recipe-draft-binding-ingredient="chicken-drumsticks"]');
  const thigh = recipe.locator('[data-recipe-draft-binding-ingredient="chicken-thighs"]');
  await expect(drumstick).toBeVisible();
  await expect(thigh).toBeHidden();

  await drumstick.click();
  await expect(drumstick).toHaveAttribute('aria-pressed', 'true');
  await thigh.evaluate((element) => (element as HTMLButtonElement).click());
  await expect(drumstick).toHaveAttribute('aria-pressed', 'true');
  await expect(thigh).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#meal-live')).toContainText('库存里现在没有鸡腿，不能选。');

  await recipe.locator('[data-confirm-recipe-draft]').click();
  const selected = page.locator('[data-selected-recipe="oyster-sauce-braised-chicken"]');
  await expect(selected).toBeVisible();
  await expect(selected.locator('[data-selected-plan-summary]')).toContainText('鸡小腿');
  await expect(selected.locator('[data-selected-plan-summary]')).not.toContainText('鸡腿');
});
