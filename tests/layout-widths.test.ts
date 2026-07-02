import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..');
const SRC = join(ROOT, 'src');

function readFile(path: string): string {
  return readFileSync(join(SRC, path), 'utf-8');
}

describe('layout width consistency', () => {
  it('BlogLayout main uses max-w-3xl with horizontal padding on mobile', () => {
    const content = readFile('layouts/BlogLayout.astro');
    expect(content).toContain('max-w-3xl');
    expect(content).toContain('mx-auto');
    expect(content).toContain('px-4');
  });

  it('BlogLayout main has vertical padding for breathing room', () => {
    const content = readFile('layouts/BlogLayout.astro');
    expect(content).toMatch(/pt-\d+/);
    expect(content).toMatch(/pb-\d+/);
  });

  it('Header inner uses --max-width-shell with horizontal padding', () => {
    const content = readFile('components/Header.astro');
    expect(content).toContain('max-width: var(--max-width-shell)');
    expect(content).toMatch(/padding:\s*0\s+1rem/);
    expect(content).not.toMatch(/padding:\s*0;/);
  });

  it('Footer inner uses 48rem max-width with horizontal padding', () => {
    const content = readFile('components/Footer.astro');
    expect(content).toContain('max-width: 48rem');
    expect(content).toMatch(/padding:\s*2rem\s+1rem/);
  });

  it('--max-width-shell is 48rem matching max-w-3xl', () => {
    const content = readFile('styles/global.css');
    expect(content).toContain('--max-width-shell: 48rem');
  });

  it('all pages use BlogLayout', () => {
    const pages = [
      'pages/index.astro',
      'pages/notes/index.astro',
      'pages/uses.astro',
      'pages/404.astro',
      'pages/notes/[slug].astro',
    ];

    for (const page of pages) {
      const content = readFile(page);
      expect(content).toContain('BlogLayout');
    }
  });
});

describe('prose width consistency', () => {
  it('prose-custom has no max-width constraint (fills container)', () => {
    const content = readFile('styles/global.css');
    const proseMatch = content.match(/\.prose-custom\s*\{[^}]+\}/);
    expect(proseMatch).toBeTruthy();
    expect(proseMatch![0]).not.toContain('max-width');
  });

  it('prose-custom has no margin-inline (no centering override)', () => {
    const content = readFile('styles/global.css');
    const proseMatch = content.match(/\.prose-custom\s*\{[^}]+\}/);
    expect(proseMatch).toBeTruthy();
    expect(proseMatch![0]).not.toContain('margin-inline');
  });
});
