import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSearchLoader, liveSearch, searchDocuments } from '../src/search/client';

afterEach(() => vi.useRealTimers());

function fakeInput() {
  let listener = () => {};
  return {
    value: '',
    addEventListener: (_: 'input', handler: () => void) => { listener = handler; },
    type(value: string) { this.value = value; listener(); },
  };
}

describe('site search', () => {
  it('ranks title matches ahead of body-only matches', () => {
    const results = searchDocuments([
      { title: 'A different article', body: 'Network risk appears in the body.' },
      { title: 'Network Risk', body: 'A direct title match.' },
    ], 'network risk');
    expect(results.map((result) => result.title)).toEqual(['Network Risk', 'A different article']);
  });

  it('requires every term to match somewhere', () => {
    expect(searchDocuments([{ title: 'Network risk' }], 'network wallet')).toEqual([]);
  });

  it('loads the index once, and tries again after a failed load', async () => {
    const entries = [{ kind: 'Note', title: 'Network risk', meta: 'Nov 3', href: '/notes/network' }];
    const fetcher = vi.fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue(Response.json(entries));
    const load = createSearchLoader(fetcher);
    await expect(load()).rejects.toThrow('offline');
    expect(await load()).toEqual(entries);
    expect(await load()).toEqual(entries);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('runs once typing stops, with the trimmed query', async () => {
    vi.useFakeTimers();
    const input = fakeInput();
    const search = vi.fn();
    liveSearch(input, search);
    input.type('net');
    input.type(' network ');
    await vi.advanceTimersByTimeAsync(200);
    expect(search).toHaveBeenCalledTimes(1);
    expect(search.mock.calls[0][0]).toBe('network');
  });

  it('marks a slow search stale once the reader types again', async () => {
    vi.useFakeTimers();
    const input = fakeInput();
    const current: boolean[] = [];
    let finishFirst = () => {};
    liveSearch(input, async (query, isCurrent) => {
      if (query === 'network') await new Promise<void>((resolve) => { finishFirst = resolve; });
      current.push(isCurrent());
    });
    input.type('network');
    await vi.advanceTimersByTimeAsync(200);
    input.type('');
    await vi.advanceTimersByTimeAsync(200);
    finishFirst();
    await vi.advanceTimersByTimeAsync(0);
    expect(current).toEqual([true, false]);
  });
});
