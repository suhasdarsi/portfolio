import { test, expect } from '@playwright/test';

test('homepage links are grouped and the standalone SuperAlign page is removed', async ({ page, request }) => {
  await page.goto('/');
  const explore = page.getByRole('navigation', { name: 'On this site', exact: true });
  const connect = page.getByRole('navigation', { name: 'Stay in touch', exact: true });
  await expect(explore.getByRole('link')).toHaveText(['About', 'Notes', 'Uses', 'Design systems']);
  await expect(connect.getByRole('link')).toHaveText(['Say Hello', 'Subscribe via RSS']);
  await expect(page.locator('a[href="/superalign"]')).toHaveCount(0);
  expect((await request.get('/superalign')).status()).toBe(404);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.locator('.home-bio, .timeline-section, .recent-section')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'LinkedIn', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'X (Twitter)', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Copy email address: suhas@superalign.ai', exact: true })).toBeVisible();
  await expect(page.locator('.social-email-link')).toHaveCount(0);
  for (const group of [explore, connect]) {
    const aligned = await group.evaluate(element => {
      const heading = element.querySelector('h2')!.getBoundingClientRect();
      return Array.from(element.querySelectorAll('a')).every(link =>
        Math.abs(link.getBoundingClientRect().left - heading.left) < 2);
    });
    expect(aligned).toBe(true);
  }
  const centered = await page.locator('.home-hub').evaluate(element => {
    const rect = element.getBoundingClientRect();
    return Math.abs(rect.x + rect.width / 2 - innerWidth / 2) < 2;
  });
  expect(centered).toBe(true);
  await explore.getByRole('link', { name: 'About', exact: true }).click();
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
