import { expect, test } from '@playwright/test';
import { moduleRegistry } from '../src/config/modules';

const routes = ['./', ...moduleRegistry.map((module) => module.route.slice(1))];

for (const width of [375, 1440]) {
  test(`diagnose responsive controls at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const violations: Array<Record<string, string | number>> = [];

    for (const route of routes) {
      await page.goto(route);
      const controls = await page.locator('button:visible, input:visible, select:visible, summary:visible').evaluateAll((nodes) =>
        nodes
          .map((node) => {
            const element = node as HTMLElement;
            const rect = element.getBoundingClientRect();
            const style = getComputedStyle(element);
            return {
              tag: element.tagName.toLowerCase(),
              id: element.id,
              className: element.className,
              text: element.textContent?.trim().slice(0, 60) ?? '',
              height: rect.height,
              minHeight: style.minHeight,
            };
          })
          .filter((control) => control.height < 47),
      );
      for (const control of controls) violations.push({ route, ...control });
    }

    expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
  });
}
