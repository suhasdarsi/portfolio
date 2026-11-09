import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { buildWikilinkIndex, extractWikilinkTargets, resolveWikilink } from '../src/notes/wikilinks.mjs';

const tempDirs: string[] = [];

function makeFixture() {
  const blog = mkdtempSync(join(tmpdir(), 'wikilinks-'));
  tempDirs.push(blog);
  return { blog };
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
      id: 'ai-as-the-ultimate-hub',
      href: '/notes/ai-as-the-ultimate-hub',
    });
    expect(resolveWikilink('AI as the Ultimate Hub#The Implications')?.href).toBe(
      '/notes/ai-as-the-ultimate-hub#the-implications'
    );
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
    writeMarkdown(join(fixture.blog, 'due.md'), 'title: "Due Note"\ndraft: true\ndueDate: 2020-01-01');

    const index = buildWikilinkIndex(fixture.blog);

    expect(resolveWikilink('Published Note', index)?.href).toBe('/notes/published');
    expect(resolveWikilink('Draft Note', index)).toBeUndefined();
    expect(resolveWikilink('Due Note', index)?.href).toBe('/notes/due');
    expect(new Set([...index.values()].map((entry) => entry.id))).toEqual(new Set(['published', 'due']));
  });

  it('does not validate links from draft documents', () => {
    const fixture = makeFixture();
    writeMarkdown(join(fixture.blog, 'published.md'), 'title: "Published Note"');
    writeMarkdown(join(fixture.blog, 'draft.md'), 'title: "Draft Note"\ndraft: true', '[[missing-note]]');

    expect(() => buildWikilinkIndex(fixture.blog)).not.toThrow();
  });

  it('prevents public links to unpublished targets', () => {
    const fixture = makeFixture();
    writeMarkdown(join(fixture.blog, 'source.md'), 'title: "Source Note"', '[[Target Note]]');
    writeMarkdown(join(fixture.blog, 'target.md'), 'title: "Target Note"\ndraft: true');

    expect(() => buildWikilinkIndex(fixture.blog)).toThrow(
      'linked note "Target Note" does not exist or is unpublished'
    );
  });

  it('rejects block references and ambiguous targets', () => {
    const fixture = makeFixture();
    writeMarkdown(join(fixture.blog, 'source.md'), 'title: "Source Note"', '[[Target Note#^block]]');
    writeMarkdown(join(fixture.blog, 'target.md'), 'title: "Target Note"');
    expect(() => buildWikilinkIndex(fixture.blog)).toThrow('Block-reference wikilinks are not supported');

    const other = makeFixture();
    writeMarkdown(join(other.blog, 'one.md'), 'title: "Same Title"');
    writeMarkdown(join(other.blog, 'two.md'), 'title: "Same Title"');
    expect(() => buildWikilinkIndex(other.blog)).toThrow('Ambiguous wikilink target');
  });
});
