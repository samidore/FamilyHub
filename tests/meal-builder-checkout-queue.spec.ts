import { expect, test, type Page } from '@playwright/test';

async function inventoryItem(page: Page, id: string) {
  const row = page.locator(`[data-inventory-item="${id}"]`);
  const group = row.locator('xpath=ancestor::details');
  if (await group.count() && await group.getAttribute('open') === null) await group.locator('summary').click();
  return row;
}

async function setInventory(page: Page, ids: string[]) {
  for (const id of ids) await (await inventoryItem(page, id)).locator('[data-inventory-toggle]').click();
}

test('queued meal can be checked out from the warning without finishing the next meal', async ({ page }) => {
  await page.goto('meal-builder/');
  await setInventory(page, ['green-cabbage', 'ground-pork', 'ground-beef']);
  await page.locator('#meal-start-current').click();

  await page.locator('#meal-vegetable').selectOption('1');
  await page.locator('#meal-staple').uncheck();
  await page.locator('#meal-child').uncheck();

  const recipe = page.locator('[data-meal-recipe="simple-stir-fried-green-cabbage"]');
  await expect(recipe).toBeVisible();
  await recipe.locator('[data-select-recipe]').click();

  const selected = page.locator('[data-selected-recipe="simple-stir-fried-green-cabbage"]');
  await selected.locator('[data-composition-editor] > summary').click();
  await selected.locator('[data-plan-optional-ingredient="ground-pork"]').click();
  await selected.locator('[data-plan-optional-ingredient="ground-beef"]').click();
  await expect(page.locator('#meal-next')).toBeEnabled();
  await page.locator('#meal-next').click();

  await expect(page.locator('#meal-shared-status')).toHaveText('做饭中');
  await expect(page.locator('[data-queue-cook-plan] > strong').first()).toHaveText('本次');
  await expect(page.locator('#meal-queue-checkout')).toHaveText('排队结算');
  await page.locator('#meal-queue-checkout').click();

  const warning = page.locator('#meal-queue-alert');
  await expect(warning).toBeVisible();
  await expect(warning.locator('#meal-queue-open-checkout')).toHaveText('结算');
  await expect(page.locator('#meal-shared-status')).toHaveText('选菜中');
  await expect(page.locator('#meal-builder-view')).toBeVisible();

  await warning.locator('#meal-queue-open-checkout').click();
  await expect(page.locator('#meal-checkout')).toBeVisible();
  await expect(page.locator('#meal-checkout-heading')).toHaveText('待结算');
  await expect(page.locator('[data-queue-checkout-meal]')).toHaveCount(1);
  await expect(page.locator('[data-queue-checkout-meal] > h3')).toHaveText('待结算 1');
  await expect(page.locator('#meal-shared-status')).toHaveText('选菜中');

  await page.locator('#meal-confirm-checkout').click();
  await expect(page.locator('#meal-finalize-checkout')).toBeVisible();
  await page.locator('#meal-finalize-checkout').click();

  await expect(warning).toBeHidden();
  await expect(page.locator('#meal-builder-view')).toBeVisible();
  await expect(page.locator('#meal-shared-status')).toHaveText('选菜中');
});
