import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { highlightText, searchExcerpt } from '../src/utils/search-display';
import { searchDocuments } from '../src/utils/client-search';
import { createSearchLoader as buildSearchLoader, debounce } from '../src/utils/search-loader';
import type { SearchDocument } from '../src/utils/search-loader';

function element() {
  const classes = new Set<string>();
  return {
    value: '', textContent: '', style: {} as Record<string, string>, children: [] as any[],
    classList: {
      add: (name: string) => classes.add(name), remove: (name: string) => classes.delete(name),
      contains: (name: string) => classes.has(name),
      toggle: (name: string, force?: boolean) => {
        const enabled = force ?? !classes.has(name);
        enabled ? classes.add(name) : classes.delete(name);
      },
    },
    handlers: {} as Record<string, Function>,
    addEventListener(name: string, handler: Function) { this.handlers[name] = handler; },
    removeEventListener() {}, setAttribute() {}, removeAttribute() {}, focus() {},
    replaceChildren(...items: any[]) { this.children = items; },
    appendChild(item: any) { this.children.push(item); }, append() {}, scrollIntoView() {},
    querySelectorAll() { return this.children; }, click: vi.fn(),
  };
}

function setup(file: string, overrides: Record<string, unknown> = {}) {
  const nodes = new Map<string, ReturnType<typeof element>>();
  const get = (id: string) => {
    if (!nodes.has(id)) nodes.set(id, element());
    return nodes.get(id)!;
  };
  const document = {
    ...element(), documentElement: element(), body: element(), activeElement: null as any,
    getElementById: get, createElement: () => element(), querySelector: () => null,
  };
  const window = { ...element(), matchMedia: () => ({ matches: true }), scrollY: 0, innerHeight: 800 };
  const localStorage = { getItem: () => { throw Error('storage disabled'); }, setItem: () => { throw Error('storage disabled'); } };
  const source = readFileSync(file, 'utf8').match(/<script(?: is:inline)?>([\s\S]*?)<\/script>/)![1]
    .replace(/import .*? from .*?;\n/g, '');
  const sandboxFetch = (overrides.fetch ?? fetch) as typeof fetch;
  const createSearchLoader = <T extends SearchDocument,>() => buildSearchLoader<T>(sandboxFetch);
  runInNewContext(ts.transpile(source, { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None }), {
    document, window, localStorage, searchDocuments, highlightText, searchExcerpt,
    createSearchLoader, debounce, setTimeout, clearTimeout, console, ...overrides,
  });
  return { get, document, window };
}

const posts = [{ title: 'Network risk', href: '/notes/network' }];
const response = { ok: true, json: async () => posts };

describe('browser script regressions', () => {
  it('initializes the preferred theme and search when storage throws', async () => {
    const fetch = vi.fn().mockResolvedValue(response);
    const { get, document } = setup('src/components/Header.astro', { fetch });
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    await get('global-search-toggle').handlers.click();
    expect(get('global-search-results').children).toHaveLength(1);
  });

  it('leaves Enter on a focused result to native link activation', async () => {
    const { get, document } = setup('src/components/Header.astro', { fetch: async () => response });
    await get('global-search-toggle').handlers.click();
    const result = get('global-search-results').children[0];
    document.activeElement = result;
    const preventDefault = vi.fn();
    document.handlers.keydown({ key: 'Enter', preventDefault });
    expect(result.click).not.toHaveBeenCalled();
    expect(preventDefault).not.toHaveBeenCalled();
    document.activeElement = get('global-search-input');
    document.handlers.keydown({ key: 'Enter', preventDefault });
    expect(result.click).toHaveBeenCalledOnce();
    expect(preventDefault).toHaveBeenCalledOnce();
  });

  it('retries failed 404 searches', async () => {
    const fetch = vi.fn().mockRejectedValueOnce(Error('offline')).mockResolvedValue(response);
    const { get } = setup('src/pages/404.astro', { fetch });
    const input = get('error-search-input');
    input.value = 'network';
    await input.handlers.input();
    expect(get('error-search-status').textContent).toContain('unavailable');
    await input.handlers.input();
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(get('error-search-results').children).toHaveLength(1);
  });

  it('does not restore stale 404 results after clearing during loading', async () => {
    let resolve!: Function;
    const pending = new Promise((done) => { resolve = done; });
    const { get } = setup('src/pages/404.astro', { fetch: () => pending });
    const input = get('error-search-input');
    input.value = 'network';
    const first = input.handlers.input();
    input.value = '';
    await input.handlers.input();
    resolve(response);
    await first;
    expect(get('error-search-results').children).toHaveLength(0);
    expect(get('error-search-status').textContent).toBe('');
  });

  it('reaches 100 percent when the article bottom reaches the viewport bottom', () => {
    const { get, document, window } = setup('src/components/ReadingProgress.astro');
    const article = { offsetHeight: 2000, getBoundingClientRect: () => ({ top: 200 - window.scrollY }) };
    document.querySelector = () => article as any;
    window.scrollY = 1400;
    window.handlers.scroll();
    expect(get('reading-progress').style.width).toBe('100%');
    window.scrollY = 800;
    window.handlers.scroll();
    expect(get('reading-progress').style.width).toBe('50%');
  });
});
