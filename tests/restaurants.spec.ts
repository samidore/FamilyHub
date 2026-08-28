import { expect, test } from '@playwright/test';

test('Restaurants renders Bloom metadata and Meal Builder-style tag bulk filtering', async ({ page }) => {
  await page.goto('restaurants/');

  const bloom = page.locator('[data-restaurant][data-id="bloom-chicken-hackensack"]');
  await expect(bloom.getByRole('heading', { name: 'Bloom Chicken' })).toBeVisible();
  await expect(bloom.getByText('脆皮韩式炸鸡，鸡翅鸡块为主。')).toBeVisible();
  await expect(bloom.getByText('韩餐', { exact: true })).toBeVisible();
  await expect(bloom.getByText('炸鸡', { exact: true })).toBeVisible();

  const want = bloom.locator('[data-restaurant-want]');
  await expect(want).toHaveText('想吃');
  await expect(want).toBeDisabled();
  await expect(bloom.locator('[data-restaurant-want-people] img')).toHaveCount(0);

  const disclosure = page.locator('.filter-disclosure');
  if (await disclosure.getAttribute('open') === null) await disclosure.locator('summary').click();

  const tagButtons = page.locator('[data-restaurant-tag]');
  await expect(tagButtons).toHaveCount(2);
  await expect(page.locator('#restaurant-tag-count')).toHaveText('已选 2 / 2');
  await expect(page.locator('[data-restaurant-tag="韩餐"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-restaurant-tag="炸鸡"]')).toHaveAttribute('aria-pressed', 'true');

  await page.locator('#restaurant-tag-none').click();
  await expect(page.locator('#restaurant-tag-count')).toHaveText('已选 0 / 2');
  await expect(page.locator('#restaurant-count')).toHaveText('显示 0 / 1 家饭店');
  await expect(page.locator('#restaurant-empty')).toBeVisible();

  await page.locator('#restaurant-tag-all').click();
  await expect(page.locator('#restaurant-tag-count')).toHaveText('已选 2 / 2');
  await expect(page.locator('#restaurant-count')).toHaveText('显示 1 / 1 家饭店');
  await expect(bloom).toBeVisible();
});
