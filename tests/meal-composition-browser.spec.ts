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

test('optional contributions can complete the plan and normal Next enters Cook', async ({ page }) => {
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

  await expect(page.locator('#progress-protein')).toHaveText('1 / 1');
  await expect(page.locator('#progress-vegetable')).toHaveText('1 / 1');
  await expect(page.locator('#meal-completion-status')).toHaveText('目标已满足，可以进入下一步。');
  await expect(page.locator('#meal-next')).toBeEnabled();

  await page.locator('#meal-next').click();
  await expect(page.locator('#meal-shared-status')).toHaveText('cooking');
  await expect(page.locator('#meal-cook-view')).toBeVisible();
});
