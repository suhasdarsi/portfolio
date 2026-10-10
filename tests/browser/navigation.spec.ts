import { test, expect } from '@playwright/test';

test('homepage leads with Say hello, groups micro-apps, and every page links home', async ({ page, request }) => {
  await page.goto('/');
  const cta = page.getByRole('link', { name: 'Say hello' });
  await expect(cta).toHaveAttribute('href', 'https://booking.akiflow.com/suhas--a84d');
  await expect(cta).toHaveClass(/\bbutton\b/);
  const explore = page.getByRole('navigation', { name: 'On this site', exact: true });
  const apps = page.getByRole('navigation', { name: 'Micro-apps', exact: true });
  await expect(explore.locator('.row-title')).toHaveText(['About', 'Notes', 'Uses']);
  await expect(apps.locator('.row-title')).toHaveText(['Pocket Card', 'Swatchbook']);
  await expect(page.getByRole('link', { name: 'RSS' })).toHaveAttribute('href', '/rss.xml');
  await expect(page.getByRole('link', { name: 'Suhas Darsi, home' })).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('a[href="/superalign"]')).toHaveCount(0);
  expect((await request.get('/superalign')).status()).toBe(404);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.locator('.home-bio, .timeline-section, .recent-section')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'LinkedIn', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'X (Twitter)', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Copy email address: suhas@superalign.ai', exact: true })).toBeVisible();
  await expect(page.locator('.social-email-link')).toHaveCount(0);

  for (const path of ['/', '/about', '/notes', '/notes/ai-as-the-ultimate-hub', '/uses', '/pocket-card', '/swatchbook', '/missing-page']) {
    await page.goto(path);
    const home = page.getByRole('link', { name: 'Suhas Darsi, home' });
    await expect(home).toBeVisible();
    await expect(home).toHaveAttribute('href', '/');
  }

  await page.goto('/');
  await explore.getByRole('link', { name: /^About/ }).click();
  await expect(page).toHaveURL(/\/about\/?$/);
  await expect(page.getByRole('heading', { name: 'About', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Suhas Darsi', exact: true })).toHaveCount(0);
  await expect(page.getByText('Founder · Researcher · Writer', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'LinkedIn', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Copy email address: suhas@superalign.ai', exact: true })).toBeVisible();
  await expect(page.locator('.social-email-link')).toHaveCount(0);
  await expect(page.getByText("I'm a co-founder at", { exact: false })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Currently' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Previously' })).toBeVisible();
});
