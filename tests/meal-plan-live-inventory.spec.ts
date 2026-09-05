import { expect, test, type Page } from '@playwright/test';

async function inventoryItem(page: Page, id: string) {
  const row = page.locator(`[data-inventory-item="${id}"]`);
  const group = row.locator('xpath=ancestor::details');
  if (await group.count() && await group.getAttribute('open') === null) await group.locator('summary').click();
  return row;
}

async function setInventory(page: Page, ids: string[]) {
  const showAll = page.locator('#meal-show-all');
  if (!(await showAll.isChecked())) await showAll.check();
  for (const id of ids) {
    const action = (await inventoryItem(page, id)).locator('[data-stock-add], [data-stock-toggle]').first();
    await action.click();
  }
}

async function removeOneCountedUnit(page: Page, id: string) {
  const value = page.locator(`[data-inventory-item="${id}"] [data-inventory-value="${id}"]`);
  for (const expected of ['0.5', '0']) {
    const minus = page.locator(`[data-inventory-item="${id}"] [data-stock-delta="-0.5"][data-stock-storage="inventory"]`).first();
    await minus.click();
    await expect.poll(async () => value.textContent()).toBe(expected);
  }
}

test('Optional cannot be confirmed after live inventory disappears from a frozen meal snapshot', async ({ browser }) => {
  const context = await browser.newContext();
  const first = await context.newPage();
  const second = await context.newPage();
  await first.goto('meal-builder/');
  await second.goto('meal-builder/');
  await second.locator('#meal-show-all').check();

  await setInventory(first, ['ground-pork', 'soft-tofu', 'fried-tofu-puffs']);
  await expect.poll(async () => second.locator('[data-inventory-item="fried-tofu-puffs"] [data-inventory-value="fried-tofu-puffs"]').textContent()).toBe('1');
  await first.locator('#meal-start-current').click();
  await expect(first.locator('#meal-builder-view')).toBeVisible();

  const recipe = first.locator('[data-meal-recipe="minced-pork-tofu"]');
  await expect(recipe).toBeVisible();
  await recipe.locator('[data-select-recipe]').click();
  const puff = recipe.locator('[data-recipe-draft-optional-ingredient="fried-tofu-puffs"]');
  await expect(puff).toBeVisible();
  await puff.click();
  await expect(puff).toHaveAttribute('aria-pressed', 'true');

  await removeOneCountedUnit(second, 'fried-tofu-puffs');
  await expect(puff).toBeHidden();

  await recipe.locator('[data-confirm-recipe-draft]').click();
  await expect(first.locator('[data-selected-recipe="minced-pork-tofu"]')).toHaveCount(0);
  await expect(first.locator('#meal-live')).toContainText('库存里现在没有油豆腐 / 豆泡，不能选。');
  await context.close();
});

test('One of cannot be confirmed after its chosen Ingredient leaves live inventory', async ({ browser }) => {
  const context = await browser.newContext();
  const first = await context.newPage();
  const second = await context.newPage();
  await first.goto('meal-builder/');
  await second.goto('meal-builder/');
  await second.locator('#meal-show-all').check();

  await setInventory(first, ['chicken-drumsticks', 'chicken-thighs']);
  await expect.poll(async () => second.locator('[data-inventory-item="chicken-thighs"] [data-inventory-value="chicken-thighs"]').textContent()).toBe('1');
  await first.locator('#meal-start-current').click();

  const recipe = first.locator('[data-meal-recipe="oyster-sauce-braised-chicken"]');
  await expect(recipe).toBeVisible();
  await recipe.locator('[data-select-recipe]').click();
  const thigh = recipe.locator('[data-recipe-draft-binding-ingredient="chicken-thighs"]');
  await expect(thigh).toBeVisible();
  await thigh.click();
  await expect(thigh).toHaveAttribute('aria-pressed', 'true');

  await removeOneCountedUnit(second, 'chicken-thighs');
  await expect(thigh).toBeHidden();

  await recipe.locator('[data-confirm-recipe-draft]').click();
  await expect(first.locator('[data-selected-recipe="oyster-sauce-braised-chicken"]')).toHaveCount(0);
  await expect(first.locator('#meal-live')).toContainText('库存里现在没有鸡腿，不能选。');
  await context.close();
});
