import type { APIRoute } from 'astro';
import { categoryTags } from '../../toolshed/catalog';
import { toolCategories } from '../../toolshed/categories';
import { categoryHref, getTools, hasReview, toolHref } from '../../toolshed/tools';
import { absoluteUrl, site } from '../../site/site';

// Open data: the whole Toolshed directory, for people and AI tools to query directly.
export const GET: APIRoute = async () => {
  const tools = await getTools();
  const body = {
    name: 'Toolshed',
    status: 'alpha',
    notice: 'Work in progress: incomplete and partly unverified. Do not rely on this data yet.',
    description: 'Independent directory of security tools, tagged by the jobs they do. Nobody can pay to be listed.',
    url: absoluteUrl('/toolshed'),
    disclosure: `The author works at ${site.company.name}, which is listed under AI security.`,
    categories: toolCategories.map((category) => ({
      name: category,
      url: absoluteUrl(categoryHref(category)),
      tagGroups: categoryTags[category].map((group) => ({
        name: group.name,
        tags: group.tags.map(({ name, summary, examples, via }) => ({ name, summary, examples, controlledVia: via })),
      })),
    })),
    tools: tools.map((tool) => ({
      id: tool.id,
      name: tool.name,
      url: tool.url,
      categories: tool.categories,
      tags: tool.tags,
      affiliatedWithAuthor: tool.affiliated,
      review: hasReview(tool)
        ? { url: absoluteUrl(toolHref(tool)), rating: tool.review.data.rating ?? null, verdict: tool.review.data.verdict ?? null }
        : null,
    })),
  };

  return new Response(JSON.stringify(body, null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  });
};
