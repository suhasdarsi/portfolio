import { test, expect } from '@playwright/test';

const allowedSizes = ['13px', '16px', '28px'];

test('Geist and Geist Serif are self-hosted, loaded, and the type scale stays at 13, 16 and 28px', async ({ page }) => {
  for (const path of ['/', '/about', '/notes', '/notes/ai-as-the-ultimate-hub', '/uses', '/swatchbook', '/pocket-card', '/toolshed']) {
    await page.goto(path);
    const styles = await page.evaluate(async () => {
      const [sans, serif] = await Promise.all([
        document.fonts.load('400 16px Geist'),
        document.fonts.load('400 28px "Geist Serif"'),
      ]);
      const sizes = new Set<string>();
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const el = node.parentElement;
        if (!el || !node.textContent?.trim() || ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(el.tagName)) continue;
        const style = getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') continue;
        sizes.add(style.fontSize);
      }
      const heading = document.querySelector('h1, h2')!;
      return {
        loaded: [sans, serif].every(faces => faces.length > 0 && faces.every(face => face.status === 'loaded')),
        body: getComputedStyle(document.body).fontFamily,
        heading: getComputedStyle(heading).fontFamily,
        sizes: [...sizes],
        fits: document.documentElement.scrollWidth <= window.innerWidth,
      };
    });
    expect(styles.loaded, path).toBe(true);
    expect(styles.body, path).toContain('Geist');
    expect(styles.body, path).not.toContain('Inter');
    expect(styles.heading, path).toContain('Geist Serif');
    expect(styles.sizes.filter(size => !allowedSizes.includes(size)), path).toEqual([]);
    expect(styles.fits, path).toBe(true);
  }
});

test('page titles share one Geist Serif treatment', async ({ page }) => {
  let titleStyle: string[] | undefined;
  for (const path of ['/about', '/notes', '/notes/ai-as-the-ultimate-hub', '/uses', '/swatchbook', '/pocket-card']) {
    await page.goto(path);
    const style = await page.evaluate(() => {
      const heading = getComputedStyle(document.querySelector('h1.title')!);
      return [heading.fontFamily, heading.fontSize, heading.fontWeight];
    });
    expect(style[0], path).toContain('Geist Serif');
    expect(allowedSizes).toContain(style[1]);
    titleStyle ??= style;
    expect(style, path).toEqual(titleStyle);
  }
});
