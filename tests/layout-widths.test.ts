import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..');
const SRC = join(ROOT, 'src');

function readFile(path: string): string {
  return readFileSync(join(SRC, path), 'utf-8');
}

describe('layout consistency', () => {
  it('SiteLayout is the shared shell with the site header and footer', () => {
    const content = readFile('layouts/SiteLayout.astro');
    expect(content).toContain('SiteHeader');
    expect(content).toContain('SiteFooter');
    expect(content).toContain('main-content');
  });

  it('site stylesheet keeps one content column and mobile gutters', () => {
    const content = readFile('styles/site.css');
    expect(content).toMatch(/\.page \{ max-width:920px; margin:0 auto; padding-left:max\(24px/);
    expect(content).toContain('@media (max-width:760px)');
  });

  it('all main-site pages use SiteLayout', () => {
    const pages = [
      'pages/index.astro',
      'pages/notes/index.astro',
      'pages/uses.astro',
      'pages/about.astro',
      'pages/404.astro',
      'pages/pocket-card.astro',
      'pages/swatchbook.astro',
      'pages/notes/[slug].astro',
    ];

    for (const page of pages) {
      const content = readFile(page);
      expect(content, page).toContain('SiteLayout');
      expect(content, page).not.toContain('BlogLayout');
    }
  });

  it('toolshed pages use the Toolshed layout', () => {
    expect(readFile('layouts/ToolshedLayout.astro')).toContain('toolshed/Header');
  });
});
