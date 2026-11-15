// The font checker. It opens every page the site links to, on desktop and on a phone, and checks that every piece of
// visible text is set as one of the roles in type-roles.ts (typeface, size, weight, line height, letter spacing).
// Run it alone with `bun run fonts`; it also runs with the rest of the browser tests.
import { test, expect } from '@playwright/test';
import { collectText, crawl } from './type-audit';
import { check, roles } from './type-roles';

test('every piece of text on every page is set as one of the type roles', async ({ page }) => {
  test.setTimeout(180_000);
  const phone = (page.viewportSize()?.width ?? 0) < 760;
  const pages = await crawl(page);
  expect(pages.length, 'pages found by following links from home').toBeGreaterThan(20);

  // One line per distinct problem, with how many pages have it and one place to look.
  const found = new Map<string, { pages: Set<string>; example: string }>();
  for (const path of pages) {
    await page.goto(path);
    for (const text of await collectText(page)) {
      const bad = check(text, phone);
      if (!bad) continue;
      const key = `${text.where}: nearest role "${bad.role.name}", but ${bad.wrong.join('; ')}`;
      const entry = found.get(key) ?? { pages: new Set<string>(), example: `${path} "${text.text}"` };
      entry.pages.add(path);
      found.set(key, entry);
    }
  }
  const report = [...found].sort((a, b) => b[1].pages.size - a[1].pages.size).map(([problem, { pages: on, example }]) => `${problem}\n    on ${on.size} page(s), e.g. ${example}`);
  expect(report, `Text that fits no type role (${phone ? 'phone' : 'desktop'}, ${pages.length} pages checked).\nRoles: ${roles.map((role) => role.name).join(', ')}.\nFix the style, or mark a drawing with data-type-drawing.`).toEqual([]);
});

test('the checker flags text that is off the type system', () => {
  const interfaceText = { family: 'Geist', size: 15, weight: 400, leading: 1.5, tracking: 0, upper: false, italic: false, code: false, where: 'p', text: 'x' };
  expect(check(interfaceText, false)).toBeUndefined();
  expect(check({ ...interfaceText, size: 13 }, false)?.wrong.join()).toContain('size 13px');
  expect(check({ ...interfaceText, size: 22, weight: 600, leading: 1.3 }, false)?.wrong.join()).toContain('letter spacing');
  expect(check({ ...interfaceText, family: 'Geist Serif' }, false)?.wrong.length).toBeGreaterThan(0);
  // Reading text is 22px on desktop and 18px on a phone, not the other way round.
  const reading = { ...interfaceText, family: 'Geist Serif', size: 18, leading: 1.6 };
  expect(check(reading, true)).toBeUndefined();
  expect(check(reading, false)?.wrong.join()).toContain('size 18px');
});
