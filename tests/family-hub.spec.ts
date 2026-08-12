import { expect, test, type Page } from '@playwright/test';

async function setInventory(page: Page, ids: string[]) {
  for (const id of ids) await page.locator(`[data-inventory-item="${id}"] [data-inventory-toggle]`).click();
}

async function startMeal(page: Page, ids: string[] = []) {
  await setInventory(page, ids);
  await page.locator('#meal-start-current').click();
  await expect(page.locator('#meal-start-current')).toBeDisabled();
  await expect(page.locator('#meal-builder-view')).toBeVisible();
}

test('home groups and searches the active modules', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('[data-module]')).toHaveCount(6);
  await expect(page.getByRole('heading', { name: '出行与玩乐' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '健康与照护' })).toBeVisible();
  await page.getByLabel('查找一个工具').fill('牙医');
  await expect(page.locator('[data-module]:visible')).toHaveCount(1);
  await expect(page.getByText('找到 1 个工具')).toBeVisible();
  await page.getByLabel('查找一个工具').fill('不存在');
  await expect(page.getByText('没有找到对应工具')).toBeVisible();
});

test('day-trip filters combine, persist in the URL, and clear', async ({ page }) => {
  await page.goto('day-trips/');
  await expect(page.locator('[data-destination]')).toHaveCount(29);
  const mcfaul = page.locator('[data-destination]').filter({ hasText: 'J.A. McFaul Environmental Center' });
  await expect(mcfaul.locator('.location-line')).toHaveText('Wyckoff, NJ · 15 分钟');
  await page.getByText('更多筛选').click();
  await page.locator('#trip-drive').selectOption('20');
  const filtered = page.locator('[data-destination]:visible');
  await expect(filtered).toHaveCount(14);
  await expect(mcfaul).toBeVisible();
  await expect(page).toHaveURL(/drive=20/);
  await page.reload();
  await expect(page.locator('#trip-drive')).toHaveValue('20');
  await page.getByRole('button', { name: '清除筛选' }).click();
  await expect(page.locator('[data-destination]:visible')).toHaveCount(29);
  await expect(page).not.toHaveURL(/drive=/);
});

test('library, dentist, dermatologist, and colonoscopy domain filters work', async ({ page }) => {
  await page.goto('library-activities/');
  await page.getByText('更多筛选').click();
  await page.getByLabel('活动类型').selectOption('story');
  expect(await page.locator('[data-event]:visible').count()).toBeGreaterThan(0);
  expect(await page.locator('[data-event]:visible').count()).toBeLessThan(18);

  await page.goto('pediatric-dentists/');
  await page.getByText('更多筛选').click();
  await page.getByLabel('家庭比较 Tier').selectOption('1');
  expect(await page.locator('[data-dentist]:visible').count()).toBeGreaterThan(0);
  expect(await page.locator('[data-dentist]:visible').count()).toBeLessThan(10);

  await page.goto('adult-dermatologists/');
  await page.getByText('更多筛选').click();
  await page.getByLabel('Adult acne fit').selectOption('strong');
  expect(await page.locator('[data-dermatologist]:visible').count()).toBeGreaterThan(0);
  expect(await page.locator('[data-dermatologist]:visible').count()).toBeLessThan(10);

  await page.goto('colonoscopy-specialists/');
  await page.getByText('更多筛选').click();
  await page.getByLabel('复杂息肉能力').selectOption('strong');
  expect(await page.locator('[data-colonoscopy]:visible').count()).toBeGreaterThan(0);
  expect(await page.locator('[data-colonoscopy]:visible').count()).toBeLessThan(18);
});

test('colonoscopy network plan filter preserves candidates without private fields', async ({ page }) => {
  await page.goto('colonoscopy-specialists/');
  await page.locator('.filter-disclosure summary').click();
  await page.getByLabel('Network evidence').selectOption('publicly-supported');
  await expect(page.locator('[data-colonoscopy]:visible')).toHaveCount(13);
  await expect(page.getByText('BlueCard PPO').first()).toBeVisible();
  await expect(page.locator('body')).not.toContainText('groupNumber');
  await expect(page.locator('body')).not.toContainText('memberId');
});

