import { describe, it, expect } from 'vitest';
import { existsSync } from 'fs';
import { join } from 'path';
import { readFileSync, readdirSync } from 'fs';
import { execSync } from 'child_process';
import { parseFrontmatter } from 'astro/markdown';
import { isPublishedContent } from '../src/utils/content-routes.mjs';

const ROOT = join(__dirname, '..');
const SRC = join(ROOT, 'src');

function readAllFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== 'dist') {
        results.push(...readAllFiles(full));
      }
    } else {
      results.push(full);
    }
  }
  return results;
}

function extractImports(content: string): string[] {
  const imports: string[] = [];
  const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }
  return imports;
}

describe('file structure', () => {
  it('BlogLayout.astro exists with correct name', () => {
    expect(existsSync(join(SRC, 'layouts', 'BlogLayout.astro'))).toBe(true);
  });

  it('Search.astro was removed (functionality moved to Header.astro)', () => {
    expect(existsSync(join(SRC, 'components', 'Search.astro'))).toBe(false);
  });

  it('Backlinks.astro exists with correct name', () => {
    expect(existsSync(join(SRC, 'components', 'Backlinks.astro'))).toBe(true);
  });

  it('TableOfContents.astro exists with correct name', () => {
    expect(existsSync(join(SRC, 'components', 'TableOfContents.astro'))).toBe(true);
  });

  it('notes dynamic route uses [slug].astro', () => {
    expect(existsSync(join(SRC, 'pages', 'notes', '[slug].astro'))).toBe(true);
    expect(existsSync(join(SRC, 'pages', 'notes', 'slug.astro'))).toBe(false);
  });


  it('no files with _1 suffix exist in src/', () => {
    const allFiles = readAllFiles(SRC);
    const badFiles = allFiles.filter((f) => {
      const basename = f.split('/').pop() || '';
      return basename.includes('_1.');
    });
    if (badFiles.length > 0) {
      expect.fail(`Found files with _1 suffix: ${badFiles.join(', ')}`);
    }
  });
});

describe('import paths resolve to real files', () => {
  const astroFiles = readAllFiles(SRC).filter((f) => f.endsWith('.astro'));

  for (const file of astroFiles) {
    it(`${file.replace(SRC + '/', '')} has valid imports`, () => {
      const content = readFileSync(file, 'utf-8');
      const imports = extractImports(content);

      for (const imp of imports) {
        // Skip package imports
        if (!imp.startsWith('.') && !imp.startsWith('/')) continue;

        const dir = file.substring(0, file.lastIndexOf('/'));
        let resolved = join(dir, imp);

        // Try common extensions
        const candidates = [
          resolved,
          resolved + '.astro',
          resolved + '.ts',
          resolved + '.js',
          join(resolved, 'index.astro'),
          join(resolved, 'index.ts'),
          join(resolved, 'index.js'),
        ];

        const found = candidates.some((c) => existsSync(c));
        if (!found) {
          expect.fail(`Import "${imp}" in ${file.replace(SRC + '/', '')} does not resolve to a file`);
        }
      }
    });
  }
});

describe('build', () => {
  it('produces all expected pages', () => {
    execSync('bun run build', { cwd: ROOT, stdio: 'pipe' });

    const blogDir = join(SRC, 'content', 'blog');
    const publishedSlugs = (directory: string) => readdirSync(directory)
      .filter((file) => file.endsWith('.md'))
      .filter((file) => {
        const markdown = readFileSync(join(directory, file), 'utf-8');
        return isPublishedContent(parseFrontmatter(markdown).frontmatter);
      })
      .map((file) => file.replace(/\.md$/, ''));

    const blogSlugs = publishedSlugs(blogDir);

    const cardDir = join(SRC, 'content', 'cards');
    const cardSlugs = publishedSlugs(cardDir);

    const expectedPages = [
      'dist/index.html',
      'dist/notes/index.html',
      'dist/cards/index.html',
      ...blogSlugs.map((slug) => `dist/notes/${slug}/index.html`),
      ...cardSlugs.map((slug) => `dist/cards/${slug}/index.html`),
    ];

    for (const page of expectedPages) {
      expect(existsSync(join(ROOT, page)), `${page} should exist after build`).toBe(true);
    }
  }, 15_000);
});

describe('content publication graph', () => {
  it('exposes centralized published collection and validation APIs', () => {
    const contentUtil = readFileSync(join(SRC, 'utils', 'content.ts'), 'utf-8');

    expect(contentUtil).toContain('getPublishedBlogEntries');
    expect(contentUtil).toContain('getPublishedBlogEntriesByDate');
    expect(contentUtil).toContain('getPublishedCardEntries');
    expect(contentUtil).toContain('getPublishedCardEntriesByOrder');
    expect(contentUtil).toContain('validatePublishedCardReferences');
    expect(contentUtil).toContain('Invalid published content references');
    expect(contentUtil).toContain('related entry');
    expect(contentUtil).toContain('source');
    expect(contentUtil).toContain('existing published card');
    expect(contentUtil).toContain('existing published blog note');
  });

  it('note detail navigation uses the same published date ordering as the notes index', () => {
    const noteDetail = readFileSync(join(SRC, 'pages', 'notes', '[slug].astro'), 'utf-8');
    const notesIndex = readFileSync(join(SRC, 'pages', 'notes', 'index.astro'), 'utf-8');

    expect(noteDetail).toContain('getPublishedBlogEntriesByDate');
    expect(notesIndex).toContain('getPublishedBlogEntriesByDate');
    expect(noteDetail).not.toContain('!p.data.draft');
  });

  it('practical published content consumers use centralized helpers', () => {
    const consumers = [
      join(SRC, 'components', 'Backlinks.astro'),
      join(SRC, 'pages', 'cards', '[slug].astro'),
      join(SRC, 'pages', 'cards', 'index.astro'),
      join(SRC, 'pages', 'index.astro'),
      join(SRC, 'pages', 'notes', '[slug].astro'),
      join(SRC, 'pages', 'notes', 'index.astro'),
      join(SRC, 'pages', 'rss.xml.ts'),
    ];

    for (const file of consumers) {
      const content = readFileSync(file, 'utf-8');
      expect(content, file).not.toMatch(/getCollection\(['"](?:blog|cards)['"]\)/);
      expect(content, file).not.toMatch(/\.filter\(\([^)]*\) => isPublished\(/);
    }
  });

  it('uses centralized publication policy for search too', () => {
    const searchUtil = readFileSync(join(SRC, 'utils', 'search.ts'), 'utf-8');

    expect(searchUtil).toContain('getPublishedCardEntries');
    expect(searchUtil).not.toContain("getCollection('cards')");
  });
});
