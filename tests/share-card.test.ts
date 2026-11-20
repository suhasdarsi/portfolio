import { expect, test } from 'vitest';
import { fitTitle, shareCardSvg, TITLE, titleWidth } from '../src/notes/share-card';

const titles = [
  'Hubs',
  'AI as the Ultimate Hub',
  'Designing Resilient AI Systems Through Network Science',
  'What Happens When Every Agent in the Organization Quietly Routes Its Requests Through a Single Vendor Gateway Nobody Audits',
  'Supercalifragilisticexpialidociousnessnessnessness tokens',
];

test.each(titles)('the title "%s" fits the share card box in at most three lines', (title) => {
  const { size, lines } = fitTitle(title);
  expect(size).toBeGreaterThanOrEqual(TITLE.smallest);
  expect(size).toBeLessThanOrEqual(TITLE.largest);
  expect(lines.length).toBeGreaterThan(0);
  expect(lines.length).toBeLessThanOrEqual(TITLE.maxLines);
  for (const line of lines) expect(titleWidth(line, size)).toBeLessThanOrEqual(TITLE.width);
});

test('a title that fits is kept whole, one that does not ends with an ellipsis', () => {
  expect(fitTitle('Designing Resilient AI Systems Through Network Science').lines.join(' ')).toBe('Designing Resilient AI Systems Through Network Science');
  expect(fitTitle(titles[3]).lines.at(-1)).toMatch(/\S…$/);
});

test('the share card draws its text as outlines, so it does not depend on fonts installed on the build machine', () => {
  const svg = shareCardSvg({ title: 'AI as the Ultimate Hub', kicker: 'Note · 3 min read', figure: { markup: '', viewBox: [0, 0, 320, 220] }, author: 'Suhas Darsi', host: 'suhasdarsi.com' });
  expect(svg).toMatch(/^<svg [^>]*width="1200" height="630"/);
  expect(svg).not.toMatch(/<text|font-family/);
  expect((svg.match(/<path /g) ?? []).length).toBeGreaterThan(40);
});
