import { test, expect, type Page } from '@playwright/test';

/*
 * Rendered readability verifier (desktop Chrome and Pixel 7). Static text metrics live in
 * tests/quality/readability.test.ts. Not repeated here: the 13/16/28px type scale
 * (typography.spec.ts), the exact 16px / 1.6 note body with blocked storage (reading.spec.ts),
 * and axe colour-contrast on notes in light and dark (site.spec.ts). Contrast is still
 * measured below on the body text itself so the numeric ratio is reported.
 *
 * Thresholds:
 *  - Body size: 16px on both viewports. The brief suggested 17px on desktop, but the site's
 *    deliberate three-step scale (13/16/28px, enforced by typography.spec.ts) has no 17px, so
 *    16px is the floor; line-height must be at least 1.5x (site uses 1.7).
 *  - Line length 45-80 characters on desktop (the usual 45-75 comfort band with slack for
 *    wide glyph mixes). Phones are only required to stay at or under 80.
 */
const note = '/notes/ai-as-the-ultimate-hub';
const MIN_SIZE_DESKTOP = 16;
const MIN_SIZE_MOBILE = 16;
const MIN_LEADING = 1.5;
const LINE_MIN = 45;
const LINE_MAX = 80;
const CONTRAST_MIN = 4.5;
const PARA_GAP_EM = 0.5;

const isMobile = (page: Page) => (page.viewportSize()?.width ?? 0) < 760;

/**
 * Line length: the average character width is measured with canvas measureText using the
 * element's computed font on the element's own text; characters per line is then
 * content-box width divided by that average width.
 */
