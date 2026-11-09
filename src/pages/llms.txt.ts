// /llms.txt (llmstxt.org): a plain-text map of the site for answer engines. Generated so it never drifts from the notes.
import { getNotes, noteHref } from '../notes/notes';
import { apps, pages, type Section } from '../site/sections';
import { absoluteUrl, isIndexed, site } from '../site/site';

export async function GET() {
  const notes = await getNotes();
  const clean = (s: string) => s.replace(/\s+/g, ' ').trim();
  const list = (sections: Section[]) =>
    sections.filter((section) => isIndexed(section.href)).map((section) => `- [${section.title}](${absoluteUrl(section.href)}): ${section.summary}`);

  const lines = [
    `# ${site.name}`,
    '',
    `> ${site.name} is a co-founder of ${site.company.name} who writes about AI security, agent systems and network risk. This site holds his long-form notes and a few small micro-apps.`,
    '',
    '## Notes',
    '',
    `- [All notes](${absoluteUrl('/notes')}): Index of every published note, newest first.`,
    ...notes.map((n) => `- [${clean(n.data.title)}](${absoluteUrl(noteHref(n.id))}): ${clean(n.data.description)}`),
    '',
    '## About',
    '',
    ...list(pages),
    '',
    '## Micro-apps',
    '',
    ...list(apps),
    '',
    '## Optional',
    '',
    `- [RSS feed](${absoluteUrl('/rss.xml')}): Notes as an RSS feed.`,
    '',
  ];

  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
