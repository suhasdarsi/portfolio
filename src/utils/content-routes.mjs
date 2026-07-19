export const contentCollections = [
  {
    name: 'blog',
    directory: 'src/content/blog',
    routePrefix: '/notes/',
  },
  {
    name: 'cards',
    directory: 'src/content/cards',
    routePrefix: '/cards/',
  },
];

/**
 * Shared publication policy for Astro content queries and build-time wikilinks.
 * Draft content becomes public only after its due date.
 */
export function isPublishedContent(data, now = new Date()) {
  if (data?.published === false) return false;
  if (data?.draft !== true) return true;
  if (!data.dueDate) return false;

  const dueDate = new Date(data.dueDate);
  return !Number.isNaN(dueDate.valueOf()) && dueDate <= now;
}
