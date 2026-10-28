import { test, expect } from '@playwright/test';

test('Today dashboard is a private shell with links to existing household modules', async ({ page }) => {
  await page.goto('today/');
  await expect(page.getByRole('heading', { name: '家庭今日看板' })).toBeVisible();
  await expect(page.locator('#today-dashboard')).toBeHidden();
  await expect(page.locator('#today-dashboard .today-card--meal .today-card-heading a')).toHaveAttribute('href', /meal-builder\/$/);
  await expect(page.locator('#today-dashboard .today-card--urgent .today-card-heading a')).toHaveAttribute('href', /sami-notebook\/$/);
  await expect(page.locator('#today-auth-message')).not.toHaveText('家庭数据实时同步中');
});

test('Home provides an obvious Today entry and the manifest opens Today', async ({ page, request }) => {
  await page.goto('');
  await expect(page.getByRole('link', { name: /打开家庭今日看板/ })).toHaveAttribute('href', /today\/$/);
  const manifestLink = page.locator('link[rel="manifest"]');
  const manifestHref = await manifestLink.getAttribute('href');
  expect(manifestHref).toContain('manifest.webmanifest');
  const response = await request.get(new URL('/manifest.webmanifest', page.url()).toString());
  expect(response.ok()).toBe(true);
  const manifest = await response.json();
  expect(manifest.start_url).toBe('./today/');
  expect(manifest.display).toBe('standalone');
});
