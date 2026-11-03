import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

// Thresholds. Each is a deliberate bound, not a rubber stamp.
const SITE = 'https://suhasdarsi.com'; // canonical origin every absolute URL must use
const TITLE_MIN = 30; // shorter titles are too vague to rank or to read in a tab
const TITLE_MAX = 65; // Google truncates titles near 60 characters; 65 leaves a little slack
const DESC_MIN = 70; // below this a snippet says too little to earn a click
const DESC_MAX = 160; // Google truncates snippets near 155-160 characters

const ROOT = process.cwd();
const DIST = join(ROOT, 'dist');
const PUBLIC = join(ROOT, 'public');
const BLOG = join(ROOT, 'src/content/blog');

if (!existsSync(join(DIST, 'index.html'))) {
  throw new Error('dist/ is missing. Run `bun run build` before running the SEO verifier.');
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

function attrs(tag: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of tag.matchAll(/([a-zA-Z_:][-\w:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g)) {
    if (m[1] === tag.match(/^<\w+/)?.[0].slice(1)) continue;
    out[m[1].toLowerCase()] = decode(m[2] ?? m[3] ?? m[4] ?? '');
  }
  return out;
}

const tagsOf = (html: string, name: string) =>
  [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'gi'))].map((m) => m[0]);

const metas = (html: string) => tagsOf(html, 'meta').map(attrs);
const metaAll = (html: string, key: 'name' | 'property', value: string) =>
  metas(html).filter((m) => m[key] === value);
const metaContent = (html: string, key: 'name' | 'property', value: string) =>
  metaAll(html, key, value)[0]?.content;

/** HTML with script, style and template bodies removed so markup inside them is not counted. */
const body = (html: string) =>
  html.replace(/<(script|style|template)\b[\s\S]*?<\/\1>/gi, '');

function urlOf(file: string): string {
  const rel = relative(DIST, file).replace(/\\/g, '/').replace(/\.html$/, '');
  return rel === 'index' ? '/' : `/${rel}`;
}

const isNoindex = (html: string) =>
  metaAll(html, 'name', 'robots').some((m) => /noindex/i.test(m.content ?? ''));

const allPages = walk(DIST)
  .filter((f) => f.endsWith('.html'))
  .map((file) => {
    const html = readFileSync(file, 'utf8');
    return { file, url: urlOf(file), html, noindex: isNoindex(html) };
  });

const pages = allPages.filter(
  (p) => !p.noindex && p.url !== '/toolshed' && !p.url.startsWith('/toolshed/')
);

