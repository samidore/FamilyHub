import { expect, test } from '@playwright/test';

test('inventory and freezer controls stack below the name at mobile width', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto('meal-builder/');
  await page.locator('#meal-show-all').check();

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
    expect(layout.controlsTop).toBeGreaterThanOrEqual(layout.nameBottom);
    expect(layout.controlsBottom).toBeLessThanOrEqual(layout.rowBottom + 1);
    expect(layout.controlsTop).toBeLessThan(layout.rowBottom);
    expect(layout.rowTop).toBeLessThan(layout.controlsBottom);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});

test('unified inventory defaults to live stock and reveals zero-stock ingredients', async ({ page }) => {
  await page.goto('meal-builder/');
  await expect(page.locator('[data-inventory-tab]')).toHaveCount(0);
  await expect(page.locator('[data-inventory-item]')).toHaveCount(0);
  await page.locator('#meal-show-all').check();
  await expect(page.locator('[data-inventory-item]')).not.toHaveCount(0);
});

test('ordinary counted aggregate +/- changes through the inventory event path', async ({ page }) => {
  await page.goto('meal-builder/');
  await page.locator('#meal-show-all').check();
  const row = page.locator('[data-inventory-item="salmon"]');
  await row.locator('[data-stock-add][data-stock-storage="inventory"]').click();
  await expect(row.locator('[data-inventory-value="salmon"]')).toHaveText('1');
  await row.locator('[data-stock-delta="0.5"][data-stock-storage="inventory"]').click();
  await expect(row.locator('[data-inventory-value="salmon"]')).toHaveText('1.5');
  await row.locator('[data-stock-delta="-0.5"][data-stock-storage="inventory"]').click();
  await expect(row.locator('[data-inventory-value="salmon"]')).toHaveText('1');
});

test('FIFO refrigerated inventory has one whole-unit add action outside batch rows', async ({ page }) => {
  await page.goto('meal-builder/');
  await page.locator('#meal-show-all').check();
  const row = page.locator('[data-inventory-item="chicken-thighs"]');
  await row.locator('[data-stock-add][data-stock-storage="inventory"]').click();
  await expect(row.locator('[data-stock-add][data-stock-storage="inventory"]')).toHaveCount(1);
  await expect(row.locator('[data-stock-add][data-stock-storage="inventory"]')).toHaveText('+1');
  await expect(row.locator('[data-batch-key]')).toHaveCount(1);
  await expect(row.locator('[data-batch-key] [data-stock-add]')).toHaveCount(0);
});

test('presence-only rows show one state label and counted rows keep their controls', async ({ page }) => {
  await page.goto('meal-builder/');

  const inventoryPresence = page.locator('[data-inventory-item="eggs"]');
  await page.locator('#meal-show-all').check();
  await expect(inventoryPresence.locator('[data-stock-toggle]')).toHaveText('入库');
  await inventoryPresence.locator('[data-stock-toggle]').click();
  await expect(inventoryPresence.locator('[data-stock-toggle]').first()).toHaveText('移除');

  await expect(page.locator('[data-inventory-tab]')).toHaveCount(0);
  await page.locator('[data-inventory-item="fresh-meat-mooncake"] [data-stock-toggle]').click();
  const freezerPresence = page.locator('[data-inventory-item="fresh-meat-mooncake"]');
  await expect(freezerPresence).toBeVisible();
  await expect(freezerPresence).toContainText('冷冻');

  const counted = page.locator('[data-inventory-item="chicken-breast"]');
  await counted.locator('[data-stock-add]').first().click();
  await expect(counted).toBeVisible();
});

