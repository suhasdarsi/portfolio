// The notes in the vault as the tests need them: each file with the title, address and date the site gives it.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parseFrontmatter } from 'astro/markdown';
import { NOTES_DIRECTORY, isHiddenFolder, isPublished, noteId, noteTitle } from '../src/notes/publishing.mjs';

export interface NoteFile {
  /** Path from the project root, e.g. "content/My Note.md". */
  path: string;
  /** The last part of the note's address: /notes/<slug>. */
  slug: string;
  title: string;
  description: string;
  /** YYYY-MM-DD, or '' when the note has no date yet. */
  pubDate: string;
  draft: boolean;
  /** The Markdown after the properties block. */
  body: string;
}

function files(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return isHiddenFolder(entry.name) ? [] : files(path);
    return entry.name.toLowerCase().endsWith('.md') ? [path] : [];
  });
}

export function noteFiles(): NoteFile[] {
  return files(NOTES_DIRECTORY).map((path) => {
    const parsed = parseFrontmatter(readFileSync(path, 'utf8'));
    const data = (parsed.frontmatter ?? {}) as Record<string, unknown>;
    const inVault = path.slice(NOTES_DIRECTORY.length + 1);
    return {
      path,
      slug: noteId(inVault, data),
      title: noteTitle(inVault, data),
      description: typeof data.description === 'string' ? data.description : '',
      pubDate: data.pubDate ? new Date(data.pubDate as string | Date).toISOString().slice(0, 10) : '',
      draft: !isPublished(data),
      body: parsed.content,
    };
  });
}
