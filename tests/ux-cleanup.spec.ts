/** Checks search recovery, accurate empty states, and shared motion preferences. */
import { expect, test } from '@playwright/test';

const searchableRoutes = ['', 'library-activities/', 'pediatric-dentists/', 'adult-dermatologists/',
  'colonoscopy-specialists/', 'ob-gyn/', 'breast-surgeons/', 'restaurants/'];

test('extra filters remain reachable on desktop and after resizing', async ({ page }) => {
  for (const route of searchableRoutes.filter(Boolean)) {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(route);
    await expect(page.locator('.filter-grid select').first()).toBeVisible();
    await page.setViewportSize({ width: 375, height: 812 });
    const disclosure = page.locator('.filter-disclosure');
    await disclosure.locator('summary').click();
    await expect(disclosure).not.toHaveAttribute('open', '');
    await page.setViewportSize({ width: 1024, height: 900 });
    await expect(page.locator('.filter-grid select').first()).toBeVisible();
  }
});

for (const route of searchableRoutes) {
  test(`native search clear restores results on ${route || 'home'}`, async ({ page }) => {
    await page.clock.install({ time: new Date('2026-11-01T12:00:00Z') });
    await page.goto(route || './');
    const count = page.locator('#module-search-status, .filter-footer p');
    const initial = await count.textContent();
    const search = page.locator('input[type="search"]').first();
    await search.fill('ux-no-matching-result');
    await expect(count).not.toHaveText(initial!);
    await search.evaluate((input: HTMLInputElement) => {
      input.value = '';
      input.dispatchEvent(new Event('search', { bubbles: true }));
    });
    await expect(count).toHaveText(initial!);
    await expect(page).not.toHaveURL(/[?&]q=/);
    await expect(page.locator('.empty-state:visible')).toHaveCount(0);
  });
}

test('library distinguishes a filter miss from an empty schedule', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-01T12:00:00Z') });
  await page.goto('library-activities/');
  await page.locator('#event-search').fill('ux-no-matching-result');
  await expect(page.locator('#event-empty')).toContainText('没有符合这些条件的活动');
  await expect(page.locator('#event-empty')).not.toContainText('没有尚未过期');
  await page.getByRole('button', { name: '清除筛选', exact: true }).click();
  await expect(page.locator('#event-empty')).toBeHidden();
  await page.clock.setSystemTime(new Date('2099-01-01T12:00:00Z'));
  await page.reload();
  await expect(page.locator('#event-empty')).toContainText('没有尚未过期');
  await expect(page.locator('#event-empty a')).toHaveAttribute('href', /^https:/);
});

test('inventory jumps respect reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('meal-builder/');
  await page.locator('[data-inventory-tab="all"]').click();
  await page.evaluate(() => {
    Element.prototype.scrollIntoView = function (options) {
      this.setAttribute('data-observed-scroll', JSON.stringify(options));
    };
  });
  await page.locator('[data-inventory-jump="leafy-vegetable"]').click();
  const target = page.locator('[data-inventory-section="leafy-vegetable"]');
  await expect(target).toHaveAttribute('data-observed-scroll', /start/);
  expect(JSON.parse((await target.getAttribute('data-observed-scroll'))!).behavior).not.toBe('smooth');
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe('auto');
});

test('dialog entry motion is brief and disabled for reduced motion', async ({ page }) => {
  await page.goto('sami-notebook/');
  const dialog = page.locator('#notebook-item-dialog');
  await dialog.evaluate((element: HTMLDialogElement) => element.showModal());
  expect(await dialog.evaluate((element) => getComputedStyle(element).animationDuration)).toBe('0.2s');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await dialog.evaluate((element) => getComputedStyle(element).animationName)).toBe('none');
});
