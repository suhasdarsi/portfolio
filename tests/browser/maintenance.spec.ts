import { test, expect } from '@playwright/test';
test('unknown tag parameters do not trap the tool filter', async ({ page }) => {
  await page.goto('/toolshed/ai-security/tools?tag=unknown');
  await expect(page.locator('#tool-count')).not.toContainText('unknown');
  await expect(page.locator('[data-tool]:visible').first()).toBeVisible();
});
test('tag filters hide excluded cards', async ({ page }) => {
  await page.goto('/toolshed/ai-security/tools');
  await page.locator('[data-tag]').first().click();
  const hidden = page.locator('[data-tool][hidden]');
  expect(await hidden.count()).toBeGreaterThan(0);
  for (const card of await hidden.all()) await expect(card).toBeHidden();
});
test('search exposes a close button and announces arrow navigation through focus', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Open search' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.locator('.search-result-item').first()).toBeVisible();
  await page.keyboard.press('ArrowDown');
  await expect(dialog.locator('.search-result-item.active')).toBeFocused();
  await dialog.getByRole('button', { name: 'Close search' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('button', { name: 'Open search' })).toBeFocused();
});
