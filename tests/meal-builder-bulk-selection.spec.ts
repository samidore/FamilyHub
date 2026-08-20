import { expect, test, type Page } from '@playwright/test';

async function inventoryItem(page: Page, id: string) {
  const row = page.locator(`[data-inventory-item="${id}"]`);
  const group = row.locator('xpath=ancestor::details');
  if (await group.count() && await group.getAttribute('open') === null) await group.locator('summary').click();
  return row;
}

async function setInventory(page: Page, ids: string[]) {
  for (const id of ids) await (await inventoryItem(page, id)).locator('[data-inventory-toggle]').click();
}

test('global and section bulk controls filter the current meal without changing inventory', async ({ page }) => {
  await page.goto('meal-builder/');
  await setInventory(page, ['ground-pork', 'pork-chops', 'chicken-breast', 'broccoli']);
  await page.locator('#meal-start-current').click();

  const globalSelect = page.locator('[data-ingredient-bulk-scope="all"][data-ingredient-bulk="select"]');
  const globalClear = page.locator('[data-ingredient-bulk-scope="all"][data-ingredient-bulk="clear"]');
  await expect(globalSelect).toHaveAttribute('aria-label', '全选所有可用食材');
  await expect(globalClear).toHaveAttribute('aria-label', '全不选所有可用食材');
  await expect(globalSelect.locator('[data-bulk-icon="circle-check"]')).toHaveCount(1);
  await expect(globalClear.locator('[data-bulk-icon="circle-x"]')).toHaveCount(1);
  await expect(globalSelect).toHaveText('');
  await expect(globalClear).toHaveText('');

  await globalClear.click();
  for (const id of ['ground-pork', 'pork-chops', 'chicken-breast', 'broccoli']) {
    await expect(page.locator(`[data-ingredient-id="${id}"]`)).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator(`[data-inventory-value="${id}"]`)).toHaveText('1');
  }
  await expect(page.locator('#meal-ingredient-count')).toHaveText('已选 0');

  await globalSelect.click();
  for (const id of ['ground-pork', 'pork-chops', 'chicken-breast', 'broccoli']) {
    await expect(page.locator(`[data-ingredient-id="${id}"]`)).toHaveAttribute('aria-pressed', 'true');
  }
  await page.locator('[data-meal-recipe="clear-braised-lions-head-meatballs"] [data-select-recipe]').click();
  await expect(page.locator('[data-selected-recipe="clear-braised-lions-head-meatballs"]')).toBeVisible();

  const porkSection = page.locator('[data-ingredient-section="pork"]');
  const porkClear = porkSection.locator('[data-ingredient-bulk-section="pork"][data-ingredient-bulk="clear"]');
  await expect(porkSection).toHaveAttribute('open', '');
  await porkClear.click();
  await expect(porkSection).toHaveAttribute('open', '');
  await expect(page.locator('[data-ingredient-id="ground-pork"]')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('[data-ingredient-id="pork-chops"]')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('[data-ingredient-id="chicken-breast"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-ingredient-id="broccoli"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(porkSection.locator('[data-section-count]')).toHaveText('0 / 2');
  await expect(page.locator('[data-selected-recipe="clear-braised-lions-head-meatballs"]')).toBeHidden();

  const vegetableSection = page.locator('[data-ingredient-section="other-vegetable"]');
  const vegetableClear = vegetableSection.locator('[data-ingredient-bulk-section="other-vegetable"][data-ingredient-bulk="clear"]');
  await expect(vegetableSection).not.toHaveAttribute('open', '');
  await vegetableClear.click();
  await expect(vegetableSection).not.toHaveAttribute('open', '');
  await expect(page.locator('[data-ingredient-id="broccoli"]')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('[data-ingredient-id="chicken-breast"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-inventory-value="broccoli"]')).toHaveText('1');
});
