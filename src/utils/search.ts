import { getPublishedCardEntries } from './content';

export interface SearchEntry {
  id: string;
  href: string;
  type: string;
  title: string;
  description?: string;
  body: string;
}

export async function getSearchData(): Promise<SearchEntry[]> {
  const cards = await getPublishedCardEntries();

  return cards
    .map((card) => ({
      id: card.id,
      href: `/cards/${card.id}`,
      type: 'Note',
      title: card.data.title,
      description: card.data.description,
      body: card.body?.slice(0, 2000) ?? '',
      pubDate: card.data.pubDate,
    }))
    .sort((a, b) => new Date(b.pubDate).valueOf() - new Date(a.pubDate).valueOf())
    .map(({ pubDate: _pubDate, ...entry }) => entry);
}
