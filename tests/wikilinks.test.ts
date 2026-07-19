import { mkdtempSync, mkdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { buildWikilinkIndex, extractWikilinkTargets, resolveWikilink } from '../src/utils/wikilinks.mjs';

const tempDirs: string[] = [];

function makeFixture() {
  const root = mkdtempSync(join(tmpdir(), 'wikilinks-'));
  tempDirs.push(root);
  const blog = join(root, 'blog');
  const cards = join(root, 'cards');
  mkdirSync(blog, { recursive: true });
  mkdirSync(cards, { recursive: true });

  return {
    root,
    blog,
    cards,
    collections: [
      { name: 'blog', directory: blog, routePrefix: '/notes/' },
      { name: 'cards', directory: cards, routePrefix: '/cards/' },
    ],
  };
}

function writeMarkdown(file: string, frontmatter: string, body = '') {
  writeFileSync(file, `---\n${frontmatter.trim()}\n---\n\n${body}`);
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe('native wikilinks', () => {
  it('resolves note filenames, titles, and headings to public routes', () => {
    expect(resolveWikilink('ai-as-the-ultimate-hub')).toMatchObject({
      collection: 'blog',
      id: 'ai-as-the-ultimate-hub',
      href: '/notes/ai-as-the-ultimate-hub',
    });
    expect(resolveWikilink('AI as the Ultimate Hub#The Implications')?.href).toBe(
      '/notes/ai-as-the-ultimate-hub#the-implications'
    );
    expect(resolveWikilink('Agent permissions should expire')).toMatchObject({
      collection: 'cards',
      href: '/cards/agent-permissions-should-expire',
    });
  });

  it('extracts linked notes without treating embeds as backlinks', () => {
    const markdown =
      'See [[ai-as-the-ultimate-hub|AI as the Ultimate Hub]] and [[small-world-networks-and-hubs#The Power-Law Distribution]]. ![[diagram.png]]';

    expect(extractWikilinkTargets(markdown)).toEqual([
      'ai-as-the-ultimate-hub',
      'small-world-networks-and-hubs#The Power-Law Distribution',
    ]);
  });

  it('does not resolve missing notes', () => {
    expect(resolveWikilink('a-note-that-does-not-exist')).toBeUndefined();
  });

  it('indexes only published documents using parsed frontmatter', () => {
    const fixture = makeFixture();
    writeMarkdown(join(fixture.blog, 'published.md'), 'title: "Published Note"');
    writeMarkdown(join(fixture.blog, 'draft.md'), 'title: "Draft Note"\ndraft: true');
    writeMarkdown(join(fixture.cards, 'hidden.md'), 'title: "Hidden Card"\npublished: false');

    const index = buildWikilinkIndex(fixture.collections);

    expect(resolveWikilink('Published Note', index)?.href).toBe('/notes/published');
    expect(resolveWikilink('Draft Note', index)).toBeUndefined();
    expect(resolveWikilink('Hidden Card', index)).toBeUndefined();
    expect(new Set([...index.values()].map((entry) => entry.id))).toEqual(new Set(['published']));
  });

  it('does not validate links from draft or unpublished source documents', () => {
    const fixture = makeFixture();
    writeMarkdown(join(fixture.blog, 'published.md'), 'title: "Published Note"');
    writeMarkdown(join(fixture.blog, 'draft.md'), 'title: "Draft Note"\ndraft: true', '[[missing-note]]');
    writeMarkdown(
      join(fixture.blog, 'unpublished.md'),
      'title: "Unpublished Note"\npublished: false',
      '[[missing-note]]'
    );

    expect(() => buildWikilinkIndex(fixture.collections)).not.toThrow();
  });

  it('prevents public links to unpublished targets', () => {
    const fixture = makeFixture();
    writeMarkdown(join(fixture.blog, 'source.md'), 'title: "Source Note"', '[[Target Note]]');
    writeMarkdown(join(fixture.blog, 'target.md'), 'title: "Target Note"\ndraft: true');

    expect(() => buildWikilinkIndex(fixture.collections)).toThrow(
      'linked note "Target Note" does not exist or is unpublished'
    );
  });

  it('rebuilds from current files instead of stale module-level cache', () => {
    const fixture = makeFixture();
    const original = join(fixture.blog, 'original.md');
    const renamed = join(fixture.blog, 'renamed.md');
    writeMarkdown(original, 'title: "Original Title"');

    const first = buildWikilinkIndex(fixture.collections);
    expect(resolveWikilink('Original Title', first)?.href).toBe('/notes/original');

    renameSync(original, renamed);
    writeMarkdown(renamed, 'title: "Renamed Title"');

    const second = buildWikilinkIndex(fixture.collections);
    expect(resolveWikilink('Original Title', second)).toBeUndefined();
    expect(resolveWikilink('Renamed Title', second)?.href).toBe('/notes/renamed');
  });
});
