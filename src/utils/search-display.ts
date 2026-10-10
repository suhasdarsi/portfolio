/** Plain text for search excerpts; never interpret note content as HTML. */
export function plainText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, target, label) => label || target)
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]*>/g, ' ')
    .replace(/[#*_`>~]/g, '')
    .replace(/\s+/g, ' ').trim();
}

export function searchExcerpt(body: string, query: string, description = ''): string {
  const text = plainText(body || description);
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const positions = terms.map((term) => text.toLowerCase().indexOf(term)).filter((position) => position >= 0);
  const match = positions.length ? Math.min(...positions) : 0;
  const start = Math.max(0, match - 55);
  const end = Math.min(text.length, start + 190);
  return `${start ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}`;
}

export function highlightText(element: HTMLElement, text: string, query: string): void {
  element.replaceChildren();
  const terms = [...new Set(query.trim().split(/\s+/).filter(Boolean))]
    .sort((a, b) => b.length - a.length)
    .map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (!terms.length) { element.textContent = text; return; }
  const pattern = new RegExp(terms.join('|'), 'gi');
  let cursor = 0;
  for (const match of text.matchAll(pattern)) {
    element.append(document.createTextNode(text.slice(cursor, match.index)));
    const mark = document.createElement('mark');
    mark.textContent = match[0];
    element.append(mark);
    cursor = match.index! + match[0].length;
  }
  element.append(document.createTextNode(text.slice(cursor)));
}
