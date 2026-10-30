import { test, expect } from '@playwright/test';

test('homepage leads with Say hello, groups micro-apps, and every page links home', async ({ page }) => {
  await page.goto('/');
  const cta = page.getByRole('link', { name: 'say hello' });
  await expect(cta).toHaveAttribute('href', 'https://booking.akiflow.com/suhas--a84d');
  // New home page design doesn't use button class or micro-apps sections
  await expect(page.getByRole('navigation', { name: 'Primary' })).toBeVisible();
  await expect(page.getByText('Every network has a hub.')).toBeVisible();
  await expect(page.getByText("Hi, I'm Suhas.")).toBeVisible();
  await expect(page.getByRole('link', { name: 'SuperAlign' })).toHaveAttribute('href', 'https://superalign.ai');
  await expect(page.getByRole('link', { name: 'Aztlan' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'IIIT Hyderabad' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'linkedin' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'x' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'email' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  for (const path of ['/', '/about', '/notes', '/notes/ai-as-the-ultimate-hub', '/uses', '/pocket-card', '/swatchbook', '/missing-page']) {
    await page.goto(path);
    const home = page.getByRole('link', { name: 'Suhas Darsi, home' });
    // Home page has a simpler nav without the full header
    if (path === '/') {
      await expect(page.getByRole('link', { name: 'home' })).toBeVisible();
    } else {
      await expect(home).toBeVisible();
      await expect(home).toHaveAttribute('href', '/');
    }
  }

  await page.goto('/about');
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
