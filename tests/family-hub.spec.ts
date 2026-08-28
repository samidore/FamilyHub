import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { loadMealData } from '../scripts/load-meal-data.mjs';
import { moduleRegistry } from '../src/config/modules';

const mealData = await loadMealData();
const visibleIngredientCount = mealData.ingredients.filter((ingredient) => ingredient.visible).length;
const visibleSectionCount = mealData.starterSections.length;

const dayTripData = JSON.parse(await readFile(new URL('../src/data/day-trips.json', import.meta.url), 'utf8')) as Array<{ name: string; city: string; state: string; driveMinutes: number }>;
const dayTripCount = dayTripData.length;
const within20DayTripCount = dayTripData.filter((trip) => trip.driveMinutes <= 20).length;
const mcfaulData = dayTripData.find((trip) => trip.name === 'J.A. McFaul Environmental Center');
if (!mcfaulData) throw new Error('J.A. McFaul Environmental Center is missing from Day Trips data');
const mcfaulDriveText = `${mcfaulData.city}, ${mcfaulData.state} · 约 ${mcfaulData.driveMinutes} 分钟`;

const libraryEventCount = JSON.parse(await readFile(new URL('../src/data/library-events.json', import.meta.url), 'utf8')).length;

const pediatricDentistData = JSON.parse(await readFile(new URL('../src/data/pediatric-dentists.json', import.meta.url), 'utf8')) as Array<{ tier: number }>;
const tierOneDentistCount = pediatricDentistData.filter((item) => item.tier === 1).length;

const dermatologistData = JSON.parse(await readFile(new URL('../src/data/adult-dermatologists.json', import.meta.url), 'utf8')) as Array<{
  locationScope: string;
  capabilities: string[];
  evidenceBands: { perianalDermatitisFit: string };
}>;
const dermatologistCount = dermatologistData.length;
const strongDermatologistCount = dermatologistData.filter((item) => item.evidenceBands.perianalDermatitisFit === 'strong').length;
const nycDermatologistCount = dermatologistData.filter((item) => item.locationScope === 'nyc').length;
const nycPatchTestingCount = dermatologistData.filter((item) => item.locationScope === 'nyc' && item.capabilities.includes('patch-testing')).length;

const colonoscopyData = JSON.parse(await readFile(new URL('../src/data/colonoscopy-specialists.json', import.meta.url), 'utf8')) as Array<{
  evidenceBands: { complexPolypFit: string };
  networkVerification: { facilityStatus: string };
}>;
const strongColonoscopyCount = colonoscopyData.filter((item) => item.evidenceBands.complexPolypFit === 'strong').length;
const publiclySupportedColonoscopyCount = colonoscopyData.filter((item) => item.networkVerification.facilityStatus === 'publicly-supported').length;

const obGynData = JSON.parse(await readFile(new URL('../src/data/ob-gyn.json', import.meta.url), 'utf8')) as Array<{ placements: Array<{ section: string }> }>;
const obGynSectionCount = (section: string) => obGynData.reduce((count, provider) => count + provider.placements.filter((placement) => placement.section === section).length, 0);
const obGynSections = ['valley-ob', 'hackensack-ob', 'englewood-ob', 'gyn'] as const;
const responsiveRoutes = ['./', ...moduleRegistry.map((module) => module.route.slice(1))];

async function inventoryItem(page: Page, id: string) {
  const row = page.locator(`[data-inventory-item="${id}"]`);
  const group = row.locator('xpath=ancestor::details');
  if (await group.count() && await group.getAttribute('open') === null) await group.locator('summary').click();
  return row;
}

async function setInventory(page: Page, ids: string[]) {
  for (const id of ids) await (await inventoryItem(page, id)).locator('[data-inventory-toggle]').click();
}

