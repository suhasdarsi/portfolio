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
