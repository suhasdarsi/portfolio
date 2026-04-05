import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const posts = (await getCollection('blog'))
    .filter((post) => !post.data.draft)
    .sort((a, b) => new Date(b.data.pubDate).valueOf() - new Date(a.data.pubDate).valueOf());

  return rss({
    title: 'Suhas Darsi — Notes',
    description: 'Thoughts on AI safety, product building, bags, travel, and infrastructure.',
    site: context.site || 'https://suhasdarsi.com',
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: `/notes/${post.id}`,
    })),
  });
}
