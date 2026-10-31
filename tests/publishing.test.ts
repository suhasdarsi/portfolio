import { it, expect } from 'vitest';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';

it('publishes due drafts with revisions, preview images, and sitemap entries while excluding future drafts', () => {
  const work = mkdtempSync(join(tmpdir(), 'portfolio-publishing-'));
  const out = join(work, 'dist');
  const prefix = `publishing-fixture-${Date.now()}`;
  const due = `${prefix}-due`;
  const future = `${prefix}-future`;
  const paths = [due, future].map((id) => join('src/content/blog', `${id}.md`));
  try {
    writeFileSync(
      paths[0],
      `---\ntitle: "Publishing fixture due"\ndescription: "Test fixture"\npubDate: "2020-01-01"\ndraft: true\ndueDate: "2020-01-01"\nrevisions:\n  - date: "2020-01-03"\n    summary: "Added a containment example."\n  - date: "2020-01-02"\n    summary: "Clarified the introduction."\n---\n\nTest body.\n`
    );
    writeFileSync(
      paths[1],
      `---\ntitle: "Publishing fixture future"\ndescription: "Test fixture"\npubDate: "2999-01-01"\ndraft: true\ndueDate: "2999-01-01"\n---\n\nFuture body.\n`
    );
    execFileSync(
      'bun',
      [
        '--eval',
        'import { build } from "astro"; await build({ outDir: process.argv[1], cacheDir: process.argv[2] });',
        out,
        join(work, 'cache'),
      ],
      { stdio: 'pipe', timeout: 110_000 }
    );
    const article = readFileSync(join(out, 'notes', `${due}.html`), 'utf8');
    const metadata = JSON.parse(
      article.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)![1]
    );
    expect(metadata.author).toEqual({
      '@type': 'Person',
      name: 'Suhas Darsi',
      url: 'https://suhasdarsi.com/about',
    });
    expect(metadata.image).toBe(`https://suhasdarsi.com/og/${due}.png`);
    expect(metadata.mainEntityOfPage['@id']).toBe(`https://suhasdarsi.com/notes/${due}`);
    expect(article).toContain('Revision history');
    expect(article).toContain('Added a containment example.');
    expect(article).toContain('"dateModified":"2020-01-03T00:00:00.000Z"');
    expect(existsSync(join(out, 'og', `${due}.png`))).toBe(true);
    expect(existsSync(join(out, 'notes', `${future}.html`))).toBe(false);
    expect(existsSync(join(out, 'og', `${future}.png`))).toBe(false);
    const sitemap = readFileSync(join(out, 'sitemap-0.xml'), 'utf8');
    expect(sitemap).toContain(`/notes/${due}`);
    expect(sitemap).not.toContain(future);
    const search = readFileSync(join(out, 'search.json'), 'utf8');
    expect(search).toContain(due);
    expect(search).not.toContain(future);
  } finally {
    paths.forEach((path) => rmSync(path, { force: true }));
    rmSync(work, { recursive: true, force: true });
  }
}, 120_000);
