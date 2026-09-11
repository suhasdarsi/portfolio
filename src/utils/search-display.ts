function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function searchExcerpt(body: string, query: string, fallback = ''): string {
  const haystack = body.replace(/\s+/g, ' ').trim();
  const needle = query.trim();
  if (!haystack) return fallback.trim();
  if (!needle) {
    return haystack.length > 180 ? `${haystack.slice(0, 177).trimEnd()}…` : haystack;
  }

  const index = haystack.toLocaleLowerCase().indexOf(needle.toLocaleLowerCase());
  if (index < 0) {
    const fallbackText = fallback.trim();
    if (fallbackText) return fallbackText.length > 180 ? `${fallbackText.slice(0, 177).trimEnd()}…` : fallbackText;
    return haystack.length > 180 ? `${haystack.slice(0, 177).trimEnd()}…` : haystack;
  }

  const start = Math.max(0, index - 60);
  const end = Math.min(haystack.length, index + needle.length + 120);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < haystack.length ? '…' : '';
  return `${prefix}${haystack.slice(start, end).trim()}${suffix}`;
}

export function highlightText(element: HTMLElement, text: string, query: string): void {
  const needle = query.trim();
  if (!needle) {
    element.textContent = text;
    return;
  }

  const terms = [...new Set(needle.split(/\s+/).filter(Boolean))];
  const pattern = new RegExp(`(${terms.map(escapeRegExp).join('|')})`, 'gi');
  element.innerHTML = escapeHtml(text).replace(pattern, '<mark>$1</mark>');
}
