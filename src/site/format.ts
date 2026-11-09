export function formatDate(date: Date, { year = false } = {}): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...(year ? { year: 'numeric' } : {}) });
}

export function hostname(url: string): string {
  return new URL(url).hostname.replace(/^www\./, '');
}
