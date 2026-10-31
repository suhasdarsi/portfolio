// Toolshed vocabulary, in the order the filters show it. Security tools only.
export const toolCategories = [
  'AI security',
  'AppSec',
  'Browser',
  'Cloud',
  'Data protection',
  'Detection & response',
  'Email',
  'Endpoint',
  'GRC',
  'Identity',
  'Network',
  'Offensive',
  'Secrets',
  'Threat intel',
  'Vulnerability management',
] as const;

export type ToolCategory = (typeof toolCategories)[number];


// A tool's review file is src/content/tools/<slug>.md.
export function toolSlug(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
