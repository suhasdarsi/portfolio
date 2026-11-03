import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

// Thresholds. Each is a deliberate bound, not a rubber stamp.
const SITE = 'https://suhasdarsi.com'; // canonical origin every absolute URL must use
const PERSON_NAME = 'Suhas Darsi'; // the one author entity answer engines should attribute to
const SUMMARY_MIN_WORDS = 12; // a one-sentence answer needs about a dozen words to stand alone
const SUMMARY_MAX_WORDS = 60; // beyond ~60 words an engine truncates instead of quoting it
const DEFINITION_MAX_WORDS = 40; // a definitional sentence an engine can quote whole
const DEFINITION_WINDOW_CHARS = 1500; // "near the top": within the first 1500 characters of visible text
const PHRASE_WORDS = 6; // consecutive words of a note's first paragraph that must be in static HTML
const LLMS_REQUIRED_PATHS = ['/notes', '/about', '/uses', '/swatchbook']; // pages llms.txt must link
// Marker a robots.txt owner adds above a deliberate block, e.g. "# aeo-blocked: GPTBot".
const BLOCK_MARKER = (agent: string) => `aeo-blocked: ${agent}`;
const AI_AGENTS = ['*', 'GPTBot', 'ChatGPT-User', 'OAI-SearchBot', 'ClaudeBot', 'Claude-SearchBot', 'PerplexityBot', 'Google-Extended'];

const ROOT = process.cwd();
const DIST = join(ROOT, 'dist');
const BLOG = join(ROOT, 'src/content/blog');

