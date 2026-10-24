import type { APIRoute } from 'astro';
import sharp from 'sharp';
import { getPublishedBlogEntries } from '../../utils/content';
import { siteMarkPaths } from '../../utils/site-mark';

export async function getStaticPaths() {
  return (await getPublishedBlogEntries()).map((post) => ({
    params: { slug: post.id }, props: { title: post.data.title },
  }));
}

const escape = (text: string) => text.replace(/[&<>"']/g, (character) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character]!);

export const GET: APIRoute = async ({ props }) => {
  const words = (props.title as string).split(/\s+/);
  const lines: string[] = [];
  for (const word of words) {
    if (!lines.length || `${lines.at(-1)} ${word}`.length > 32) lines.push(word);
    else lines[lines.length - 1] += ` ${word}`;
  }
  const size = Math.min(64, 300 / lines.length);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
    <rect width="1200" height="630" fill="#f7f0e7"/>
    <path d="M72 105H1128" stroke="#ddd2bf" stroke-width="2"/>
    <text x="72" y="73" font-family="sans-serif" font-size="24" fill="#625c56">AI SECURITY FIELD NOTES</text>
    <g font-family="sans-serif" font-weight="bold" font-size="${size}" fill="#2b2825">
      ${lines.map((line, index) => `<text x="72" y="${185 + index * size * 1.15}">${escape(line)}</text>`).join('')}
    </g>
    <g transform="translate(70 536) scale(1.25)">${siteMarkPaths({ color: '#2b2825' })}</g>
    <text x="122" y="565" font-family="sans-serif" font-size="28" fill="#5d5751">Suhas Darsi</text>
    <text x="1128" y="565" text-anchor="end" font-family="sans-serif" font-size="24" fill="#625c56">suhasdarsi.com</text>
  </svg>`;
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
