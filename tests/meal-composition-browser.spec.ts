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

test('optional contributions have a clear editor, react immediately, complete the plan, and normal Next enters Cook', async ({ page }) => {
  await page.goto('meal-builder/');
  await page.locator('#meal-show-all').check();
  await setInventory(page, ['green-cabbage', 'ground-pork', 'ground-beef']);
  await page.locator('#meal-start-current').click();

  await page.locator('#meal-vegetable').selectOption('1');
  await page.locator('#meal-staple').uncheck();
  await page.locator('#meal-child').uncheck();

  const recipe = page.locator('[data-meal-recipe="simple-stir-fried-green-cabbage"]');
  await expect(recipe).toBeVisible();
  await recipe.locator('[data-select-recipe]').click();

  const selected = page.locator('[data-selected-recipe="simple-stir-fried-green-cabbage"]');
  const editorButton = selected.locator('[data-composition-editor] > summary');
  await expect(editorButton).toHaveText('编辑');
  const editorStyle = await editorButton.evaluate((element) => {
    const style = getComputedStyle(element);
    return { height: element.getBoundingClientRect().height, borderWidth: parseFloat(style.borderTopWidth), background: style.backgroundColor };
  });
  expect(editorStyle.height).toBeGreaterThanOrEqual(48);
  expect(editorStyle.borderWidth).toBeGreaterThan(0);
  expect(editorStyle.background).not.toBe('rgba(0, 0, 0, 0)');

  await editorButton.click();
  const optionalHeading = selected.locator('.meal-composition-editor__body h4').filter({ hasText: '加点油水' });
  await expect(optionalHeading).toBeVisible();
  const headingStyle = await optionalHeading.evaluate((element) => {
    const style = getComputedStyle(element);
    return { color: style.color, weight: Number(style.fontWeight), borderLeft: parseFloat(style.borderLeftWidth) };
  });
  expect(headingStyle.color).toBe('rgb(23, 35, 28)');
  expect(headingStyle.weight).toBeGreaterThanOrEqual(700);
  expect(headingStyle.borderLeft).toBeGreaterThanOrEqual(3);

  const pork = selected.locator('[data-plan-optional-ingredient="ground-pork"]');
  const chipStyle = await pork.evaluate((element) => {
    const style = getComputedStyle(element);
    return { borderWidth: parseFloat(style.borderTopWidth), height: element.getBoundingClientRect().height };
  });
  expect(chipStyle.borderWidth).toBeGreaterThan(0);
  expect(chipStyle.height).toBeGreaterThanOrEqual(48);

  const immediatePressed = await pork.evaluate((element) => {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    return element.getAttribute('aria-pressed');
  });
  expect(immediatePressed).toBe('true');
  await selected.locator('[data-plan-optional-ingredient="ground-beef"]').click();

  await expect(page.locator('#progress-protein')).toHaveText('1 / 1');
  await expect(page.locator('#progress-vegetable')).toHaveText('1 / 1');
  await expect(page.locator('#meal-completion-status')).toHaveText('目标已满足，可以进入下一步。');
  await expect(page.locator('#meal-next')).toBeEnabled();

  await page.locator('#meal-next').click();
  await expect(page.locator('#meal-shared-status')).toHaveText('做饭中');
  await expect(page.locator('#meal-cook-view')).toBeVisible();
});
