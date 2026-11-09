// The Toolshed directory merged with my reviews, and the URL of every Toolshed page.
import { getCollection, type CollectionEntry } from 'astro:content';
import { categoryTags, securityTools } from './catalog';
import { toolCategories, type ToolCategory } from './categories';
import { slugify } from '../site/slug.mjs';

export type ToolReview = CollectionEntry<'tools'>;

export interface Tool {
  id: string;
  name: string;
  url: string;
  tags: string[];
  categories: ToolCategory[];
  affiliated: boolean;
  review?: ToolReview;
}

const tagCategory = new Map(
  Object.entries(categoryTags).flatMap(([category, groups]) =>
    groups.flatMap((group) => group.tags.map((tag) => [tag.name, category as ToolCategory] as const))
  )
);

export const inCategory = (tools: Tool[], category: ToolCategory) => tools.filter((tool) => tool.categories.includes(category));

export const tagsIn = (tool: Tool, category: ToolCategory) => tool.tags.filter((tag) => tagCategory.get(tag) === category);

export const categoryHref = (category: ToolCategory, tab?: 'tools' | 'market') =>
  `/toolshed/${slugify(category)}${tab ? `/${tab}` : ''}`;

/** The category's tool list, filtered to one tag. */
export const tagHref = (tag: string) => `${categoryHref(tagCategory.get(tag)!, 'tools')}?tag=${encodeURIComponent(tag)}`;

/** getStaticPaths for the pages under /toolshed/<category>. */
export const categoryPaths = () => toolCategories.map((category) => ({ params: { category: slugify(category) }, props: { category } }));

// A tool gets its own review page once its review has a verdict or notes; until then it links out.
export function hasReview(tool: Tool): tool is Tool & { review: ToolReview } {
  return Boolean(tool.review && (tool.review.data.verdict || tool.review.body?.trim()));
}

export const toolHref = (tool: Tool) => `/toolshed/tools/${tool.id}`;

/** Where a tool's name links: its review here, or the vendor's site in a new tab. */
export function toolLink(tool: Tool): { href: string; external: boolean; attrs: Record<string, string> } {
  return hasReview(tool)
    ? { href: toolHref(tool), external: false, attrs: {} }
    : { href: tool.url, external: true, attrs: { target: '_blank', rel: 'noopener noreferrer' } };
}

function withCategories(tool: Omit<Tool, 'categories'>, source: string): Tool {
  const categories = new Set(tool.tags.map((tag) => {
    const category = tagCategory.get(tag);
    if (!category) throw new Error(`${source}: unknown tag "${tag}" on ${tool.name}.`);
    return category;
  }));
  return { ...tool, categories: toolCategories.filter((category) => categories.has(category)) };
}

// The directory merged with my reviews. Reviewed tools first, most recently touched on top, then by name.
export async function getTools(): Promise<Tool[]> {
  const reviews = new Map((await getCollection('tools')).filter((review) => !review.data.draft).map((review) => [review.id, review]));
  const tools: Tool[] = securityTools.map(({ name, url, tags, affiliated }) => {
    const id = slugify(name);
    const review = reviews.get(id);
    reviews.delete(id);
    return withCategories({
      id,
      name: review?.data.title ?? name,
      url: review?.data.url ?? url,
      tags: review?.data.tags.length ? review.data.tags : tags,
      affiliated: Boolean(affiliated),
      review,
    }, review?.filePath ?? 'the Toolshed catalog');
  });

  for (const review of reviews.values()) {
    const { title, url, tags } = review.data;
    if (!title || !url || tags.length === 0) {
      throw new Error(`${review.filePath} matches no tool in the Toolshed catalog, so it needs a title, url and tags.`);
    }
    tools.push(withCategories({ id: review.id, name: title, url, tags, affiliated: false, review }, review.filePath ?? review.id));
  }

  const touched = (tool: Tool) => (tool.review?.data.updated ?? tool.review?.data.tried)?.valueOf() ?? 0;
  return tools.sort((a, b) =>
    Number(hasReview(b)) - Number(hasReview(a)) || touched(b) - touched(a) || a.name.localeCompare(b.name)
  );
}

export async function getCategoryGuide(category: ToolCategory) {
  return (await getCollection('toolshed')).find((guide) => guide.data.category === category);
}

export async function getMarketGuide(category: ToolCategory) {
  return (await getCollection('toolshedMarket')).find((guide) => guide.data.category === category);
}
