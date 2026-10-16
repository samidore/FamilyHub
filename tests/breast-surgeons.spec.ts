import { expect, test } from '@playwright/test';

test('Breast Surgeons is listed and keeps its complete diagnostic shortlist', async ({ page }) => {
  await page.goto('./');
  const module = page.locator('[data-module][href$="/breast-surgeons/"]');
  await expect(module).toBeVisible();
  await module.click();
  await expect(page.locator('[data-breast-surgeon]')).toHaveCount(10);
  await expect(page.getByRole('heading', { name: /Breast Surgeons/ })).toBeVisible();
  await expect(page.locator('[data-breast-surgeon][data-tier="1"]')).toHaveCount(0);
  await expect(page.locator('[data-breast-surgeon]').first()).toContainText('Jennifer Marti');
});

test('Breast surgeon diagnostic filters persist in URL and can be cleared', async ({ page }) => {
  await page.goto('breast-surgeons/');
  await page.locator('.filter-disclosure summary').click();
  await page.locator('#breast-surgeon-fit').selectOption('oncology-focused');
  await expect(page.locator('[data-breast-surgeon]:visible')).toHaveCount(1);
  await expect(page.locator('[data-breast-surgeon]:visible')).toContainText('Christopher McGreevy');
  await expect(page).toHaveURL(/fit=oncology-focused/);
  await page.reload();
  await expect(page.locator('#breast-surgeon-fit')).toHaveValue('oncology-focused');
  await expect(page.locator('[data-breast-surgeon]:visible')).toHaveCount(1);
  await page.locator('#breast-surgeon-clear').click();
  await expect(page.locator('[data-breast-surgeon]:visible')).toHaveCount(10);
  await expect(page).not.toHaveURL(/fit=/);
  await page.locator('#breast-surgeon-search').fill('West Nyack');
  await expect(page.locator('[data-breast-surgeon]:visible')).toHaveCount(1);
  await expect(page.locator('[data-breast-surgeon]:visible')).toContainText('Adriana Suarez-Ligon');
});

test('Breast surgeon cards show only direct Healthgrades profiles and safe external links', async ({ page }) => {
  await page.goto('breast-surgeons/');
  const brinkmann = page.locator('[data-breast-surgeon][data-id="erika-brinkmann"]');
  await expect(brinkmann.getByRole('link', { name: 'Healthgrades' })).toHaveCount(0);
  const marti = page.locator('[data-breast-surgeon][data-id="jennifer-marti"]');
  await expect(marti.getByRole('link', { name: 'Healthgrades' }))
    .toHaveAttribute('href', 'https://www.healthgrades.com/physician/dr-jennifer-marti-3vxrw');
  const external = page.locator('[data-breast-surgeon] a[href^="https:"]');
  for (const link of await external.all()) {
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', /noopener noreferrer/);
  }
});
