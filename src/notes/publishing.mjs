// Where notes live and when they go public. Shared by the Astro pages (src/notes/notes.ts) and the
// build-time wikilink plugin (src/notes/wikilinks.mjs), which reads the Markdown before Astro does.
import { slugify } from '../site/slug.mjs';

// The Obsidian vault: open this folder in Obsidian and write. Every Markdown file in it is a note, except in
// folders that start with "_" or "." (the note template lives in _templates). Pasted images go to attachments/.
export const NOTES_DIRECTORY = 'content';

/** Folders inside the vault that hold no notes. @param {string} name */
export const isHiddenFolder = (name) => name.startsWith('_') || name.startsWith('.');

/** The file's own name, without folders or ".md". @param {string} path */
const fileName = (path) => path.replace(/\\/g, '/').split('/').pop().replace(/\.md$/i, '');

/**
 * A note's title is its file name, exactly as it shows in Obsidian. A `title` property overrides it, for
 * titles a file name can't hold (":" "/" "?").
 * @param {string} path
 * @param {{ title?: unknown } | undefined} [data] the note's properties
 */
export function noteTitle(path, data) {
  return typeof data?.title === 'string' && data.title.trim() ? data.title.trim() : fileName(path);
}

/**
 * A note's id, and the last part of its address, from its path inside the vault:
 * "My New Note.md" → "my-new-note". A `slug` property pins the address, so a note can be renamed
 * without breaking links to it from other sites.
 * @param {string} path
 * @param {{ slug?: unknown } | undefined} [data] the note's properties
 */
export function noteId(path, data) {
  const pinned = typeof data?.slug === 'string' && data.slug.trim();
  const id = pinned ? slugify(pinned) : path.replace(/\\/g, '/').replace(/\.md$/i, '').split('/').map(slugify).join('/');
  if (!id || id.split('/').includes('')) throw new Error(`"${pinned || path}" has no letters or digits (a–z, 0–9) to make an address from. Rename the file.`);
  return id;
}

/** Today's date where the writer is, as YYYY-MM-DD. */
export function today(now = new Date()) {
  const two = (/** @type {number} */ n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${two(now.getMonth() + 1)}-${two(now.getDate())}`;
}

/**
 * Fills in what a note doesn't have to say for itself: its title (the file name) and its date.
 * The date is written into the note by `bun run notes publish`; until then it is today, so a note that
 * was never published shows today's date in the local preview. On GitHub a missing date stops the build:
 * there, "today" would change with every deploy.
 * @template {Record<string, unknown>} T
 * @param {string} path
 * @param {T} data the note's properties
 * @returns {T}
 */
export function withNoteDefaults(path, data) {
  if (!data.pubDate && process.env.CI && isPublished(data)) {
    throw new Error(`${path} has no pubDate. Publish notes with "bun run notes publish", which adds it.`);
  }
  return /** @type {T} */ ({ ...data, title: noteTitle(path, data), pubDate: data.pubDate || today() });
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
