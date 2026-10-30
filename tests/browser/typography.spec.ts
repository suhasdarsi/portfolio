import { test, expect } from '@playwright/test';

test('Inter is self-hosted, loads its weights, and keeps page headings consistent', async ({ page }) => {
  let headingStyle: string[] | undefined;
  for (const path of ['/', '/about', '/notes', '/notes/ai-as-the-ultimate-hub', '/uses', '/swatchbook']) {
    await page.goto(path);
    const styles = await page.evaluate(async () => {
      const fonts = await Promise.all([
        document.fonts.load('400 16px "Inter Variable"'),
        document.fonts.load('500 16px "Inter Variable"'),
        document.fonts.load('600 16px "Inter Variable"'),
      ]);
      const heading = getComputedStyle(document.querySelector('.page-heading')!);
      return {
        loaded: fonts.every(faces => faces.length > 0 && faces.every(face => face.status === 'loaded')),
        body: getComputedStyle(document.body).fontFamily,
        heading: [heading.fontFamily, heading.fontSize, heading.fontWeight, heading.lineHeight],
        fits: document.documentElement.scrollWidth <= window.innerWidth,
      };
    });
    expect(styles.loaded).toBe(true);
    expect(styles.body).toContain('Inter');
    expect(styles.heading[0]).toContain('Inter');
    headingStyle ??= styles.heading;
    expect(styles.heading).toEqual(headingStyle);
    expect(styles.fits).toBe(true);
  }
});
