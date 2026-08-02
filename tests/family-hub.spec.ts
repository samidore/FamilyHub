import { expect, test } from '@playwright/test';

test('home groups and searches the active modules', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-module]')).toHaveCount(3);
  await expect(page.getByRole('heading', { name: '出行与玩乐' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '健康与照护' })).toBeVisible();
  await page.getByLabel('查找一个工具').fill('牙医');
  await expect(page.locator('[data-module]:visible')).toHaveCount(1);
  await expect(page.getByText('找到 1 个工具')).toBeVisible();
  await page.getByLabel('查找一个工具').fill('不存在');
  await expect(page.getByText('没有找到对应工具')).toBeVisible();
});

test('day-trip filters combine, persist in the URL, and clear', async ({ page }) => {
  await page.goto('/day-trips/');
  await expect(page.locator('[data-destination]')).toHaveCount(29);
  await page.getByText('更多筛选').click();
  await page.locator('#trip-drive').selectOption('20');
  const filtered = page.locator('[data-destination]:visible');
  expect(await filtered.count()).toBeGreaterThan(0);
  expect(await filtered.count()).toBeLessThan(29);
  await expect(page).toHaveURL(/drive=20/);
  await page.reload();
  await expect(page.locator('#trip-drive')).toHaveValue('20');
  await page.getByRole('button', { name: '清除筛选' }).click();
  await expect(page.locator('[data-destination]:visible')).toHaveCount(29);
  await expect(page).not.toHaveURL(/drive=/);
});

test('library and dentist domain filters work', async ({ page }) => {
  await page.goto('/library-activities/');
  await page.getByText('更多筛选').click();
  await page.getByLabel('活动类型').selectOption('story');
  expect(await page.locator('[data-event]:visible').count()).toBeGreaterThan(0);
  expect(await page.locator('[data-event]:visible').count()).toBeLessThan(18);

  await page.goto('/pediatric-dentists/');
  await page.getByText('更多筛选').click();
  await page.getByLabel('家庭比较 Tier').selectOption('1');
  expect(await page.locator('[data-dentist]:visible').count()).toBeGreaterThan(0);
  expect(await page.locator('[data-dentist]:visible').count()).toBeLessThan(10);
});

test('complete records remain available without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/day-trips/');
  await expect(page.locator('[data-destination]')).toHaveCount(29);
  await page.goto('/library-activities/');
  await expect(page.locator('[data-event]')).toHaveCount(18);
  await page.goto('/pediatric-dentists/');
  await expect(page.locator('[data-dentist]')).toHaveCount(10);
  await context.close();
});

test('external links are HTTPS and safely opened', async ({ page }) => {
  await page.goto('/day-trips/');
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
    for (const route of ['/', '/day-trips/', '/library-activities/', '/pediatric-dentists/']) {
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
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.locator('.skip-link')).toBeFocused();
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});
