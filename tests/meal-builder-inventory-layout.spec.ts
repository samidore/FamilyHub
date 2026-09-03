import { expect, test } from '@playwright/test';

test('inventory and freezer controls stay on one row at mobile width', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto('meal-builder/');

  const inventoryRow = page.locator('[data-inventory-item="whole-beef-brisket"]');
  await expect(inventoryRow).toBeVisible();
  await expect(inventoryRow.locator('.meal-inventory-controls')).toBeVisible();

  await page.locator('[data-inventory-tab="freezer"]').click();
  const freezerRows = [
    page.locator('[data-inventory-item="frozen-beef-patties"]'),
    page.locator('[data-inventory-item="whole-beef-brisket"]'),
    page.locator('[data-inventory-item="fresh-meat-mooncake"]'),
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
  await expect(inventoryPresence.locator('[data-inventory-toggle]')).toHaveText('无');
  await expect(inventoryPresence.locator('button').filter({ hasText: /^无$/ })).toHaveCount(1);
  await inventoryPresence.locator('[data-inventory-toggle]').click();
  await expect(inventoryPresence.locator('[data-inventory-toggle]')).toHaveText('有');
  await expect(inventoryPresence.locator('button').filter({ hasText: /^有$/ })).toHaveCount(1);

  await page.locator('[data-inventory-tab="freezer"]').click();
  const freezerPresence = page.locator('[data-inventory-item="fresh-meat-mooncake"]');
  await expect(freezerPresence.locator('[data-inventory-toggle]')).toHaveText('无');
  await expect(freezerPresence.locator('button').filter({ hasText: /^无$/ })).toHaveCount(1);
  await freezerPresence.locator('[data-inventory-toggle]').click();
  await expect(freezerPresence.locator('[data-inventory-toggle]')).toHaveText('有');
  await expect(freezerPresence.locator('button').filter({ hasText: /^有$/ })).toHaveCount(1);

  const counted = page.locator('[data-inventory-item="chicken-breast"]');
  await expect(counted.locator('[data-freezer-toggle]')).toHaveText('开启');
  await expect(counted.locator('[data-freezer-step]')).toHaveCount(2);
  await expect(counted.locator('[data-inventory-value="freezer-chicken-breast"]')).toHaveText('0');
});

test('thawing workspace starts only stocked thaw-required ingredients', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto('meal-builder/');
  await page.locator('[data-inventory-tab="freezer"]').click();

  await expect(page.locator('[data-start-thaw]')).toHaveCount(0);
  const chicken = page.locator('[data-inventory-item="chicken-breast"]');
  await chicken.locator('[data-freezer-step="0.5"]').click();
  await page.locator('[data-inventory-tab="thawing"]').click();

  await expect(page.locator('[data-thaw-section="active"]')).toContainText('当前没有化冻中的食材');
  const eligible = page.locator('[data-thaw-section="eligible"] [data-thaw-eligible="chicken-breast"]');
  await expect(eligible).toContainText('鸡胸');
  await expect(eligible.locator('[data-start-thaw]')).toHaveCount(1);
  await expect(page.locator('[data-thaw-section="eligible"] [data-thaw-eligible="eggs"]')).toHaveCount(0);

  await eligible.locator('[data-start-thaw]').click();
  await expect(page.locator('[data-thaw-section="active"] [data-thawing-item]')).toHaveCount(1);
  await expect(page.locator('[data-thaw-section="eligible"] [data-thaw-eligible="chicken-breast"]')).toHaveCount(0);
  await expect(page.locator('[data-thawing-count]')).toHaveText('1');
  await expect(page.locator('[data-thaw-section="active"]')).toContainText('进入库存');
  await expect(page.locator('[data-thaw-section="active"]')).toContainText('取消化冻');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});
