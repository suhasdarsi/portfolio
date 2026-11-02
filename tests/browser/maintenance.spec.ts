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
  const open = page.getByRole('button', { name: 'Search', exact: true });
  await open.click();
  const dialog = page.getByRole('dialog', { name: 'Search' });
  await expect(dialog.locator('.result').first()).toBeVisible();
  await page.keyboard.press('ArrowDown');
  await expect(dialog.locator('.result.active')).toBeFocused();
  await dialog.getByRole('button', { name: 'Close search' }).click();
  await expect(dialog).toBeHidden();
  await expect(open).toBeFocused();
});
for (const key of ['ArrowDown', 'ArrowUp']) {
  test(`search ${key} enters at the correct edge and follows keyboard focus`, async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Search', exact: true }).click();
    const input = page.locator('#site-q');
    const items = page.locator('#search-overlay .result');
    await expect(items.first()).toBeVisible();
    // ArrowDown from the box lands on the first result; ArrowUp wraps to the last.
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
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  const input = page.locator('#site-q');
  const items = page.locator('#search-overlay .result');
  await expect(items.first()).toBeVisible();
  await input.press('ArrowDown');
  await input.fill('network');
  await expect(page.locator('[data-search-status]')).toContainText('result');
  await input.press('ArrowDown');
  await expect(items.first()).toBeFocused();
  await input.focus();
  const href = await items.first().getAttribute('href');
  await input.press('Enter');
  await expect(page).toHaveURL(new RegExp(href! + '$'));
});
