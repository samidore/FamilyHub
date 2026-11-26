/** Exercises redesigned task menus, Inbox recovery, and compact medical filtering. */
import { expect, test } from '@playwright/test';
import { mountNotebook } from './helpers/householdUi';

test('medical filters keep clear conditional and count active folded filters', async ({ page }) => {
  await page.goto('adult-dermatologists/');
  await expect(page.locator('.title-sub')).toHaveText('肛周皮炎/湿疹');
  await expect(page.locator('.field-tab')).toBeHidden();
  await expect(page.locator('#dermatologist-clear')).toBeHidden();
  await expect(page.locator('#dermatologist-tier')).toBeHidden();
  await page.locator('.filter-disclosure > summary').click();
  const widths = await page.evaluate(() => [document.querySelector('.filter-grid')!.getBoundingClientRect().width, document.querySelector('#dermatologist-search')!.getBoundingClientRect().width]);
  expect(widths[0]).toBeCloseTo(widths[1], 0);
  await page.locator('#dermatologist-tier').selectOption('1');
  await expect(page.locator('[data-filter-badge]')).toHaveText('1');
  await expect(page.locator('#dermatologist-clear')).toBeVisible();
  await page.locator('#dermatologist-search').fill('No matching doctor');
  await expect(page.locator('#dermatologist-empty')).toBeVisible();
  await page.locator('#dermatologist-clear').click();
  await expect(page.locator('#dermatologist-empty')).toBeHidden();
  expect(await page.locator('#dermatologist-sort').evaluate((node) => getComputedStyle(node).fontWeight)).toBe('400');
});

test('task menu changes priority and completion retains a working undo', async ({ page }) => {
  await mountNotebook(page);
  const card = page.locator('[data-item-id="task"]');
  await card.locator('[data-task-expand]').click();
  await expect(card.locator('.task-body')).toBeVisible();
  await card.locator('[data-task-menu-toggle]').click();
  await expect(card.locator('[role="menu"]')).toBeVisible();
  await card.locator('[data-task-priority="high"]').click();
  await expect(card).toHaveClass(/task--high/);
  await expect(card.locator('.task-body')).toBeVisible();
  await card.locator('[data-task-menu-toggle]').click();
  await page.keyboard.press('Escape');
  await expect(card.locator('[data-task-menu-toggle]')).toBeFocused();
  await card.locator('[data-complete-item]').click();
  await expect(card.locator('[data-restore-item]')).toBeVisible();
  await expect(card.locator('[data-task-menu-toggle]')).toHaveCount(0);
  await card.locator('[data-restore-item]').click();
  await expect(card.locator('[data-complete-item]')).toBeEnabled();
});

test('task mutation shows pending and exposes save failure without completing', async ({ page }) => {
  await mountNotebook(page);
  await page.evaluate(() => {
    (window as any).repository.transaction = () => new Promise((_, reject) => { (window as any).failTask = () => reject(new Error('Synthetic save failure')); });
  });
  const card = page.locator('[data-item-id="task"]');
  await card.locator('[data-complete-item]').click();
  await expect(card).toHaveAttribute('aria-busy', 'true');
  await expect(card.locator('[data-task-menu-toggle]')).toBeDisabled();
  await page.evaluate(() => (window as any).failTask());
  await expect(card.locator('[data-complete-item]')).toBeEnabled();
  await expect(page.locator('#notebook-live-status')).toHaveText('Synthetic save failure');
});

test('task reorder keeps its menu and focus when reaching a section boundary', async ({ page }) => {
  await mountNotebook(page);
  await page.evaluate(() => (window as any).repository.update((state: any) => ({ ...state, items: { ...state.items, second: { ...state.items.task, id: 'second', title: 'Second task' } }, memberships: { todo: { task: { order: 0 }, second: { order: 1 } } } })));
  const card = page.locator('[data-item-id="task"]');
  await card.locator('[data-task-menu-toggle]').click();
  await card.locator('[data-move-item="down"]').click();
  await expect(card.locator('[role="menu"]')).toBeVisible();
  await expect(card.locator('[data-move-item="down"]')).toHaveAttribute('aria-disabled', 'true');
  await expect(card.locator('[data-move-item="down"]')).toBeFocused();
});

test('Developer edits in place, preserves drafts on updates, and restores deletion', async ({ page }) => {
  await mountNotebook(page, true);
  page.on('dialog', () => { throw new Error('Native dialog must not open'); });
  await page.locator('[data-edit-ticket]').click();
  const input = page.locator('[data-ticket-editor] textarea');
  await input.fill('Updated capture');
  await page.evaluate(() => (window as any).repository.update((state: any) => ({ ...state })));
  await expect(input).toHaveValue('Updated capture');
  await expect(input).toBeFocused();
  await page.evaluate(() => {
    const transaction = (window as any).repository.transaction.bind((window as any).repository);
    (window as any).repository.transaction = (fn: any) => new Promise((resolve) => { (window as any).finishTicketSave = () => resolve(transaction(fn)); });
  });
  await page.locator('[data-ticket-editor] button[type="submit"]').click();
  await expect(input).toHaveAttribute('readonly', '');
  await page.evaluate(() => {
    (window as any).finishTicketSave();
    delete (window as any).repository.transaction;
  });
  await expect(page.locator('[data-ticket-id] p')).toHaveText('Updated capture');
  await page.locator('[data-delete-ticket]').click();
  await expect(page.locator('[data-ticket-id]')).toHaveCount(0);
  await page.locator('[data-undo-ticket]').click();
  await expect(page.locator('[data-ticket-id] p')).toHaveText('Updated capture');
  await page.locator('#developer-patch-input').fill(JSON.stringify({ patchVersion: 1, items: [{ ticketId: 'ticket', title: 'Converted capture', details: '', boardIds: ['todo'], priority: 'normal' }] }));
  await page.locator('#developer-validate-patch').click();
  await page.locator('#developer-apply-patch').click();
  await expect(page.locator('#developer-patch-preview')).toContainText('已创建 1 个事项');
  await expect(page.locator('#developer-patch-preview a')).toHaveAttribute('href', /sami-notebook\/\?board=todo#notebook-board-todo$/);
});

test('production Today ignores mock login parameters', async ({ page }) => {
  await page.goto('today/?mock=today-signed-in');
  await expect(page.locator('#today-dashboard')).toBeHidden();
  await expect(page.locator('body')).not.toContainText('确认周末安排');
});

test('conversion destination opens a hidden, collapsed Board without changing shared settings', async ({ page }) => {
  await mountNotebook(page);
  await page.evaluate(() => {
    history.replaceState(null, '', '?board=todo#notebook-board-todo');
    return (window as any).repository.update((state: any) => ({ ...state, settings: { ...state.settings, viewFilter: 'completed' }, boards: { todo: { ...state.boards.todo, visible: false, collapsed: true } } }));
  });
  await expect(page.locator('#notebook-board-todo [data-item-id="task"]')).toBeVisible();
  await expect(page.locator('[data-view-filter="all"]')).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => (window as any).repository.getSnapshot().boards.todo.collapsed)).toBe(true);
  await page.locator('[data-view-filter="active"]').click();
  expect(new URL(page.url()).searchParams.has('board')).toBe(false);
});
