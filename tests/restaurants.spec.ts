import { expect, test } from '@playwright/test';

test('Restaurants renders restaurant metadata and Meal Builder-style tag bulk filtering', async ({ page }) => {
  await page.goto('restaurants/');

  const bloom = page.locator('[data-restaurant][data-id="bloom-chicken-hackensack"]');
  await expect(bloom.getByRole('heading', { name: 'Bloom Chicken' })).toBeVisible();
  await expect(bloom.getByText('脆皮韩式炸鸡，鸡翅鸡块为主。')).toBeVisible();
  await expect(bloom.getByText('韩餐', { exact: true })).toBeVisible();
  await expect(bloom.getByText('炸鸡', { exact: true })).toBeVisible();

  const tatte = page.locator('[data-restaurant][data-id="tatte-bakery-cafe-paramus"]');
  await expect(tatte.getByRole('heading', { name: 'Tatte Bakery & Cafe' })).toBeVisible();
  await expect(tatte.getByText('咖啡烘焙和早午餐，甜咸都有。')).toBeVisible();
  await expect(tatte.getByText('咖啡馆', { exact: true })).toBeVisible();
  await expect(tatte.getByText('烘焙', { exact: true })).toBeVisible();
  await expect(tatte.getByText('93 W Spring Valley Ave, Maywood, NJ 07607')).toBeVisible();

  const want = bloom.locator('[data-restaurant-want]');
  await expect(want).toHaveText('想吃');
  await expect(want).toBeDisabled();
  await expect(bloom.locator('[data-restaurant-want-people] img')).toHaveCount(0);

  const ratingRows = bloom.locator('[data-restaurant-ratings] .restaurant-rating-row');
  await expect(ratingRows).toHaveCount(2);
  const ratingGeometry = await ratingRows.evaluateAll((rows) => rows.map((row) => ({
    slots: [...row.querySelectorAll<HTMLElement>('.restaurant-rating-star-slot')].map((slot) => {
      const rect = slot.getBoundingClientRect();
      return [rect.width, rect.height];
    }),
    icons: [...row.querySelectorAll<SVGElement>('.restaurant-rating-star-icon')].map((icon) => {
      const rect = icon.getBoundingClientRect();
      return [rect.width, rect.height];
    }),
  })));
  expect(ratingGeometry).toEqual([
    { slots: Array(5).fill([40, 48]), icons: Array(5).fill([24, 24]) },
    { slots: Array(5).fill([40, 48]), icons: Array(5).fill([24, 24]) },
  ]);

  const disclosure = page.locator('.filter-disclosure');
  if (await disclosure.getAttribute('open') === null) await disclosure.locator('summary').click();

  const tagButtons = page.locator('[data-restaurant-tag]');
  await expect(tagButtons).toHaveCount(4);
  await expect(page.locator('#restaurant-tag-count')).toHaveText('已选 4 / 4');
  await expect(page.locator('[data-restaurant-tag="韩餐"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-restaurant-tag="炸鸡"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-restaurant-tag="咖啡馆"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-restaurant-tag="烘焙"]')).toHaveAttribute('aria-pressed', 'true');

  await page.locator('#restaurant-tag-none').click();
  await expect(page.locator('#restaurant-tag-count')).toHaveText('已选 0 / 4');
  await expect(page.locator('#restaurant-count')).toHaveText('显示 0 / 2 家饭店');
  await expect(page.locator('#restaurant-empty')).toBeVisible();

  await page.locator('#restaurant-tag-all').click();
  await expect(page.locator('#restaurant-tag-count')).toHaveText('已选 4 / 4');
  await expect(page.locator('#restaurant-count')).toHaveText('显示 2 / 2 家饭店');
  await expect(bloom).toBeVisible();
  await expect(tatte).toBeVisible();
});
