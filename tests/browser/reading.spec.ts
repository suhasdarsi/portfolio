import { test, expect } from '@playwright/test';
const note = '/notes/ai-as-the-ultimate-hub';
test('readers can preview sections and jump to the one they need', async ({ page }) => {
  await page.goto(note);
  await page.getByText('In this note', { exact: true }).click();
  const link = page.getByRole('navigation', { name: 'In this note' }).getByRole('link').first();
  const href = await link.getAttribute('href');
  await link.click();
  await expect(page).toHaveURL(new RegExp(href! + '$'));
  const heading = page.locator(href!);
  await expect(heading).toBeInViewport();
});
test('larger reading text persists without changing the site navigation', async ({ page }) => {
  await page.goto(note);
  const prose = page.locator('[data-reader] .prose-custom');
  const before = await prose.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  const header = await page.locator('.header').evaluate((el) => getComputedStyle(el).fontSize);
  const button = page.getByRole('button', { name: 'Larger text', exact: true });
  await button.click();
  await expect(button).toHaveAttribute('aria-pressed', 'true');
  await expect
    .poll(() => prose.evaluate((el) => parseFloat(getComputedStyle(el).fontSize)))
    .toBeGreaterThan(before);
  await page.reload();
  await expect(button).toHaveAttribute('aria-pressed', 'true');
  expect(await page.locator('.header').evaluate((el) => getComputedStyle(el).fontSize)).toBe(
    header
  );
  await button.click();
  await expect(button).toHaveAttribute('aria-pressed', 'false');
});
test('reading controls work with blocked storage and text remains comfortable', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new Error('blocked');
    };
    Storage.prototype.setItem = () => {
      throw new Error('blocked');
    };
  });
  await page.goto(note);
  await page.getByRole('button', { name: 'Larger text', exact: true }).click();
  await expect
    .poll(() =>
      page
        .locator('[data-reader] .prose-custom')
        .evaluate((el) => parseFloat(getComputedStyle(el).fontSize))
    )
    .toBeGreaterThanOrEqual(18);
  const type = await page.locator('[data-reader] .prose-custom').evaluate((el) => {
    const s = getComputedStyle(el);
    return {
      size: parseFloat(s.fontSize),
      leading: parseFloat(s.lineHeight) / parseFloat(s.fontSize),
    };
  });
  expect(type.size).toBeGreaterThanOrEqual(18);
  expect(type.leading).toBeGreaterThanOrEqual(1.7);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test('copying a note uses its canonical URL and announces success', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: async (text: string) => {
          (window as unknown as { copied: string }).copied = text;
        },
      },
    });
  });
  await page.goto(note + '?from=reader');
  await page.getByRole('button', { name: 'Copy link', exact: true }).click();
  await expect(page.locator('#copy-link-status')).toHaveText('Link copied.');
  expect(await page.evaluate(() => (window as unknown as { copied: string }).copied)).toBe(
    'https://suhasdarsi.com' + note
  );
});
test('section navigation and article content work without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4322' + note);
  await page.getByText('In this note', { exact: true }).click();
  await expect(
    page.getByRole('navigation', { name: 'In this note' }).getByRole('link').first()
  ).toBeVisible();
  await expect(page.locator('.prose-custom p').first()).toBeVisible();
  await expect(page.locator('#reading-size')).toBeHidden();
  await context.close();
});
test('clipboard failure gives a useful fallback', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: async () => {
          throw new Error('denied');
        },
      },
    });
  });
  await page.goto(note);
  await page.getByRole('button', { name: 'Copy link', exact: true }).click();
  await expect(page.locator('#copy-link-status')).toContainText(
    'Copy the address from your browser'
  );
});
