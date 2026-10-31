import { getPublishedBlogEntriesByDate } from './content';
import { stripDiagramSource } from './diagrams.mjs';

export interface SearchEntry {
  id: string;
  href: string;
  type: string;
  title: string;
  description?: string;
  body: string;
}

export async function getSearchData(): Promise<SearchEntry[]> {
  const notes = await getPublishedBlogEntriesByDate();

  return notes.map((note) => ({
    id: note.id,
    href: `/notes/${note.id}`,
    type: 'Note',
    title: note.data.title,
    description: note.data.description,
    body: stripDiagramSource(note.body ?? ''),
  }));
}
