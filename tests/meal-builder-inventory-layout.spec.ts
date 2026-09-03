import { expect, test } from '@playwright/test';

test('inventory and freezer controls stay on one row at mobile width', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto('meal-builder/');

  const inventoryRow = page.locator('[data-inventory-item="whole-beef-brisket"]');
  await expect(inventoryRow).toBeVisible();
  await expect(inventoryRow.locator('.meal-inventory-controls')).toBeVisible();

  const freezerRows = [
    page.locator('[data-inventory-item="whole-beef-brisket"]'),
    page.locator('[data-inventory-item="chicken-breast"]'),
  ];
  for (const row of freezerRows) {
    await expect(row).toBeVisible();
    const layout = await row.evaluate((element) => {
      const name = element.querySelector<HTMLElement>('.meal-inventory-name')!.getBoundingClientRect();
      const controls = element.querySelector<HTMLElement>('.meal-inventory-controls')!.getBoundingClientRect();
      const rowBox = element.getBoundingClientRect();
      return { rowWidth: rowBox.width, rowScrollWidth: element.scrollWidth, controlsTop: controls.top, controlsBottom: controls.bottom, nameTop: name.top, nameBottom: name.bottom, rowTop: rowBox.top, rowBottom: rowBox.bottom };
    });
    expect(layout.rowScrollWidth).toBeLessThanOrEqual(layout.rowWidth + 1);
    expect(layout.controlsTop).toBeLessThan(layout.nameBottom);
    expect(layout.controlsBottom).toBeLessThanOrEqual(layout.rowBottom + 1);
    expect(layout.controlsTop).toBeLessThan(layout.rowBottom);
    expect(layout.rowTop).toBeLessThan(layout.controlsBottom);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});

test('presence-only rows show one state label and counted rows keep their controls', async ({ page }) => {
  await page.goto('meal-builder/');

  const inventoryPresence = page.locator('[data-inventory-item="eggs"]');
  await page.locator('[data-inventory-tab="intake"]').click();
  await expect(inventoryPresence.locator('[data-stock-toggle]')).toHaveText('入库');
  await inventoryPresence.locator('[data-stock-toggle]').click();
  await expect(inventoryPresence.locator('[data-stock-toggle]')).toHaveText('有');

  await expect(page.locator('[data-inventory-tab="freezer"]')).toHaveCount(0);
  await expect(page.locator('[data-inventory-tab="thawing"]')).toHaveCount(0);
  await page.locator('[data-inventory-tab="intake"]').click();
  await page.locator('[data-inventory-item="fresh-meat-mooncake"] [data-stock-toggle]').click();
  await page.locator('[data-inventory-tab="inventory"]').click();
  const freezerPresence = page.locator('[data-inventory-item="fresh-meat-mooncake"]');
  await expect(freezerPresence).toBeVisible();
  await expect(freezerPresence).toContainText('冷冻');

  const counted = page.locator('[data-inventory-item="chicken-breast"]');
  await page.locator('[data-inventory-tab="intake"]').click();
  await counted.locator('[data-stock-add]').first().click();
  await page.locator('[data-inventory-tab="inventory"]').click();
  await expect(counted).toBeVisible();
});

test('thawing workspace starts only stocked thaw-required ingredients', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto('meal-builder/');
  await page.locator('[data-inventory-tab="intake"]').click();
  await page.locator('[data-inventory-item="chicken-breast"] [data-stock-add][data-stock-storage="freezer"]').click();
  await page.locator('[data-inventory-tab="inventory"]').click();
  await expect(page.locator('[data-start-thaw]')).toHaveCount(1);
  await page.locator('[data-start-thaw]').click();
  await expect(page.locator('[data-complete-thaw]')).toHaveCount(1);
  await expect(page.locator('[data-cancel-thaw]')).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});
