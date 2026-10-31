import { getCollection, type CollectionEntry } from 'astro:content';
import { isPublishedContent } from './content-routes.mjs';
import { categoryTags, securityTools } from '../data/security-tools';
import { toolCategories, toolSlug, type ToolCategory } from '../data/toolshed';

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

export type ToolReview = CollectionEntry<'tools'>;
export type CategoryGuide = CollectionEntry<'toolshed'>;
export type MarketGuide = CollectionEntry<'toolshedMarket'>;

export interface Tool {
  id: string;
  name: string;
  url: string;
  tags: string[];
  categories: ToolCategory[];
  affiliated: boolean;
  review?: ToolReview;
}

// Which category each tag belongs to, and the order tags appear in.
export const tagCategory = new Map(
  Object.entries(categoryTags).flatMap(([category, groups]) =>
    groups.flatMap((group) => group.tags.map((tag) => [tag.name, category as ToolCategory] as const))
  )
);

export const toolHref = (tool: Tool) => `/toolshed/tools/${tool.id}`;
const tagOrder = [...tagCategory.keys()];
export const tagsIn = (tool: Tool, category: ToolCategory) =>
  tool.tags.filter((tag) => tagCategory.get(tag) === category).sort((a, b) => tagOrder.indexOf(a) - tagOrder.indexOf(b));

// A tool gets its own review page once its review has a verdict or notes; until then it links out.
export function hasReview(tool: Tool): tool is Tool & { review: ToolReview } {
  return Boolean(tool.review && (tool.review.data.verdict || tool.review.body?.trim()));
}

function withCategories(tool: Omit<Tool, 'categories'>, source: string): Tool {
  const categories = [...new Set(tool.tags.map((tag) => {
    const category = tagCategory.get(tag);
    if (!category) throw new Error(`${source}: unknown tag "${tag}" on ${tool.name}.`);
    return category;
  }))];
  return { ...tool, categories: toolCategories.filter((category) => categories.includes(category)) };
}

// The directory merged with my reviews. Reviewed tools first, most recently touched on top, then by name.
export async function getTools(): Promise<Tool[]> {
  const reviews = new Map((await getCollection('tools')).filter((review) => !review.data.draft).map((review) => [review.id, review]));
  const tools: Tool[] = securityTools.map(({ name, url, tags, affiliated }) => {
    const id = toolSlug(name);
    const review = reviews.get(id);
    reviews.delete(id);
    return withCategories({
      id,
      name: review?.data.title ?? name,
      url: review?.data.url ?? url,
      tags: review?.data.tags.length ? review.data.tags : tags,
      affiliated: Boolean(affiliated),
      review,
    }, 'src/data/security-tools.ts');
  });

  for (const review of reviews.values()) {
    const { title, url, tags } = review.data;
    if (!title || !url || tags.length === 0) {
      throw new Error(`src/content/tools/${review.id}.md matches no tool in src/data/security-tools.ts, so it needs a title, url and tags.`);
    }
    tools.push(withCategories({ id: review.id, name: title, url, tags, affiliated: false, review }, `src/content/tools/${review.id}.md`));
  }

  const touched = (tool: Tool) => (tool.review?.data.updated ?? tool.review?.data.tried)?.valueOf() ?? 0;
  return tools.sort((a, b) =>
    Number(hasReview(b)) - Number(hasReview(a)) || touched(b) - touched(a) || a.name.localeCompare(b.name)
  );
}

export async function getCategoryGuide(category: ToolCategory): Promise<CategoryGuide | undefined> {
  return (await getCollection('toolshed')).find((guide) => guide.data.category === category);
}

export async function getMarketGuide(category: ToolCategory): Promise<MarketGuide | undefined> {
  return (await getCollection('toolshedMarket')).find((guide) => guide.data.category === category);
}
