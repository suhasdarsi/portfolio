import type { APIRoute } from 'astro';
import sharp from 'sharp';
import { noteCover } from '../../notes/cover';
import { noteGraph } from '../../notes/graph';
import { getNoteLinks, getNotes, readingTime } from '../../notes/notes';
import { shareCardSvg } from '../../notes/share-card';
import { site } from '../../site/site';

type Figure = Parameters<typeof shareCardSvg>[0]['figure'];

// The graph of every note, as on the home page, with the best-linked note as the hub.
function siteFigure(ids: string[], links: ReturnType<typeof getNoteLinks>): Figure {
  const size = 360;
  const { nodes, edges } = noteGraph(ids, links, size);
  const hub = nodes.reduce((best, node) => (node.r > best.r ? node : best));
  const markup = edges.map(([a, b]) => `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/>`).join('')
    + nodes.map((node) => `<circle class="n${node === hub ? ' hub' : ''}" cx="${node.x}" cy="${node.y}" r="${node.r * 1.6}"/>`).join('');
  return { markup, viewBox: [0, 0, size, size] };
}

export async function getStaticPaths() {
  const posts = await getNotes();
  const links = getNoteLinks(posts);
  // Cover drawings use a 320x220 box with a little room around the drawing; show the drawing, not the room.
  const notes = posts.map((post) => ({
    params: { slug: post.id },
    props: {
      title: post.data.title,
      kicker: ['Note', readingTime(post)].filter(Boolean).join(' · '),
      figure: { markup: noteCover(post.id, links.get(post.id)!), viewBox: [30, 20, 260, 180] } satisfies Figure,
    },
  }));
  // 'site' is the default share card for pages that are not notes.
  const home = { title: site.headline, kicker: 'Notes on AI security', figure: siteFigure(posts.map((post) => post.id), links) };
  return [...notes, { params: { slug: 'site' }, props: home }];
}

export const GET: APIRoute = async ({ props }) => {
  const svg = shareCardSvg({ ...(props as { title: string; kicker: string; figure: Figure }), author: site.name, host: new URL(site.url).host });
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
