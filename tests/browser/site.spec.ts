import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const note = '/notes/ai-as-the-ultimate-hub';

test('shared search URLs filter notes, highlight matches, clear, and support history', async ({ page }) => {
  await expect(async () => {
    await page.goto('/notes');
    await expect(page.locator('.note:visible')).toHaveCount(5);
  }).toPass();
  await expect(page.locator('.excerpt:visible')).toHaveCount(0);

  await page.goto('/notes?q=power-law');
  const count = page.locator('#notes-count');
  await expect(page.getByRole('searchbox', { name: 'Search notes' })).toHaveValue('power-law');
  await expect(count).toContainText(' of 5');
  await expect(page.locator('.note:visible mark').first()).toBeVisible();
  await expect(page.locator('.excerpt:visible').first()).toBeVisible();
  const matches = await page.locator('.note:visible').count();
  expect(matches).toBeLessThan(5);

  // Emptying the box restores every note and drops ?q= from the URL.
  await page.getByRole('searchbox', { name: 'Search notes' }).fill('');
  await expect(page).toHaveURL(/\/notes$/);
  await expect(page.locator('.note:visible')).toHaveCount(5);
  await expect(page.locator('.excerpt:visible')).toHaveCount(0);

  // A query with no matches offers a way back.
  await page.getByRole('searchbox', { name: 'Search notes' }).fill('zzzzqqq');
  await expect(page.locator('#notes-empty')).toBeVisible();
  await page.getByRole('button', { name: 'Clear search' }).click();
  await expect(page).toHaveURL(/\/notes$/);
  await expect(page.locator('.note:visible')).toHaveCount(5);

  // Shared URLs work with browser history.
  await page.goto('/notes?q=power-law');
  await expect(page.locator('.note:visible')).toHaveCount(matches);
  await page.goBack();
  await expect(page.locator('.note:visible')).toHaveCount(5);
  await page.goForward();
  await expect(page.locator('.note:visible')).toHaveCount(matches);
});

test('search keyboard navigation, focus return and share link', async ({ page }) => {
  await page.goto('/');
  const open = page.getByRole('button', { name: 'Search', exact: true });
  await open.click();
  const input = page.locator('#site-q');
  await expect(input).toBeFocused();
  await input.fill('network');
  await expect(page.locator('#search-overlay .result').first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'Browse or share this search' })).toHaveAttribute('href', '/notes?q=network');
  await input.press('ArrowDown');
  const href = await page.locator('#search-overlay .result.active').getAttribute('href');
  await input.press('Enter');
  await expect(page).toHaveURL(new RegExp(`${href}$`));
  await page.goto('/');
  await open.click();
  await page.keyboard.press('Escape');
  await expect(page.locator('#search-overlay')).toBeHidden();
  await expect(open).toBeFocused();
});

test('Cmd/Ctrl+K opens and closes search', async ({ page }) => {
  await page.goto('/');
  await page.locator('body').click({ position: { x: 5, y: 5 } });
  await page.keyboard.press('ControlOrMeta+k');
  await expect(page.locator('#search-overlay')).toBeVisible();
  await expect(page.locator('#site-q')).toBeFocused();
  await page.keyboard.press('ControlOrMeta+k');
  await expect(page.locator('#search-overlay')).toBeHidden();
});

test('themes persist and disabled storage does not break search', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Switch to .* mode/ }).click();
  const theme = await page.locator('html').getAttribute('class');
  await page.reload();
  expect(await page.locator('html').getAttribute('class')).toBe(theme);
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw Error('disabled'); };
    Storage.prototype.setItem = () => { throw Error('disabled'); };
  });
  await page.reload();
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page.locator('#search-overlay .result').first()).toBeVisible();
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
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await page.locator('#site-q').fill('network');
  await expect(page.locator('#search-overlay .result').first()).toBeVisible();
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