async function startMeal(page: Page, ids: string[] = []) {
  await setInventory(page, ids);
  await page.locator('#meal-start-current').click();
  await expect(page.locator('#meal-start-current')).toBeDisabled();
  await expect(page.locator('#meal-builder-view')).toBeVisible();
}

test('home groups and searches the active modules', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('[data-module]')).toHaveCount(moduleRegistry.length);
  const sections = page.locator('[data-category-section]');
  await expect(sections).toHaveCount(3);
  await expect(sections.nth(0)).toHaveAttribute('data-category-section', 'food-home');
  await expect(sections.nth(0).locator('.category-index')).toHaveText('01');
  await expect(sections.nth(0).locator('[data-module]').first()).toHaveAttribute('href', /\/meal-builder\/$/);
  await expect(sections.nth(1)).toHaveAttribute('data-category-section', 'explore-play');
  await expect(sections.nth(1).locator('.category-index')).toHaveText('02');
  await expect(sections.nth(2)).toHaveAttribute('data-category-section', 'health-care');
  await expect(sections.nth(2).locator('.category-index')).toHaveText('03');
  await expect(page.getByRole('heading', { name: '出行与玩乐' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '健康与照护' })).toBeVisible();
  await page.getByLabel('查找一个工具').fill('牙医');
  await expect(page.locator('[data-module]:visible')).toHaveCount(1);
  await expect(page.getByText('找到 1 个工具')).toBeVisible();
  await page.getByLabel('查找一个工具').fill('不存在');
  await expect(page.getByText('没有找到对应工具')).toBeVisible();
});

test('day-trip filters combine, persist in the URL, and clear', async ({ page }) => {
  await page.goto('day-trips/');
  await expect(page.locator('[data-destination]')).toHaveCount(dayTripCount);
  const mcfaul = page.locator('[data-destination]').filter({ hasText: mcfaulData.name });
  await expect(mcfaul.locator('.location-line')).toHaveText(mcfaulDriveText);
  await page.getByText('更多筛选').click();
  await page.locator('#trip-drive').selectOption('20');
  const filtered = page.locator('[data-destination]:visible');
  await expect(filtered).toHaveCount(within20DayTripCount);
  for (const card of await filtered.all()) expect(Number(await card.getAttribute('data-drive'))).toBeLessThanOrEqual(20);
  await expect(mcfaul).toBeVisible();
  await expect(page).toHaveURL(/drive=20/);
  await page.reload();
  await expect(page.locator('#trip-drive')).toHaveValue('20');
  await page.getByRole('button', { name: '清除筛选' }).click();
  await expect(page.locator('[data-destination]:visible')).toHaveCount(dayTripCount);
  await expect(page).not.toHaveURL(/drive=/);
});

test('library scope and medical domain filters work', async ({ page }) => {
  await page.goto('library-activities/');
  await expect(page.locator('#event-library')).toHaveCount(0);
  await expect(page.locator('#event-sort option[value="library"]')).toHaveCount(0);
  await expect(page.locator('[data-event]')).toHaveCount(libraryEventCount);
  for (const card of await page.locator('[data-event]').all()) {
    await expect(card).toContainText('Maurice M. Pine Library');
    await expect(card).toContainText('Fair Lawn');
  }
  if (libraryEventCount === 0) await expect(page.locator('#event-empty')).toBeVisible();

  await page.goto('pediatric-dentists/');
  await page.getByText('更多筛选').click();
  await page.getByLabel('家庭比较 Tier').selectOption('1');
  await expect(page.locator('[data-dentist]:visible')).toHaveCount(tierOneDentistCount);

  await page.goto('adult-dermatologists/');
  await page.getByText('更多筛选').click();
  await page.locator('#dermatologist-fit').selectOption('strong');
  await expect(page.locator('[data-dermatologist]:visible')).toHaveCount(strongDermatologistCount);

  await page.goto('colonoscopy-specialists/');
  await page.getByText('更多筛选').click();
  await page.getByLabel('复杂息肉能力').selectOption('strong');
  await expect(page.locator('[data-colonoscopy]:visible')).toHaveCount(strongColonoscopyCount);

  await page.goto('ob-gyn/');
  await page.getByText('更多筛选').click();
  await page.getByLabel('区块').selectOption('hackensack-ob');
  await expect(page.locator('[data-ob-gyn]:visible')).toHaveCount(obGynSectionCount('hackensack-ob'));
  await expect(page).toHaveURL(/section=hackensack-ob/);
});

