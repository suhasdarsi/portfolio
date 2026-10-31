import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function expectAccessible(page: Page) {
  for (const theme of ['light', 'dark']) {
    await page.evaluate(theme => document.documentElement.classList.toggle('dark', theme === 'dark'), theme);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(results.violations).toEqual([]);
  }
}

const fits = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);

test('Toolshed is its own app: own navigation, category cards, independence footer', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /^Toolshed/ }).click();
  await expect(page).toHaveURL(/\/toolshed$/);
  await expect(page.getByRole('heading', { name: 'Toolshed', level: 1 })).toBeVisible();

  const nav = page.getByRole('navigation', { name: 'Toolshed', exact: true });
  await expect(nav.getByRole('link', { name: 'Categories' })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('navigation', { name: 'Site' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Suhas Darsi, home' })).toHaveAttribute('href', '/');

  await expect(page.locator('.ts-category-card')).toHaveCount(15);
  await expect(page.getByRole('contentinfo')).toContainText('Nobody can pay to be listed');
  await expect(page.getByRole('contentinfo')).toContainText('SuperAlign');
  expect(await fits(page)).toBe(true);
  await expectAccessible(page);
});

test('A category has Overview, Tools and Market guide tabs', async ({ page }) => {
  await page.goto('/toolshed');
  await page.locator('.ts-category-card', { hasText: 'AI security' }).click();
  await expect(page).toHaveURL(/\/toolshed\/ai-security$/);
  await expect(page.getByRole('heading', { name: 'AI security', level: 1 })).toBeVisible();
  const tabs = page.getByRole('navigation', { name: 'AI security sections' });
  await expect(tabs.getByRole('link', { name: 'Overview' })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('navigation', { name: 'Categories' }).getByRole('link', { name: /^AI security/ })).toHaveAttribute('aria-current', 'page');

  // The agent-type 2x2: who built it x who runs it.
  const matrix = page.locator('.ts-matrix');
  for (const label of ['Run by the vendor', 'Run in your environment', 'Built by a vendor', 'Built by your team']) {
    await expect(matrix.getByText(label).filter({ visible: true }).first()).toBeVisible();
  }
  await expect(matrix.locator('a.cell')).toHaveCount(4);
  expect(await fits(page)).toBe(true);
  await expectAccessible(page);

  // A cell opens the Tools tab filtered to that tag.
  await matrix.locator('a.cell', { hasText: 'Local agents' }).click();
  await expect(page).toHaveURL(/\/toolshed\/ai-security\/tools\?tag=Local\+agents|tag=Local%20agents/);
  await expect(page.getByRole('button', { name: /^Local agents/ })).toHaveAttribute('aria-pressed', 'true');
  const visible = page.locator('[data-tool]:visible');
  expect(await visible.count()).toBeGreaterThan(0);
  for (const tags of await visible.evaluateAll((items) => items.map((item) => (item as HTMLElement).dataset.tags))) {
    expect(JSON.parse(tags!)).toContain('Local agents');
  }
  await expect(page.locator('[data-tool]', { hasText: 'SuperAlign' })).toContainText('My employer');
  await expect(page.locator('[data-tool]', { hasText: 'Prompt Security' }).getByRole('link', { name: 'Browser' })).toBeVisible();

  await page.getByRole('button', { name: /^Local agents/ }).click();
  expect(await page.locator('[data-tool]:visible').count()).toBeGreaterThan(30);
  expect(await fits(page)).toBe(true);
  await expectAccessible(page);

  await page.getByRole('navigation', { name: 'AI security sections' }).getByRole('link', { name: 'Market guide' }).click();
  await expect(page).toHaveURL(/\/toolshed\/ai-security\/market$/);
  await expect(page.getByText(/^As of/)).toBeVisible();
  const row = page.getByRole('table').getByRole('row', { name: /Prisma AIRS/ });
  expect(await row.getByText('Yes').count()).toBeGreaterThan(2);
  expect(await fits(page)).toBe(true);
  await expectAccessible(page);
});

test('A tool tagged in two categories shows up in both', async ({ page }) => {
  await page.goto('/toolshed/browser/tools');
  await expect(page.locator('[data-tool]', { hasText: 'Prompt Security' })).toBeVisible();
  await expect(page.locator('[data-tool]', { hasText: 'Prompt Security' }).getByRole('link', { name: 'AI security' })).toBeVisible();
});

test('Header search lands on All tools, filtered', async ({ page }) => {
  await page.goto('/toolshed/tools?q=vault');
  await expect(page.getByLabel('Find a tool')).toHaveValue('vault');
  await expect(page.locator('[data-tool]:visible', { hasText: 'HashiCorp Vault' })).toBeVisible();
  const visible = await page.locator('[data-tool]:visible').count();
  expect(visible).toBeLessThan(10);
  await page.getByLabel('Find a tool').fill('');
  expect(await page.locator('[data-tool]:visible').count()).toBeGreaterThan(300);
  expect(await fits(page)).toBe(true);
  await expectAccessible(page);
});

test('About explains independence, and the data is open', async ({ page, request }) => {
  await page.goto('/toolshed/about');
  await expect(page.getByRole('heading', { name: 'Nobody can pay to be here' })).toBeVisible();
  const data = await (await request.get('/toolshed/tools.json')).json();
  expect(data.tools.length).toBeGreaterThan(300);
  expect(data.tools.find((tool: { name: string }) => tool.name === 'SuperAlign').affiliatedWithAuthor).toBe(true);
  await expectAccessible(page);
});

test('Toolshed is marked alpha and kept out of search engines', async ({ page, request }) => {
  for (const path of ['/toolshed', '/toolshed/ai-security', '/toolshed/tools', '/toolshed/about']) {
    await page.goto(path);
    await expect(page.getByRole('note')).toContainText('Alpha.');
    await expect(page.getByRole('note')).toContainText('Please don’t rely on it');
    await expect(page.locator('.ts-brand')).toContainText('Alpha');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
  }
  const sitemap = await (await request.get('/sitemap-0.xml')).text();
  expect(sitemap).not.toContain('/toolshed');
  expect((await (await request.get('/toolshed/tools.json')).json()).status).toBe('alpha');
});

test('People can suggest a tool; without a sitekey the page points to GitHub', async ({ page }) => {
  await page.goto('/toolshed');
  await page.getByRole('navigation', { name: 'Toolshed', exact: true }).getByRole('link', { name: 'Suggest a tool' }).click();
  await expect(page).toHaveURL(/\/toolshed\/suggest$/);
  await expect(page.getByRole('heading', { name: 'Suggest a tool or a correction', level: 1 })).toBeVisible();
  await expect(page.getByText('Nobody can pay to be listed', { exact: false }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'open a request on GitHub' })).toHaveAttribute('href', /github\.com\/suhasdarsi\/portfolio\/issues\/new\?labels=toolshed-request/);
  await expect(page.locator('meta[http-equiv="Content-Security-Policy"]')).toHaveAttribute('content', /frame-src 'none'/);
  expect(await fits(page)).toBe(true);
  await expectAccessible(page);
});
