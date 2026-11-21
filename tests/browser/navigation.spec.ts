import { test, expect } from '@playwright/test';

test('homepage is the introduction and the garden, and every page links home', async ({ page, request }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText("I study how AI systems fail");
  expect(await page.locator('#writing a[href^="/notes/"]').count()).toBeGreaterThanOrEqual(5);
  await expect(page.getByRole('heading', { level: 2 })).toHaveText(['Notes', 'Working through an AI security problem?']);
  // The site's one ask: a booking button in the introduction and again after the notes.
  await expect(page.getByRole('link', { name: 'Book a time to talk' })).toHaveCount(2);
  await expect(page.getByRole('link', { name: 'Book a time to talk' }).first()).toHaveAttribute('href', 'https://booking.akiflow.com/suhas--a84d');
  // The graph has a node for every note, and each node opens its note.
  const graph = page.getByRole('navigation', { name: 'Graph of all notes' });
  const entries = (await (await request.get('/search.json')).json()) as { kind: string }[];
  await expect(graph.getByRole('link')).toHaveCount(entries.filter((entry) => entry.kind === 'Note').length);
  const node = graph.getByRole('link').first();
  const nodeHref = await node.getAttribute('href');
  expect(nodeHref).toMatch(/^\/notes\//);
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
  await expect(page.getByText('I’m a co-founder at', { exact: false })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Currently' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Previously' })).toBeVisible();

  await page.goto('/');
  await page.getByRole('navigation', { name: 'Main', exact: true }).getByRole('link', { name: 'About' }).click();
  await expect(page).toHaveURL(/\/about\/?$/);
});

test('the Apps link in the header opens a page listing the tiny apps', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('navigation', { name: 'Main', exact: true }).getByRole('link', { name: 'Apps' }).click();
  await expect(page).toHaveURL(/\/apps\/?$/);
  await expect(page.getByRole('heading', { name: 'Tiny apps', level: 1 })).toBeVisible();
  await expect(page.locator('.app .an')).toHaveText(['Pocket Card', 'Swatchbook', 'Toolshed alpha']);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('the home graph names every note, can be tapped on a phone, and its previews open beside it', async ({ page }) => {
  await page.goto('/');
  const graph = page.getByRole('navigation', { name: 'Graph of all notes' });
  const nodes = graph.getByRole('link');
  // Every note is named on the drawing, and each target is at least 44px across so a finger can hit it.
  for (const node of await nodes.all()) {
    await expect(node.locator('text')).not.toBeEmpty();
    expect((await node.locator('.hit').boundingBox())!.width).toBeGreaterThanOrEqual(43.5);
  }
  // The graph opens the section, before the note cards.
  const cards = page.locator('.g-card').first();
  expect((await graph.boundingBox())!.y).toBeLessThan((await cards.boundingBox())!.y);
  // A note that has a card on the page, so the card and its node can light each other.
  const href = await cards.getAttribute('href');
  const target = graph.locator(`svg.art:visible a[href="${href}"]`);
  if ((page.viewportSize()?.width ?? 0) < 760) {
    // One tap on the name opens the note: nothing on the graph reacts to touch first.
    await target.scrollIntoViewIfNeeded();
    const name = (await target.locator('text').boundingBox())!;
    await page.touchscreen.tap(name.x + name.width / 2, name.y + name.height / 2);
    await expect(page).toHaveURL(new RegExp(href! + '$'));
    return;
  }
  // Pointing at a note card lights its note in the graph.
  await page.locator(`.g-card[href="${href}"]`).hover();
  await expect(target).toHaveClass(/\blit\b/);
  // Pointing at a note in the graph opens its preview beside the drawing, not over it.
  await target.locator('.node').hover();
  const preview = page.locator('.peek:visible');
  await expect(preview).toHaveCount(1);
  const card = (await preview.boundingBox())!, drawing = (await graph.locator('svg.art:visible').boundingBox())!;
  expect(card.x + card.width <= drawing.x || card.x >= drawing.x + drawing.width).toBe(true);
});

test('graph names stay at 15px and targets at 44px or more at every width, on home and on a note', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'one browser is enough: this resizes the window itself');
  const measure = () => page.evaluate(() => {
    const svg = [...document.querySelectorAll<SVGSVGElement>('.graph svg.art')].find((s) => s.getBoundingClientRect().width > 0)!;
    const scale = svg.getBoundingClientRect().width / svg.viewBox.baseVal.width;
    return {
      shown: document.querySelectorAll('.graph svg.art').length - [...document.querySelectorAll('.graph svg.art')].filter((s) => !s.getBoundingClientRect().width).length,
      names: svg.querySelectorAll('text').length,
      text: 15 * scale,
      hit: Math.min(...[...svg.querySelectorAll('.hit')].map((hit) => hit.getBoundingClientRect().width)),
      // The drawing is a plain block, not a second sticky element in the rail.
      position: getComputedStyle(svg).position,
    };
  });
  for (const width of [360, 390, 760, 901, 1000, 1179, 1180, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    const home = await measure();
    expect(home.shown, `${width}px: one drawing shown`).toBe(1);
    expect(home.names, `${width}px: every note named`).toBe(await page.getByRole('navigation', { name: 'Graph of all notes' }).getByRole('link').count());
    expect(home.text, `${width}px: names at 15px`).toBeGreaterThanOrEqual(14.9);
    expect(home.hit, `${width}px: targets 44px or more`).toBeGreaterThanOrEqual(44);
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/notes/ai-as-the-ultimate-hub');
  const local = await measure();
  expect(local.text).toBeGreaterThanOrEqual(14.9);
  expect(local.names).toBeGreaterThan(1);
  expect(local.position).toBe('static');
});