const lineLengthIn = (page: Page, selector: string) =>
  page.evaluate((sel) => {
    const els = [...document.querySelectorAll<HTMLElement>(sel)].filter((e) => (e.textContent ?? '').trim().length > 200);
    const el = els[0];
    const s = getComputedStyle(el);
    const ctx = document.createElement('canvas').getContext('2d')!;
    ctx.font = `${s.fontStyle} ${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;
    const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
    const avg = ctx.measureText(text).width / text.length;
    const width = el.clientWidth - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight);
    return { chars: width / avg, width, avg };
  }, selector);

test.describe('note typography', () => {
  test('body text is at least 16px with at least 1.5x line height', async ({ page }) => {
    await page.goto(note);
    const t = await page.locator('.prose p').first().evaluate((el) => {
      const s = getComputedStyle(el);
      return { size: parseFloat(s.fontSize), leading: parseFloat(s.lineHeight) / parseFloat(s.fontSize) };
    });
    expect(t.size).toBeGreaterThanOrEqual(isMobile(page) ? MIN_SIZE_MOBILE : MIN_SIZE_DESKTOP);
    expect(t.leading).toBeGreaterThanOrEqual(MIN_LEADING);
  });

  test('desktop line length is 45 to 80 characters; mobile stays under 80', async ({ page }) => {
    await page.goto(note);
    const { chars } = await lineLengthIn(page, '.prose p');
    expect(chars).toBeLessThanOrEqual(LINE_MAX);
    if (!isMobile(page)) expect(chars).toBeGreaterThanOrEqual(LINE_MIN);
  });

  test('body text meets 4.5:1 contrast in light and dark themes', async ({ page }) => {
    await page.goto(note);
    for (const theme of ['light', 'dark']) {
      await page.evaluate((th) => document.documentElement.classList.toggle('dark', th === 'dark'), theme);
      const ratios = await page.evaluate(() => {
        const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!;
        const rgba = (c: string) => {
          ctx.clearRect(0, 0, 1, 1);
          ctx.fillStyle = '#000';
          ctx.fillStyle = c;
          ctx.fillRect(0, 0, 1, 1);
          const d = ctx.getImageData(0, 0, 1, 1).data;
          return [d[0], d[1], d[2], d[3] / 255];
        };
        const lum = ([r, g, b]: number[]) => {
          const f = (v: number) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
          return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
        };
        const bgOf = (el: Element) => {
          for (let e: Element | null = el; e; e = e.parentElement) {
            const c = rgba(getComputedStyle(e).backgroundColor);
            if (c[3] > 0.99) return c;
          }
          return rgba(getComputedStyle(document.body).backgroundColor);
        };
        const out: Record<string, number> = {};
        for (const [name, sel] of [['paragraph', '.prose p'], ['link', '.prose p a'], ['heading', '.prose h2'], ['lede', '.lede']] as const) {
          const el = document.querySelector(sel);
          if (!el) continue;
          const fg = rgba(getComputedStyle(el).color);
          const bg = bgOf(el);
          const [a, b] = [lum(fg), lum(bg)].sort((x, y) => y - x);
          out[name] = (a + 0.05) / (b + 0.05);
        }
        return out;
      });
      for (const [name, ratio] of Object.entries(ratios)) {
        expect(ratio, `${theme} ${name}`).toBeGreaterThanOrEqual(CONTRAST_MIN);
      }
      expect(Object.keys(ratios)).toContain('paragraph');
    }
  });

  test('consecutive paragraphs are separated by at least 0.5em', async ({ page }) => {
    await page.goto(note);
    const gaps = await page.evaluate(() => {
      const out: { gap: number; em: number }[] = [];
      for (const p of document.querySelectorAll<HTMLElement>('.prose p')) {
        const next = p.nextElementSibling;
        if (next?.tagName !== 'P') continue;
        const em = parseFloat(getComputedStyle(p).fontSize);
        out.push({ gap: next.getBoundingClientRect().top - p.getBoundingClientRect().bottom, em });
      }
      return out;
    });
    expect(gaps.length).toBeGreaterThan(0);
    for (const g of gaps) expect(g.gap).toBeGreaterThanOrEqual(g.em * PARA_GAP_EM);
  });

  test('the note body is not clipped and no text overflows its box', async ({ page }) => {
    await page.goto(note);
    const bad = await page.evaluate(() => {
      const problems: string[] = [];
      const clipped = (e: Element) => /hidden|clip/.test(getComputedStyle(e).overflowX + getComputedStyle(e).overflowY);
      for (let e: Element | null = document.querySelector('.prose'); e && e !== document.body; e = e.parentElement) {
        if (clipped(e)) problems.push(`container overflow: ${e.tagName}.${e.className}`);
      }
      for (const el of document.querySelectorAll<HTMLElement>('.prose p, .prose li, .prose h2, .prose h3, .prose blockquote')) {
        if (clipped(el)) problems.push(`overflow hidden on ${el.tagName}`);
        if (el.scrollWidth > el.clientWidth + 1) problems.push(`horizontal overflow in ${el.tagName}: ${(el.textContent ?? '').slice(0, 30)}`);
      }
      return problems;
    });
    expect(bad).toEqual([]);
  });

  test('no running text in the note body is smaller than 14px (diagram labels excluded)', async ({ page }) => {
    await page.goto(note);
    const small = await page.evaluate(() => {
      const out: string[] = [];
      const walker = document.createTreeWalker(document.querySelector('.prose')!, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const el = n.parentElement;
        // Diagram labels inside <figure> are graphics, sized by the 13px scale step, not running text.
        if (!el || !n.textContent?.trim() || el.closest('figure')) continue;
        const size = parseFloat(getComputedStyle(el).fontSize);
        if (size < 14) out.push(`${size}px ${el.tagName}: ${n.textContent.trim().slice(0, 30)}`);
      }
      return out;
    });
    expect(small).toEqual([]);
  });
});

test.describe('homepage typography', () => {
  test('reading text is at least 16px with comfortable leading and line length', async ({ page }) => {
    await page.goto('/');
    const found = await page.evaluate(() => {
      const out: { size: number; leading: number; chars: number; text: string }[] = [];
      const ctx = document.createElement('canvas').getContext('2d')!;
      // Section-label glosses (.sec-label p) and the epigraph are 13px captions by design
      // (type scale in typography.spec.ts); everything else that reads as a paragraph is checked.
      for (const el of document.querySelectorAll<HTMLElement>('main p:not(.epigraph):not(.sec-label p)')) {
        const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
        if (text.length < 80 || el.offsetParent === null) continue;
        const s = getComputedStyle(el);
        ctx.font = `${s.fontStyle} ${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;
        const avg = ctx.measureText(text).width / text.length;
        out.push({
          size: parseFloat(s.fontSize),
          leading: parseFloat(s.lineHeight) / parseFloat(s.fontSize),
          chars: el.clientWidth / avg,
          text: text.slice(0, 30),
        });
      }
      return out;
    });
    expect(found.length).toBeGreaterThan(0);
    for (const p of found) {
      expect(p.size, p.text).toBeGreaterThanOrEqual(16);
      expect(p.leading, p.text).toBeGreaterThanOrEqual(1.4);
      expect(p.chars, p.text).toBeLessThanOrEqual(LINE_MAX);
    }
  });

  test('no horizontal scrolling on the homepage or a note', async ({ page }) => {
    for (const path of ['/', note]) {
      await page.goto(path);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), path).toBe(true);
    }
  });
});
