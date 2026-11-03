import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { searchDocuments } from '../src/utils/client-search';

const read = (path: string) => readFileSync(path, 'utf8');

describe('search architecture', () => {
  it('uses a static JSON endpoint instead of embedded page data', () => {
    expect(existsSync('src/pages/search.json.ts')).toBe(true);
    expect(existsSync('src/components/SearchData.astro')).toBe(false);
  });

  it('shares one search loader instead of triplicating fetch logic', () => {
    const notFound = read('src/pages/404.astro');
    const overlay = read('src/components/site/SearchOverlay.astro');
    const loader = read('src/utils/search-loader.ts');

    expect(loader).toContain("'/search.json'");
    for (const consumer of [notFound, overlay]) {
      expect(consumer).toContain('createSearchLoader');
      expect(consumer).toContain('utils/search-loader');
      expect(consumer).not.toContain("fetch('/search.json')");
    }
  });

  it('debounces keystroke search inputs', () => {
    const notFound = read('src/pages/404.astro');
    const loader = read('src/utils/search-loader.ts');

    expect(loader).toContain('debounce');
    expect(notFound).toContain('debounce');
    expect(read('src/components/site/SearchOverlay.astro')).toContain('debounce');
  });

  it('ranks title matches ahead of body-only matches', () => {
    const results = searchDocuments([
      { title: 'A different article', body: 'Network risk appears in the body.' },
      { title: 'Network Risk', body: 'A direct title match.' },
    ], 'network risk');

    expect(results.map((result) => result.title)).toEqual(['Network Risk', 'A different article']);
  });
});
