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

  const cancelMetrics = await page.locator('#notebook-item-dialog > .dialog-close-row > .secondary-button').evaluate((button) => {
    const buttonRect = button.getBoundingClientRect();
    const rowRect = button.parentElement!.getBoundingClientRect();
    return {
      width: buttonRect.width,
      centerOffset: Math.abs((buttonRect.left + buttonRect.width / 2) - (rowRect.left + rowRect.width / 2)),
    };
  });
  const saveWidth = await page.locator('#notebook-item-form .notebook-item-dialog__actions > button[type="submit"]').evaluate(
    (button) => button.getBoundingClientRect().width,
  );
  expect(cancelMetrics.width).toBeGreaterThanOrEqual(240);
  expect(cancelMetrics.centerOffset).toBeLessThanOrEqual(1);
  expect(Math.abs(cancelMetrics.width - saveWidth)).toBeLessThanOrEqual(1);
});
