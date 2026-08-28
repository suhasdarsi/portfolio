import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { searchDocuments } from '../src/utils/client-search';

const read = (path: string) => readFileSync(path, 'utf8');

describe('search architecture', () => {
  it('uses a static JSON endpoint instead of embedded page data', () => {
    expect(existsSync('src/pages/search.json.ts')).toBe(true);
    expect(existsSync('src/components/SearchData.astro')).toBe(false);
    expect(read('src/components/Header.astro')).not.toContain('SearchData');
    expect(read('src/components/Header.astro')).not.toContain('id="search-data"');
  });

  it('uses local ranked search without a runtime package request', () => {
    const header = read('src/components/Header.astro');
    const notFound = read('src/pages/404.astro');

    expect(header).toContain("fetch('/search.json')");
    expect(notFound).toContain("fetch('/search.json')");
    expect(header).toContain("import { searchDocuments } from '../utils/client-search'");
    expect(notFound).toContain("import { searchDocuments } from '../utils/client-search'");
    expect(header).not.toContain("import('fuse.js')");
    expect(notFound).not.toContain("import('fuse.js')");
  });

  it('ranks title matches ahead of body-only matches', () => {
    const results = searchDocuments([
      { title: 'A different article', body: 'Network risk appears in the body.' },
      { title: 'Network Risk', body: 'A direct title match.' },
    ], 'network risk');

    expect(results.map((result) => result.title)).toEqual(['Network Risk', 'A different article']);
  });
});