test('complete records remain available without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('day-trips/');
  await expect(page.locator('[data-destination]')).toHaveCount(29);
  await page.goto('library-activities/');
  await expect(page.locator('[data-event]')).toHaveCount(18);
  await page.goto('pediatric-dentists/');
  await expect(page.locator('[data-dentist]')).toHaveCount(10);
  await page.goto('adult-dermatologists/');
  await expect(page.locator('[data-dermatologist]')).toHaveCount(10);
  await page.goto('colonoscopy-specialists/');
  await expect(page.locator('[data-colonoscopy]')).toHaveCount(18);
  await page.goto('meal-builder/');
  await expect(page.locator('[data-meal-recipe]')).toHaveCount(162);
  await context.close();
});

test('external links are HTTPS and safely opened', async ({ page }) => {
  await page.goto('day-trips/');
  const links = page.locator('a[target="_blank"]');
  expect(await links.count()).toBeGreaterThan(0);
  for (const link of await links.all()) {
    expect(await link.getAttribute('href')).toMatch(/^https:\/\//);
    expect(await link.getAttribute('rel')).toContain('noopener');
    expect(await link.getAttribute('rel')).toContain('noreferrer');
  }
});

for (const width of [375, 390, 430, 768, 1024, 1440]) {
  test(`responsive foundation at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ['./', 'day-trips/', 'library-activities/', 'pediatric-dentists/', 'adult-dermatologists/', 'colonoscopy-specialists/', 'meal-builder/']) {
      await page.goto(route);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);
      expect(await page.locator('body').evaluate((body) => parseFloat(getComputedStyle(body).fontSize))).toBeGreaterThanOrEqual(18);
      const controls = page.locator('button:visible, input:visible, select:visible, summary:visible');
      for (const control of await controls.all()) expect((await control.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(47);
    }
  });
}

test('keyboard focus and 200% zoom remain usable', async ({ page }) => {
  await page.goto('./');
  await page.keyboard.press('Tab');
  await expect(page.locator('.skip-link')).toBeFocused();
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});

test('meal builder filters live, completes a meal, and preserves state', async ({ page }) => {
  await page.goto('meal-builder/');
  await expect(page.locator('[data-inventory-item]')).toHaveCount(129);
  await expect(page.locator('#meal-builder-view')).toBeHidden();
  await startMeal(page, ['chicken-breast', 'broccoli', 'green-cabbage', 'onion', 'noodles']);
  const chicken = page.locator('[data-meal-recipe="chicken-broccoli-stir-fry"]');
  const udon = page.locator('[data-meal-recipe="yaki-udon"]');
  await expect(chicken).toBeVisible();
  await chicken.getByRole('button', { name: '选择这道菜' }).click();
  await expect(page.locator('#progress-protein')).toHaveText('1 / 1');
  await expect(udon).toBeVisible();
  await udon.getByRole('button', { name: '选择这道菜' }).click();
  await expect(page.locator('#meal-completion-status')).toHaveText('目标已满足，可以进入下一步。');
  await expect(page.locator('#meal-next')).toBeEnabled();
  await page.locator('#meal-next').click();
  await expect(page.locator('#meal-shared-status')).toHaveText('ready');
  await expect(page.getByRole('heading', { name: '今晚的菜' })).toBeVisible();
  await page.getByRole('button', { name: '开始做饭' }).click();
  await expect(page.locator('#meal-shared-status')).toHaveText('cooking');
  await expect(page.getByRole('heading', { name: '开始做饭' })).toBeVisible();
  await expect(page.locator('[data-cook-recipe]:visible')).toHaveCount(2);
  await page.reload();
  await expect(page.locator('#meal-cook-view')).toBeVisible();
  await page.locator('#meal-open-checkout').click();
  await expect(page.locator('#meal-checkout')).toBeVisible();
  await page.locator('#meal-confirm-checkout').click();
  await expect(page.locator('#meal-start-current')).toBeEnabled();
});

test('meal ingredient sections keep selection while collapsed', async ({ page }) => {
  await page.goto('meal-builder/');
  await startMeal(page, ['whole-pork-tenderloin']);
  const section = page.locator('[data-ingredient-section="pork"]');
  await expect(section.locator('[data-ingredient-id="whole-pork-tenderloin"]')).toHaveAttribute('aria-pressed', 'true');
  await section.locator('summary').click();
  await expect(section.locator('[data-ingredient-id="whole-pork-tenderloin"]')).not.toBeVisible();
  await section.locator('summary').click();
  await expect(section.locator('[data-ingredient-id="whole-pork-tenderloin"]')).toHaveAttribute('aria-pressed', 'true');
});

test('meal builder explains completion blocker and gates next step', async ({ page }) => {
  await page.goto('meal-builder/');
  await startMeal(page);
  await expect(page.locator('#meal-completion-status')).toContainText('还缺：');
  await expect(page.locator('#meal-next')).toBeDisabled();
});

test('meal builder exposes one-of binding and explicit leafy add-on choices', async ({ page }) => {
  await page.goto('meal-builder/');
  await startMeal(page, ['chicken-drumsticks', 'bone-in-chicken-thighs', 'chinese-greens', 'lettuce']);
  const main = page.locator('[data-meal-recipe="oyster-sauce-braised-chicken"]');
  await expect(main).toBeVisible();
  const binding = main.locator('select[data-binding-recipe="oyster-sauce-braised-chicken"]');
  await expect(binding).toBeVisible();
  await binding.selectOption('bone-in-chicken-thighs');
  await main.getByRole('button', { name: /选择这道菜/ }).click();
  const selected = page.locator('[data-selected-recipe="oyster-sauce-braised-chicken"]');
  await expect(selected).toBeVisible();
  const addon = selected.locator('[data-addon-select="true"]');
  await expect(addon).toHaveCount(1);
  await addon.selectOption('lettuce');
  const state = await page.evaluate(() => Object.values(sessionStorage).map((value) => { try { return JSON.parse(value); } catch { return null; } }).find((value) => value?.state)?.state);
  expect(state.selectedRecipeIds).toContain('oyster-sauce-braised-chicken');
  expect(state.recipeIngredientBindings['oyster-sauce-braised-chicken']).toContain('bone-in-chicken-thighs');
  expect(state.selectedAddons).toContainEqual({ mainRecipeId: 'oyster-sauce-braised-chicken', addonType: 'finish-with-leafy-vegetable', ingredientId: 'lettuce' });
});

test('ready meal modification is a shared selecting transition', async ({ page }) => {
  await page.goto('meal-builder/');
  await startMeal(page, ['chicken-breast', 'broccoli', 'green-cabbage', 'onion', 'noodles']);
  await page.locator('[data-meal-recipe="chicken-broccoli-stir-fry"] [data-select-recipe]').click();
  await page.locator('[data-meal-recipe="yaki-udon"] [data-select-recipe]').click();
  await page.locator('#meal-next').click();
  await expect(page.locator('#meal-shared-status')).toHaveText('ready');
  await page.locator('#meal-modify').click();
  await expect(page.locator('#meal-shared-status')).toHaveText('selecting');
  await expect(page.locator('#meal-builder-view')).toBeVisible();
});

test('household inventory keeps counted half-steps, presence-only values, and visible starter scope', async ({ page }) => {
  await page.goto('meal-builder/');
  await expect(page.locator('[data-inventory-item]')).toHaveCount(129);
  for (const id of ['ginger', 'scallion', 'garlic']) await expect(page.locator(`[data-inventory-item="${id}"]`)).toHaveCount(0);

  const counted = page.locator('[data-inventory-item="chicken-breast"]');
  await expect(counted.locator('[data-inventory-value="chicken-breast"]')).toHaveText('0');
  await counted.locator('[data-inventory-toggle]').click();
  await expect(counted.locator('[data-inventory-value="chicken-breast"]')).toHaveText('1');
  await counted.locator('[data-inventory-step="0.5"]').click();
  await expect(counted.locator('[data-inventory-value="chicken-breast"]')).toHaveText('1.5');

  const presence = page.locator('[data-inventory-item="eggs"]');
  await expect(presence.locator('[data-inventory-step]')).toHaveCount(0);
  await presence.locator('[data-inventory-toggle]').click();
  await expect(presence.locator('[data-inventory-value="eggs"]')).not.toHaveText('0');
});

test('turning a current-meal ingredient off does not change shared inventory', async ({ page }) => {
  await page.goto('meal-builder/');
  await startMeal(page, ['whole-pork-tenderloin']);
  const row = page.locator('[data-inventory-item="whole-pork-tenderloin"]');
  await expect(row.locator('[data-inventory-value="whole-pork-tenderloin"]')).toHaveText('1');
  await page.locator('[data-ingredient-id="whole-pork-tenderloin"]').click();
  await expect(page.locator('[data-ingredient-id="whole-pork-tenderloin"]')).toHaveAttribute('aria-pressed', 'false');
  await expect(row.locator('[data-inventory-value="whole-pork-tenderloin"]')).toHaveText('1');
});

test('checkout consumes counted inventory while presence-only defaults to keep', async ({ page }) => {
  await page.goto('meal-builder/');
  await startMeal(page, ['eggs', 'tomato', 'noodles']);
  await page.locator('[data-meal-recipe="tomato-egg-noodles"] [data-select-recipe]').click();
  await page.locator('[data-meal-recipe="tomato-scrambled-eggs"] [data-select-recipe]').click();
  await page.locator('#meal-next').click();
  await page.locator('#meal-start-cooking').click();
  await page.locator('#meal-open-checkout').click();

  const eggsCheckout = page.locator('[data-checkout-ingredient="eggs"]');
  await expect(eggsCheckout).toContainText('用完');
  await expect(eggsCheckout.locator('[data-checkout-used-up]')).not.toBeChecked();
  await expect(page.locator('[data-checkout-value="tomato"]')).toHaveText('1 / 1');
  await page.locator('#meal-confirm-checkout').click();
  await expect(page.locator('[data-inventory-value="tomato"]')).toHaveText('0');
  await expect(page.locator('[data-inventory-value="eggs"]')).toHaveText('有');
  await expect(page.locator('[data-inventory-value="noodles"]')).toHaveText('有');
});

test('inventory reset confirms while recipe reset is immediate and scoped to the meal', async ({ page }) => {
  await page.goto('meal-builder/');
  await startMeal(page, ['chicken-breast', 'broccoli']);
  const row = page.locator('[data-inventory-item="chicken-breast"]');
  await page.locator('[data-meal-recipe="chicken-broccoli-stir-fry"] [data-select-recipe]').click();

  let dialogType = '';
  page.once('dialog', async (dialog) => { dialogType = dialog.type(); await dialog.dismiss(); });
  await page.locator('#meal-inventory-reset').click();
  expect(dialogType).toBe('confirm');
  await expect(row.locator('[data-inventory-value="chicken-breast"]')).toHaveText('1');

  let recipeDialog = false;
  page.once('dialog', async (dialog) => { recipeDialog = true; await dialog.dismiss(); });
  await page.locator('#meal-recipe-reset').click();
  await expect.poll(() => recipeDialog).toBe(false);
  await expect(page.locator('[data-selected-recipe]:visible')).toHaveCount(0);
  await expect(row.locator('[data-inventory-value="chicken-breast"]')).toHaveText('1');
});

test('two pages in one browser context receive inventory and current-meal updates', async ({ browser }) => {
  const context = await browser.newContext();
  const first = await context.newPage();
  const second = await context.newPage();
  await first.goto('meal-builder/');
  await second.goto('meal-builder/');
  await setInventory(first, ['chicken-breast', 'broccoli', 'green-cabbage', 'onion', 'noodles']);
  await expect.poll(async () => second.locator('[data-inventory-value="chicken-breast"]').textContent()).toBe('1');
  await first.locator('#meal-start-current').click();
  await expect(second.locator('#meal-start-current')).toBeDisabled();
  await expect(second.locator('#meal-builder-view')).toBeVisible();

  await first.locator('[data-meal-recipe="chicken-broccoli-stir-fry"] [data-select-recipe]').click();
  await expect(second.locator('[data-selected-recipe="chicken-broccoli-stir-fry"]')).toBeVisible();
  await first.locator('[data-meal-recipe="yaki-udon"] [data-select-recipe]').click();
  await expect(second.locator('[data-selected-recipe="yaki-udon"]')).toBeVisible();
  await first.locator('#meal-next').click();
  await expect(second.locator('#meal-shared-status')).toHaveText('ready');
  await second.locator('#meal-start-cooking').click();
  await expect(first.locator('#meal-shared-status')).toHaveText('cooking');
  await second.locator('#meal-open-checkout').click();
  await expect(second.locator('#meal-checkout')).toBeVisible();
  await second.locator('#meal-confirm-checkout').click();
  await expect.poll(async () => first.locator('[data-inventory-value="chicken-breast"]').textContent()).toBe('0');
  await expect(first.locator('#meal-start-current')).toBeEnabled();
  await context.close();
});