if (!existsSync(join(DIST, 'index.html'))) {
  throw new Error('dist/ is missing. Run `bun run build` before running the AEO verifier.');
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const decode = (s: string) =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

const strip = (html: string) =>
  html.replace(/<(script|style|template)\b[\s\S]*?<\/\1>/gi, '');
const textOf = (html: string) => decode(strip(html).replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const words = (s: string) => s.trim().split(/\s+/).filter(Boolean);
// Normalise typographic quotes and dashes so phrase matching is not defeated by smart punctuation.
const norm = (s: string) => s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').toLowerCase();

function urlOf(file: string): string {
  const rel = relative(DIST, file).replace(/\\/g, '/').replace(/\.html$/, '');
  return rel === 'index' ? '/' : `/${rel}`;
}

const isNoindex = (html: string) => /<meta[^>]+name="robots"[^>]+noindex/i.test(html);

const pages = walk(DIST)
  .filter((f) => f.endsWith('.html'))
  .map((file) => {
    const html = readFileSync(file, 'utf8');
    return { url: urlOf(file), html, noindex: isNoindex(html) };
  })
  .filter((p) => !p.noindex && p.url !== '/toolshed' && !p.url.startsWith('/toolshed/'));

const page = (url: string) => pages.find((p) => p.url === url)!;

type Node = Record<string, any>;
function jsonLd(html: string): Node[] {
  const out: Node[] = [];
  for (const m of html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) {
    const parsed = JSON.parse(m[1]);
    out.push(...(Array.isArray(parsed) ? parsed : [parsed]));
  }
  return out;
}
const flat = (html: string): Node[] => jsonLd(html).flatMap((n) => (Array.isArray(n['@graph']) ? n['@graph'] : [n]));
const typeOf = (n: Node, t: string) => [n['@type']].flat().includes(t);
const find = (html: string, t: string) => flat(html).find((n) => typeOf(n, t));

function resolvesPath(path: string): boolean {
  const clean = decodeURIComponent(path.split(/[?#]/)[0]);
  if (clean === '/' || clean === '') return true;
  return [join(DIST, clean), join(DIST, `${clean}.html`), join(DIST, clean, 'index.html')].some(
    (c) => existsSync(c) && statSync(c).isFile()
  );
}
function sitePath(url: string): string {
  expect(url.startsWith(SITE), `${url} must be absolute on ${SITE}`).toBe(true);
  return url.slice(SITE.length) || '/';
}

function frontmatter(file: string) {
  const fm = readFileSync(file, 'utf8').match(/^---\n([\s\S]*?)\n---/)![1];
  const get = (k: string) => {
    const m = fm.match(new RegExp(`^${k}:\\s*(?:"((?:[^"\\\\]|\\\\.)*)"|'([^']*)'|(.+))\\s*$`, 'm'));
    return m ? (m[1] ?? m[2] ?? m[3]).trim() : '';
  };
  return {
    title: get('title'),
    description: get('description'),
    pubDate: get('pubDate'),
    draft: get('draft') === 'true',
    body: readFileSync(file, 'utf8').replace(/^---\n[\s\S]*?\n---\n?/, ''),
  };
}

const notes = readdirSync(BLOG)
  .filter((f) => f.endsWith('.md'))
  .map((f) => ({ slug: f.replace(/\.md$/, ''), ...frontmatter(join(BLOG, f)) }))
  .filter((n) => !n.draft && page(`/notes/${n.slug}`));

/** First visible body paragraph of a rendered note, as HTML. */
function firstParagraph(html: string): string | undefined {
  const prose = html.match(/<div class="prose"[^>]*>([\s\S]*?)<\/div>/)?.[1] ?? '';
  return prose.match(/<p\b[^>]*>([\s\S]*?)<\/p>/)?.[1];
}

describe('AEO: fixture sanity', () => {
  it('finds indexable pages and published notes', () => {
    expect(pages.length).toBeGreaterThan(0);
    expect(notes.length).toBeGreaterThan(0);
  });
});

describe('AEO 1: llms.txt', () => {
  const file = join(DIST, 'llms.txt');
  const text = existsSync(file) ? readFileSync(file, 'utf8') : '';
  const lines = text.split('\n');

  it('exists in dist', () => expect(existsSync(file), 'dist/llms.txt missing').toBe(true));
  it('starts with an H1 naming the person or site', () => {
    expect(lines[0]).toMatch(/^# \S/);
    expect(lines[0]).toContain(PERSON_NAME);
  });
  it('has a blockquote summary right after the H1', () => {
    expect(text.split('\n').find((l, i) => i > 0 && l.trim() !== '')).toMatch(/^> \S/);
  });
  it('has H2 sections whose link lines are "- [title](absolute url): description"', () => {
    expect(lines.filter((l) => /^## \S/.test(l)).length).toBeGreaterThan(0);
    const linkLines = lines.filter((l) => l.startsWith('- ['));
    expect(linkLines.length).toBeGreaterThan(0);
    for (const l of linkLines) expect(l).toMatch(/^- \[[^\]]+\]\(https:\/\/[^)\s]+\): \S.*/);
  });
  it('every link resolves to a page in dist and required pages plus every note are listed', () => {
    const urls = [...text.matchAll(/^- \[[^\]]+\]\(([^)]+)\)/gm)].map((m) => m[1]);
    for (const u of urls) expect(resolvesPath(sitePath(u)), `${u} does not resolve in dist`).toBe(true);
    for (const p of LLMS_REQUIRED_PATHS) expect(urls, `llms.txt must link ${p}`).toContain(`${SITE}${p}`);
    for (const n of notes) expect(urls, `llms.txt must link note ${n.slug}`).toContain(`${SITE}/notes/${n.slug}`);
  });
});

describe('AEO 2: JSON-LD on every indexable page', () => {
  it.each(pages.map((p) => [p.url]))('%s has valid schema.org JSON-LD', (url) => {
    const blocks = jsonLd(page(url).html);
    expect(blocks.length, `${url} has no JSON-LD`).toBeGreaterThan(0);
    for (const b of blocks) {
      expect(b['@context']).toBe('https://schema.org');
      expect(b['@type'] ?? b['@graph'], `${url} block lacks @type`).toBeTruthy();
    }
  });
});

describe('AEO 3: Person entity', () => {
  const person = find(page('/').html, 'Person');
  it('homepage has a Person with name, url, jobTitle and an @id', () => {
    expect(person).toBeTruthy();
    expect(person!.name).toBe(PERSON_NAME);
    expect(person!.url).toBe(SITE);
    expect(person!.jobTitle).toBeTruthy();
    expect(person!['@id']).toMatch(new RegExp(`^${SITE}/#`));
  });
  it('sameAs lists only profiles the site itself links to', () => {
    const sameAs: string[] = person!.sameAs;
    expect(sameAs.length).toBeGreaterThan(0);
    const siteHtml = pages.map((p) => p.html).join('\n') + readFileSync(join(ROOT, 'src/components/SocialLinks.astro'), 'utf8');
    for (const u of sameAs) {
      expect(u).toMatch(/^https:\/\//);
      expect(siteHtml, `${u} is not linked anywhere on the site`).toContain(u);
    }
  });
  it('about page carries the same Person @id', () => {
    expect(find(page('/about').html, 'Person')?.['@id']).toBe(person!['@id']);
  });
});

describe('AEO 4: WebSite entity and shared @id', () => {
  const site = find(page('/').html, 'WebSite');
  it('homepage has a WebSite with name and url', () => {
    expect(site?.name).toBeTruthy();
    expect(site?.url).toBe(SITE);
    expect(site?.['@id']).toBeTruthy();
  });
  it('WebSite and Person @ids are referenced consistently on every indexable page', () => {
    const personId = find(page('/').html, 'Person')!['@id'];
    for (const p of pages) {
      for (const n of flat(p.html)) {
        if (typeOf(n, 'WebPage') || typeOf(n, 'AboutPage')) expect(n.isPartOf?.['@id'], p.url).toBe(site!['@id']);
        if (typeOf(n, 'BlogPosting')) expect(n.author?.['@id'], p.url).toBe(personId);
      }
    }
  });
});

describe('AEO 5-6, 10: note structured data and dates', () => {
  it.each(notes.map((n) => [n.slug, n] as const))('%s', (_slug, n) => {
    const html = page(`/notes/${n.slug}`).html;
    const post = flat(html).find((x) => typeOf(x, 'BlogPosting') || typeOf(x, 'Article'))!;
    expect(post, 'BlogPosting/Article missing').toBeTruthy();
    expect(post.headline).toBe(n.title);
    expect(post.description).toBe(n.description);
    expect(post.datePublished).toMatch(/^\d{4}-\d{2}-\d{2}(T[\d:.]+(Z|[+-]\d{2}:\d{2}))?$/);
    expect(post.datePublished.slice(0, 10)).toBe(n.pubDate);
    if (post.dateModified) {
      expect(post.dateModified).toMatch(/^\d{4}-\d{2}-\d{2}/);
      expect(post.dateModified >= post.datePublished).toBe(true);
    }
    expect(post.author?.['@id'], 'author must reference the Person').toBe(find(page('/').html, 'Person')!['@id']);

    const crumbs = flat(html).find((x) => typeOf(x, 'BreadcrumbList'))!;
    expect(crumbs, 'BreadcrumbList missing').toBeTruthy();
    const items: Node[] = crumbs.itemListElement;
    expect(items.length).toBeGreaterThan(1);
    items.forEach((it, i) => {
      expect(it.position).toBe(i + 1);
      expect(resolvesPath(sitePath(it.item)), `${it.item} does not resolve`).toBe(true);
    });
    expect(items.at(-1)!.item).toBe(`${SITE}/notes/${n.slug}`);

    const times = [...html.matchAll(/<time\b[^>]*datetime="(\d{4}-\d{2}-\d{2})"[^>]*>/g)].map((m) => m[1]);
    expect(times, 'note must render its publish date in <time datetime>').toContain(n.pubDate);
  });
});

describe('AEO 7-8: answer-first copy in static HTML', () => {
  it.each(notes.map((n) => [n.slug, n] as const))('%s', (_slug, n) => {
    const html = page(`/notes/${n.slug}`).html;
    const metaDesc = decode(html.match(/<meta name="description" content="([^"]*)"/)![1]);
    const count = words(metaDesc).length;
    expect(count, `summary is ${count} words`).toBeGreaterThanOrEqual(SUMMARY_MIN_WORDS);
    expect(count).toBeLessThanOrEqual(SUMMARY_MAX_WORDS);
    expect(textOf(html), 'summary must also be visible on the page').toContain(metaDesc);

    const prose = html.match(/<div class="prose"[^>]*>([\s\S]*?)<\/div>/)?.[1] ?? '';
    expect(prose.trimStart(), 'body must open with a paragraph, not a heading or image').toMatch(/^<p\b/);
    const para = firstParagraph(html);
    expect(para && textOf(para).length, 'first paragraph empty').toBeGreaterThan(0);

    const w = words(textOf(para!));
    const phrase = norm(w.slice(0, Math.min(PHRASE_WORDS, w.length)).join(' '));
    expect(norm(textOf(html)), `"${phrase}" missing from static HTML`).toContain(phrase);
  });
});

describe('AEO 9: robots.txt for AI crawlers', () => {
  const robotsFile = join(DIST, 'robots.txt');
  const robots = existsSync(robotsFile) ? readFileSync(robotsFile, 'utf8') : '';

  function disallows(agent: string): string[] {
    const groups: { agents: string[]; rules: string[] }[] = [];
    let cur: { agents: string[]; rules: string[] } | null = null;
    let lastWasAgent = false;
    for (const raw of robots.split('\n')) {
      const line = raw.replace(/#.*/, '').trim();
      const m = line.match(/^([\w-]+)\s*:\s*(.*)$/);
      if (!m) continue;
      const key = m[1].toLowerCase();
      if (key === 'user-agent') {
        if (!cur || !lastWasAgent) groups.push((cur = { agents: [], rules: [] }));
        cur.agents.push(m[2].toLowerCase());
        lastWasAgent = true;
      } else {
        lastWasAgent = false;
        if (cur && key === 'disallow' && m[2]) cur.rules.push(m[2]);
      }
    }
    const specific = groups.filter((g) => g.agents.includes(agent.toLowerCase()));
    return (specific.length ? specific : groups.filter((g) => g.agents.includes('*'))).flatMap((g) => g.rules);
  }

  it('exists', () => expect(robots).not.toBe(''));
  it.each(AI_AGENTS.map((a) => [a]))('%s may fetch /, /notes, /llms.txt and note paths unless explicitly marked', (agent) => {
    const rules = disallows(agent);
    const paths = ['/', '/notes', '/llms.txt', ...notes.map((n) => `/notes/${n.slug}`)];
    const blocked = paths.filter((p) => rules.some((r) => p.startsWith(r)));
    if (blocked.length) {
      expect(robots, `${agent} is blocked from ${blocked.join(', ')} without a "${BLOCK_MARKER(agent)}" comment`).toContain(
        BLOCK_MARKER(agent)
      );
    }
  });
});

describe('AEO 11: definitional text on the about page', () => {
  it('has a quotable "Suhas Darsi is ..." sentence near the top, under the word limit', () => {
    const text = textOf(page('/about').html.match(/<main\b[\s\S]*?<\/main>/)![0]).slice(0, DEFINITION_WINDOW_CHARS);
    const sentence = text.match(new RegExp(`${PERSON_NAME} is [^.!?]*[.!?]`));
    expect(sentence, `no "${PERSON_NAME} is ..." sentence in the first ${DEFINITION_WINDOW_CHARS} characters`).toBeTruthy();
    expect(words(sentence![0]).length).toBeLessThanOrEqual(DEFINITION_MAX_WORDS);
  });
});

describe('AEO 12: sitemap still lists every indexable HTML page', () => {
  const sitemap = walk(DIST)
    .filter((f) => /sitemap-\d+\.xml$/.test(f))
    .map((f) => readFileSync(f, 'utf8'))
    .join('\n');
  const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  it.each(pages.filter((p) => p.url !== '/404').map((p) => [p.url]))('%s is listed', (url) => {
    expect(locs).toContain(url === '/' ? `${SITE}/` : `${SITE}${url}`);
  });
});
