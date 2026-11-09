// Search in the browser: ranking, loading /search.json once, and running the latest query only.
export interface SearchEntry {
  kind: string;
  title: string;
  meta: string;
  href: string;
  description?: string;
  body?: string;
}

function normalize(value: string): string {
  return value.toLocaleLowerCase().replace(/\s+/g, ' ').trim();
}

export function searchDocuments<T extends Pick<SearchEntry, 'title' | 'description' | 'body'>>(documents: T[], query: string): T[] {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return documents;

  const terms = [...new Set(normalizedQuery.split(' '))];

  return documents
    .map((document, index) => {
      const title = normalize(document.title);
      const description = normalize(document.description ?? '');
      const body = normalize(document.body ?? '');
      const searchableText = `${title} ${description} ${body}`;

      if (!terms.every((term) => searchableText.includes(term))) return undefined;

      let score = 0;
      if (title === normalizedQuery) score += 20;
      if (title.startsWith(normalizedQuery)) score += 12;
      if (title.includes(normalizedQuery)) score += 8;
      if (description.includes(normalizedQuery)) score += 4;
      if (body.includes(normalizedQuery)) score += 2;

      for (const term of terms) {
        if (title.includes(term)) score += 5;
        if (description.includes(term)) score += 2;
        if (body.includes(term)) score += 1;
      }

      return { document, index, score };
    })
    .filter((result): result is { document: T; index: number; score: number } => result !== undefined)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ document }) => document);
}

/** Loads /search.json on first use and shares it; a failed load is retried on the next call. */
export function createSearchLoader(fetchDocuments: (url: string) => Promise<Response> = fetch): () => Promise<SearchEntry[]> {
  let data: Promise<SearchEntry[]> | undefined;
  return () => {
    data ??= fetchDocuments('/search.json')
      .then((response) => {
        if (!response.ok) throw new Error('Unable to load search data');
        return response.json() as Promise<SearchEntry[]>;
      })
      .catch((error) => {
        data = undefined;
        throw error;
      });
    return data;
  };
}

/**
 * Runs `search` 150ms after typing stops. `isCurrent()` turns false once a newer query has started,
 * so a slow response never overwrites the results of what the reader typed since.
 */
export function liveSearch(
  input: { value: string; addEventListener(type: 'input', listener: () => void): void },
  search: (query: string, isCurrent: () => boolean) => void | Promise<void>,
  delay = 150
): void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let latest = 0;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    const run = ++latest;
    timer = setTimeout(() => void search(input.value.trim(), () => run === latest), delay);
  });
}
