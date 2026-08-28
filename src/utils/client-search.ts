export interface SearchableDocument {
  title: string;
  description?: string;
  body?: string;
}

function normalize(value: string): string {
  return value.toLocaleLowerCase().replace(/\s+/g, ' ').trim();
}

export function searchDocuments<T extends SearchableDocument>(documents: T[], query: string): T[] {
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
