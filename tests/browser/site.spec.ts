import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const note = '/notes/ai-as-the-ultimate-hub';

test('topic chips filter notes, and a filtered view can be shared', async ({ page }) => {
  // Every published note is listed; the count grows as notes are added.
  let total = 0;
  await expect(async () => {
    await page.goto('/notes');
    total = await page.locator('.note:visible').count();
    expect(total).toBeGreaterThan(1);
  }).toPass();
  // Search lives in the header on every page, not in the notes list.
  await expect(page.getByRole('searchbox')).toHaveCount(0);

  const all = page.getByRole('button', { name: 'All', exact: true });
  const security = page.getByRole('button', { name: 'AI Security', exact: true });
  await expect(all).toHaveAttribute('aria-pressed', 'true');

  await security.click();
  await expect(security).toHaveAttribute('aria-pressed', 'true');
  await expect(all).toHaveAttribute('aria-pressed', 'false');
  await expect(page).toHaveURL(/\?topic=AI\+Security$/);
  const filtered = await page.locator('.note:visible').count();
  expect(filtered).toBeGreaterThan(0);
  expect(filtered).toBeLessThan(total);
  await expect(page.locator('#notes-count')).toHaveText(`${filtered} of ${total} notes`);

  // The shared URL opens with the same filter.
  await page.goto('/notes?topic=AI+Security');
  await expect(page.locator('.note:visible')).toHaveCount(filtered);
  await expect(security).toHaveAttribute('aria-pressed', 'true');

  await all.click();
  await expect(page).toHaveURL(/\/notes$/);
  await expect(page.locator('.note:visible')).toHaveCount(total);
});

test('search keyboard navigation and focus return', async ({ page }) => {
  await page.goto('/');
  const open = page.getByRole('button', { name: 'Search', exact: true });
  await open.click();
  const input = page.locator('#site-q');
  await expect(input).toBeFocused();
  await input.fill('network');
  await expect(page.locator('#search-overlay .result').first()).toBeVisible();
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
