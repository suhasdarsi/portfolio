import { test, expect, type Page } from '@playwright/test';

/*
 * Styling verifier (rendered). Static checks (tokens, dark tokens, literals, !important, font files,
 * img dimensions, inline colours) live in tests/quality/styling.test.ts.
 * Not repeated here: type scale (typography.spec.ts), axe contrast (site.spec.ts), reading
 * controls (reading.spec.ts), swatch page content (swatchbook.spec.ts), body size, line length
 * and paragraph gap (readability.spec.ts).
 */
const WIDTHS = [375, 768, 1280, 1920]; // phone, tablet, laptop, large desktop
const MOBILE_GUTTER_MIN = 16; // px of space between the viewport edge and main content on phones
const MOBILE_MAX_WIDTH = 760; // matches the @media (max-width:760px) breakpoint in site.css
const FOCUSABLES_CHECKED = 3; // the skip link and the first two header controls
const FOCUS_OUTLINE_MIN = 1; // px; WCAG 2.4.7 needs a visible indicator, 2px is the site's own
const ASPECT_TOLERANCE = 0.02; // 2% between rendered and natural aspect ratio
const MOTION_MAX_MS = 300; // longest transition or animation a UI response should take
const HOVER_SIZE_TOLERANCE = 0.5; // px of sub-pixel rounding allowed when comparing hover boxes
const note = '/notes/ai-as-the-ultimate-hub';
const pages = ['/', '/about', '/uses', '/notes', note, '/swatchbook', '/no-such-page-for-styling-check'];

// Blocked storage must not break theme switching (same approach as reading.spec.ts).
async function blockStorage(page: Page) {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new Error('blocked');
    };
    Storage.prototype.setItem = () => {
      throw new Error('blocked');
    };
  });
}

for (const path of pages) {
  test.describe(path, () => {
    test('no horizontal scroll and a phone gutter at 375, 768, 1280 and 1920', async ({ page }) => {
      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(path);
        const m = await page.evaluate(() => {
          const el = document.documentElement;
          const main = document.querySelector('main')!;
          const r = main.getBoundingClientRect();
          return { scroll: el.scrollWidth, client: el.clientWidth, left: r.left + parseFloat(getComputedStyle(main).paddingLeft), right: el.clientWidth - r.right };
        });
        expect(m.scroll, `scrollWidth at ${width}px`).toBeLessThanOrEqual(m.client);
        if (width < MOBILE_MAX_WIDTH) {
          expect(m.left, `left gutter at ${width}px`).toBeGreaterThanOrEqual(MOBILE_GUTTER_MIN);
          expect(m.right, `right gutter at ${width}px`).toBeGreaterThanOrEqual(MOBILE_GUTTER_MIN);
        }
      }
    });

    test('tabbing shows a visible focus indicator on the first three focusable elements', async ({ page }) => {
      await page.goto(path);
      for (let i = 0; i < FOCUSABLES_CHECKED; i++) {
        await page.keyboard.press('Tab');
        const focus = await page.evaluate(() => {
          const el = document.activeElement!;
          const s = getComputedStyle(el);
          return { tag: el.tagName, outline: s.outlineStyle, width: parseFloat(s.outlineWidth), shadow: s.boxShadow, label: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 30) };
        });
        expect(focus.tag, 'focus moved off the page body').not.toBe('BODY');
        const visible = (focus.outline !== 'none' && focus.width >= FOCUS_OUTLINE_MIN) || focus.shadow !== 'none';
        expect(visible, `focus ring on ${focus.tag} "${focus.label}"`).toBe(true);
      }
    });

    test('hovering a header link or control does not change any box size', async ({ page }) => {
      await page.goto(path);
      const targets = page.locator('header a, header button');
      const count = await targets.count();
      expect(count).toBeGreaterThan(0);
      const all = page.locator('header a, header button, main > *');
      const sizes = async () => await all.evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return [r.width, r.height]; }));
      const before = await sizes();
      for (let i = 0; i < count; i++) {
        await targets.nth(i).hover();
        const after = await sizes();
        after.forEach(([w, h], j) => {
          expect(Math.abs(w - before[j][0]), `width of element ${j} while hovering control ${i}`).toBeLessThanOrEqual(HOVER_SIZE_TOLERANCE);
          expect(Math.abs(h - before[j][1]), `height of element ${j} while hovering control ${i}`).toBeLessThanOrEqual(HOVER_SIZE_TOLERANCE);
        });
      }
    });

    test('images keep their natural aspect ratio unless object-fit is set', async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('load');
      const stretched = await page.evaluate((tol) => {
        const bad: string[] = [];
        document.querySelectorAll('img').forEach((img) => {
          if (!img.complete || !img.naturalWidth || !img.offsetWidth) return;
          if (getComputedStyle(img).objectFit !== 'fill') return;
          const natural = img.naturalWidth / img.naturalHeight;
          const rendered = img.offsetWidth / img.offsetHeight;
          if (Math.abs(rendered / natural - 1) > tol) bad.push(`${img.src} ${rendered.toFixed(3)} vs ${natural.toFixed(3)}`);
        });
        return bad;
      }, ASPECT_TOLERANCE);
      expect(stretched).toEqual([]);
    });

    test('the header sits above the first heading and does not cover it', async ({ page }) => {
      await page.goto(path);
      await page.evaluate(() => window.scrollTo(0, 0));
      const box = await page.evaluate(() => {
        const header = document.querySelector('header')!.getBoundingClientRect();
        const h1 = document.querySelector('h1')!.getBoundingClientRect();
        return { headerBottom: header.bottom, h1Top: h1.top };
      });
      expect(box.headerBottom).toBeLessThanOrEqual(box.h1Top);
    });

    test('loads without console errors, page errors or failed requests', async ({ page }) => {
      const problems: string[] = [];
      page.on('console', (m) => {
        // Chrome logs the 404 status of the page itself (the 404 test path) as a console error; that is not a defect.
        if (m.type() === 'error' && m.location().url !== page.url()) problems.push(`console: ${m.text()}`);
      });
      page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
      page.on('response', (r) => {
        // The 404 page is itself served with a 404 status; only its subresources count.
        if (r.status() >= 400 && r.request().resourceType() !== 'document') problems.push(`${r.status()} ${r.url()}`);
      });
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      expect(problems).toEqual([]);
    });
  });
}

