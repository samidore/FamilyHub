import { expect, test } from '@playwright/test';

test('Meal Builder keeps routine header and account chrome compact', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto('meal-builder/');

  await expect(page.locator('.module-hero__copy > p:not(.eyebrow)')).toHaveText('按库存选菜，凑齐这一顿。');
  await expect(page.locator('.module-hero .field-tab')).toBeHidden();
  await expect(page.locator('.module-hero__copy > .eyebrow')).toBeHidden();
  await expect(page.locator('.module-hero .summary-row')).toBeHidden();
  await expect(page.locator('.meal-shared-status')).toBeHidden();
  await expect(page.locator('#meal-account')).toBeHidden();
  await expect(page.locator('[data-meal-auth-footer] #meal-logout')).toHaveCount(1);

  const connection = page.locator('#meal-connection');
  const householdBar = page.locator('.meal-household-bar');
  await connection.evaluate((element) => {
    element.setAttribute('data-connection', 'signed-out');
    element.textContent = '请登录以连接家庭';
  });
  await expect(householdBar).toBeVisible();

  await connection.evaluate((element) => {
    element.setAttribute('data-connection', 'connected');
    element.textContent = '家庭已连接';
  });
  await expect(householdBar).toBeHidden();
});

test('inventory category jump bar is bottom-pinned, two-row, non-scrolling, data-driven, and opens the target section', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto('meal-builder/');
  await page.locator('#meal-show-all').check();

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
  const jumpIds = await buttons.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-inventory-jump')));
  const sectionIds = await page.locator('[data-inventory-section]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-inventory-section')));
  expect(jumpIds).toEqual(sectionIds);
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
  await expect(page.locator('[data-inventory-jump="extra"]')).toHaveText('点心');

  const leafy = page.locator('[data-inventory-section="leafy-vegetable"]');
  await expect(leafy).toHaveAttribute('open', '');
  await leafy.locator('summary').click();
  await expect(leafy).not.toHaveAttribute('open', '');

  await page.locator('[data-inventory-jump="leafy-vegetable"]').click();
  await expect(leafy).toHaveAttribute('open', '');
});

test('Recipes targets default folded, summarize the live settings, and keep reset outside the fold', async ({ page }) => {
  await page.goto('meal-builder/');
  const startCurrent = page.locator('#meal-start-current');
  await startCurrent.evaluate((element) => element.scrollIntoView({ block: 'center' }));
  await startCurrent.evaluate((element) => (element as HTMLButtonElement).click());

  const fold = page.locator('[data-meal-target-fold]');
  await expect(fold).toBeVisible();
  await expect(fold).not.toHaveAttribute('open', '');
  await expect(fold.locator('[data-meal-target-summary-primary]')).toHaveText('Protein 1 · Vegetable 2 · 不限');
  await expect(fold.locator('[data-meal-target-summary-secondary]')).toHaveText('Staple ✓ · 孩子一起吃 ✓');
  await expect(page.getByText('01 · 这顿需要什么')).toHaveCount(0);
  await expect(page.locator('#meal-builder-view > .meal-step-actions #meal-reset')).toHaveText('重置本顿选菜');
  await expect(page.locator('#meal-protein')).not.toBeVisible();

  await fold.locator(':scope > summary').click();
  await expect(fold).toHaveAttribute('open', '');
  await expect(page.locator('#meal-protein')).toBeVisible();
  await page.locator('#meal-vegetable').selectOption('1');
  await page.locator('#meal-staple').uncheck();
  await page.locator('#meal-child').uncheck();
  await expect(fold.locator('[data-meal-target-summary-primary]')).toHaveText('Protein 1 · Vegetable 1 · 不限');
  await expect(fold.locator('[data-meal-target-summary-secondary]')).toHaveText('Staple — · 孩子一起吃 —');

  await page.locator('#meal-back-inventory').click();
  await expect(page.locator('#meal-inventory-view')).toBeVisible();
  await startCurrent.evaluate((element) => element.scrollIntoView({ block: 'center' }));
  await startCurrent.evaluate((element) => (element as HTMLButtonElement).click());
  await expect(fold).not.toHaveAttribute('open', '');
});

test('Recipes ingredient filter defaults folded with every inner section expanded and folds again when re-entering Recipes', async ({ page }) => {
  await page.goto('meal-builder/');
  const startCurrent = page.locator('#meal-start-current');
  await startCurrent.evaluate((element) => element.scrollIntoView({ block: 'center' }));
  await startCurrent.evaluate((element) => (element as HTMLButtonElement).click());

  const fold = page.locator('[data-meal-ingredient-fold]');
  await expect(fold).toBeVisible();
  await expect(fold).not.toHaveAttribute('open', '');
  await expect(page.locator('[data-meal-ingredient-fold-count]')).toHaveText(/已选 \d+/);

  const ingredientSections = fold.locator('details[data-ingredient-section]');
  expect(await ingredientSections.count()).toBeGreaterThan(0);
  expect(await ingredientSections.evaluateAll((sections) => sections.every((section) => (section as HTMLDetailsElement).open))).toBe(true);

  await fold.locator(':scope > summary').click();
  await expect(fold).toHaveAttribute('open', '');
  expect(await ingredientSections.evaluateAll((sections) => sections.every((section) => (section as HTMLDetailsElement).open))).toBe(true);

  await page.locator('#meal-back-inventory').click();
  await expect(page.locator('#meal-inventory-view')).toBeVisible();
  await startCurrent.evaluate((element) => element.scrollIntoView({ block: 'center' }));
  await startCurrent.evaluate((element) => (element as HTMLButtonElement).click());
  await expect(fold).not.toHaveAttribute('open', '');
});