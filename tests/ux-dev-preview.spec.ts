/** Verifies development previews through Astro and optionally records review screenshots. */
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const origin = 'http://127.0.0.1:4323';
const shots = path.resolve('../CodexTasks/orchestrator/handoffs/ux-implement-familyhub.shots');
let server: ChildProcess;
test.beforeAll(async () => {
  server = spawn(process.execPath, ['node_modules/astro/astro.js', 'dev', '--host', '127.0.0.1', '--port', '4323'], { stdio: 'ignore', env: { ...process.env, GITHUB_ACTIONS: '', GITHUB_REPOSITORY: '' } });
  await expect.poll(async () => { try { return (await fetch(origin)).ok; } catch { return false; } }, { timeout: 30000 }).toBe(true);
});
test.afterAll(() => { server?.kill(); });

async function shot(page: Page, name: string) {
  if (process.env.FAMILYHUB_UX_SHOTS !== '1') return;
  await mkdir(shots, { recursive: true });
  await page.screenshot({ path: path.join(shots, `${name}.png`), fullPage: false, animations: 'disabled', style: 'astro-dev-toolbar { display: none; }' });
}

for (const width of [390, 1440]) {
  test(`development Today states and device controls at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    for (const mode of ['signed-in', 'signed-out', 'pending', 'loading', 'error', 'meal-error', 'notebook-error', 'reconnecting', 'push-checking', 'push-enabling', 'push-disabling', 'push-enabled', 'push-disabled', 'push-denied', 'push-unsupported', 'push-unconfigured', 'push-error']) {
      await page.goto(`${origin}/today/?mock=today-${mode}`);
      if (mode === 'pending') await expect(page.locator('#today-auth-message')).toContainText('等待');
      else if (mode === 'signed-out') await expect(page.locator('#today-dashboard')).toBeHidden();
      else await expect(page.locator('#today-dashboard')).toBeVisible();
      if (mode.endsWith('error') && !mode.startsWith('push')) await expect(page.locator('#today-retry-data')).toBeVisible();
      if (mode === 'push-enabling') await expect(page.locator('#today-enable-push')).toBeDisabled();
      if (mode === 'push-disabling') await expect(page.locator('#today-disable-push')).toBeDisabled();
      await shot(page, `today-${mode}-${width}`);
      if (mode === 'meal-error') {
        await expect(page.locator('.today-card--upcoming')).toHaveAttribute('data-ready', 'true');
        await page.locator('.today-card--meal [data-retry-source]').click();
        await expect(page.locator('.today-card--meal')).toHaveAttribute('data-ready', 'true');
      }
      if (mode === 'push-enabled') await expect(page.locator('#today-disable-push')).toBeVisible();
      if (mode === 'push-disabled') {
        await page.locator('#today-enable-push').click();
        await expect(page.locator('#today-disable-push')).toBeVisible();
        await page.locator('#today-disable-push').click();
        await expect(page.locator('#today-enable-push')).toBeVisible();
      }
      if (mode === 'push-denied') await expect(page.locator('#today-push-status')).toContainText('设置');
      if (mode === 'push-unsupported') await expect(page.locator('#today-push-status')).toContainText('暂不支持');
      if (mode === 'reconnecting') await expect(page.locator('#today-auth-message')).toContainText('自动重连');
    }
  });

  test(`redesigned pages and local interactions at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    for (const route of ['adult-dermatologists', 'breast-surgeons', 'pediatric-dentists', 'colonoscopy-specialists', 'ob-gyn', 'restaurants', 'day-trips', 'library-activities', '']) {
      await page.goto(`${origin}/${route}/`);
      await expect(page.locator('h1').first()).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await shot(page, `${route || 'home'}-${width}`);
      if (route === 'adult-dermatologists') {
        await page.locator('.about > summary').click();
        await shot(page, `medical-about-${width}`);
        await page.locator('.about > summary').click();
        await page.locator('.filter-disclosure').evaluate((node: HTMLDetailsElement) => { node.open = true; });
        await page.locator('.filter-disclosure').scrollIntoViewIfNeeded();
        await shot(page, `medical-filters-${width}`);
      }
    }
    await page.goto(`${origin}/meal-builder/?mock=meal-signed-in`);
    const candidate = page.locator('[data-meal-recipe]:visible').first();
    await expect(candidate).toBeVisible();
    await candidate.scrollIntoViewIfNeeded();
    const families = await page.locator('#meal-next').evaluate((node) => [getComputedStyle(node).fontFamily, getComputedStyle(document.body).fontFamily]);
    expect(families[0]).toBe(families[1]);
    await shot(page, `meal-candidates-${width}`);
    await candidate.locator('.comp > summary').click();
    await shot(page, `meal-composition-${width}`);
    await candidate.locator('[data-select-recipe]').click();
    await expect(candidate.locator('[data-recipe-plan-draft]')).toBeVisible();
    await shot(page, `meal-draft-${width}`);
    await candidate.locator('[data-confirm-recipe-draft]').click();
    await page.locator('#meal-force-next').click();
    const duration = page.locator('[data-cook-recipe]:visible > summary > span:nth-child(2)');
    expect(await duration.evaluate((node) => getComputedStyle(node).whiteSpace)).toBe('nowrap');
    await page.locator('.meal-cook > .meal-section-heading').scrollIntoViewIfNeeded();
    await shot(page, `meal-cook-${width}`);
    await page.locator('#meal-open-checkout').click();
    await page.locator('#meal-checkout').scrollIntoViewIfNeeded();
    await shot(page, `meal-checkout-${width}`);
    await page.goto(`${origin}/sami-notebook/?mock=notebook-signed-in`);
    await expect(page.locator('.notebook-task').first()).toBeVisible();
    await shot(page, `notebook-${width}`);
    const task = page.locator('.notebook-board[data-board-id] .notebook-task').first();
    await task.evaluate((node) => node.scrollIntoView({ block: 'start' }));
    await shot(page, `notebook-task-${width}`);
    await task.locator('[data-task-expand]').click();
    await task.locator('[data-task-menu-toggle]').click();
    await task.evaluate((node) => node.scrollIntoView({ block: 'start', behavior: 'instant' }));
    await shot(page, `notebook-menu-${width}`);
    await page.keyboard.press('Escape');
    await task.locator('[data-complete-item]').click();
    await expect(task.locator('[data-restore-item]')).toBeVisible();
    await shot(page, `notebook-completed-${width}`);
    await page.goto(`${origin}/sami-notebook/developer/?mock=developer-signed-in`);
    await page.locator('[data-edit-ticket]').click();
    await shot(page, `developer-edit-${width}`);
    await page.locator('[data-cancel-ticket]').click();
    await page.locator('#developer-patch-input').fill(JSON.stringify({ patchVersion: 1, items: [{ ticketId: 'preview-ticket', title: '转换结果示例', details: '', boardIds: ['preview-board'], priority: 'normal' }] }));
    await page.locator('#developer-validate-patch').click();
    await page.locator('#developer-apply-patch').click();
    await expect(page.locator('#developer-patch-preview a')).toHaveAttribute('href', /board=preview-board/);
    await page.locator('#developer-patch-preview').scrollIntoViewIfNeeded();
    await shot(page, `developer-result-${width}`);
  });
}
