import { expect, test } from '@playwright/test';

test('Chat inventory import reviews, edits, confirms twice, and writes FIFO inventory additively', async ({ page }) => {
  await page.goto('meal-builder/');

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
      { ingredient_id: 'whole-pork-tenderloin', quantity: 2 },
      { ingredient_id: 'broccoli', quantity: 1 },
      { ingredient_id: 'eggs', quantity: 1 },
      { ingredient_id: 'not-in-library', quantity: 1 },
    ],
    unmatched: ['上海青苗'],
  }));
  await page.locator('#meal-inventory-import-parse').click();

  await expect(page.locator('#meal-inventory-import-review')).toBeVisible();
  await expect(page.locator('#meal-inventory-import-unmatched-list li')).toHaveCount(2);
  await expect(page.locator('[data-import-ingredient="whole-pork-tenderloin"]')).toContainText('本次 +2');

  await page.locator('[data-import-ingredient="broccoli"] .meal-inventory-import__remove').click();
  await page.locator('#meal-inventory-import-date').fill(dates.yesterday);
  await page.locator('#meal-inventory-import-date').blur();

  await expect(page.locator('[data-inventory-value="whole-pork-tenderloin"]')).toHaveText('0');
  await expect(page.locator('[data-inventory-item="eggs"] [data-stock-toggle]')).toHaveText('入库');
  await page.locator('#meal-inventory-import-open-confirm').click();
  await expect(page.locator('#meal-inventory-import-dialog')).toBeVisible();
  await expect(page.locator('#meal-inventory-import-dialog-copy')).toContainText('2 种食材');
  await expect(page.locator('#meal-inventory-import-dialog-copy')).toContainText(dates.yesterday);

  await expect(page.locator('[data-inventory-value="whole-pork-tenderloin"]')).toHaveText('0');
  await page.locator('#meal-inventory-import-final').click();

  await expect(page.locator('#meal-inventory-import-dialog')).not.toBeVisible();
  await expect(page.locator('[data-inventory-value="whole-pork-tenderloin"]')).toHaveText('2');
  await expect(page.locator('[data-inventory-item="eggs"] [data-stock-toggle]')).toHaveText('有');
  await expect(page.locator('[data-inventory-value="broccoli"]')).toHaveText('0');
  await expect(page.locator('[data-inventory-item="whole-pork-tenderloin"]')).toContainText('现有 2');
  await expect(page.locator('#meal-inventory-import-review')).toBeHidden();
  await expect(page.locator('#meal-inventory-import-json')).toHaveValue('');
});
