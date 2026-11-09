import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/*
 * Readability verifier. Static text metrics for every note, computed from the built
 * dist/notes/<slug>.html (rendered body) and the markdown frontmatter in src/content/blog.
 * Rendered typography (size, line length, contrast, spacing) lives in
 * tests/browser/readability.spec.ts. Related checks that already exist and are NOT repeated:
 *   - title/description length for search: tests/quality/seo.test.ts
 *   - answer-engine structure: tests/quality/aeo.test.ts
 *   - type scale (13/16/28px) and 16px/1.6 body: tests/browser/typography.spec.ts, reading.spec.ts
 *
 * Counted text: the rendered note body (<div class="prose">) only. <pre>, <code>, <svg>,
 * <figure>, <table>, nav, footer and the table of contents sit outside that div or are
 * stripped before counting.
 *
 * Thresholds are set where a well-edited technical article passes, not at plain-language
 * targets: AI security writing carries jargon and long compound terms, so Flesch Reading
 * Ease is held at 'difficult but fine for a technical audience' rather than 60+.
 */
const FLESCH_MIN = 30; // 30-50 = "difficult" (college level); below 30 is dense academic prose
const GRADE_MAX = 16; // Flesch-Kincaid grade: 16 = college graduate; fair for technical writing
const AVG_SENTENCE_MAX = 28; // words; plain-English guides say 20, technical prose often runs 22-26
const PARAGRAPH_MAX = 150; // words; beyond this a paragraph is a wall of text on a 66ch column
const SENTENCE_MAX = 60; // words; a single sentence this long cannot be held in working memory
const HEADING_MAX_WORDS = 12; // h2/h3 should scan at a glance
const DESC_MIN_WORDS = 12;
const DESC_MAX_WORDS = 40;
const TITLE_MAX_CHARS = 70;
const LIST_ITEM_MAX = 60; // words
const HEADINGS_REQUIRED_OVER = 300; // words; longer bodies need headings to be skimmable

const ROOT = process.cwd();
const DIST_NOTES = join(ROOT, 'dist/notes');
const BLOG = join(ROOT, 'src/content/blog');

if (!existsSync(DIST_NOTES)) {
  throw new Error('dist/ is missing. Run `bun run build` before running the readability verifier.');
}

const decode = (s: string) =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

const squash = (s: string) => decode(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const words = (s: string) => s.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w));

/** Extract the inner HTML of <div class="prose"> by counting nested divs. */
function proseHtml(html: string): string {
  const start = html.indexOf('<div class="prose"');
  if (start < 0) return '';
  const open = html.indexOf('>', start) + 1;
  let depth = 1;
  const re = /<(\/?)div\b[^>]*>/g;
  re.lastIndex = open;
  for (let m = re.exec(html); m; m = re.exec(html)) {
    depth += m[1] ? -1 : 1;
    if (depth === 0) return html.slice(open, m.index);
  }
  return html.slice(open);
}

/** Remove everything that is not running prose. */
const stripNonProse = (h: string) =>
  h.replace(/<(pre|code|svg|figure|table|script|style)\b[\s\S]*?<\/\1>/g, ' ');

type Block = { tag: string; text: string; hadCode: boolean };

function blocks(prose: string): Block[] {
  const out: Block[] = [];
  const re = /<(p|li|h2|h3|h4|blockquote)\b[^>]*>([\s\S]*?)<\/\1>/g;
  // Process leaf blocks only: strip nested p inside li/blockquote by taking the outer element once.
  const cleaned = stripNonProse(prose);
  for (const m of cleaned.matchAll(re)) {
    const original = m[2];
    const text = squash(original);
    if (text) out.push({ tag: m[1], text, hadCode: false });
  }
  // Mark list items / paragraphs that held inline code in the original HTML.
  const codeRe = /<(p|li|h2|h3|h4|blockquote)\b[^>]*>([\s\S]*?)<\/\1>/g;
  let i = 0;
  const outer = prose.replace(/<(pre|svg|figure|table)\b[\s\S]*?<\/\1>/g, ' ');
  for (const m of outer.matchAll(codeRe)) {
    const text = squash(m[2].replace(/<(code)\b[\s\S]*?<\/\1>/g, ' '));
    if (!text) continue;
    if (out[i] && /<code\b/.test(m[2])) out[i].hadCode = true;
    i++;
  }
  return out;
}

