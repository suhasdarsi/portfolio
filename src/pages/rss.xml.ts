import rss from '@astrojs/rss';
import { getPublishedCardEntries } from '../utils/content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const cards = (await getPublishedCardEntries())
    .sort((a, b) => new Date(b.data.pubDate).valueOf() - new Date(a.data.pubDate).valueOf());

  const items = cards.map((card) => ({
    title: card.data.title,
    description: card.data.description,
    pubDate: card.data.pubDate,
    link: `/cards/${card.id}`,
  }));

  return rss({
    title: 'Suhas Darsi — Notes',
    description: 'Short, connected ideas about AI security, agent systems, and network risk.',
    site: context.site!,
    items,
  });
}
