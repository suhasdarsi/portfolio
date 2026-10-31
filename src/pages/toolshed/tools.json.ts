import type { APIRoute } from 'astro';
import { categoryTags } from '../../data/security-tools';
import { toolSlug } from '../../data/toolshed';
import { getTools, hasReview, toolHref } from '../../utils/content';

// Open data: the whole Toolshed directory, for people and AI tools to query directly.
export const GET: APIRoute = async ({ site }) => {
  const origin = site?.toString().replace(/\/$/, '') ?? 'https://suhasdarsi.com';
  const tools = await getTools();
  const body = {
    name: 'Toolshed',
    status: 'alpha',
    notice: 'Work in progress: incomplete and partly unverified. Do not rely on this data yet.',
    description: 'Independent directory of security tools, tagged by the jobs they do. Nobody can pay to be listed.',
    url: `${origin}/toolshed`,
    disclosure: 'The author works at SuperAlign, which is listed under AI security.',
    categories: Object.entries(categoryTags).map(([category, groups]) => ({
      name: category,
      url: `${origin}/toolshed/${toolSlug(category)}`,
      tagGroups: groups.map((group) => ({
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
        ? { url: `${origin}${toolHref(tool)}`, rating: tool.review.data.rating ?? null, verdict: tool.review.data.verdict ?? null }
        : null,
    })),
  };

  return new Response(JSON.stringify(body, null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  });
};
