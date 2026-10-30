import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { designSystems } from '../../src/data/design-systems';

test('Swatchbook can be found from home, searched and filtered', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /^Swatchbook/ }).click();
  await expect(page).toHaveURL(/\/swatchbook$/);
  await expect(page.getByRole('heading', { name: 'Swatchbook', level: 1 })).toBeVisible();
  const search = page.getByLabel('Find a design system');
  await search.fill('github');
  await expect(page.locator('[data-system]:visible')).toHaveCount(1);
  await expect(page.locator('[data-system]:visible a')).toHaveAttribute('href', 'https://primer.style/');
  await page.getByRole('button', { name: 'Public service', exact: true }).click();
  await expect(page.locator('#system-empty')).toBeVisible();
  await search.fill('');
  await expect(page.locator('[data-system]:visible')).toHaveCount(designSystems.filter(system => system.category === 'Public service').length);
  await page.getByRole('button', { name: 'All', exact: true }).click();
  await expect(page.locator('[data-system]:visible')).toHaveCount(designSystems.length);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  for (const theme of ['light', 'dark']) {
    await page.evaluate(theme => document.documentElement.classList.toggle('dark', theme === 'dark'), theme);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(results.violations).toEqual([]);
  }
});