/** Resolve a site path to a file in dist/ (file format) or public/. */
function resolves(path: string): boolean {
  const clean = decodeURIComponent(path.split(/[?#]/)[0]);
  if (clean === '/' || clean === '') return existsSync(join(DIST, 'index.html'));
  const candidates = [
    join(DIST, clean),
    join(DIST, `${clean}.html`),
    join(DIST, clean, 'index.html'),
    join(PUBLIC, clean),
  ];
  return candidates.some((c) => existsSync(c) && statSync(c).isFile());
}

function toSitePath(ref: string): string | null {
  if (/^(mailto:|tel:|data:|javascript:|blob:|#)/i.test(ref)) return null;
  if (ref.startsWith('//')) return null;
  if (ref.startsWith(SITE)) return ref.slice(SITE.length) || '/';
  if (/^[a-z][a-z0-9+.-]*:/i.test(ref)) return null;
  if (ref.startsWith('/')) return ref;
  return null;
}

function frontmatter(file: string): { title: string; description: string; draft: boolean } {
  const fm = readFileSync(file, 'utf8').match(/^---\n([\s\S]*?)\n---/)![1];
  const get = (k: string) => {
    const m = fm.match(new RegExp(`^${k}:\\s*(?:"((?:[^"\\\\]|\\\\.)*)"|'([^']*)'|(.+))\\s*$`, 'm'));
    return m ? (m[1] ?? m[2] ?? m[3]).trim() : '';
  };
  return { title: get('title'), description: get('description'), draft: get('draft') === 'true' };
}

const label = (p: { url: string }) => p.url;

describe('SEO: test fixture sanity', () => {
  it('finds indexable pages, including the homepage, notes index, and notes', () => {
    const urls = pages.map((p) => p.url);
    expect(urls).toContain('/');
    expect(urls).toContain('/notes');
    expect(urls.filter((u) => u.startsWith('/notes/')).length).toBeGreaterThan(0);
  });

  it('treats pocket-card, 404 and toolshed as non-indexable', () => {
    const urls = pages.map((p) => p.url);
    expect(urls).not.toContain('/pocket-card');
    expect(urls).not.toContain('/404');
    expect(urls.some((u) => u.startsWith('/toolshed'))).toBe(false);
  });
});

describe('SEO: per-page head', () => {
  it('1. has exactly one <html lang> and a viewport meta', () => {
    const bad: string[] = [];
    for (const p of pages) {
      const htmlTags = tagsOf(p.html, 'html');
      const lang = htmlTags.length === 1 ? attrs(htmlTags[0]).lang : undefined;
      const viewports = metaAll(p.html, 'name', 'viewport');
      if (htmlTags.length !== 1 || !lang || !/^[a-z]{2,3}(-[A-Za-z0-9]+)*$/.test(lang) || viewports.length !== 1 || !/width=device-width/.test(viewports[0].content ?? ''))
        bad.push(label(p));
    }
    expect(bad).toEqual([]);
  });

  it(`2. has exactly one <title> of ${TITLE_MIN}-${TITLE_MAX} chars, unique across pages`, () => {
    const bad: string[] = [];
    const seen = new Map<string, string>();
    for (const p of pages) {
      const titles = [...p.html.matchAll(/<title\b[^>]*>([\s\S]*?)<\/title>/gi)];
      if (titles.length !== 1) {
        bad.push(`${label(p)}: ${titles.length} <title> tags`);
        continue;
      }
      const t = decode(titles[0][1]).trim();
      if (t.length < TITLE_MIN || t.length > TITLE_MAX) bad.push(`${label(p)}: title length ${t.length} ("${t}")`);
      if (seen.has(t)) bad.push(`${label(p)}: title duplicates ${seen.get(t)} ("${t}")`);
      seen.set(t, label(p));
    }
    expect(bad).toEqual([]);
  });

  it(`3. has exactly one meta description of ${DESC_MIN}-${DESC_MAX} chars, unique across pages`, () => {
    const bad: string[] = [];
    const seen = new Map<string, string>();
    for (const p of pages) {
      const d = metaAll(p.html, 'name', 'description');
      if (d.length !== 1) {
        bad.push(`${label(p)}: ${d.length} description tags`);
        continue;
      }
      const c = (d[0].content ?? '').trim();
      if (c.length < DESC_MIN || c.length > DESC_MAX) bad.push(`${label(p)}: description length ${c.length}`);
      if (seen.has(c)) bad.push(`${label(p)}: description duplicates ${seen.get(c)}`);
      seen.set(c, label(p));
    }
    expect(bad).toEqual([]);
  });

  it('4. has exactly one canonical, absolute https on the site origin, matching its own URL, no trailing slash', () => {
    const bad: string[] = [];
    for (const p of pages) {
      const links = tagsOf(p.html, 'link').map(attrs).filter((l) => l.rel === 'canonical');
      if (links.length !== 1) {
        bad.push(`${label(p)}: ${links.length} canonical links`);
        continue;
      }
      const href = links[0].href ?? '';
      const expected = p.url === '/' ? `${SITE}/` : `${SITE}${p.url}`;
      // The homepage canonical is the bare origin; every other URL must not end in a slash.
      const ok = p.url === '/' ? href === SITE || href === `${SITE}/` : href === expected && !href.endsWith('/');
      if (!href.startsWith(`${SITE}`) || !ok) bad.push(`${label(p)}: canonical "${href}" (expected ${expected})`);
    }
    expect(bad).toEqual([]);
  });

  it('5. has complete Open Graph and Twitter tags with a resolvable absolute og:image', () => {
    const bad: string[] = [];
    for (const p of pages) {
      for (const prop of ['og:title', 'og:description', 'og:url', 'og:type', 'og:image', 'og:site_name']) {
        const m = metaAll(p.html, 'property', prop);
        if (m.length !== 1 || !(m[0].content ?? '').trim()) bad.push(`${label(p)}: ${prop} count=${m.length}`);
      }
      for (const name of ['twitter:card', 'twitter:title']) {
        const m = metaAll(p.html, 'name', name);
        if (m.length !== 1 || !(m[0].content ?? '').trim()) bad.push(`${label(p)}: ${name} count=${m.length}`);
      }
      const ogUrl = metaContent(p.html, 'property', 'og:url');
      const canonical = tagsOf(p.html, 'link').map(attrs).find((l) => l.rel === 'canonical')?.href;
      if (ogUrl !== canonical) bad.push(`${label(p)}: og:url "${ogUrl}" != canonical "${canonical}"`);
      const img = metaContent(p.html, 'property', 'og:image');
      if (img) {
        if (!img.startsWith(`${SITE}/`)) bad.push(`${label(p)}: og:image not absolute on site: ${img}`);
        else if (!resolves(img.slice(SITE.length))) bad.push(`${label(p)}: og:image missing from dist/public: ${img}`);
      }
    }
    expect(bad).toEqual([]);
  });
});

describe('SEO: page structure', () => {
  it('6. has exactly one h1 and no heading level skips', () => {
    const bad: string[] = [];
    for (const p of pages) {
      const levels = [...body(p.html).matchAll(/<h([1-6])\b/gi)].map((m) => Number(m[1]));
      const h1s = levels.filter((l) => l === 1).length;
      if (h1s !== 1) bad.push(`${label(p)}: ${h1s} h1 elements`);
      levels.forEach((l, i) => {
        if (i > 0 && l > levels[i - 1] + 1) bad.push(`${label(p)}: h${levels[i - 1]} followed by h${l}`);
      });
    }
    expect(bad).toEqual([]);
  });

  it('7. gives every image alt text and every empty link an aria-label', () => {
    const bad: string[] = [];
    for (const p of pages) {
      const html = body(p.html);
      for (const tag of tagsOf(html, 'img')) {
        const a = attrs(tag);
        if (!('alt' in a)) bad.push(`${label(p)}: <img> without alt: ${a.src}`);
        else if (a.alt === '' && !(a.role === 'presentation' || a['aria-hidden'] === 'true' || a.role === 'none'))
          // alt="" is allowed only as an explicit decorative marker; we accept it as such (WCAG H67).
          continue;
      }
      for (const m of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
        const a = attrs(`<a ${m[1]}>`);
        const inner = m[2];
        const text = decode(inner.replace(/<img\b[^>]*\balt="([^"]*)"[^>]*>/gi, ' $1 ').replace(/<[^>]*>/g, '')).trim();
        const svgTitle = /<svg\b[\s\S]*?<title\b/i.test(inner);
        if (!text && !svgTitle && !(a['aria-label'] ?? '').trim() && !(a['aria-labelledby'] ?? '').trim())
          bad.push(`${label(p)}: empty link href=${a.href}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('8. has no duplicate id attributes', () => {
    const bad: string[] = [];
    for (const p of pages) {
      const seen = new Set<string>();
      for (const m of body(p.html).matchAll(/<[a-z][\w-]*\b[^>]*?\sid=(?:"([^"]*)"|'([^']*)'|([^\s>]+))[^>]*>/gi)) {
        const id = m[1] ?? m[2] ?? m[3];
        if (seen.has(id)) bad.push(`${label(p)}: duplicate id "${id}"`);
        seen.add(id);
      }
    }
    expect(bad).toEqual([]);
  });

  it('9. resolves every internal href and src to a file in dist/', () => {
    const bad: string[] = [];
    for (const p of pages) {
      const html = body(p.html);
      const refs = [...html.matchAll(/<[a-z][\w-]*\b[^>]*?\s(?:href|src)=(?:"([^"]*)"|'([^']*)')[^>]*>/gi)].flatMap((m) => {
        const tag = attrs(m[0]);
        return [tag.href, tag.src].filter((v): v is string => !!v);
      });
      for (const ref of new Set(refs)) {
        const path = toSitePath(ref);
        if (path === null) continue;
        if (path.startsWith('/cdn-cgi/')) continue; // injected by Cloudflare at the edge, not built
        if (!resolves(path)) bad.push(`${label(p)}: broken ${ref}`);
      }
    }
    expect(bad).toEqual([]);
  });
});

describe('SEO: sitemap, robots, feeds', () => {
  const sitemapIndex = existsSync(join(DIST, 'sitemap-index.xml')) ? readFileSync(join(DIST, 'sitemap-index.xml'), 'utf8') : '';
  const sitemapFiles = [...sitemapIndex.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const locs = sitemapFiles.flatMap((u) => {
    const f = join(DIST, u.replace(SITE, ''));
    return existsSync(f) ? [...readFileSync(f, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]) : [];
  });

  it('10. sitemap lists every indexable page with absolute URLs, no excluded pages, no duplicates', () => {
    expect(sitemapFiles.length, 'dist/sitemap-index.xml has no <loc> entries').toBeGreaterThan(0);
    for (const u of sitemapFiles) expect(existsSync(join(DIST, u.replace(SITE, ''))), `sitemap file ${u}`).toBe(true);
    expect(locs.length).toBeGreaterThan(0);
    expect(locs.filter((l) => !l.startsWith(`${SITE}`))).toEqual([]);
    expect(locs.filter((l, i) => locs.indexOf(l) !== i), 'duplicates').toEqual([]);
    expect(locs.filter((l) => /\/pocket-card|\/toolshed/.test(l)), 'excluded pages listed').toEqual([]);
    const norm = (l: string) => l.replace(SITE, '').replace(/\/$/, '') || '/';
    const listed = new Set(locs.map(norm));
    const missing = pages.map((p) => p.url).filter((u) => !listed.has(u));
    expect(missing, 'indexable pages missing from sitemap').toEqual([]);
    const extra = [...listed].filter((u) => !pages.some((p) => p.url === u));
    expect(extra, 'sitemap entries with no indexable page').toEqual([]);
  });

  it('11. robots.txt points at the sitemap and does not block the homepage or notes', () => {
    const file = join(DIST, 'robots.txt');
    expect(existsSync(file), 'dist/robots.txt').toBe(true);
    const txt = readFileSync(file, 'utf8');
    const sm = txt.match(/^Sitemap:\s*(\S+)/im)?.[1];
    expect(sm, 'Sitemap line').toBeTruthy();
    expect(sm!.startsWith(SITE)).toBe(true);
    expect(existsSync(join(DIST, sm!.replace(SITE, ''))), `sitemap ${sm} exists in dist`).toBe(true);
    const disallows = [...txt.matchAll(/^Disallow:\s*(\S*)/gim)].map((m) => m[1]).filter(Boolean);
    for (const path of ['/', '/notes', '/notes/any-note']) {
      expect(disallows.filter((d) => path.startsWith(d)), `Disallow rules matching ${path}`).toEqual([]);
    }
  });

  it('12. rss.xml is valid and complete, and the homepage advertises it', () => {
    const file = join(DIST, 'rss.xml');
    expect(existsSync(file), 'dist/rss.xml').toBe(true);
    const xml = readFileSync(file, 'utf8');
    expect(xml.trimStart().startsWith('<?xml'), 'XML declaration').toBe(true);
    expect(xml.match(/<rss\b[^>]*>/g)?.length).toBe(1);
    expect(xml.match(/<\/rss>\s*$/)).toBeTruthy();
    const channelHead = xml.slice(xml.indexOf('<channel>'), xml.indexOf('<item>'));
    for (const t of ['title', 'link', 'description']) expect(channelHead, `channel ${t}`).toMatch(new RegExp(`<${t}>[^<]+</${t}>|<${t}><!\\[CDATA\\[[^\\]]+\\]\\]></${t}>`));
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1]);
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      for (const t of ['title', 'link', 'pubDate', 'description']) expect(item, `item ${t}`).toMatch(new RegExp(`<${t}>(?:<!\\[CDATA\\[)?[^<]+`));
      const link = item.match(/<link>([^<]+)<\/link>/)![1];
      expect(link.startsWith(`${SITE}/`)).toBe(true);
      expect(resolves(link.slice(SITE.length)), `item link ${link} resolves`).toBe(true);
      expect(Number.isNaN(Date.parse(item.match(/<pubDate>([^<]+)<\/pubDate>/)![1]))).toBe(false);
    }
    const home = allPages.find((p) => p.url === '/')!;
    const alt = tagsOf(home.html, 'link').map(attrs).find((l) => l.rel === 'alternate' && l.type === 'application/rss+xml');
    expect(alt?.href, 'homepage rss alternate link').toBeTruthy();
    expect(resolves(alt!.href)).toBe(true);
  });

  it('13. note pages take title and description from frontmatter, unique and descriptive', () => {
    const notes = readdirSync(BLOG)
      .filter((f) => f.endsWith('.md'))
      .map((f) => ({ slug: f.replace(/\.md$/, ''), ...frontmatter(join(BLOG, f)) }))
      .filter((n) => !n.draft);
    expect(notes.length).toBeGreaterThan(0);
    const bad: string[] = [];
    for (const n of notes) {
      const page = pages.find((p) => p.url === `/notes/${n.slug}`);
      if (!page) {
        bad.push(`${n.slug}: no built page`);
        continue;
      }
      const title = decode(page.html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '').trim();
      const desc = metaContent(page.html, 'name', 'description');
      if (!title.includes(n.title)) bad.push(`${n.slug}: <title> "${title}" lacks frontmatter title "${n.title}"`);
      if (desc !== n.description) bad.push(`${n.slug}: description differs from frontmatter`);
      if (metaContent(page.html, 'property', 'og:description') !== n.description) bad.push(`${n.slug}: og:description differs`);
      if (n.title.split(/\s+/).length < 3) bad.push(`${n.slug}: title too short to be descriptive`);
    }
    expect(new Set(notes.map((n) => n.title)).size, 'unique note titles').toBe(notes.length);
    expect(new Set(notes.map((n) => n.description)).size, 'unique note descriptions').toBe(notes.length);
    expect(bad).toEqual([]);
  });
});
