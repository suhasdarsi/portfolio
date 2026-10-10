import { test, expect } from '@playwright/test';

test('Libron is self-hosted, loads all reading styles, and keeps page headings consistent', async ({ page }) => {
  let headingStyle: string[] | undefined;
  for (const path of ['/', '/about', '/notes', '/notes/ai-as-the-ultimate-hub', '/uses', '/swatchbook']) {
    await page.goto(path);
    const styles = await page.evaluate(async () => {
      const fonts = await Promise.all([
        document.fonts.load('400 16px Libron'),
        document.fonts.load('700 16px Libron'),
        document.fonts.load('italic 400 16px Libron'),
        document.fonts.load('italic 700 16px Libron'),
      ]);
      const heading = getComputedStyle(document.querySelector('.page-heading')!);
      return {
        loaded: fonts.every(faces => faces.length === 1 && faces[0].status === 'loaded'),
        body: getComputedStyle(document.body).fontFamily,
        heading: [heading.fontFamily, heading.fontSize, heading.fontWeight, heading.lineHeight],
        fits: document.documentElement.scrollWidth <= window.innerWidth,
      };
    });
    expect(styles.loaded).toBe(true);
    expect(styles.body).toContain('Libron');
    expect(styles.heading[0]).toContain('Libron');
    headingStyle ??= styles.heading;
    expect(styles.heading).toEqual(headingStyle);
    expect(styles.fits).toBe(true);
  }
});
