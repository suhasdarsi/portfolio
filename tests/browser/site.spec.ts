import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const note = '/notes/ai-as-the-ultimate-hub';

test('search URLs restore queries, highlight matches, and support history', async ({ page }) => {
  await page.goto('/notes?q=power-law');
  const input = page.getByLabel('Search notes', { exact: true });
  await expect(input).toHaveValue('power-law');
  await expect(page.locator('#notes-search-status')).toContainText('found');
  await expect(page.locator('.note-item:visible mark').first()).toBeVisible();
  await input.fill('ultimate');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page).toHaveURL(/q=ultimate/);
  await page.goBack();
  await expect(input).toHaveValue('power-law');
  await page.goForward();
  await expect(input).toHaveValue('ultimate');
  await page.reload();
  await expect(input).toHaveValue('ultimate');
  await input.fill('');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page.locator('.note-item:visible')).toHaveCount(5);
});

test('search keyboard navigation, focus return, excerpts and share link', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Open search' }).click();
  const input = page.locator('#global-search-input');
  await expect(input).toBeFocused();
  await input.fill('network');
  await expect(page.locator('.search-result-excerpt').first()).toBeVisible();
  await expect(page.locator('#search-all')).toHaveAttribute('href', '/notes?q=network');
  await input.press('ArrowDown');
  const href = await page.locator('.search-result-item.active').getAttribute('href');
  await input.press('Enter');
  await expect(page).toHaveURL(new RegExp(`${href}$`));
  await page.getByRole('button', { name: 'Open search' }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Open search' })).toBeFocused();
});

test('themes persist and disabled storage does not break search', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Switch to .* theme/ }).click();
  const theme = await page.locator('html').getAttribute('class');
  await page.reload();
  expect(await page.locator('html').getAttribute('class')).toBe(theme);
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw Error('disabled'); };
    Storage.prototype.setItem = () => { throw Error('disabled'); };
  });
  await page.reload();
  await page.getByRole('button', { name: 'Open search' }).click();
  await expect(page.locator('.search-result-item').first()).toBeVisible();
});

test('404 search recovers after a failed request', async ({ page }) => {
  let failed = false;
  await page.route('**/search.json', (route) => {
    if (!failed) { failed = true; return route.abort(); }
    return route.continue();
  });
  await page.goto('/404');
  const input = page.getByLabel('Search all notes');
  await input.fill('network');
  await expect(page.locator('#error-search-status')).toContainText('unavailable');
  await input.fill('network risk');
  await expect(page.locator('.error-search-result').first()).toBeVisible();
});

for (const path of ['/', '/about', '/notes', note, '/uses', '/404']) {
  test(`accessible and fits viewport: ${path}`, async ({ page }) => {
    await page.goto(path);
    for (const theme of ['light', 'dark']) {
      await page.evaluate((theme) => document.documentElement.classList.toggle('dark', theme === 'dark'), theme);
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      expect(results.violations.map(({ id, nodes }) => ({ id, nodes: nodes.map(({ target, failureSummary }) => ({ target, failureSummary })) }))).toEqual([]);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}

test('open search dialog passes accessibility checks', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Open search' }).click();
  await page.locator('#global-search-input').fill('network');
  await expect(page.locator('.search-result-item').first()).toBeVisible();
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(results.violations.map(({ id, nodes }) => ({ id, nodes: nodes.map(({ target, failureSummary }) => ({ target, failureSummary })) }))).toEqual([]);
});

test('article includes a real social-preview PNG', async ({ page, request }) => {
  await page.goto(note);
  const url = await page.locator('meta[property="og:image"]').getAttribute('content');
  expect(url).toContain('/og/ai-as-the-ultimate-hub.png');
  const response = await request.get(new URL(url!).pathname);
  expect(response.headers()['content-type']).toContain('image/png');
  const bytes = await response.body();
  expect(bytes.readUInt32BE(16)).toBe(1200);
  expect(bytes.readUInt32BE(20)).toBe(630);
});
