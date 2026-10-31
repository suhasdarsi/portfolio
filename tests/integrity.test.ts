import { describe, it, expect } from 'vitest';
import { existsSync } from 'fs';
import { join } from 'path';
import { readFileSync, readdirSync } from 'fs';
import {} from 'child_process';
import { parseFrontmatter } from 'astro/markdown';
import { isPublishedContent } from '../src/utils/content-routes.mjs';
import { stripDiagramSource } from '../src/utils/diagrams.mjs';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

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

  it('notes dynamic route uses [slug].astro', () => {
    expect(existsSync(join(SRC, 'pages', 'notes', '[slug].astro'))).toBe(true);
    expect(existsSync(join(SRC, 'pages', 'notes', 'slug.astro'))).toBe(false);
  });

  it('short-form card routes, components, and content are removed', () => {
    expect(existsSync(join(SRC, 'pages', 'cards'))).toBe(false);
    expect(existsSync(join(SRC, 'components', 'CardPreview.astro'))).toBe(false);
    expect(existsSync(join(SRC, 'content', 'cards'))).toBe(false);
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

describe('typography system', () => {
  it('uses the shared page heading treatment on primary portfolio pages', () => {
    const pages = [
      join(SRC, 'pages', 'index.astro'),
      join(SRC, 'pages', 'uses.astro'),
      join(SRC, 'pages', 'notes', 'index.astro'),
      join(SRC, 'pages', 'notes', '[slug].astro'),
    ];

    const globalStyles = readFileSync(join(SRC, 'styles', 'global.css'), 'utf-8');
    expect(globalStyles).toContain('.page-heading');

    for (const page of pages) {
      expect(readFileSync(page, 'utf-8'), page).toMatch(/<h1[^>]*class="[^"]*page-heading/);
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
          expect.fail(
            `Import "${imp}" in ${file.replace(SRC + '/', '')} does not resolve to a file`
          );
        }
      }
    });
  }
});

describe('build', () => {
  it('produces all expected pages', () => {
    const cache = mkdtempSync(join(tmpdir(), 'portfolio-integrity-cache-'));
    try {
      execFileSync(
        'bun',
        [
          '--eval',
          'import { build } from "astro"; await build({ cacheDir: process.argv[1] });',
          cache,
        ],
        { cwd: ROOT, stdio: 'pipe', timeout: 110_000 }
      );
    } finally {
      rmSync(cache, { recursive: true, force: true });
    }

    const blogDir = join(SRC, 'content', 'blog');
    const publishedSlugs = (directory: string) =>
      readdirSync(directory)
        .filter((file) => file.endsWith('.md'))
        .filter((file) => {
          const markdown = readFileSync(join(directory, file), 'utf-8');
          return isPublishedContent(parseFrontmatter(markdown).frontmatter);
        })
        .map((file) => file.replace(/\.md$/, ''));

    const blogSlugs = publishedSlugs(blogDir);

    const expectedPages = [
      'dist/index.html',
      'dist/notes.html',
      ...blogSlugs.map((slug) => `dist/notes/${slug}.html`),
    ];

    for (const page of expectedPages) {
      expect(existsSync(join(ROOT, page)), `${page} should exist after build`).toBe(true);
      // Canonical and og:url must be the clean URLs the sitemap lists, not the .html files.
      const html = readFileSync(join(ROOT, page), 'utf8');
      const cleanUrl = `https://suhasdarsi.com${page.slice('dist'.length).replace(/(\/index)?\.html$/, '') || '/'}`;
      expect(html).toContain(`<link rel="canonical" href="${cleanUrl}">`);
      expect(html).toContain(`<meta property="og:url" content="${cleanUrl}">`);
    }

    const searchIndex = JSON.parse(readFileSync(join(ROOT, 'dist/search.json'), 'utf8'));
    for (const entry of searchIndex) {
      const markdown = readFileSync(join(blogDir, `${entry.id}.md`), 'utf8');
      const body = markdown.replace(/^---[\s\S]*?---\s*/, '');
      expect(entry.body.trim()).toBe(stripDiagramSource(body).trim());
      expect(entry.body).not.toContain('```mermaid');
    }

    const css =
      readAllFiles(join(ROOT, 'dist'))
        .filter((file) => file.endsWith('.css'))
        .map((file) => readFileSync(file, 'utf8'))
        .join('') +
      readFileSync(join(ROOT, 'dist/404.html'), 'utf8') +
      // Small page stylesheets are inlined by Astro, so include a built note page.
      readFileSync(join(ROOT, 'dist/notes/ai-as-the-ultimate-hub.html'), 'utf8');
    expect(css).toContain('.copy-code-button{');
    expect(css).not.toMatch(/\.copy-code-button\[data-astro-/);
    // 404 results are created at runtime, so they rely on the global (unscoped) row style.
    expect(readFileSync(join(SRC, 'pages/404.astro'), 'utf8')).toContain(
      "link.className = 'row error-search-result'"
    );
    expect(css).toMatch(/\.row\{/);
    expect(css).not.toMatch(/\.row\[data-astro-/);
  }, 15_000);
});

describe('content publication graph', () => {
  it('exposes centralized long-form publication APIs only', () => {
    const contentUtil = readFileSync(join(SRC, 'utils', 'content.ts'), 'utf-8');

    expect(contentUtil).toContain('getPublishedBlogEntries');
    expect(contentUtil).toContain('getPublishedBlogEntriesByDate');
    expect(contentUtil).not.toContain('CardEntry');
    expect(contentUtil).not.toContain('getPublishedCardEntries');
    expect(contentUtil).not.toContain("getCollection('cards')");
  });

  it('note detail pages expose sharing without recommendation or sequence panels', () => {
    const noteDetail = readFileSync(join(SRC, 'pages', 'notes', '[slug].astro'), 'utf-8');
    const notesIndex = readFileSync(join(SRC, 'pages', 'notes', 'index.astro'), 'utf-8');

    expect(noteDetail).toContain('class="article-share"');
    expect(noteDetail).toContain('Share on X');
    expect(noteDetail).toContain('Share on LinkedIn');
    expect(noteDetail).toContain('Share on Bluesky');
    expect(noteDetail).not.toContain('source-cards');
    expect(noteDetail).not.toContain('<Backlinks');
    expect(noteDetail).not.toContain('note-nav');
    expect(noteDetail).not.toContain('article-description');
    expect(notesIndex).toContain('getPublishedBlogEntriesByDate');
    expect(noteDetail).not.toContain('!p.data.draft');
  });

  it('practical published content consumers use centralized helpers', () => {
    const consumers = [
      join(SRC, 'pages', 'index.astro'),
      join(SRC, 'pages', 'notes', '[slug].astro'),
      join(SRC, 'pages', 'notes', 'index.astro'),
      join(SRC, 'pages', 'rss.xml.ts'),
    ];

    for (const file of consumers) {
      const content = readFileSync(file, 'utf-8');
      expect(content, file).not.toMatch(/getCollection\(['"]blog['"]\)/);
      expect(content, file).not.toMatch(/\.filter\(\([^)]*\) => isPublished\(/);
    }
  });

  it('uses centralized publication policy for search too', () => {
    const searchUtil = readFileSync(join(SRC, 'utils', 'search.ts'), 'utf-8');

    expect(searchUtil).toContain('getPublishedBlogEntriesByDate');
    expect(searchUtil).not.toContain('/cards/');
    expect(searchUtil).not.toContain("getCollection('blog')");
  });
});
