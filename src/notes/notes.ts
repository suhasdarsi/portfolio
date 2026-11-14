// Published notes and what pages derive from them: links, backlinks, reading time and plain text.
import { getCollection, type CollectionEntry } from 'astro:content';
import { isPublished, noteHref } from './publishing.mjs';
import { extractWikilinkTargets, resolveWikilink } from './wikilinks.mjs';
import { stripDiagramSource } from './diagrams.mjs';
import { stripComments } from './obsidian.mjs';

export { noteHref };

export type Note = CollectionEntry<'blog'>;

/** Published notes, newest first. */
export async function getNotes(): Promise<Note[]> {
  return (await getCollection('blog'))
    .filter((note) => isPublished(note.data))
    .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

/** The note's Markdown without diagram source: what a reader reads and search matches. */
export const noteText = (note: Note) => stripComments(stripDiagramSource(note.body ?? ''));

// 150 words a minute: a careful pace for technical notes with figures to read.
export function readingTime(note: Note): string {
  const words = noteText(note).split(/\s+/).filter(Boolean).length;
  return words ? `${Math.ceil(words / 150)} min read` : '';
}

/** When the note was last revised (never earlier than the day it was published); undefined if it never was. */
export function lastRevised(note: Note): Date | undefined {
  const dates = [...note.data.revisions.map((revision) => revision.date), ...(note.data.updatedDate ? [note.data.updatedDate] : [])];
  if (!dates.length) return undefined;
  return new Date(Math.max(note.data.pubDate.valueOf(), ...dates.map((date) => date.valueOf())));
}

export type NoteStage = NonNullable<Note['data']['stage']>;

/** What each growth stage is called and what it tells a reader. */
export const stageInfo: Record<NoteStage, { label: string; means: string }> = {
  seedling: { label: 'Seedling', means: 'A rough, early idea' },
  budding: { label: 'Budding', means: 'Worked through, still changing' },
  evergreen: { label: 'Evergreen', means: 'Settled and kept up to date' },
};

export interface NoteLinks {
  /** Notes this note links to, in the order they first appear. */
  linksTo: string[];
  /** Other notes that link to this one, in the order of the list passed in. */
  linkedFrom: string[];
}

// The [[wikilink]] graph between published notes, keyed by note id. Self-links don't count.
export function getNoteLinks(notes: Note[]): Map<string, NoteLinks> {
  const links = new Map(notes.map((note) => [note.id, { linksTo: [] as string[], linkedFrom: [] as string[] }]));
  for (const note of notes) {
    for (const target of extractWikilinkTargets(note.body ?? '')) {
      const linked = resolveWikilink(target);
      if (!linked || linked.id === note.id || !links.has(linked.id)) continue;
      const from = links.get(note.id)!;
      if (!from.linksTo.includes(linked.id)) from.linksTo.push(linked.id);
    }
  }
  for (const note of notes) {
    for (const id of links.get(note.id)!.linksTo) links.get(id)!.linkedFrom.push(note.id);
  }
  return links;
}
