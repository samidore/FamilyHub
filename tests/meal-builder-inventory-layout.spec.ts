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
  await expect(row.locator('[data-batch-key] [data-discard-stock]')).toHaveText('丢掉');
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

test('thaw-required frozen stock keeps half-unit correction and one visible thaw action', async ({ page }) => {
  await page.goto('meal-builder/');
  await page.locator('#meal-show-all').check();
  const row = page.locator('[data-inventory-item="chicken-breast"]');
  const freezer = row.locator('[data-storage-block="freezer"]');
  const freezerPlus = freezer.locator('[data-stock-delta="0.5"][data-stock-storage="freezer"]');
  const thawAction = freezer.locator('[data-thaw-action]');

  await expect(freezer.locator('[data-stock-add][data-stock-storage="freezer"]')).toHaveCount(0);
  await expect(freezer.locator('[data-storage-control-row="freezer"]')).toHaveCount(1);
  await expect(freezer.locator('[data-stock-delta="-0.5"][data-stock-storage="freezer"]')).toHaveCount(1);
  await expect(freezerPlus).toHaveCount(1);
  await expect(thawAction).toHaveText('化冻');
  await expect(thawAction).toBeDisabled();

  await freezerPlus.click();
  await expect(freezer.locator('[data-freezer-value="chicken-breast"]')).toHaveText('0.5');
  await expect(freezer.locator('[data-start-thaw]:visible')).toHaveCount(1);
  await expect(thawAction).toHaveAttribute('data-thaw-quantity', '0.5');

  await freezerPlus.click();
  await expect(freezer.locator('[data-freezer-value="chicken-breast"]')).toHaveText('1');
  await expect(freezer.locator('[data-start-thaw]:visible')).toHaveCount(1);
  await expect(thawAction).toHaveAttribute('data-thaw-quantity', '1');

  const direct = page.locator('[data-inventory-item="frozen-chicken-patties"] [data-storage-block="freezer"]');
  await expect(direct.locator('[data-stock-add][data-stock-storage="freezer"]')).toHaveText('+1');
  await expect(direct.locator('[data-thaw-action]')).toHaveCount(0);
});

test('FIFO and freezer quantity controls share columns at mobile width', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto('meal-builder/');
  await page.locator('#meal-show-all').check();

  const cold = page.locator('[data-inventory-item="whole-pork-tenderloin"]');
  await cold.locator('[data-stock-add][data-stock-storage="inventory"]').click();
  const batch = cold.locator('[data-batch-key]').first();
  const coldAdd = cold.locator('.meal-storage-header [data-stock-add][data-stock-storage="inventory"]');

  const positions = await page.evaluate(() => {
    const rect = (selector: string) => document.querySelector<HTMLElement>(selector)!.getBoundingClientRect();
    const coldMinus = rect('[data-inventory-item="whole-pork-tenderloin"] [data-batch-key] [data-stock-delta="-0.5"]');
    const coldPlus = rect('[data-inventory-item="whole-pork-tenderloin"] [data-batch-key] [data-stock-delta="0.5"]');
    const coldAction = rect('[data-inventory-item="whole-pork-tenderloin"] .meal-storage-header [data-stock-add][data-stock-storage="inventory"]');
    const discard = rect('[data-inventory-item="whole-pork-tenderloin"] [data-batch-key] [data-discard-stock]');
    const frozenMinus = rect('[data-inventory-item="chicken-breast"] [data-storage-block="freezer"] [data-stock-delta="-0.5"]');
    const frozenPlus = rect('[data-inventory-item="chicken-breast"] [data-storage-block="freezer"] [data-stock-delta="0.5"]');
    const frozenAction = rect('[data-inventory-item="chicken-breast"] [data-storage-block="freezer"] [data-thaw-action]');
    return {
      coldMinusX: coldMinus.x,
      frozenMinusX: frozenMinus.x,
      coldPlusX: coldPlus.x,
      frozenPlusX: frozenPlus.x,
      coldActionX: coldAction.x,
      discardX: discard.x,
      frozenActionX: frozenAction.x,
      coldActionWidth: coldAction.width,
      discardWidth: discard.width,
      frozenActionWidth: frozenAction.width,
    };
  });

  expect(Math.abs(positions.coldMinusX - positions.frozenMinusX)).toBeLessThanOrEqual(1);
  expect(Math.abs(positions.coldPlusX - positions.frozenPlusX)).toBeLessThanOrEqual(1);
  expect(Math.abs(positions.coldActionX - positions.discardX)).toBeLessThanOrEqual(1);
  expect(Math.abs(positions.coldActionX - positions.frozenActionX)).toBeLessThanOrEqual(1);
  expect(positions.coldActionWidth).toBeGreaterThanOrEqual(60);
  expect(Math.abs(positions.coldActionWidth - positions.discardWidth)).toBeLessThanOrEqual(1);
  expect(Math.abs(positions.coldActionWidth - positions.frozenActionWidth)).toBeLessThanOrEqual(1);
  await expect(batch).toBeVisible();
  await expect(coldAdd).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});

test('thawing workspace starts only stocked thaw-required ingredients', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto('meal-builder/');
  await page.locator('#meal-show-all').check();
  const row = page.locator('[data-inventory-item="chicken-breast"]');
  const freezerPlus = row.locator('[data-stock-delta="0.5"][data-stock-storage="freezer"]');
  const thawAction = row.locator('[data-thaw-action]');
  await expect(thawAction).toBeDisabled();
  await freezerPlus.click();
  await freezerPlus.click();
  await expect(thawAction).toBeEnabled();
  await expect(thawAction).toHaveAttribute('data-thaw-quantity', '1');
  await expect(row.locator('[data-start-thaw]:visible')).toHaveCount(1);
  await thawAction.click();
  await expect(page.locator('[data-complete-thaw]')).toHaveCount(1);
  await expect(page.locator('[data-cancel-thaw]')).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});
