import { expect, test } from '@playwright/test';

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
  await expect(page.locator('[data-meal-recipe]:visible')).toHaveCount(0);
  for (const id of ['chicken-breast', 'broccoli', 'green-cabbage', 'onion', 'noodles']) {
    const button = page.locator(`[data-ingredient-id="${id}"]`);
    const section = button.locator('xpath=ancestor::details');
    if (!(await section.evaluate((element: HTMLDetailsElement) => element.open))) await section.locator('summary').click();
    await button.click();
  }
  const chicken = page.locator('[data-meal-recipe="chicken-broccoli-stir-fry"]');
  const udon = page.locator('[data-meal-recipe="yaki-udon"]');
  await expect(chicken).toBeVisible();
  await chicken.getByRole('button', { name: '选择这道菜' }).click();
  await expect(page.locator('#progress-protein')).toHaveText('1 / 1');
  await expect(udon).toBeVisible();
  await udon.getByRole('button', { name: '选择这道菜' }).click();
  await expect(page.getByRole('heading', { name: '今晚的菜' })).toBeVisible();
  await page.getByRole('button', { name: '开始做饭' }).click();
  await expect(page.getByRole('heading', { name: '开始做饭' })).toBeVisible();
  await expect(page.locator('[data-cook-recipe]:visible')).toHaveCount(2);
  await page.reload();
  await expect(page.getByRole('heading', { name: '开始做饭' })).toBeVisible();
  await page.getByRole('button', { name: '返回菜单' }).click();
  await page.getByRole('button', { name: '修改选菜' }).click();
  await expect(page.locator('[data-selected-recipe]:visible')).toHaveCount(2);
});

test('meal ingredient sections keep selection while collapsed', async ({ page }) => {
  await page.goto('meal-builder/');
  const section = page.locator('[data-ingredient-section="pork"]');
  await section.locator('[data-ingredient-id="whole-pork-tenderloin"]').click();
  await section.locator('summary').click();
  await expect(section.locator('[data-ingredient-id="whole-pork-tenderloin"]')).not.toBeVisible();
  await section.locator('summary').click();
  await expect(section.locator('[data-ingredient-id="whole-pork-tenderloin"]')).toHaveAttribute('aria-pressed', 'true');
});

test('meal builder exposes one-of binding and explicit leafy add-on choices', async ({ page }) => {
  await page.goto('meal-builder/');
  for (const id of ['chicken-drumsticks', 'bone-in-chicken-thighs', 'chinese-greens', 'lettuce']) {
    const button = page.locator(`[data-ingredient-id="${id}"]`);
    const section = button.locator('xpath=ancestor::details');
    if (!(await section.evaluate((element: HTMLDetailsElement) => element.open))) await section.locator('summary').click();
    await button.click();
  }
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
