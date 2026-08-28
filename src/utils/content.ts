import { getCollection, type CollectionEntry } from 'astro:content';
import { isPublishedContent } from './content-routes.mjs';

type PublishableData = { draft: boolean; dueDate?: Date | string; published?: boolean };

export type BlogEntry = CollectionEntry<'blog'>;

export function isPublished(data: PublishableData): boolean {
  return isPublishedContent(data);
}

function byNewestPubDate<T extends { data: { pubDate: Date } }>(a: T, b: T): number {
  return b.data.pubDate.valueOf() - a.data.pubDate.valueOf();
}

export async function getPublishedBlogEntries(): Promise<BlogEntry[]> {
  return (await getCollection('blog')).filter((post) => isPublished(post.data));
}

export async function getPublishedBlogEntriesByDate(): Promise<BlogEntry[]> {
  return (await getPublishedBlogEntries()).sort(byNewestPubDate);
}
