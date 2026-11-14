import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { stripDiagramSource } from '../src/notes/diagrams.mjs';
import { noteFiles } from './note-files';

const ROOT = join(__dirname, '..');

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

    const notes = noteFiles().filter((note) => !note.draft);
    const published = notes.map((note) => note.slug);

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
      const markdown = notes.find((note) => `/notes/${note.slug}` === entry.href)!.body;
      expect(entry.body.trim()).toBe(stripDiagramSource(markdown).trim());
      expect(entry.body).not.toContain('```mermaid');
    }
  }, 120_000);
});
