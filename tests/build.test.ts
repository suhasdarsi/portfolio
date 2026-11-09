import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseFrontmatter } from 'astro/markdown';
import { isPublished } from '../src/notes/publishing.mjs';
import { stripDiagramSource } from '../src/notes/diagrams.mjs';

const ROOT = join(__dirname, '..');
const BLOG = join(ROOT, 'src/content/blog');

describe('build', () => {
  it('produces every page with clean canonical URLs, and indexes note text for search', () => {
    const cache = mkdtempSync(join(tmpdir(), 'portfolio-build-cache-'));
    try {
      execFileSync('bun', ['--eval', 'import { build } from "astro"; await build({ cacheDir: process.argv[1] });', cache], {
        cwd: ROOT,
        stdio: 'pipe',
        timeout: 110_000,
      });
    } finally {
      rmSync(cache, { recursive: true, force: true });
    }

    const published = readdirSync(BLOG)
      .filter((file) => file.endsWith('.md'))
      .filter((file) => isPublished(parseFrontmatter(readFileSync(join(BLOG, file), 'utf-8')).frontmatter))
      .map((file) => file.replace(/\.md$/, ''));

    for (const page of ['dist/index.html', 'dist/notes.html', ...published.map((slug) => `dist/notes/${slug}.html`)]) {
      expect(existsSync(join(ROOT, page)), `${page} should exist after build`).toBe(true);
      // Canonical and og:url must be the clean URLs the sitemap lists, not the .html files.
      const html = readFileSync(join(ROOT, page), 'utf8');
      const cleanUrl = `https://suhasdarsi.com${page.slice('dist'.length).replace(/(\/index)?\.html$/, '') || '/'}`;
      expect(html).toContain(`<link rel="canonical" href="${cleanUrl}">`);
      expect(html).toContain(`<meta property="og:url" content="${cleanUrl}">`);
    }

    const searchIndex: { kind: string; title: string; meta: string; href: string; description: string; body: string }[] = JSON.parse(readFileSync(join(ROOT, 'dist/search.json'), 'utf8'));
    expect(searchIndex.map((entry) => entry.href).sort()).toEqual(published.map((slug) => `/notes/${slug}`).sort());
    for (const entry of searchIndex) {
      expect(entry).toMatchObject({ kind: 'Note', title: expect.any(String), description: expect.any(String) });
      expect(entry.meta).toMatch(/^[A-Z][a-z]{2} \d{1,2}$/);
      const markdown = readFileSync(join(BLOG, `${entry.href.replace('/notes/', '')}.md`), 'utf8');
      expect(entry.body.trim()).toBe(stripDiagramSource(markdown.replace(/^---[\s\S]*?---\s*/, '')).trim());
      expect(entry.body).not.toContain('```mermaid');
    }
  }, 120_000);
});
