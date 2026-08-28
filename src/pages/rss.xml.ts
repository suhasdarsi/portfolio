import rss from '@astrojs/rss';
import { getPublishedBlogEntriesByDate } from '../utils/content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const notes = await getPublishedBlogEntriesByDate();

  const items = notes.map((note) => ({
    title: note.data.title,
    description: note.data.description,
    pubDate: note.data.pubDate,
    link: `/notes/${note.id}`,
  }));

  return rss({
    title: 'Suhas Darsi — Notes',
    description: 'Long-form notes about AI security, agent systems, and network risk.',
    site: context.site!,
    items,
  });
}
