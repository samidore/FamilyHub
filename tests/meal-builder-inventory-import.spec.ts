import { expect, test } from '@playwright/test';

test('Chat inventory import can route reviewed rows into refrigerated and frozen stock', async ({ page }) => {
  await page.goto('meal-builder/');
  await page.locator('#meal-show-all').check();

  const dates = await page.evaluate(() => {
    const key = (value: Date) => {
      const year = value.getFullYear();
      const month = String(value.getMonth() + 1).padStart(2, '0');
      const day = String(value.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    const today = new Date();
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    return { today: key(today), yesterday: key(yesterday) };
  });

  await page.locator('#meal-inventory-import-toggle').click();
  await page.locator('#meal-inventory-import-json').fill(JSON.stringify({
    schema: 'meal-builder-inventory-import',
    version: 1,
    stocked_on: dates.today,
    items: [
      { ingredient_id: 'whole-pork-tenderloin', quantity: 2, storage: 'freezer' },
      { ingredient_id: 'broccoli', quantity: 1, storage: 'inventory' },
      { ingredient_id: 'eggs', quantity: 1, storage: 'inventory' },
      { ingredient_id: 'frozen-beef-patties', quantity: 1, storage: 'freezer' },
      { ingredient_id: 'not-in-library', quantity: 1, storage: 'freezer' },
    ],
    unmatched: ['上海青苗'],
  }));
  await page.locator('#meal-inventory-import-parse').click();

  await expect(page.locator('#meal-inventory-import-review')).toBeVisible();
  await expect(page.locator('#meal-inventory-import-unmatched-list li')).toHaveCount(2);

  const pork = page.locator('[data-import-ingredient="whole-pork-tenderloin"]');
  const porkStorage = pork.locator('[data-import-storage]');
  await expect(pork).toContainText('冷冻 0 · 本次 +2');
  await expect(porkStorage).toHaveValue('freezer');
  await porkStorage.selectOption('inventory');
  await expect(pork).toContainText('冷藏 0 · 本次 +2');
  await porkStorage.selectOption('freezer');
  await expect(pork).toContainText('冷冻 0 · 本次 +2');

  const direct = page.locator('[data-import-ingredient="frozen-beef-patties"]');
  await expect(direct).toContainText('冷冻 0 · 本次 +1');
  await expect(direct.locator('[data-import-storage]')).toHaveCount(0);

  await page.locator('[data-import-ingredient="broccoli"] .meal-inventory-import__remove').click();
  await page.locator('#meal-inventory-import-date').fill(dates.yesterday);
  await page.locator('#meal-inventory-import-date').blur();

  await expect(page.locator('[data-inventory-item="whole-pork-tenderloin"]')).toBeVisible();
  await expect(page.locator('[data-inventory-item="eggs"] [data-stock-toggle]')).toHaveText('入库');
  await page.locator('#meal-inventory-import-open-confirm').click();
  await expect(page.locator('#meal-inventory-import-dialog')).toBeVisible();
  await expect(page.locator('#meal-inventory-import-dialog-copy')).toContainText('3 项食材');
  await expect(page.locator('#meal-inventory-import-dialog-copy')).toContainText('其中 2 项进冷冻');
  await expect(page.locator('#meal-inventory-import-dialog-copy')).toContainText(dates.yesterday);

  await page.locator('#meal-inventory-import-final').click();

  await expect(page.locator('#meal-inventory-import-dialog')).not.toBeVisible();
  await expect(page.locator('[data-inventory-item="whole-pork-tenderloin"]')).toBeVisible();
  await expect(page.locator('[data-inventory-item="whole-pork-tenderloin"]')).toContainText('冷冻');
  await expect(page.locator('[data-inventory-item="eggs"] [data-stock-toggle]')).toHaveText('移除');
  await expect(page.locator('[data-inventory-value="frozen-beef-patties"]')).toHaveText('1');
  await expect(page.locator('[data-inventory-item="frozen-beef-patties"]')).toContainText('冷冻');
  await expect(page.locator('[data-inventory-item="broccoli"]')).toBeVisible();

  const porkLifecycle = page.locator('[data-inventory-item="whole-pork-tenderloin"]');
  await expect(porkLifecycle).toContainText('冷冻');
  await expect(porkLifecycle.locator('[data-start-thaw]')).toHaveCount(1);
  const directLifecycle = page.locator('[data-inventory-item="frozen-beef-patties"]');
  await expect(directLifecycle).toContainText('冷冻');
  await expect(directLifecycle.locator('[data-start-thaw]')).toHaveCount(0);

  await expect(page.locator('#meal-inventory-import-review')).toBeHidden();
  await expect(page.locator('#meal-inventory-import-json')).toHaveValue('');
});
