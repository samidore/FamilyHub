import { expect, test, type Page } from '@playwright/test';

async function inventoryItem(page: Page, id: string) {
  const row = page.locator(`[data-inventory-item="${id}"]`);
  const group = row.locator('xpath=ancestor::details');
  if (await group.count() && await group.getAttribute('open') === null) await group.locator('summary').click();
  return row;
}

async function setInventory(page: Page, ids: string[]) {
  for (const id of ids) { const action = (await inventoryItem(page, id)).locator('[data-stock-add], [data-stock-toggle]').first(); await action.click(); }
}

test('candidate composition stays draft-only until confirmation and supports optional multi-select', async ({ page }) => {
  await page.goto('meal-builder/');
  await page.locator('#meal-show-all').check();
  await setInventory(page, ['green-cabbage', 'ground-pork', 'ground-beef']);
  await page.locator('#meal-start-current').click();

  await page.locator('#meal-vegetable').selectOption('1');
  await page.locator('#meal-staple').uncheck();
  await page.locator('#meal-child').uncheck();

  const recipe = page.locator('[data-meal-recipe="simple-stir-fried-green-cabbage"]');
  await expect(recipe).toBeVisible();
  const summary = recipe.locator('[data-candidate-composition]');
  await expect(summary).toContainText('必需 Required');
  await expect(summary).toContainText('选一 One of');
  await expect(summary).toContainText('可加 Optional');
  await expect(summary).toContainText('加点油水');

  await expect(page.locator('#progress-protein')).toHaveText('0 / 1');
  await recipe.locator('[data-select-recipe]').click();

  const draft = recipe.locator('[data-recipe-plan-draft]');
  await expect(draft).toBeVisible();
  await expect(page.locator('[data-selected-recipe="simple-stir-fried-green-cabbage"]')).toBeHidden();
  await expect(page.locator('#progress-protein')).toHaveText('0 / 1');
  await expect(page.locator('#progress-vegetable')).toHaveText('0 / 1');

  await expect(draft.getByRole('heading', { name: '必需 Required' })).toBeVisible();
  await expect(draft).toContainText('卷心菜 / 圆白菜');
  await expect(draft.getByRole('heading', { name: '可加 Optional' })).toBeVisible();
  await expect(draft.getByRole('heading', { name: '加点油水' })).toBeVisible();

  const pork = draft.locator('[data-recipe-draft-optional-ingredient="ground-pork"]');
  const beef = draft.locator('[data-recipe-draft-optional-ingredient="ground-beef"]');
  const chipStyle = await pork.evaluate((element) => {
    const style = getComputedStyle(element);
    return { borderWidth: parseFloat(style.borderTopWidth), height: element.getBoundingClientRect().height };
  });
  expect(chipStyle.borderWidth).toBeGreaterThan(0);
  expect(chipStyle.height).toBeGreaterThanOrEqual(48);

  await pork.click();
  await beef.click();
  await expect(pork).toHaveAttribute('aria-pressed', 'true');
  await expect(beef).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#progress-protein')).toHaveText('0 / 1');

  await draft.locator('[data-confirm-recipe-draft]').click();
  const selected = page.locator('[data-selected-recipe="simple-stir-fried-green-cabbage"]');
  await expect(selected).toBeVisible();
  await expect(selected.locator('[data-selected-plan-summary]')).toContainText('猪绞肉');
  await expect(selected.locator('[data-selected-plan-summary]')).toContainText('牛绞肉');
  await expect(page.locator('#progress-protein')).toHaveText('1 / 1');
  await expect(page.locator('#progress-vegetable')).toHaveText('1 / 1');
  await expect(page.locator('#meal-completion-status')).toHaveText('目标已满足，可以进入下一步。');
  await expect(page.locator('#meal-next')).toBeEnabled();
});

test('cancel discards a new or edited Recipe draft and selected Plan edits require confirmation', async ({ page }) => {
  await page.goto('meal-builder/');
  await page.locator('#meal-show-all').check();
  await setInventory(page, ['chicken-drumsticks', 'chicken-thighs']);
  await page.locator('#meal-start-current').click();

  const recipe = page.locator('[data-meal-recipe="oyster-sauce-braised-chicken"]');
  await recipe.locator('[data-select-recipe]').click();
  let draft = recipe.locator('[data-recipe-plan-draft]');
  const thigh = draft.locator('[data-recipe-draft-binding-ingredient="chicken-thighs"]');
  await thigh.click();
  await expect(thigh).toHaveAttribute('aria-pressed', 'true');
  await draft.locator('[data-cancel-recipe-draft]').click();
  await expect(page.locator('[data-selected-recipe="oyster-sauce-braised-chicken"]')).toBeHidden();

  await recipe.locator('[data-select-recipe]').click();
  draft = recipe.locator('[data-recipe-plan-draft]');
  await draft.locator('[data-recipe-draft-binding-ingredient="chicken-thighs"]').click();
  await draft.locator('[data-confirm-recipe-draft]').click();

  const selected = page.locator('[data-selected-recipe="oyster-sauce-braised-chicken"]');
  await expect(selected).toBeVisible();
  await expect(selected.locator('[data-selected-plan-summary]')).toContainText('鸡腿肉');

  await selected.locator('[data-edit-recipe-plan]').click();
  let edit = selected.locator('[data-recipe-plan-draft]');
  const drumstick = edit.locator('[data-recipe-draft-binding-ingredient="chicken-drumsticks"]');
  await drumstick.click();
  await expect(drumstick).toHaveAttribute('aria-pressed', 'true');
  await edit.locator('[data-cancel-recipe-draft]').click();
  await expect(selected.locator('[data-selected-plan-summary]')).toContainText('鸡腿肉');

  await selected.locator('[data-edit-recipe-plan]').click();
  edit = selected.locator('[data-recipe-plan-draft]');
  await expect(edit.locator('[data-recipe-draft-binding-ingredient="chicken-thighs"]')).toHaveAttribute('aria-pressed', 'true');
  await edit.locator('[data-recipe-draft-binding-ingredient="chicken-drumsticks"]').click();
  await edit.locator('[data-confirm-recipe-draft]').click();
  await expect(selected.locator('[data-selected-plan-summary]')).toContainText('鸡小腿');
});
