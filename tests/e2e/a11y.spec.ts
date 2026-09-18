import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Phase 5 / phase 3 (accessibility pass) coverage: runs axe-core against the
 * three states that matter most — the main page at rest, the search dialog
 * open, and the settings panel open (cycling its first two sections) —
 * asserting zero violations in each. Automated tools only catch a fraction
 * of real accessibility problems, but the fraction they do catch is cheap to
 * keep passing and easy to regress silently, so it's worth locking down here.
 *
 * Locators are role-based, matching `search.spec.ts` / `settings.spec.ts`.
 */

test('main page has no detectable accessibility violations', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.link-card').first()).toBeVisible();

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test('search dialog has no detectable accessibility violations', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Control+k');
  const searchDialog = page.getByRole('dialog', { name: 'Search' });
  await expect(searchDialog).toBeVisible();

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test('settings panel has no detectable accessibility violations', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press(',');
  const settings = page.getByRole('dialog', { name: 'Settings' });
  await expect(settings).toBeVisible();

  // Default section ("Appearance").
  const appearanceResults = await new AxeBuilder({ page }).analyze();
  expect(appearanceResults.violations).toEqual([]);

  // Cycle to a second section ("Tabs & links") for broader coverage without
  // making the spec unwieldy by checking every section.
  await settings.getByRole('button', { name: 'Tabs & links' }).click();
  const tabsLinksResults = await new AxeBuilder({ page }).analyze();
  expect(tabsLinksResults.violations).toEqual([]);
});

/**
 * Lightweight, best-effort proxy for a manual 200%-zoom check: simulates
 * zoom via a CSS `zoom` on `<body>` (Chromium supports this directly) at a
 * desktop-sized viewport, then asserts no horizontal scrollbar appears on
 * any of the three main views (default page, search open, settings open).
 * This is not a substitute for a real visual zoom walkthrough across
 * browsers, but it catches gross overflow regressions automatically.
 */
test('200% zoom does not introduce horizontal scroll', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await expect(page.locator('.link-card').first()).toBeVisible();

  async function hasHorizontalScroll(): Promise<boolean> {
    return page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  }

  await page.evaluate(() => {
    document.body.style.zoom = '2';
  });

  expect(await hasHorizontalScroll()).toBe(false);

  await page.keyboard.press('Control+k');
  await expect(page.getByRole('dialog', { name: 'Search' })).toBeVisible();
  expect(await hasHorizontalScroll()).toBe(false);
  await page.keyboard.press('Escape');

  await page.keyboard.press(',');
  await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible();
  expect(await hasHorizontalScroll()).toBe(false);
});
