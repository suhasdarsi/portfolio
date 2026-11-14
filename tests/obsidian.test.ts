import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { markdownToHtml } from 'satteri';
import { obsidianSyntaxPlugin, stripComments } from '../src/notes/obsidian.mjs';
import { wikilinkRoutesPlugin } from '../src/notes/wikilinks.mjs';
import { NOTES_DIRECTORY, noteId } from '../src/notes/publishing.mjs';

// A folder only this test uses, inside the vault, so image embeds have something to find.
const attachments = resolve(NOTES_DIRECTORY, `attachments-test-${Date.now()}`);
const note = pathToFileURL(resolve(NOTES_DIRECTORY, 'A Test Note.md'));

beforeAll(() => {
  mkdirSync(attachments, { recursive: true });
  writeFileSync(join(attachments, 'Pasted image 7.png'), '');
});
afterAll(() => rmSync(attachments, { recursive: true, force: true }));

// With plugins that throw, the parser hands back a promise, so always await it.
const render = async (markdown: string) =>
  (await Promise.resolve(markdownToHtml(markdown, {
    features: { wikilinks: true },
    mdastPlugins: [obsidianSyntaxPlugin(), wikilinkRoutesPlugin()],
    fileURL: note,
  }))).html;

it('turns a file name into the note address', () => {
  expect(noteId('My New Note.md')).toBe('my-new-note');
  expect(noteId('ai-as-the-ultimate-hub.md')).toBe('ai-as-the-ultimate-hub');
});

it('links live notes and shows links to unwritten notes as text', async () => {
  const html = await render('[[AI as the Ultimate Hub]], [[Not written <yet>]], [web](https://example.com), [top](#top), [file](report.pdf), [[Note: with colon]]');
  expect(html).toContain('<a href="/notes/ai-as-the-ultimate-hub" class="wikilink">');
  expect(html).toContain('<span class="wikilink unwritten" title="This note isn’t published yet">Not written &lt;yet&gt;</span>');
  expect(html).toContain('<a href="https://example.com">web</a>');
  expect(html).toContain('<a href="#top">top</a>');
  expect(html).toContain('<a href="report.pdf">file</a>');
  expect(html).toContain('>Note: with colon</span>');
  expect(() => noteId('!!!.md')).toThrow('Rename the file');
});

it('renders callouts, with the type as the title when none is given', async () => {
  const html = await render('> [!warning] Watch out\n> Body **bold**.\n\n> [!note]-\n> Folded.\n\n> Just a quote.');
  expect(html).toContain('<aside class="callout callout-warning">\n<p class="callout-title">Watch out</p>\n<p>Body <strong>bold</strong>.</p>');
  expect(html).toContain('<p class="callout-title">Note</p>\n<p>Folded.</p>');
  expect(html).toContain('<blockquote>\n<p>Just a quote.</p>');
});

it('renders highlights and never publishes comments', async () => {
  const html = await render('Keep ==this & that== and %%my private\nnote%% that. 2 == 2 stays.');
  expect(html).toContain('<mark>this &amp; that</mark>');
  expect(html).not.toContain('private');
  expect(html).toContain('2 == 2 stays');
  await expect(render('%%starts **here** and ends%% later')).rejects.toThrow('%%comment%%');
  expect(await render('![%%private%% chart](https://example.com/a.png)')).not.toContain('private');
  expect(stripComments('a %%x%% b\n```mermaid\n%% kept\n```\n')).toBe('a  b\n```mermaid\n%% kept\n```\n');
});

it('finds embedded images anywhere in the vault and links embedded notes', async () => {
  const html = await render('![[Pasted image 7.png|300]]\n\n![[small-world-networks-and-hubs]]');
  expect(html).toMatch(/<img src="\.\/attachments-test-\d+\/Pasted%20image%207\.png" alt="Pasted image 7">/);
  expect(html).toContain('<a class="wikilink" href="/notes/small-world-networks-and-hubs">');
  await expect(render('![[missing.png]]')).rejects.toThrow('"missing.png" is not in content');
});
