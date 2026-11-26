/** Component regressions for Inbox transfer and remote notebook updates. */
import { expect, test } from '@playwright/test';
import { mountNotebook } from './helpers/householdUi';

test('a remote notebook update preserves the open comment draft and focus', async ({ page }) => {
  await mountNotebook(page);
  const editor = page.locator('[data-comment-add="task"]');
  await editor.locator('..').locator('summary').click();
  const input = editor.locator('textarea');
  await input.fill('Unsent synthetic draft');
  await page.evaluate(() => (window as any).repository.transaction((state: any) => ({ ...state, inbox: {} })));
  await expect(input).toHaveValue('Unsent synthetic draft');
  await expect(input).toBeFocused();
  await expect(page.locator('#notebook-inbox-count')).toHaveText('暂无待整理');
  await editor.getByRole('button', { name: '添加', exact: true }).click();
  await expect(input).toHaveValue('');
  await expect(page.locator('.notebook-comment p')).toHaveText('Unsent synthetic draft');
});

test('Developer apply cannot duplicate direct items while a transaction is pending', async ({ page }) => {
  await mountNotebook(page, true);
  const patch = JSON.stringify({ patchVersion: 1, items: [{ title: 'Synthetic new item', details: '', boardIds: ['todo'], priority: 'normal' }] });
  await page.locator('#developer-patch-input').fill(patch);
  await page.locator('#developer-validate-patch').click();
  await page.evaluate(() => {
    const test = window as any;
    const transaction = test.repository.transaction.bind(test.repository);
    test.transactions = 0;
    test.repository.transaction = async (mutate: any) => {
      test.transactions++;
      await new Promise((resolve) => test.finishTransaction = resolve);
      return transaction(mutate);
    };
  });
  await page.locator('#developer-apply-patch').click();
  await expect(page.locator('#developer-apply-patch')).toBeDisabled();
  await expect(page.locator('#developer-patch-input')).toHaveAttribute('readonly', '');
  await page.locator('#developer-apply-patch').dispatchEvent('click');
  expect(await page.evaluate(() => (window as any).transactions)).toBe(1);
  await page.evaluate(() => (window as any).finishTransaction());
  await expect(page.locator('#developer-patch-input')).toHaveValue('');
  await expect(page.locator('#developer-patch-status')).toContainText('完成');
  expect(await page.evaluate(() => Object.values((window as any).repository.getSnapshot().items).filter((item: any) => item.title === 'Synthetic new item').length)).toBe(1);
  await expect(page.locator('#developer-inbox-count')).toHaveText('1 条待整理');
});

test('Developer ticket conversion updates the Inbox and preserves JSON on failure', async ({ page }) => {
  await mountNotebook(page, true);
  const patch = JSON.stringify({ patchVersion: 1, items: [{ ticketId: 'ticket', title: 'Converted capture', details: '', boardIds: ['todo'], priority: 'normal' }] });
  await page.locator('#developer-patch-input').fill(patch);
  await page.locator('#developer-validate-patch').click();
  await page.evaluate(() => {
    const test = window as any;
    test.originalTransaction = test.repository.transaction.bind(test.repository);
    test.repository.transaction = async () => { throw new Error('synthetic transaction failure'); };
  });
  await page.locator('#developer-apply-patch').click();
  await expect(page.locator('#developer-patch-input')).toHaveValue(patch);
  await expect(page.locator('#developer-patch-status')).toContainText('synthetic transaction failure');
  await expect(page.locator('#developer-inbox-count')).toHaveText('1 条待整理');
  await page.evaluate(() => (window as any).repository.transaction = (window as any).originalTransaction);
  await page.locator('#developer-apply-patch').click();
  await expect(page.locator('#developer-inbox-count')).toHaveText('暂无待整理');
  expect(await page.evaluate(() => Object.values((window as any).repository.getSnapshot().items).some((item: any) => item.title === 'Converted capture'))).toBe(true);
});

test('Inbox capture prevents duplicate saves and retains text typed during a pending save', async ({ page }) => {
  await mountNotebook(page);
  await page.evaluate(() => {
    const test = window as any;
    const transaction = test.repository.transaction.bind(test.repository);
    test.repository.transaction = async (mutate: any) => {
      await new Promise((resolve) => test.finishCapture = resolve);
      return transaction(mutate);
    };
  });
  const input = page.locator('#notebook-inbox-input');
  await input.fill('First synthetic capture');
  await page.locator('#notebook-inbox-form button').click();
  await expect(page.locator('#notebook-inbox-form button')).toBeDisabled();
  await input.fill('Next synthetic capture');
  await page.locator('#notebook-inbox-form').dispatchEvent('submit');
  await page.evaluate(() => (window as any).finishCapture());
  await expect(page.locator('#notebook-inbox-form button')).toBeEnabled();
  await expect(input).toHaveValue('Next synthetic capture');
  await expect(page.locator('#notebook-inbox-count')).toHaveText('2 条待整理');
});
