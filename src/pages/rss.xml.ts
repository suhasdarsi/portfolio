import rss from '@astrojs/rss';
import { getNotes, noteHref } from '../notes/notes';
import { absoluteUrl, site } from '../site/site';

export async function GET() {
  const notes = await getNotes();
  return rss({
    title: `${site.name} — Notes`,
    description: 'Long-form notes about AI security, agent systems, and network risk.',
    site: site.url,
    items: notes.map((note) => ({
      title: note.data.title,
      description: note.data.description,
      pubDate: note.data.pubDate,
      link: absoluteUrl(noteHref(note.id)),
    })),
  });
}
