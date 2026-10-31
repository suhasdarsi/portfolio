// Toolshed "suggest a tool" requests: validated the same way in the browser, the Worker and the tests.
// Requests become public GitHub issues, so the issue body keeps submitted text inert (no mentions, no HTML).
import { toolCategories } from '../data/toolshed';

export type RequestKind = 'add' | 'correct';

export interface ToolRequest {
  kind: RequestKind;
  name: string;
  url: string;
  categories: string[];
  details: string;
  affiliated: boolean;
  relationship: string;
}

const oneLine = (value: unknown, label: string, max: number, required = true) => {
  if (value !== undefined && typeof value !== 'string') throw new Error(`Invalid ${label}.`);
  const text = String(value ?? '').trim();
  if (required && !text) throw new Error(`Enter the ${label}.`);
  if (text.length > max || /[\r\n\x00-\x1f]/.test(text))
    throw new Error(`Keep the ${label} short and on one line.`);
  return text;
};

export function validateToolRequest(input: unknown): ToolRequest {
  if (!input || typeof input !== 'object') throw new Error('Fill in the form.');
  const data = input as Record<string, unknown>;
  if (data.kind !== 'add' && data.kind !== 'correct')
    throw new Error('Choose whether to add a tool or correct one.');
  const name = oneLine(data.name, 'tool name', 80);
  const url = oneLine(data.url, 'website', 300);
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('Enter the full website address, starting with https://.');
  }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password)
    throw new Error('Enter the full website address, starting with https://.');
  if (!Array.isArray(data.categories ?? [])) throw new Error('Invalid categories.');
  const categories = [...new Set((data.categories as unknown[] | undefined) ?? [])];
  if (
    categories.some(
      (category) => !toolCategories.includes(category as (typeof toolCategories)[number])
    )
  )
    throw new Error('Choose categories from the list.');
  if (typeof data.details !== 'string') throw new Error('Describe the tool or the change.');
  const details = data.details.replace(/\r\n?/g, '\n').trim();
  if (details.length < 10) throw new Error('Say a little more about the tool or the change.');
  if (details.length > 1500 || /[\x00-\x08\x0b-\x1f]/.test(details))
    throw new Error('Keep the description under 1,500 characters.');
  if (typeof data.affiliated !== 'boolean')
    throw new Error('Say whether you work for or with the vendor.');
  const relationship = oneLine(data.relationship, 'relationship', 160, data.affiliated);
  return {
    kind: data.kind,
    name,
    url: parsed.href,
    categories: categories as string[],
    details,
    affiliated: data.affiliated,
    relationship: data.affiliated ? relationship : '',
  };
}

// Neutralise markdown that could ping people, link-spam or inject HTML into the public issue.
export function inert(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/[\\[\]*_!|~]/g, (c) => `\\${c}`)
    .replace(/[<>]/g, (c) => (c === '<' ? '&lt;' : '&gt;'))
    .replace(/@/g, '@​')
    .replace(/#(\d)/g, '#​$1')
    .replace(/`/g, 'ˋ');
}

export function issueFor(request: ToolRequest): { title: string; body: string; labels: string[] } {
  const verb = request.kind === 'add' ? 'Add' : 'Correct';
  const quote = (text: string) =>
    text
      .split('\n')
      .map((line) => `> ${inert(line)}`)
      .join('\n');
  const body = [
    `**Request:** ${verb} a tool`,
    `**Tool:** ${inert(request.name)}`,
    `**Website:** \`${request.url.replace(/`/g, '%60')}\``,
    `**Categories:** ${request.categories.length ? request.categories.join(', ') : 'Not given'}`,
    `**Submitter works for or with the vendor:** ${request.affiliated ? `Yes (${inert(request.relationship)})` : 'No'}`,
    '',
    request.kind === 'add' ? '**What it does**' : '**What should change**',
    '',
    quote(request.details),
    '',
    '---',
    'Submitted through the Toolshed form. Listing is free and decided on merit; nobody can pay to be included.',
  ].join('\n');
  return {
    title: `Toolshed: ${verb.toLowerCase()} ${request.name}`.slice(0, 120),
    body,
    labels: ['toolshed-request', request.kind === 'add' ? 'add-tool' : 'correction'],
  };
}

// Fallback when the form isn't live yet: the same request as a prefilled GitHub issue.
export function githubIssueLink(repo: string, request?: Partial<ToolRequest>): string {
  const url = new URL(`https://github.com/${repo}/issues/new`);
  url.searchParams.set('labels', 'toolshed-request');
  url.searchParams.set(
    'title',
    `Toolshed: ${request?.kind === 'correct' ? 'correct' : 'add'} ${request?.name ?? ''}`.trim()
  );
  url.searchParams.set(
    'body',
    '**Website:** \n**Categories:** \n**Do you work for or with the vendor?** \n\n**What it does / what should change**\n'
  );
  return url.href;
}
