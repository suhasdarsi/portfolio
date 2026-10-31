export interface SearchDocument {
  href: string;
  title: string;
  description?: string;
  body?: string;
}

export function createSearchLoader<T extends SearchDocument>(
  fetchDocuments: (url: string) => Promise<Response> = fetch
): () => Promise<T[]> {
  let data: Promise<T[]> | undefined;

  return function loadSearch(): Promise<T[]> {
    if (!data) {
      data = fetchDocuments('/search.json')
        .then((response) => {
          if (!response.ok) throw new Error('Unable to load search data');
          return response.json() as Promise<T[]>;
        })
        .catch((error) => {
          data = undefined;
          throw error;
        });
    }

    return data;
  };
}

export function debounce<Args extends unknown[]>(
  callback: (...args: Args) => void | Promise<void>,
  delay = 150
): (...args: Args) => Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let cancelPrevious: (() => void) | undefined;

  return (...args: Args): Promise<void> => {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
      cancelPrevious?.();
    }

    return new Promise<void>((resolve) => {
      cancelPrevious = resolve;
      timer = setTimeout(() => {
        timer = undefined;
        cancelPrevious = undefined;
        Promise.resolve()
          .then(() => callback(...args))
          .then(
            () => resolve(),
            () => resolve()
          );
      }, delay);
    });
  };
}
