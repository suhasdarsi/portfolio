import { describe, it, expect } from 'vitest';
import { existsSync } from 'fs';
import { join } from 'path';
import { readFileSync, readdirSync } from 'fs';
import { execSync } from 'child_process';

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

  it('Search.astro exists with correct name', () => {
    expect(existsSync(join(SRC, 'components', 'Search.astro'))).toBe(true);
  });

  it('Backlinks.astro exists with correct name', () => {
    expect(existsSync(join(SRC, 'components', 'Backlinks.astro'))).toBe(true);
  });

  it('TableOfContents.astro exists with correct name', () => {
    expect(existsSync(join(SRC, 'components', 'TableOfContents.astro'))).toBe(true);
  });

  it('blog dynamic route uses [slug].astro', () => {
    expect(existsSync(join(SRC, 'pages', 'blog', '[slug].astro'))).toBe(true);
    expect(existsSync(join(SRC, 'pages', 'blog', 'slug.astro'))).toBe(false);
  });

  it('tags dynamic route uses [tag].astro', () => {
    expect(existsSync(join(SRC, 'pages', 'tags', '[tag].astro'))).toBe(true);
    expect(existsSync(join(SRC, 'pages', 'tags', 'tag.astro'))).toBe(false);
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

    const expectedPages = [
      'dist/index.html',
      'dist/blog/index.html',
      'dist/tags/index.html',
      'dist/blog/ai-as-the-ultimate-hub/index.html',
    ];

    for (const page of expectedPages) {
      expect(existsSync(join(ROOT, page)), `${page} should exist after build`).toBe(true);
    }
  });
});
