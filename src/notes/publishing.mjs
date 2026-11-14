// Where notes live and when they go public. Shared by the Astro pages (src/notes/notes.ts) and the
// build-time wikilink plugin (src/notes/wikilinks.mjs), which reads the Markdown before Astro does.
import { slugify } from '../site/slug.mjs';

// The Obsidian vault: open this folder in Obsidian and write. Every Markdown file in it is a note, except in
// folders that start with "_" or "." (the note template lives in _templates). Pasted images go to attachments/.
export const NOTES_DIRECTORY = 'content';

/** Folders inside the vault that hold no notes. @param {string} name */
export const isHiddenFolder = (name) => name.startsWith('_') || name.startsWith('.');

/**
 * A note's id, and the last part of its address, from its path inside the notes folder:
 * "My New Note.md" → "my-new-note". Name the file however you like in Obsidian.
 * @param {string} path
 */
export function noteId(path) {
  const id = path.replace(/\\/g, '/').replace(/\.md$/i, '').split('/').map(slugify).join('/');
  if (!id || id.split('/').includes('')) throw new Error(`"${path}" has no letters or digits (a–z, 0–9) to make an address from. Rename the file.`);
  return id;
}

/** @param {string} id */
export function noteHref(id) {
  return `/notes/${id}`;
}

/**
 * A note is public unless it's a draft; a draft becomes public on its due date.
 * @param {{ draft?: unknown; dueDate?: unknown } | undefined} data
 */
export function isPublished(data, now = new Date()) {
  if (data?.draft !== true) return true;
  if (!data.dueDate) return false;
  const dueDate = new Date(/** @type {string | Date} */ (data.dueDate));
  return !Number.isNaN(dueDate.valueOf()) && dueDate <= now;
}

/** Growth stages a note can be marked with, youngest first. */
export const noteStages = /** @type {const} */ (['seedling', 'budding', 'evergreen']);
