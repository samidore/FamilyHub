/** Verifies comment continuity and failure feedback in shared public lists. */
import { expect, test } from '@playwright/test';
import { mountPublicHousehold } from './helpers/householdUi';

for (const restaurant of [false, true]) {
  test(`${restaurant ? 'Restaurants' : 'Day Trips'} retains drafts and explains failed saves`, async ({ page }) => {
    await mountPublicHousehold(page, restaurant);
    const selector = restaurant ? '[data-restaurant-comment-add]' : '[data-trip-comment-add]';
    const editor = page.locator(selector).first();
    await editor.locator('..').locator('summary').click();
    const input = editor.locator('textarea');
    await input.fill('Unsent synthetic draft');
    const id = await editor.getAttribute(restaurant ? 'data-restaurant-comment-add' : 'data-trip-comment-add');
    await page.evaluate(({ isRestaurant, target }) => {
      const repo = (window as any).repository;
      const comment = { id: 'remote', [isRestaurant ? 'restaurantId' : 'destinationId']: target, body: 'Remote synthetic comment', authorName: 'Test member', createdAt: Date.now() };
      if (isRestaurant) return repo.transaction((state: any) => ({ ...state, comments: { ...state.comments, remote: comment } }));
      return repo.addComment(comment);
    }, { isRestaurant: restaurant, target: id });
    await expect(input).toHaveValue('Unsent synthetic draft');
    await expect(input).toBeFocused();
    if (restaurant) await expect(editor.locator('..').locator('summary')).toContainText('1');
    await page.evaluate((isRestaurant) => {
      const repo = (window as any).repository;
      repo[isRestaurant ? 'transaction' : 'addComment'] = async () => { throw new Error('synthetic save failure'); };
    }, restaurant);
    await editor.getByRole('button', { name: '添加', exact: true }).click();
    await expect(input).toHaveValue('Unsent synthetic draft');
    await expect(page.locator(restaurant ? '#restaurant-household-live' : '#trip-household-auth-message')).toContainText('失败');
  });
}
