import { test, expect } from '@playwright/test';

/**
 * Phase 9 end-to-end coverage of the settings panel: open with ',', build a
 * new tab/link from scratch entirely through the panel, confirm it shows up
 * in the main grid once the panel is closed, then exercise the undo
 * safety-net (phase 2) on a destructive delete while the panel stays open.
 */

test('settings panel: add a tab and link, then delete and undo it', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.link-card').first()).toBeVisible();

  // --- ',' opens the settings panel ---
  await page.keyboard.press(',');
  const settings = page.getByRole('dialog', { name: 'Settings' });
  await expect(settings).toBeVisible();

  // --- Navigate to "Tabs & links" ---
  await settings.getByRole('button', { name: 'Tabs & links' }).click();

  // --- Add a tab ---
  await settings.getByRole('button', { name: 'Add tab' }).click();
  const tabRow = settings.locator('.tab-row').last();
  await tabRow.getByLabel('Tab name').fill('E2E Tab');

  // --- Add a group inside it ---
  await settings.getByRole('button', { name: 'Add group' }).click();
  const groupRow = settings.locator('.group-row').last();
  await groupRow.getByLabel('Group name').fill('E2E Group');

  // --- Add a link inside that group ---
  await groupRow.getByRole('button', { name: 'Add link' }).click();
  const linkRow = settings.locator('.link-row').last();
  await linkRow.getByLabel('Link name').fill('E2E Link');
  await linkRow.getByLabel('URL').fill('https://example.com/');

  // No validation warning for the (allowed) URL just entered.
  await expect(linkRow.locator('.warning')).toHaveCount(0);

  // --- Close the panel ---
  await page.keyboard.press('Escape');
  await expect(settings).toBeHidden();

  // --- The new tab appears in the tab bar; switch to it ---
  await page.getByRole('button', { name: 'E2E Tab' }).click();
  await expect(page.locator('.link-card', { hasText: 'E2E Link' })).toBeVisible();

  // --- Reopen settings, go back to Tabs & links, delete the tab ---
  await page.keyboard.press(',');
  await expect(settings).toBeVisible();
  await settings.getByRole('button', { name: 'Tabs & links' }).click();
  await settings.getByRole('button', { name: 'Delete tab "E2E Tab"' }).click();
  await expect(settings.locator('.tab-row', { hasText: 'E2E Tab' })).toHaveCount(0);

  // --- Undo while the panel is open restores the deleted tab ---
  await page.keyboard.press('Control+z');
  await expect(settings.locator('.tab-row', { hasText: 'E2E Tab' })).toHaveCount(1);

  // --- Closing and reopening confirms the restore persisted in state ---
  await page.keyboard.press('Escape');
  await expect(settings).toBeHidden();
  await expect(page.getByRole('button', { name: 'E2E Tab' })).toBeVisible();
});
