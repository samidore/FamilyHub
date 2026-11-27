/** Checks shared hero text flow at phone and desktop widths. */
import { expect, test } from '@playwright/test';
import { moduleRegistry } from '../src/config/modules';

const routes = ['./', ...moduleRegistry.map((module) => module.route.slice(1)),
  'today/', 'sami-notebook/developer/'];

for (const width of [390, 1280]) {
  test(`hero text flows horizontally at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 800 });
    for (const route of routes) {
      await page.goto(route);
      await page.evaluate(() => document.fonts.ready);
      const copy = page.locator('.module-hero__copy');
      const heading = page.locator('h1');
      await expect(heading).toBeVisible();
      if (process.env.FAMILYHUB_HERO_SHOTS) {
        const name = route === './' ? 'home' : route.replace(/\/$/, '').replaceAll('/', '-');
        await page.screenshot({ path: `${process.env.FAMILYHUB_HERO_SHOTS}/${name}-${width}.png` });
      }
      if (await copy.count()) {
        const geometry = await copy.evaluate((element) => ({
          right: element.getBoundingClientRect().right,
          parentRight: element.parentElement!.getBoundingClientRect().right,
        }));
        expect(geometry.right, route).toBeCloseTo(geometry.parentRight, 0);
      }
      for (const text of [heading, page.locator('.module-hero__copy > p:not(.eyebrow), .home-lead').first()]) {
        if (!await text.count()) continue;
        const tops = await text.evaluate((element) => {
          const node = element.firstChild!;
          return [0, 1].map((index) => {
            const range = document.createRange();
            range.setStart(node, index);
            range.setEnd(node, index + 1);
            return range.getBoundingClientRect().top;
          });
        });
        expect(tops[0], route).toBeCloseTo(tops[1], 0);
      }
    }
  });
}
