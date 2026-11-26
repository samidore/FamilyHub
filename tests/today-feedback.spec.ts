/** Component regressions for the authenticated Today states without live accounts. */
import { expect, test } from '@playwright/test';
import { mountToday } from './helpers/householdUi';

test('Today waits for both sources, offers read retry, and reports reconnection', async ({ page }) => {
  await mountToday(page);
  await expect(page.locator('#today-auth-message')).toContainText('正在读取');
  await page.evaluate(() => (window as any).today.emit('state', null));
  await expect(page.locator('#today-dashboard')).toBeHidden();
  await page.evaluate(() => (window as any).today.fail('notebook'));
  await expect(page.locator('#today-retry-data')).toBeVisible();
  await page.locator('#today-retry-data').click();
  await page.evaluate(() => {
    (window as any).today.emit('state', null);
    (window as any).today.emit('notebook', null);
  });
  await expect(page.locator('#today-dashboard')).toBeVisible();
  await expect(page.locator('#today-auth-message')).toHaveText('家庭数据已同步');
  await expect(page.locator('#today-retry-data')).toBeHidden();
  await page.evaluate(() => (window as any).today.setStatus({ connection: 'connected', uid: 'synthetic-member', networkConnected: false }));
  await expect(page.locator('#today-auth-message')).toContainText('自动重连');
  await expect(page.locator('#today-dashboard')).toBeVisible();
  await page.evaluate(() => (window as any).today.setStatus({ connection: 'pending', label: '等待批准' }));
  await expect(page.locator('#today-dashboard')).toBeHidden();
  await expect(page.locator('#today-refresh-access')).toBeVisible();
});

test('notification failures are visible and toggles report work immediately', async ({ page }) => {
  await mountToday(page);
  await page.evaluate(() => {
    (window as any).today.check = async () => { throw new Error('synthetic check failure'); };
    (window as any).today.setStatus({ connection: 'signed-out', label: '需要登录' });
    (window as any).today.setStatus({ connection: 'connected', uid: 'synthetic-member' });
  });
  await expect(page.locator('#today-push-status')).toContainText('重新检查');
  await expect(page.locator('#today-enable-push')).toBeHidden();
  await page.evaluate(() => (window as any).today.check = async () => false);
  await page.locator('#today-check-push').click();
  await page.evaluate(() => (window as any).today.enable = () => new Promise((resolve) => (window as any).finishPush = resolve));
  await page.locator('#today-enable-push').click();
  await expect(page.locator('#today-push-status')).toContainText('正在开启');
  await expect(page.locator('#today-enable-push')).toBeDisabled();
  await page.evaluate(() => (window as any).finishPush());
  await expect(page.locator('#today-disable-push')).toBeVisible();
  await expect(page.locator('#today-push-status')).toHaveAttribute('aria-live', 'polite');
});

test('unrelated Today updates preserve task-link keyboard focus', async ({ page }) => {
  await mountToday(page);
  await page.evaluate(() => {
    (window as any).today.emit('state', null);
    (window as any).today.emit('notebook', { items: { task: { id: 'task', title: 'Synthetic urgent', details: '', priority: 'urgent', status: 'active', createdAt: 1, updatedAt: 1 } } });
  });
  const task = page.locator('#today-urgent a');
  await task.focus();
  await page.evaluate(() => (window as any).today.emit('state', null));
  await expect(task).toBeFocused();
});

test('blocked notification permission explains settings and hides the unusable enable action', async ({ page }) => {
  await mountToday(page);
  await page.evaluate(() => {
    Object.defineProperty(Notification, 'permission', { configurable: true, value: 'denied' });
    (window as any).today.setStatus({ connection: 'signed-out' });
    (window as any).today.setStatus({ connection: 'connected', uid: 'synthetic-member' });
  });
  await expect(page.locator('#today-enable-push')).toBeHidden();
  await expect(page.locator('#today-push-status')).toContainText('设置');
});

test('Today entry motion uses shared timing and respects reduced motion', async ({ page }) => {
  await mountToday(page);
  await page.evaluate(() => {
    (window as any).today.emit('state', null);
    (window as any).today.emit('notebook', null);
  });
  const dashboard = page.locator('#today-dashboard');
  expect(await dashboard.evaluate((node) => getComputedStyle(node).animationDuration)).toBe('0.2s');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await dashboard.evaluate((node) => getComputedStyle(node).animationName)).toBe('none');
});
