import { test, expect } from '@playwright/test';

test('homepage lists the garden and tiny apps, and every page links home', async ({ page, request }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText("Hi, I'm Suhas");
  await expect(page.getByRole('heading', { name: 'Garden', level: 2 })).toBeVisible();
  expect(await page.locator('#writing .note').count()).toBeGreaterThanOrEqual(5);
  await expect(page.locator('.app .an')).toHaveText(['Pocket Card', 'Swatchbook', 'Toolshed alpha']);
  await expect(page.getByRole('heading', { name: 'Tiny apps', level: 2 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Uses', level: 2 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Say hello', level: 2 })).toBeVisible();
  await expect(page.getByRole('link', { name: 'book a time to talk' })).toHaveAttribute('href', 'https://booking.akiflow.com/suhas--a84d');
  await expect(page.getByRole('link', { name: 'RSS' }).first()).toHaveAttribute('href', '/rss.xml');
  await expect(page.locator('a[href="/superalign"]')).toHaveCount(0);
  expect((await request.get('/superalign')).status()).toBe(404);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.getByRole('link', { name: 'LinkedIn', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'X', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Copy email address suhas@superalign.ai', exact: true })).toHaveCount(2);
  await expect(page.getByRole('navigation', { name: 'On this site' })).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: 'Micro-apps' })).toHaveCount(0);

  const main = page.getByRole('navigation', { name: 'Main', exact: true });
  await expect(main.getByRole('link')).toHaveText(['Notes', 'Apps', 'About', 'Uses']);

  // The brand link is a way home from every page, including the Toolshed and the 404 page.
  for (const path of ['/', '/about', '/notes', '/notes/ai-as-the-ultimate-hub', '/uses', '/pocket-card', '/swatchbook', '/toolshed', '/missing-page']) {
    await page.goto(path);
    const home = page.locator('a[href="/"]:visible', { hasText: 'Suhas Darsi' }).first();
    await expect(home, path).toBeVisible();
  }

  await page.goto('/about');
  await expect(page.getByRole('navigation', { name: 'Main', exact: true }).getByRole('link', { name: 'About' })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('heading', { name: 'About', level: 1 })).toBeVisible();
  await expect(page.getByRole('link', { name: 'LinkedIn', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Copy email address suhas@superalign.ai', exact: true })).toBeVisible();
  await expect(page.getByText("I'm a co-founder at", { exact: false })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Currently' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Previously' })).toBeVisible();

  await page.goto('/');
  await page.getByRole('navigation', { name: 'Main', exact: true }).getByRole('link', { name: 'About' }).click();
  await expect(page).toHaveURL(/\/about\/?$/);
});
