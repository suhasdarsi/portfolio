import { test, expect } from '@playwright/test';
const note = '/notes/ai-as-the-ultimate-hub';
test('readers can jump to a section from the side column, which is hidden on phones', async ({ page }) => {
  await page.goto(note);
  const guide = page.getByRole('navigation', { name: 'In this note' });
  if ((page.viewportSize()?.width ?? 0) < 760) {
    await expect(guide).toBeHidden();
    await expect(page.locator('.prose h2').first()).toBeVisible();
    return;
  }
  const link = guide.getByRole('link').first();
  await expect(guide.getByText('On this page')).toBeVisible();
  const href = await link.getAttribute('href');
  await link.click();
  await expect(page).toHaveURL(new RegExp(href! + '$'));
  await expect(page.locator(href!)).toBeInViewport();
});
test('the side column lists the notes this note links to', async ({ page }) => {
  await page.goto(note);
  const links = page.getByRole('navigation', { name: 'Links to' }).getByRole('link');
  if ((page.viewportSize()?.width ?? 0) < 760) {
    await expect(page.getByRole('navigation', { name: 'Links to' })).toBeHidden();
    return;
  }
  const first = links.first();
  const href = await first.getAttribute('href');
  expect(href).toMatch(/^\/notes\//);
  await first.click();
  await expect(page).toHaveURL(new RegExp(href! + '$'));
});
test('notes offer older and newer neighbours without a text-size control', async ({ page }) => {
  await page.goto(note);
  await expect(page.getByRole('navigation', { name: 'More notes' }).getByRole('link').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Larger text' })).toHaveCount(0);
});
test('note text stays comfortable with blocked storage', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new Error('blocked');
    };
    Storage.prototype.setItem = () => {
      throw new Error('blocked');
    };
  });
  await page.goto(note);
  const type = await page.locator('.prose').first().evaluate((el) => {
    const s = getComputedStyle(el);
    return {
      size: parseFloat(s.fontSize),
      leading: parseFloat(s.lineHeight) / parseFloat(s.fontSize),
    };
  });
  expect(type.size).toBe(16);
  expect(type.leading).toBeGreaterThanOrEqual(1.6);
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
test('section navigation and article content work without JavaScript', async ({ browser, isMobile }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: isMobile ? { width: 412, height: 915 } : undefined });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4322' + note);
  if (!isMobile) {
    await expect(
      page.getByRole('navigation', { name: 'In this note' }).getByRole('link').first()
    ).toBeVisible();
  }
  await expect(page.locator('.prose p').first()).toBeVisible();
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
test('the reading progress bar fills as the reader reaches the end of the note', async ({ page }) => {
  await page.goto(note);
  const width = () => page.locator('#reading-progress').evaluate((bar) => bar.getBoundingClientRect().width / innerWidth);
  expect(await width()).toBeLessThan(0.1);
  await page.evaluate(() => {
    const article = document.querySelector('article')!;
    scrollTo(0, article.getBoundingClientRect().bottom + scrollY - innerHeight);
  });
  await expect.poll(width).toBeGreaterThan(0.99);
});