test('OB GYN groups are collapsible and keep complete ranked placements', async ({ page }) => {
  await page.goto('ob-gyn/');
  const sections = page.locator('[data-provider-section]');
  await expect(sections).toHaveCount(obGynSections.length);
  for (const section of obGynSections) {
    await expect(page.locator(`[data-provider-section][data-section="${section}"] [data-ob-gyn]`)).toHaveCount(obGynSectionCount(section));
  }

  const valley = page.locator('[data-provider-section][data-section="valley-ob"]');
  await expect(valley).not.toHaveAttribute('open', '');
  await valley.locator(':scope > summary').click();
  await expect(valley).toHaveAttribute('open', '');
  await valley.locator(':scope > summary').click();
  await expect(valley).not.toHaveAttribute('open', '');

  await page.getByLabel('搜索医生、practice、地点或证据').fill('Gerardis');
  await expect(page.locator('[data-ob-gyn]:visible')).toHaveCount(1);
  await expect(page.locator('[data-provider-section][data-section="hackensack-ob"]')).toHaveAttribute('open', '');
});

test('dermatologist location and diagnostic-capability filters expose NYC alternatives', async ({ page }) => {
  await page.goto('adult-dermatologists/');
  await page.getByText('更多筛选').click();
  await page.locator('#dermatologist-location').selectOption('nyc');
  const nyc = page.locator('[data-dermatologist]:visible');
  await expect(nyc).toHaveCount(nycDermatologistCount);
  if (nycDermatologistCount > 0) await expect(nyc.first()).toContainText('NYC 专科备选');
  await page.locator('#dermatologist-capability').selectOption('patch-testing');
  await expect(page.locator('[data-dermatologist]:visible')).toHaveCount(nycPatchTestingCount);
  await expect(page).toHaveURL(/capability=patch-testing/);
  await page.reload();
  await expect(page.locator('#dermatologist-location')).toHaveValue('nyc');
  await expect(page.locator('#dermatologist-capability')).toHaveValue('patch-testing');
  await page.locator('#dermatologist-clear').click();
  await expect(page.locator('[data-dermatologist]:visible')).toHaveCount(dermatologistCount);
  await expect(page).not.toHaveURL(/location=|capability=/);

  const cards = page.locator('[data-dermatologist]:visible');
  await page.locator('#dermatologist-sort').selectOption('drive');
  await expect(cards.first()).not.toHaveAttribute('data-drive-max', '999');
  if (nycDermatologistCount > 0) await expect(cards.last()).toHaveAttribute('data-drive-max', '999');
  await page.locator('#dermatologist-sort').selectOption('rating');
  await expect(cards.first()).not.toHaveAttribute('data-primary-rating', '-1');
  await expect(cards.last()).toHaveAttribute('data-primary-rating', '-1');
});

test('colonoscopy network plan filter preserves candidates', async ({ page }) => {
  await page.goto('colonoscopy-specialists/');
  await page.locator('.filter-disclosure summary').click();
  await page.getByLabel('Network evidence').selectOption('publicly-supported');
  await expect(page.locator('[data-colonoscopy]:visible')).toHaveCount(publiclySupportedColonoscopyCount);
  await expect(page.getByText('BlueCard PPO').first()).toBeVisible();
});

