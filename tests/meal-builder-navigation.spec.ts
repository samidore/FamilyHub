import { expect, test } from '@playwright/test';

test('inventory category jump bar is bottom-pinned, two-row, non-scrolling, data-driven, and opens the target section', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto('meal-builder/');

  const nav = page.locator('[data-inventory-jump-nav]');
  await expect(nav).toBeVisible();
  expect(await nav.evaluate((element) => getComputedStyle(element).position)).toBe('fixed');
  expect(await nav.evaluate((element) => getComputedStyle(element).bottom)).toBe('0px');
  const viewportHeight = await page.evaluate(() => window.innerHeight);
  const navBox = await nav.boundingBox();
  expect(navBox).not.toBeNull();
  expect(Math.abs((navBox?.y ?? 0) + (navBox?.height ?? 0) - viewportHeight)).toBeLessThanOrEqual(1);

  const track = page.locator('.meal-inventory-jump-nav__track');
  const dimensions = await track.evaluate((element) => ({ clientWidth: element.clientWidth, scrollWidth: element.scrollWidth }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);

  const buttons = track.locator('button');
  await expect(buttons).toHaveCount(11);
  const rowTops = await buttons.evaluateAll((nodes) => [...new Set(nodes.map((node) => Math.round(node.getBoundingClientRect().top)))]);
  expect(rowTops).toHaveLength(2);
  const heights = await buttons.evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().height));
  expect(heights.every((height) => height >= 48)).toBe(true);

  await expect(page.locator('[data-inventory-jump="pork"]')).toHaveText('猪');
  await expect(page.locator('[data-inventory-jump="beef"]')).toHaveText('牛');
  await expect(page.locator('[data-inventory-jump="lamb-goat"]')).toHaveText('羊');
  await expect(page.locator('[data-inventory-jump="chicken"]')).toHaveText('鸡');
  await expect(page.locator('[data-inventory-jump="egg-tofu"]')).toHaveText('蛋豆腐');
  await expect(page.locator('[data-inventory-jump="leafy-vegetable"]')).toHaveText('叶菜');
  await expect(page.locator('[data-inventory-jump="other-vegetable"]')).toHaveText('蔬菜');
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
