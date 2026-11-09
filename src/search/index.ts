// What site search can find. /search.json serves the notes with their full text; the overlay embeds the
// same entries without bodies so it can list them before the JSON arrives.
import { getNotes, noteHref, noteText } from '../notes/notes';
import { formatDate } from '../site/format';
import { apps, pages } from '../site/sections';
import type { SearchEntry } from './client';

export async function noteEntries(): Promise<SearchEntry[]> {
  return (await getNotes()).map((note) => ({
    kind: 'Note',
    title: note.data.title,
    meta: formatDate(note.data.pubDate),
    href: noteHref(note.id),
    description: note.data.description,
    body: noteText(note),
  }));
}

export const sectionEntries: SearchEntry[] = [...apps, ...pages].map(({ kind, title, meta, href, keywords }) => ({
  kind,
  title,
  meta,
  href,
  description: keywords,
}));
