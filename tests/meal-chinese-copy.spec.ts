/** Checks Chinese Meal copy in the static catalog and interactive meal flow. */
import { expect, test } from '@playwright/test';

for (const width of [375, 390, 768, 1024, 1440]) {
  test(`Meal candidates use Chinese copy and fit at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('meal-builder/');
    await expect(page.locator('h1')).toHaveText('家庭组餐');
    await expect(page.locator('.back-link')).toHaveText('← 家庭首页');
    await page.locator('[data-inventory-tab="all"]').click();
    const stock = page.locator('[data-inventory-item="chicken-drumsticks"]');
    await stock.locator('[data-stock-add]').first().click();
    await expect(stock.locator('.meal-inventory-name small')).toHaveCount(0);
    await page.locator('#meal-start-current').click();
    await expect(page.locator('[data-meal-target-summary-primary]')).toHaveText('蛋白质 1 · 蔬菜 2 · 不限');
    await expect(page.locator('#meal-completion-status')).toHaveText('还缺：蛋白质、蔬菜、主食、孩子蛋白、孩子蔬菜');
    const card = page.locator('[data-meal-recipe="oyster-sauce-braised-chicken"]');
    await expect(card).toBeVisible();
    await expect(card.locator('h3')).toHaveText('红烧鸡腿 / 鸡小腿');
    await expect(card.locator('h3 small')).toHaveCount(0);
    await expect(card.locator('.gives')).toContainText('蛋白质 +1');
    await expect(card.locator('.gives')).not.toContainText(/Protein|Vegetable|Staple/);
    const geometry = await card.evaluate((element) => {
      const title = element.querySelector('h3')!.getBoundingClientRect();
      const gives = element.querySelector('.gives')!.getBoundingClientRect();
      const button = element.querySelector('[data-select-recipe]')!.getBoundingClientRect();
      const bounds = element.getBoundingClientRect();
      return { titleBottom: title.bottom, givesTop: gives.top, buttonBottom: button.bottom, cardBottom: bounds.bottom, right: bounds.right };
    });
    expect(geometry.givesTop).toBeGreaterThanOrEqual(geometry.titleBottom);
    expect(geometry.buttonBottom).toBeLessThanOrEqual(geometry.cardBottom);
    expect(geometry.right).toBeLessThanOrEqual(width);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    if (width === 390 || width === 1440) await card.screenshot({ path: testInfo.outputPath('candidate.png') });
    await card.locator('[data-select-recipe]').click();
    await expect(card.locator('[data-recipe-plan-draft]')).not.toContainText(/Protein|Vegetable|Staple/);
    await card.locator('[data-confirm-recipe-draft]').click();
    await expect(page.locator('[data-selected-recipe="oyster-sauce-braised-chicken"]')).not.toContainText(/Protein|Vegetable|Staple/);
    await page.locator('#meal-force-next').click();
    const cook = page.locator('[data-cook-recipe="oyster-sauce-braised-chicken"]');
    await expect(cook.locator('summary small')).toHaveCount(0);
    await expect(cook.locator('.badges')).not.toContainText(/Protein|Vegetable|Staple/);
  });
}

test('static Meal catalog and group headings use Chinese without English subtitles', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(`${baseURL}meal-builder/`);
  await expect(page.locator('h1')).toHaveText('家庭组餐');
  await expect(page.locator('.meal-ingredient-section > summary small')).toHaveCount(0);
  await expect(page.locator('.meal-chip small, .meal-recipe-card h3 small, .meal-cook-card summary small')).toHaveCount(0);
  await expect(page.locator('.meal-readable-catalog')).not.toContainText(/Protein|Vegetable|Staple/);
  await expect(page.locator('[data-meal-recipe="oyster-sauce-braised-chicken"] h3')).toHaveText('红烧鸡腿 / 鸡小腿');
  await context.close();
});
