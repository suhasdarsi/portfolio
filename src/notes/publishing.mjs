// Where notes live and when they go public. Shared by the Astro pages (src/notes/notes.ts) and the
// build-time wikilink plugin (src/notes/wikilinks.mjs), which reads the Markdown before Astro does.
export const NOTES_DIRECTORY = 'src/content/blog';

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