test.describe('theme', () => {
  const colours = (page: Page) =>
    page.evaluate(() => {
      const s = getComputedStyle(document.body);
      return { bg: s.backgroundColor, text: s.color, dark: document.documentElement.classList.contains('dark') };
    });

  for (const path of ['/', note]) {
    test(`the theme button switches background and text colour on ${path}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: 'light' });
      await page.goto(path);
      const light = await colours(page);
      expect(light.dark).toBe(false);
      await page.locator('[data-theme-toggle]').first().click();
      const dark = await colours(page);
      expect(dark.dark).toBe(true);
      expect(dark.bg).not.toBe(light.bg);
      expect(dark.text).not.toBe(light.text);
      // Reload: the choice persists (stored per browser, applied before paint).
      await page.reload();
      expect((await colours(page)).bg).toBe(dark.bg);
      await page.locator('[data-theme-toggle]').first().click();
      expect((await colours(page)).bg).toBe(light.bg);
    });
  }

  test('the theme button still switches when storage is blocked', async ({ page }) => {
    await blockStorage(page);
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    const light = await colours(page);
    await page.locator('[data-theme-toggle]').first().click();
    const dark = await colours(page);
    expect(dark.bg).not.toBe(light.bg);
    expect(dark.text).not.toBe(light.text);
  });

  test('the system dark setting is honoured when nothing is stored', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
    expect((await colours(page)).dark).toBe(true);
  });
});

test.describe('fonts', () => {
  test('Geist and Geist Serif load with no failed font request', async ({ page }) => {
    const fonts: { url: string; status: number }[] = [];
    page.on('response', (r) => {
      if (/\.woff2?(\?|$)/.test(r.url())) fonts.push({ url: r.url(), status: r.status() });
    });
    await page.goto(note);
    await page.evaluate(() => document.fonts.ready);
    expect(fonts.length).toBeGreaterThan(0);
    expect(fonts.filter((f) => f.status >= 400)).toEqual([]);
    const loaded = await page.evaluate(() => ({
      body: document.fonts.check('16px Geist', 'Hello'),
      serif: document.fonts.check('16px "Geist Serif"', 'Hello'),
      family: getComputedStyle(document.body).fontFamily,
    }));
    expect(loaded.family).toMatch(/^"?Geist"?,/);
    expect(loaded.body).toBe(true);
    expect(loaded.serif).toBe(true);
  });
});

test.describe('motion', () => {
  test('with reduced motion nothing animates for longer than 300ms on the homepage', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const durations = await page.evaluate(() => document.getAnimations().map((a) => Number(a.effect?.getComputedTiming().duration ?? 0) + Number(a.effect?.getComputedTiming().delay ?? 0)));
    for (const d of durations) expect(d).toBeLessThanOrEqual(MOTION_MAX_MS);
  });

  test('without the reduced-motion setting every declared transition and animation is 300ms or shorter', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    const long = await page.evaluate((max) => {
      const toMs = (v: string) => v.split(',').map((x) => (x.trim().endsWith('ms') ? parseFloat(x) : parseFloat(x) * 1000));
      const bad: string[] = [];
      document.querySelectorAll('body, body *').forEach((el) => {
        const s = getComputedStyle(el);
        const t = Math.max(...toMs(s.transitionDuration), 0) + Math.max(...toMs(s.transitionDelay), 0);
        // A steps(1) loop is an on/off blink (the homepage caret), not movement; reduced motion switches it off.
        const blink = /^steps\(1\b/.test(s.animationTimingFunction);
        const a = s.animationName === 'none' || blink ? 0 : Math.max(...toMs(s.animationDuration), 0) + Math.max(...toMs(s.animationDelay), 0);
        if (t > max || a > max) bad.push(`${el.tagName}.${(el as HTMLElement).className} ${t}ms/${a}ms`);
      });
      return bad;
    }, MOTION_MAX_MS);
    expect(long).toEqual([]);
  });
});
