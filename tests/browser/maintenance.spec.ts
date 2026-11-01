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
test('search exposes a close button and announces arrow navigation through focus', async ({
  page,
}) => {
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
for (const key of ['ArrowDown', 'ArrowUp']) {
  test(`search ${key} enters at the correct edge and follows keyboard focus`, async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Open search' }).click();
    const input = page.locator('#global-search-input');
    const items = page.locator('.search-result-item');
    await expect(items.first()).toBeVisible();
    const firstTarget = key === 'ArrowDown' ? items.first() : items.last();
    await input.press(key);
    await expect(firstTarget).toBeFocused();
    await expect(firstTarget).toHaveClass(/active/);
    await page.keyboard.press(key);
    await expect(
      key === 'ArrowDown' ? items.nth(1) : items.nth((await items.count()) - 2)
    ).toBeFocused();
    await input.focus();
    await input.press(key);
    await expect(firstTarget).toBeFocused();
  });
}
test('search keyboard entry resets after filtering and Enter still opens the first match', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Open search' }).click();
  const input = page.locator('#global-search-input');
  const items = page.locator('.search-result-item');
  await expect(items.first()).toBeVisible();
  await input.press('ArrowDown');
  await input.fill('network');
  await expect(page.locator('#global-search-status')).toContainText('found');
  await expect(input).toBeFocused();
  await input.press('ArrowDown');
  await expect(items.first()).toBeFocused();
  await input.focus();
  const href = await items.first().getAttribute('href');
  await input.press('Enter');
  await expect(page).toHaveURL(new RegExp(href! + '$'));
});