/** Sentence split on . ! ? followed by whitespace and an opening capital/quote/digit. */
function sentences(text: string): string[] {
  const guarded = text.replace(/\b(e\.g|i\.e|etc|vs|Dr|Mr|Ms|No|Fig|approx)\./g, (x) => x.replace('.', '\u0000'));
  return guarded
    .split(/(?<=[.!?]["'”’)]?)\s+(?=["'“‘(]?[A-Z0-9])/)
    .map((s) => s.replace(/\u0000/g, '.').trim())
    .filter((s) => words(s).length > 0);
}

/**
 * Syllable heuristic (the usual vowel-group method): lowercase, strip non-letters, drop a
 * trailing silent 'e' (but not 'le' after a consonant), drop trailing 'es'/'ed' that do not
 * add a syllable, then count groups of consecutive vowels (a e i o u y). Minimum 1 per word.
 * It is approximate (about 90% of words exact); good enough to compare notes and flag outliers.
 */
function syllables(word: string): number {
  let w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  if (w.length <= 3) return 1;
  w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '');
  const groups = w.match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups ? groups.length : 1);
}

function scores(prose: string) {
  const bs = blocks(prose).filter((b) => b.tag !== 'h2' && b.tag !== 'h3' && b.tag !== 'h4');
  // Flesch is defined on sentences; a list item or paragraph counts as ending a sentence.
  const sents = bs.flatMap((b) => sentences(b.text));
  const ws = sents.flatMap(words);
  const syl = ws.reduce((n, w) => n + syllables(w), 0);
  const W = ws.length;
  const S = sents.length;
  const fre = 206.835 - 1.015 * (W / S) - 84.6 * (syl / W);
  const fk = 0.39 * (W / S) + 11.8 * (syl / W) - 15.59;
  return { W, S, avg: W / S, fre, fk };
}

const slugs = readdirSync(BLOG)
  .filter((f) => f.endsWith('.md'))
  .map((f) => f.replace(/\.md$/, ''));

function frontmatter(slug: string): Record<string, string> {
  const raw = readFileSync(join(BLOG, `${slug}.md`), 'utf-8');
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const out: Record<string, string> = {};
  for (const line of (m?.[1] ?? '').split(/\r?\n/)) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (kv) out[kv[1]] = kv[2].trim().replace(/^(["'])([\s\S]*)\1$/, '$2');
  }
  return out;
}

describe('readability sanity', () => {
  it('finds a note for every markdown source', () => {
    expect(slugs.length).toBeGreaterThan(0);
    for (const slug of slugs) expect(existsSync(join(DIST_NOTES, `${slug}.html`)), slug).toBe(true);
  });
  it('syllable heuristic is sane', () => {
    expect(syllables('cat')).toBe(1);
    expect(syllables('network')).toBe(2);
    expect(syllables('compression')).toBe(3);
    expect(syllables('table')).toBe(2);
  });
});

describe.each(slugs)('note %s', (slug) => {
  const html = readFileSync(join(DIST_NOTES, `${slug}.html`), 'utf-8');
  const prose = proseHtml(html);
  const bs = blocks(prose);
  const fm = frontmatter(slug);
  const path = `src/content/blog/${slug}.md`;

  it('has a rendered body', () => {
    expect(prose.length, slug).toBeGreaterThan(0);
    expect(bs.length, slug).toBeGreaterThan(0);
  });

  it(`1. Flesch Reading Ease >= ${FLESCH_MIN} and grade <= ${GRADE_MAX}`, () => {
    const s = scores(prose);
    console.log(
      `[readability] ${slug}: words=${s.W} sentences=${s.S} avgSentence=${s.avg.toFixed(1)} FleschEase=${s.fre.toFixed(1)} FKGrade=${s.fk.toFixed(1)}`
    );
    expect(s.fre, `${path} Flesch Reading Ease`).toBeGreaterThanOrEqual(FLESCH_MIN);
    expect(s.fk, `${path} Flesch-Kincaid grade`).toBeLessThanOrEqual(GRADE_MAX);
  });

  it(`2. average sentence length <= ${AVG_SENTENCE_MAX} words`, () => {
    expect(scores(prose).avg, path).toBeLessThanOrEqual(AVG_SENTENCE_MAX);
  });

  it(`3. no paragraph over ${PARAGRAPH_MAX} words`, () => {
    const long = bs.filter((b) => b.tag === 'p' && words(b.text).length > PARAGRAPH_MAX);
    expect(long.map((b) => `${words(b.text).length}w: ${b.text.slice(0, 60)}`), path).toEqual([]);
  });

  it(`4. no sentence over ${SENTENCE_MAX} words`, () => {
    const long = bs
      .filter((b) => !(b.tag === 'li' && b.hadCode) && !/^h\d$/.test(b.tag))
      .flatMap((b) => sentences(b.text))
      .filter((s) => words(s).length > SENTENCE_MAX);
    expect(long.map((s) => `${words(s).length}w: ${s.slice(0, 60)}`), path).toEqual([]);
  });

  it(`5. h2/h3 are at most ${HEADING_MAX_WORDS} words and unique on the page`, () => {
    const heads = bs.filter((b) => b.tag === 'h2' || b.tag === 'h3').map((b) => b.text);
    expect(heads.filter((h) => words(h).length > HEADING_MAX_WORDS), path).toEqual([]);
    const lower = heads.map((h) => h.toLowerCase());
    expect(lower.filter((h, i) => lower.indexOf(h) !== i), `${path} duplicate headings`).toEqual([]);
  });

  it(`6. description is ${DESC_MIN_WORDS}-${DESC_MAX_WORDS} words and a complete sentence`, () => {
    const d = fm.description ?? '';
    const n = words(d).length;
    expect(n, `${path} description words`).toBeGreaterThanOrEqual(DESC_MIN_WORDS);
    expect(n, `${path} description words`).toBeLessThanOrEqual(DESC_MAX_WORDS);
    expect(d, `${path} description ends a sentence`).toMatch(/[.?!]["'”’)]?$/);
    expect(d, `${path} description starts a sentence`).toMatch(/^["'“‘(]?[A-Z0-9]/);
  });

  it(`7. title is at most ${TITLE_MAX_CHARS} characters`, () => {
    expect(fm.title, path).toBeTruthy();
    expect(fm.title.length, path).toBeLessThanOrEqual(TITLE_MAX_CHARS);
  });

  it(`8. no list item over ${LIST_ITEM_MAX} words`, () => {
    const long = bs.filter((b) => b.tag === 'li' && words(b.text).length > LIST_ITEM_MAX);
    expect(long.map((b) => `${words(b.text).length}w: ${b.text.slice(0, 60)}`), path).toEqual([]);
  });

  it(`9. bodies over ${HEADINGS_REQUIRED_OVER} words have at least one heading`, () => {
    const total = bs.reduce((n, b) => n + words(b.text).length, 0);
    const heads = bs.filter((b) => /^h[23]$/.test(b.tag)).length;
    if (total > HEADINGS_REQUIRED_OVER) expect(heads, `${path} (${total} words)`).toBeGreaterThan(0);
  });
});
