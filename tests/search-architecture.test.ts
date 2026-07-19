import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');

describe('search architecture', () => {
  it('uses a static JSON endpoint instead of embedded page data', () => {
    expect(existsSync('src/pages/search.json.ts')).toBe(true);
    expect(existsSync('src/components/SearchData.astro')).toBe(false);
    expect(read('src/components/Header.astro')).not.toContain('SearchData');
    expect(read('src/components/Header.astro')).not.toContain('id="search-data"');
  });

  it('loads Fuse lazily from search interactions', () => {
    const header = read('src/components/Header.astro');
    const notFound = read('src/pages/404.astro');

    expect(header).not.toContain("import Fuse from 'fuse.js'");
    expect(notFound).not.toContain("import Fuse from 'fuse.js'");
    expect(header).not.toContain('const fuse = new Fuse');
    expect(notFound).not.toContain('const fuse = new Fuse');
    expect(header).toContain("fetch('/search.json')");
    expect(header).toContain("import('fuse.js')");
    expect(notFound).toContain("fetch('/search.json')");
    expect(notFound).toContain("import('fuse.js')");
  });
});
