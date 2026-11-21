import { test, expect } from '@playwright/test';
const note = '/notes/ai-as-the-ultimate-hub';
test('readers can jump to a section from the contents rail beside the text, which is hidden on phones', async ({ page }) => {
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
test('a note lists its linked notes in one list, on every screen size', async ({ page }) => {
  await page.goto(note);
  const links = page.getByRole('navigation', { name: 'Linked notes', exact: true }).getByRole('link');
  await expect(links).toHaveCount(4);
  const first = links.first();
  const href = await first.getAttribute('href');
  expect(href).toMatch(/^\/notes\//);
  await first.click();
  await expect(page).toHaveURL(new RegExp(href! + '$'));
});
test('notes offer older and newer neighbours without a text-size control', async ({ page }) => {
  await page.goto(note);
  // Getting in touch is one step from any note.
  await expect(page.locator('article').getByRole('link', { name: 'Book a time to talk' })).toHaveAttribute('href', /booking/);
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
  // 22px serif on desktop, 18px on phones (the breakpoint is 760px).
  expect(type.size).toBe((page.viewportSize()?.width ?? 0) < 760 ? 18 : 22);
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
test('section navigation and article content work without JavaScript', async ({ browser, isMobile, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: isMobile ? { width: 412, height: 915 } : undefined });
  const page = await context.newPage();
  await page.goto(baseURL + note);
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
test('a note opens with a way back, its name and its description; its growth stage and planting day follow the text', async ({ page }) => {
  await page.goto(note);
  await expect(page.locator('article header > *')).toHaveCount(3);
  await expect(page.locator('article header a')).toHaveAttribute('href', '/notes');
  const meta = page.locator('article .note-foot .g-meta');
  await expect(meta.locator('.stage')).toHaveText(/Seedling|Budding|Evergreen/);
  await expect(meta).toContainText('Planted');
  await page.goto('/notes');
  await expect(page.locator('[data-note-id] .stage').first()).toBeVisible();
});
test('pointing at a link to another note previews it, and Escape puts the preview away', async ({ page }) => {
  await page.goto(note);
  const link = page.locator('.prose a.wikilink').first();
  const preview = page.locator(`.peek[data-peek="${await link.getAttribute('href')}"]`);
  await expect(preview).toBeHidden();
  if ((page.viewportSize()?.width ?? 0) < 760) return; // touch screens follow the link; there is no hover
  // Scrolling puts a preview away, so bring the link into view and let the page settle before pointing at it.
  await link.scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  await link.hover();
  await expect(preview).toBeVisible();
  await expect(preview).toContainText(await link.innerText());
  await expect(preview).toBeInViewport({ ratio: 1 });
  await page.keyboard.press('Escape');
  await expect(preview).toBeHidden();
  // Keyboard: tabbing to the link opens the same preview, even when that scrolls the page.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.keyboard.press('Tab');
  await link.focus();
  await expect(preview).toBeVisible();
  await page.waitForTimeout(400);
  await expect(preview).toBeVisible();
});
test('the local graph links to each linked note and is hidden on phones', async ({ page }) => {
  await page.goto(note);
  const graph = page.getByRole('navigation', { name: 'Graph of linked notes' });
  if ((page.viewportSize()?.width ?? 0) < 760) {
    await expect(graph).toBeHidden();
    return;
  }
  const nodes = graph.getByRole('link');
  await expect(nodes).toHaveCount(4);
  await nodes.first().locator('.node').hover();
  await expect(page.locator('.peek:visible')).toHaveCount(1);
  const href = await nodes.first().getAttribute('href');
  await nodes.first().locator('.node').click();
  await expect(page).toHaveURL(new RegExp(href! + '$'));
});
