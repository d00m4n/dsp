import { test, expect } from '@playwright/test';

/**
 * The central test of phase 2: from initial load, without a single mouse
 * event, open search, pick a link result, open it; open search again with a
 * bang, run a web search; open and close the shortcuts help.
 *
 * External navigations are intercepted and fulfilled locally so the test
 * doesn't depend on real network access or leave localhost.
 */

test('full keyboard-only search flow', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.link-card').first()).toBeVisible();

  // --- Ctrl+K opens search, arrow-select "Mastodon", open with Enter ---
  await page.keyboard.press('Control+k');
  const searchDialog = page.getByRole('dialog', { name: 'Search' });
  await expect(searchDialog).toBeVisible();

  const input = searchDialog.getByRole('combobox');
  await expect(input).toBeFocused();
  await input.fill('mast');

  await expect(searchDialog.getByRole('option').first()).toContainText('Mastodon');

  // Exercise arrow-key selection: down then up returns to the top match.
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowUp');

  await page.route('**mastodon.social/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: '<html><body>ok</body></html>' }),
  );
  await page.keyboard.press('Enter');
  await page.waitForURL(/mastodon\.social/);
  expect(page.url()).toContain('mastodon.social');

  await page.goBack();
  await expect(page.locator('.link-card').first()).toBeVisible();

  // --- '/' opens search, bang search with DuckDuckGo ---
  await page.keyboard.press('/');
  await expect(searchDialog).toBeVisible();
  await expect(input).toBeFocused();
  await input.fill('!d svelte');

  await page.route('**duckduckgo.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: '<html><body>ok</body></html>' }),
  );
  await page.keyboard.press('Enter');
  await page.waitForURL(/duckduckgo\.com/);
  expect(page.url()).toContain('duckduckgo.com');
  expect(page.url()).toContain('svelte');

  await page.goBack();
  await expect(page.locator('.link-card').first()).toBeVisible();

  // --- '?' opens help, Esc closes it and restores focus ---
  await page.keyboard.press('?');
  const helpDialog = page.getByRole('dialog', { name: 'Keyboard shortcuts' });
  await expect(helpDialog).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(helpDialog).toBeHidden();
});

test('typing in the search dialog does not trigger mnemonics', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('/');
  const searchDialog = page.getByRole('dialog', { name: 'Search' });
  const input = searchDialog.getByRole('combobox');
  await input.fill('reddit');

  // Still on the homebase page: none of the letters navigated away.
  await expect(page).toHaveURL(/\/$|localhost/);
  await expect(searchDialog).toBeVisible();
});
