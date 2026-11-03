// /llms.txt (llmstxt.org): a plain-text map of the site for answer engines. Generated so it never drifts from the notes.
import type { APIContext } from 'astro';
import { getPublishedBlogEntriesByDate } from '../utils/content';

export async function GET(context: APIContext) {
  const site = context.site!.toString().replace(/\/$/, '');
  const notes = await getPublishedBlogEntriesByDate();
  const clean = (s: string) => s.replace(/\s+/g, ' ').trim();

  const lines = [
    '# Suhas Darsi',
    '',
    '> Suhas Darsi is a co-founder of SuperAlign who writes about AI security, agent systems and network risk. This site holds his long-form notes and a few small micro-apps.',
    '',
    '## Notes',
    '',
    `- [All notes](${site}/notes): Index of every published note, newest first.`,
    ...notes.map((n) => `- [${clean(n.data.title)}](${site}/notes/${n.id}): ${clean(n.data.description)}`),
    '',
    '## About',
    '',
    `- [About](${site}/about): Background, current work and ways to get in touch.`,
    `- [Uses](${site}/uses): The tools and gear Suhas uses.`,
    '',
    '## Micro-apps',
    '',
    `- [Swatchbook](${site}/swatchbook): Directory of design systems.`,
    '',
    '## Optional',
    '',
    `- [RSS feed](${site}/rss.xml): Notes as an RSS feed.`,
    '',
  ];

  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
