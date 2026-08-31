import { expect, test } from '@playwright/test';

test('notebook quick add fits in a phone viewport without dialog scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('sami-notebook/');
  await page.evaluate(() => {
    const dialog = document.querySelector<HTMLDialogElement>('#notebook-item-dialog');
    if (!dialog) throw new Error('missing notebook item dialog');
    dialog.showModal();
  });

  const dialog = page.locator('#notebook-item-dialog');
  await expect(dialog).toBeVisible();
  const metrics = await dialog.evaluate((element) => ({ clientHeight: element.clientHeight, scrollHeight: element.scrollHeight }));
  expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.clientHeight + 1);
  await expect(page.locator('#notebook-board-picker')).not.toHaveAttribute('open', '');
  await expect(page.locator('textarea[name="details"]')).toHaveAttribute('rows', '2');
  expect(await page.locator('textarea[name="details"]').evaluate((element) => element.getBoundingClientRect().height)).toBeLessThanOrEqual(64);
});
