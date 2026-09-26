import { expect, test } from '@playwright/test';

test('Day Trips search filters cards and responds to the native search event', async ({ page }) => {
  await page.goto('day-trips/');

  const allCards = page.locator('[data-destination]');
  const visibleCards = page.locator('[data-destination]:not([hidden])');
  const total = await allCards.count();
  expect(total).toBeGreaterThan(1);

  const search = page.locator('#trip-search');
  await search.fill('Bergen County Zoo');

  await expect(visibleCards).toHaveCount(1);
  await expect(visibleCards).toHaveAttribute('data-search', /bergen county zoo/);
  await expect(page.locator('#trip-count')).toContainText(`显示 1 / ${total} 个地点`);

  await search.evaluate((input: HTMLInputElement) => {
    input.value = '';
    input.dispatchEvent(new Event('search', { bubbles: true }));
  });

  await expect(visibleCards).toHaveCount(total);
});

test('Day Trips desktop keeps filters open and applies the drive filter', async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 800 });
  await page.goto('day-trips/');

  const disclosure = page.locator('.filter-disclosure');
  await expect(disclosure).toHaveAttribute('open', '');

  const allCards = page.locator('[data-destination]');
  const visibleCards = page.locator('[data-destination]:not([hidden])');
  const total = await allCards.count();

  await page.locator('#trip-drive').selectOption('20');

  await expect.poll(async () => visibleCards.count()).toBeLessThan(total);
  const drives = await visibleCards.evaluateAll((cards) =>
    cards.map((card) => Number((card as HTMLElement).dataset.drive || Number.POSITIVE_INFINITY)),
  );
  expect(drives.length).toBeGreaterThan(0);
  expect(drives.every((drive) => drive <= 20)).toBe(true);
});