for (const width of [375, 768, 1024, 1440]) {
  test(`responsive foundation at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const route of responsiveRoutes) {
      await page.goto(route);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);
      expect(await page.locator('body').evaluate((body) => parseFloat(getComputedStyle(body).fontSize))).toBeGreaterThanOrEqual(18);
      const controlHeights = await page.locator('button:visible, input:visible, select:visible, summary:visible').evaluateAll((controls) =>
        controls.map((control) => control.getBoundingClientRect().height),
      );
      for (const height of controlHeights) expect(height).toBeGreaterThanOrEqual(47);
    }
  });
}

test('keyboard focus and 200% zoom remain usable', async ({ page }) => {
  await page.goto('./');
  await page.keyboard.press('Tab');
  await expect(page.locator('.skip-link')).toBeFocused();
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});

test('meal builder filters live, completes a meal, and preserves state', async ({ page }) => {
  await page.goto('meal-builder/');
  await expect(page.locator('[data-inventory-item]')).toHaveCount(visibleIngredientCount);
  await expect(page.locator('#meal-builder-view')).toBeHidden();
  await startMeal(page, ['chicken-breast', 'broccoli', 'green-cabbage', 'onion', 'noodles']);
  const chicken = page.locator('[data-meal-recipe="chicken-broccoli-stir-fry"]');
  const udon = page.locator('[data-meal-recipe="yaki-udon"]');
  await expect(chicken).toBeVisible();
  await chicken.getByRole('button', { name: '选择这道菜' }).click();
  await expect(page.locator('#progress-protein')).toHaveText('1 / 1');
  await expect(udon).toBeVisible();
  await udon.getByRole('button', { name: '选择这道菜' }).click();
  await expect(page.locator('#meal-completion-status')).toHaveText('目标已满足，可以进入下一步。');
  await expect(page.locator('#meal-next')).toBeEnabled();
  await page.locator('#meal-next').click();
  await expect(page.locator('#meal-shared-status')).toHaveText('cooking');
  await expect(page.getByRole('heading', { name: '开始做饭' })).toBeVisible();
  await expect(page.locator('[data-cook-recipe]:visible')).toHaveCount(2);
  await expect(page.locator('[data-cook-recipe="chicken-broccoli-stir-fry"]')).toContainText('鸡胸：340 g');
  await page.reload();
  await expect(page.locator('#meal-cook-view')).toBeVisible();
  await page.locator('#meal-open-checkout').click();
  await expect(page.locator('#meal-checkout')).toBeVisible();
  await page.locator('#meal-confirm-checkout').click();
  await page.locator('#meal-finalize-checkout').click();
  await expect(page.locator('#meal-builder-view')).toBeVisible();
  await expect(page.locator('[data-step="recipes"]')).toHaveClass(/is-active/);
  await expect(page.locator('[data-selected-recipe]:visible')).toHaveCount(0);
});

test('meal ingredient sections keep selection while collapsed', async ({ page }) => {
  await page.goto('meal-builder/');
  await startMeal(page, ['whole-pork-tenderloin']);
  await page.locator('[data-meal-ingredient-fold] > summary').click();
  const section = page.locator('[data-ingredient-section="pork"]');
  await expect(section.locator('[data-ingredient-id="whole-pork-tenderloin"]')).toHaveAttribute('aria-pressed', 'true');
  await section.locator('summary').click();
  await expect(section.locator('[data-ingredient-id="whole-pork-tenderloin"]')).not.toBeVisible();
  await section.locator('summary').click();
  await expect(section.locator('[data-ingredient-id="whole-pork-tenderloin"]')).toHaveAttribute('aria-pressed', 'true');
});

test('meal builder explains completion blocker and gates next step', async ({ page }) => {
  await page.goto('meal-builder/');
  await startMeal(page);
  await expect(page.locator('#meal-completion-status')).toContainText('还缺：');
  await expect(page.locator('#meal-next')).toBeDisabled();
  await expect(page.locator('#meal-force-next')).toBeDisabled();
});

test('force next bypasses completion only after one Recipe is selected', async ({ page }) => {
  await page.goto('meal-builder/');
  await startMeal(page, ['chicken-breast', 'broccoli']);
  await page.locator('[data-meal-recipe="chicken-broccoli-stir-fry"] [data-select-recipe]').click();
  await expect(page.locator('#meal-next')).toBeDisabled();
  await expect(page.locator('#meal-force-next')).toBeEnabled();
  await page.locator('#meal-force-next').click();
  await expect(page.locator('#meal-cook-view')).toBeVisible();
});

test('top navigation allows steps one to three and gates checkout to cook', async ({ page }) => {
  await page.goto('meal-builder/');
  await startMeal(page, ['chicken-breast', 'broccoli']);
  await page.locator('[data-meal-recipe="chicken-broccoli-stir-fry"] [data-select-recipe]').click();
  await expect(page.locator('[data-step-target="checkout"]')).toBeDisabled();
  await page.locator('[data-step-target="inventory"]').click();
  await expect(page.locator('#meal-inventory-view')).toBeVisible();
  await page.locator('[data-step-target="recipes"]').click();
  await expect(page.locator('#meal-builder-view')).toBeVisible();
  await page.locator('[data-step-target="cook"]').click();
  await expect(page.locator('#meal-cook-view')).toBeVisible();
  await expect(page.locator('[data-step-target="checkout"]')).toBeEnabled();
  await page.locator('[data-step-target="checkout"]').click();
  await expect(page.locator('#meal-checkout')).toBeVisible();
});

test('selected Recipe and Checkout can change one-of independently', async ({ page }) => {
  await page.goto('meal-builder/');
  await startMeal(page, ['chicken-drumsticks', 'bone-in-chicken-thighs']);
  const main = page.locator('[data-meal-recipe="oyster-sauce-braised-chicken"]');
  await expect(main).toBeVisible();
  await main.getByRole('button', { name: /选择这道菜/ }).click();

  const selected = page.locator('[data-selected-recipe="oyster-sauce-braised-chicken"]');
  await selected.locator('[data-composition-editor] > summary').click();
  const planThigh = selected.locator('[data-plan-binding-ingredient="bone-in-chicken-thighs"]');
  await planThigh.click();
  await expect(planThigh).toHaveAttribute('aria-pressed', 'true');

  await page.locator('#meal-force-next').click();
  await page.locator('#meal-open-checkout').click();
  const checkoutCard = page.locator('[data-checkout-recipe="oyster-sauce-braised-chicken"]');
  const actualDrumstick = checkoutCard.locator('[data-actual-binding-ingredient="chicken-drumsticks"]');
  await actualDrumstick.click();
  await expect(actualDrumstick).toHaveAttribute('aria-pressed', 'true');
});

test('optional composition is editable in Plan and Actual without duplicating required Ingredients', async ({ page }) => {
  await page.goto('meal-builder/');
  await startMeal(page, ['ground-pork', 'soft-tofu', 'fried-tofu-puffs', 'carrot']);
  await page.locator('[data-meal-recipe="minced-pork-tofu"] [data-select-recipe]').click();

  const selected = page.locator('[data-selected-recipe="minced-pork-tofu"]');
  await selected.locator('[data-composition-editor] > summary').click();
  await expect(selected.getByRole('heading', { name: '一锅乱炖' })).toBeVisible();
  await expect(selected.locator('[data-plan-optional-ingredient="soft-tofu"]')).toHaveCount(0);
  const plannedPuffs = selected.locator('[data-plan-optional-ingredient="fried-tofu-puffs"]');
  await plannedPuffs.click();
  await expect(plannedPuffs).toHaveAttribute('aria-pressed', 'true');

  await page.locator('#meal-force-next').click();
  await expect(page.locator('[data-cook-recipe="minced-pork-tofu"] [data-cook-planned-optionals]')).toContainText('油豆腐 / 豆泡');
  await page.locator('#meal-open-checkout').click();

  const checkoutCard = page.locator('[data-checkout-recipe="minced-pork-tofu"]');
  await expect(checkoutCard.getByRole('heading', { name: '一锅乱炖' })).toBeVisible();
  await expect(checkoutCard.locator('[data-actual-optional-ingredient="soft-tofu"]')).toHaveCount(0);
  const actualPuffs = checkoutCard.locator('[data-actual-optional-ingredient="fried-tofu-puffs"]');
  await expect(actualPuffs).toHaveAttribute('aria-pressed', 'true');
  await actualPuffs.click();
  await expect(actualPuffs).toHaveAttribute('aria-pressed', 'false');
  const actualCarrot = checkoutCard.locator('[data-actual-optional-ingredient="carrot"]');
  await actualCarrot.click();
  await expect(actualCarrot).toHaveAttribute('aria-pressed', 'true');

  await page.locator('[data-step-target="cook"]').click();
  const planned = page.locator('[data-cook-recipe="minced-pork-tofu"] [data-cook-planned-optionals]');
  await expect(planned).toContainText('油豆腐 / 豆泡');
  await expect(planned).not.toContainText('胡萝卜');
  await page.locator('[data-step-target="checkout"]').click();
  await expect(page.locator('[data-checkout-recipe="minced-pork-tofu"] [data-actual-optional-ingredient="carrot"]')).toHaveAttribute('aria-pressed', 'true');
});

test('Recipe without optional groups does not expose optional Checkout controls', async ({ page }) => {
  await page.goto('meal-builder/');
  await startMeal(page, ['bone-in-chicken-thighs', 'fried-tofu-puffs']);
  await page.locator('[data-meal-recipe="instant-pot-soy-chicken-thighs"] [data-select-recipe]').click();
  await page.locator('#meal-force-next').click();
  await page.locator('#meal-open-checkout').click();
  const checkoutCard = page.locator('[data-checkout-recipe="instant-pot-soy-chicken-thighs"]');
  await expect(checkoutCard).toBeVisible();
  await expect(checkoutCard.locator('[data-actual-optional-recipe]')).toHaveCount(0);
});

test('cook back returns every device to the shared recipes step', async ({ page }) => {
  await page.goto('meal-builder/');
  await startMeal(page, ['chicken-breast', 'broccoli', 'green-cabbage', 'onion', 'noodles']);
  await page.locator('[data-meal-recipe="chicken-broccoli-stir-fry"] [data-select-recipe]').click();
  await page.locator('[data-meal-recipe="yaki-udon"] [data-select-recipe]').click();
  await page.locator('#meal-next').click();
  await expect(page.locator('#meal-shared-status')).toHaveText('cooking');
  await page.locator('#meal-back-to-menu').click();
  await expect(page.locator('#meal-builder-view')).toBeVisible();
});

test('household inventory keeps counted half-steps, presence-only values, and visible starter scope', async ({ page }) => {
  await page.goto('meal-builder/');
  await expect(page.locator('#meal-connection')).toContainText('本地开发同步');
  await expect(page.locator('#meal-google-login')).toBeHidden();
  await expect(page.locator('#meal-logout')).toBeHidden();
  await expect(page.locator('[data-inventory-item]')).toHaveCount(visibleIngredientCount);
  await expect(page.locator('[data-inventory-section]')).toHaveCount(visibleSectionCount);
  expect(await page.locator('[data-inventory-section]').evaluateAll((groups) => groups.every((group) => group.hasAttribute('open')))).toBe(true);
  for (const id of ['ginger', 'scallion', 'garlic']) await expect(page.locator(`[data-inventory-item="${id}"]`)).toHaveCount(0);

  const counted = page.locator('[data-inventory-item="chicken-breast"]');
  await expect(counted.locator('[data-inventory-value="chicken-breast"]')).toHaveText('0');
  await counted.locator('[data-inventory-toggle]').click();
  await expect(counted.locator('[data-inventory-value="chicken-breast"]')).toHaveText('1');
  await counted.locator('[data-inventory-step="0.5"]').click();
  await expect(counted.locator('[data-inventory-value="chicken-breast"]')).toHaveText('1.5');
  expect(await counted.locator('xpath=ancestor::details').getAttribute('open')).not.toBeNull();

  const presence = await inventoryItem(page, 'eggs');
  await expect(presence.locator('[data-inventory-step]')).toHaveCount(0);
  await presence.locator('[data-inventory-toggle]').click();
  await expect(presence.locator('[data-inventory-value="eggs"]')).not.toHaveText('0');
  for (const id of ['potato', 'peeled-shrimp']) await expect((await inventoryItem(page, id)).locator('[data-inventory-step]')).toHaveCount(0);
});

test('turning a current-meal ingredient off does not change shared inventory', async ({ page }) => {
  await page.goto('meal-builder/');
  await startMeal(page, ['whole-pork-tenderloin']);
  const row = page.locator('[data-inventory-item="whole-pork-tenderloin"]');
  await expect(row.locator('[data-inventory-value="whole-pork-tenderloin"]')).toHaveText('1');
  await page.locator('[data-meal-ingredient-fold] > summary').click();
  await page.locator('[data-ingredient-id="whole-pork-tenderloin"]').click();
  await expect(page.locator('[data-ingredient-id="whole-pork-tenderloin"]')).toHaveAttribute('aria-pressed', 'false');
  await expect(row.locator('[data-inventory-value="whole-pork-tenderloin"]')).toHaveText('1');
});

test('returning through inventory preserves exclusions and enables newly stocked ingredients', async ({ page }) => {
  await page.goto('meal-builder/');
  await startMeal(page, ['whole-pork-tenderloin']);
  await page.locator('[data-meal-ingredient-fold] > summary').click();
  await page.locator('[data-ingredient-id="whole-pork-tenderloin"]').click();
  await page.locator('#meal-back-inventory').click();
  await (await inventoryItem(page, 'chicken-breast')).locator('[data-inventory-toggle]').click();
  await page.locator('#meal-start-current').click();
  await page.locator('[data-meal-ingredient-fold] > summary').click();
  await expect(page.locator('[data-ingredient-id]:visible')).toHaveCount(2);
  await expect(page.locator('[data-ingredient-id="whole-pork-tenderloin"]')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('[data-ingredient-id="chicken-breast"]')).toHaveAttribute('aria-pressed', 'true');
});

test('Recipe-scoped checkout consumes counted inventory while presence-only defaults to keep', async ({ page }) => {
  await page.goto('meal-builder/');
  await startMeal(page, ['eggs', 'tomato', 'noodles']);
  await page.locator('[data-meal-recipe="tomato-egg-noodles"] [data-select-recipe]').click();
  await page.locator('[data-meal-recipe="tomato-scrambled-eggs"] [data-select-recipe]').click();
  await page.locator('#meal-next').click();
  await page.locator('#meal-open-checkout').click();

  const noodlesCard = page.locator('[data-checkout-recipe="tomato-egg-noodles"]');
  const eggsUsedUp = noodlesCard.locator('[data-actual-used-up-ingredient="eggs"]');
  await expect(eggsUsedUp).not.toBeChecked();
  await eggsUsedUp.check();
  await expect(eggsUsedUp).toBeChecked();
  await eggsUsedUp.uncheck();
  await expect(eggsUsedUp).not.toBeChecked();

  const tomatoMinus = noodlesCard.locator('[data-actual-step-ingredient="tomato"][data-actual-step="-0.5"]');
  const tomatoPlus = noodlesCard.locator('[data-actual-step-ingredient="tomato"][data-actual-step="0.5"]');
  const tomatoRow = tomatoMinus.locator('xpath=..');
  await expect(tomatoRow.locator('output')).toHaveText('1 / 1');
  await tomatoMinus.click();
  await tomatoMinus.click();
  await expect(tomatoRow.locator('output')).toHaveText('0 / 1');
  await tomatoPlus.click();
  await tomatoPlus.click();
  await expect(tomatoRow.locator('output')).toHaveText('1 / 1');

  await page.locator('#meal-confirm-checkout').click();
  await page.locator('#meal-finalize-checkout').click();
  await expect(page.locator('#meal-builder-view')).toBeVisible();
  await page.locator('[data-step-target="inventory"]').click();
  await expect(page.locator('[data-inventory-value="tomato"]')).toHaveText('0');
  await expect(page.locator('[data-inventory-value="eggs"]')).toHaveText('有');
  await expect(page.locator('[data-inventory-value="noodles"]')).toHaveText('有');
});

test('inventory reset confirms while recipe reset is immediate and scoped to the meal', async ({ page }) => {
  await page.goto('meal-builder/');
  await startMeal(page, ['chicken-breast', 'broccoli']);
  const row = page.locator('[data-inventory-item="chicken-breast"]');
  await page.locator('[data-meal-recipe="chicken-broccoli-stir-fry"] [data-select-recipe]').click();

  let dialogType = '';
  page.once('dialog', async (dialog) => { dialogType = dialog.type(); await dialog.dismiss(); });
  await page.locator('#meal-back-inventory').click();
  await page.locator('#meal-inventory-reset').click();
  expect(dialogType).toBe('confirm');
  await expect(row.locator('[data-inventory-value="chicken-breast"]')).toHaveText('1');

  let recipeDialog = false;
  page.once('dialog', async (dialog) => { recipeDialog = true; await dialog.dismiss(); });
  await page.locator('#meal-recipe-reset').click();
  await expect.poll(() => recipeDialog).toBe(false);
  await expect(page.locator('[data-selected-recipe]:visible')).toHaveCount(0);
  await expect(row.locator('[data-inventory-value="chicken-breast"]')).toHaveText('1');
});

test('two pages in one browser context receive inventory and current-meal updates', async ({ browser }) => {
  const context = await browser.newContext();
  const first = await context.newPage();
  const second = await context.newPage();
  await first.goto('meal-builder/');
  await second.goto('meal-builder/');
  await setInventory(first, ['chicken-breast', 'broccoli', 'green-cabbage', 'onion', 'noodles']);
  await expect.poll(async () => second.locator('[data-inventory-value="chicken-breast"]').textContent()).toBe('1');
  await first.locator('#meal-start-current').click();
  await expect(second.locator('#meal-start-current')).toBeDisabled();
  await expect(second.locator('#meal-builder-view')).toBeVisible();

  await first.locator('[data-meal-recipe="chicken-broccoli-stir-fry"] [data-select-recipe]').click();
  await expect(second.locator('[data-selected-recipe="chicken-broccoli-stir-fry"]')).toBeVisible();
  await first.locator('[data-meal-recipe="yaki-udon"] [data-select-recipe]').click();
  await expect(second.locator('[data-selected-recipe="yaki-udon"]')).toBeVisible();
  await first.locator('#meal-next').click();
  await expect(first.locator('#meal-shared-status')).toHaveText('cooking');
  await second.locator('#meal-open-checkout').click();
  await expect(second.locator('#meal-checkout')).toBeVisible();
  await second.locator('#meal-confirm-checkout').click();
  await second.locator('#meal-finalize-checkout').click();
  await expect.poll(async () => first.locator('[data-inventory-value="chicken-breast"]').textContent()).toBe('0');
  await expect(first.locator('#meal-builder-view')).toBeVisible();
  await expect(first.locator('[data-step="recipes"]')).toHaveClass(/is-active/);
  await expect(first.locator('[data-selected-recipe]:visible')).toHaveCount(0);
  await context.close();
});