test('frozen counted stock keeps half-unit correction plus a whole-unit add action', async ({ page }) => {
  await page.goto('meal-builder/');
  await page.locator('#meal-show-all').check();
  const row = page.locator('[data-inventory-item="chicken-breast"]');
  const freezer = row.locator('[data-storage-block="freezer"]');
  const wholeAdd = freezer.locator('[data-stock-add][data-stock-storage="freezer"]');
  await expect(wholeAdd).toHaveCount(1);
  await expect(wholeAdd).toHaveText('+1');
  await expect(freezer.locator('[data-storage-control-row="freezer"]')).toHaveCount(1);
  await expect(freezer.locator('[data-stock-delta="-0.5"][data-stock-storage="freezer"]')).toHaveCount(1);
  await expect(freezer.locator('[data-stock-delta="0.5"][data-stock-storage="freezer"]')).toHaveCount(1);
  await expect(freezer).toContainText('冷冻');

  await wholeAdd.click();
  await expect(freezer.locator('[data-freezer-value="chicken-breast"]')).toHaveText('1');
  await freezer.locator('[data-stock-delta="0.5"][data-stock-storage="freezer"]').click();
  await expect(freezer.locator('[data-freezer-value="chicken-breast"]')).toHaveText('1.5');
  await freezer.locator('[data-stock-delta="-0.5"][data-stock-storage="freezer"]').click();
  await expect(freezer.locator('[data-freezer-value="chicken-breast"]')).toHaveText('1');
});

test('FIFO and freezer quantity controls share columns at mobile width', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto('meal-builder/');
  await page.locator('#meal-show-all').check();

  const cold = page.locator('[data-inventory-item="whole-pork-tenderloin"]');
  await cold.locator('[data-stock-add][data-stock-storage="inventory"]').click();
  const batch = cold.locator('[data-batch-key]').first();
  const coldAdd = cold.locator('.meal-storage-header [data-stock-add][data-stock-storage="inventory"]');

  const frozen = page.locator('[data-inventory-item="chicken-breast"] [data-storage-block="freezer"]');
  const positions = await page.evaluate(() => {
    const rect = (selector: string) => document.querySelector<HTMLElement>(selector)!.getBoundingClientRect();
    const coldMinus = rect('[data-inventory-item="whole-pork-tenderloin"] [data-batch-key] [data-stock-delta="-0.5"]');
    const coldPlus = rect('[data-inventory-item="whole-pork-tenderloin"] [data-batch-key] [data-stock-delta="0.5"]');
    const coldAction = rect('[data-inventory-item="whole-pork-tenderloin"] .meal-storage-header [data-stock-add][data-stock-storage="inventory"]');
    const discard = rect('[data-inventory-item="whole-pork-tenderloin"] [data-batch-key] [data-discard-stock]');
    const frozenMinus = rect('[data-inventory-item="chicken-breast"] [data-storage-block="freezer"] [data-stock-delta="-0.5"]');
    const frozenPlus = rect('[data-inventory-item="chicken-breast"] [data-storage-block="freezer"] [data-stock-delta="0.5"]');
    const frozenAction = rect('[data-inventory-item="chicken-breast"] [data-storage-block="freezer"] [data-stock-add][data-stock-storage="freezer"]');
    return {
      coldMinusX: coldMinus.x,
      frozenMinusX: frozenMinus.x,
      coldPlusX: coldPlus.x,
      frozenPlusX: frozenPlus.x,
      coldActionX: coldAction.x,
      discardX: discard.x,
      frozenActionX: frozenAction.x,
      coldActionWidth: coldAction.width,
    };
  });

  expect(Math.abs(positions.coldMinusX - positions.frozenMinusX)).toBeLessThanOrEqual(1);
  expect(Math.abs(positions.coldPlusX - positions.frozenPlusX)).toBeLessThanOrEqual(1);
  expect(Math.abs(positions.coldActionX - positions.discardX)).toBeLessThanOrEqual(1);
  expect(Math.abs(positions.coldActionX - positions.frozenActionX)).toBeLessThanOrEqual(1);
  expect(positions.coldActionWidth).toBeLessThanOrEqual(56);
  await expect(batch).toBeVisible();
  await expect(coldAdd).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});

test('thawing workspace starts only stocked thaw-required ingredients', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto('meal-builder/');
  await page.locator('#meal-show-all').check();
  await page.locator('[data-inventory-item="chicken-breast"] [data-stock-add][data-stock-storage="freezer"]').click();
  await expect(page.locator('[data-start-thaw]')).toHaveCount(2);
  await page.locator('[data-start-thaw][data-thaw-quantity="0.5"]').click();
  await expect(page.locator('[data-complete-thaw]')).toHaveCount(1);
  await expect(page.locator('[data-cancel-thaw]')).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});
