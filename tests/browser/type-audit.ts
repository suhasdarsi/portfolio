// Collects how every piece of visible text on a page is set, and crawls the site by its own links.
// Used by fonts.spec.ts, which checks each piece against the roles in type-roles.ts.
import type { Page } from '@playwright/test';

export interface TextStyle {
  family: string;
  /** Pixels. */
  size: number;
  weight: number;
  /** Line height as a multiple of the size; 0 when the browser default is used. */
  leading: number;
  /** Letter spacing in em. */
  tracking: number;
  upper: boolean;
  italic: boolean;
  /** Text inside <pre> or <code>. */
  code: boolean;
  /** A short CSS-like description of the element, to find it again. */
  where: string;
  text: string;
}

export async function collectText(page: Page): Promise<TextStyle[]> {
  return page.evaluate(() => {
    const out: TextStyle[] = [];
    const seen = new Set<Element>();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const el = node.parentElement;
      const text = node.textContent?.trim();
      if (!el || !text || seen.has(el)) continue;
      // Drawings of other things (app thumbnails, the Wallet card preview) are pictures, not the site's own type.
      if (el.closest('script, style, noscript, svg, [data-type-drawing]')) continue;
      if (!el.getClientRects().length) continue;
      const style = getComputedStyle(el);
      if (style.visibility === 'hidden') continue;
      seen.add(el);
      const size = parseFloat(style.fontSize);
      const describe = (e: Element) => e.tagName.toLowerCase() + (e.id ? `#${e.id}` : '') + (typeof e.className === 'string' && e.className.trim() ? `.${e.className.trim().split(/\s+/).slice(0, 2).join('.')}` : '');
      out.push({
        family: style.fontFamily.split(',')[0].replace(/["']/g, '').trim(),
        size: Math.round(size * 100) / 100,
        weight: Number(style.fontWeight),
        leading: style.lineHeight === 'normal' ? 0 : Math.round((parseFloat(style.lineHeight) / size) * 100) / 100,
        tracking: style.letterSpacing === 'normal' ? 0 : Math.round((parseFloat(style.letterSpacing) / size) * 1000) / 1000,
        upper: style.textTransform === 'uppercase',
        italic: style.fontStyle === 'italic',
        code: Boolean(el.closest('pre, code, kbd')),
        where: [el.parentElement, el].flatMap((e) => (e ? [describe(e)] : [])).join(' > '),
        text: text.slice(0, 40),
      });
    }
    return out;
  });
}

/** Every page reachable from the home page by links, as paths. */
export async function crawl(page: Page, limit = 300): Promise<string[]> {
  const queue = ['/'];
  const found = new Set(queue);
  const pages: string[] = [];
  while (queue.length && pages.length < limit) {
    const path = queue.shift()!;
    const response = await page.goto(path);
    if (!response || !(response.headers()['content-type'] ?? '').includes('text/html')) continue;
    pages.push(path);
    const links = await page.evaluate(() => [...document.querySelectorAll<HTMLAnchorElement>('a[href]')]
      .filter((a) => a.origin === location.origin && !a.hasAttribute('download'))
      .map((a) => a.pathname.replace(/\/$/, '') || '/'));
    for (const link of links) {
      if (found.has(link) || /\.[a-z0-9]+$/i.test(link)) continue;
      found.add(link);
      queue.push(link);
    }
  }
  return pages;
}
