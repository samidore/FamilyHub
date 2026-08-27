import { expect, test } from '@playwright/test';

test('inventory category jump bar is sticky, data-driven, and opens the target section', async ({ page }) => {
  await page.goto('meal-builder/');

  const nav = page.locator('[data-inventory-jump-nav]');
  await expect(nav).toBeVisible();
  expect(await nav.evaluate((element) => getComputedStyle(element).position)).toBe('sticky');
  await expect(page.locator('[data-inventory-jump="pork"]')).toHaveText('猪肉');
  await expect(page.locator('[data-inventory-jump="leafy-vegetable"]')).toHaveText('叶菜');
  await expect(page.locator('[data-inventory-jump="staple"]')).toHaveText('主食');

  const leafy = page.locator('[data-inventory-section="leafy-vegetable"]');
  await expect(leafy).toHaveAttribute('open', '');
  await leafy.locator('summary').click();
  await expect(leafy).not.toHaveAttribute('open', '');

  await page.locator('[data-inventory-jump="leafy-vegetable"]').click();
  await expect(leafy).toHaveAttribute('open', '');
});

test('Recipes ingredient filter defaults folded and folds again when re-entering Recipes', async ({ page }) => {
  await page.goto('meal-builder/');
  await page.locator('#meal-start-current').click();

  const fold = page.locator('[data-meal-ingredient-fold]');
  await expect(fold).toBeVisible();
  await expect(fold).not.toHaveAttribute('open', '');
  await expect(page.locator('[data-meal-ingredient-fold-count]')).toHaveText(/已选 \d+/);

  await fold.locator(':scope > summary').click();
  await expect(fold).toHaveAttribute('open', '');

  await page.locator('#meal-back-inventory').click();
  await expect(page.locator('#meal-inventory-view')).toBeVisible();
  await page.locator('#meal-start-current').click();
  await expect(fold).not.toHaveAttribute('open', '');
});
