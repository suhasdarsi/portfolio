import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, extname, join, relative, resolve, sep } from 'node:path';
import { parseFrontmatter } from 'astro/markdown';
import { NOTES_DIRECTORY, isPublished, noteHref } from './publishing.mjs';
import { slugify } from '../site/slug.mjs';

function markdownFiles(directory) {
  if (!existsSync(directory)) return [];

  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return markdownFiles(path);
    return extname(entry.name).toLowerCase() === '.md' ? [path] : [];
  });
}

function parseMarkdownDocument(file) {
  const parsed = parseFrontmatter(readFileSync(file, 'utf8'), { frontmatter: 'empty-with-spaces' });
  return { file, content: parsed.content, data: parsed.frontmatter ?? {} };
}

function normalizeTarget(value) {
  return value
    .normalize('NFKC')
    .trim()
    .replace(/\\/g, '/')
    .replace(/\.md$/i, '')
    .toLocaleLowerCase();
}

function headingSlug(value) {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-');
}

// "Note title#Heading" → the note part and the heading part.
function parseTarget(rawTarget) {
  let decoded = rawTarget;
  try {
    decoded = decodeURIComponent(rawTarget);
  } catch {
    // Not percent-encoded; use it as written.
  }
  const [target, ...rest] = decoded.split('#');
  return { decoded, key: normalizeTarget(target), fragment: rest.join('#') };
}

function rejectBlockReference({ decoded, fragment }) {
  if (fragment.startsWith('^')) throw new Error(`Block-reference wikilinks are not supported yet: "${decoded}".`);
}

export function buildWikilinkIndex(directory = NOTES_DIRECTORY) {
  const root = resolve(process.cwd(), directory);
  const index = new Map();
  const documents = [];

  for (const file of markdownFiles(root)) {
    const document = parseMarkdownDocument(file);
    if (!isPublished(document.data)) continue;
    documents.push(document);

    const id = relative(root, file).slice(0, -extname(file).length).split(sep).join('/');
    const title = typeof document.data.title === 'string' && document.data.title.trim()
      ? document.data.title.trim()
      : basename(file, extname(file));
    const entry = { id, title, href: noteHref(id) };

    for (const key of new Set([id, basename(id), title, slugify(title)])) {
      const normalized = normalizeTarget(key);
      const existing = index.get(normalized);
      if (existing && existing.id !== entry.id) {
        throw new Error(`Ambiguous wikilink target "${key}" matches both ${existing.href} and ${entry.href}.`);
      }
      index.set(normalized, entry);
    }
  }

  for (const { file, content } of documents) {
    for (const rawTarget of extractWikilinkTargets(content)) {
      const target = parseTarget(rawTarget);
      try {
        rejectBlockReference(target);
      } catch (error) {
        throw new Error(`${file}: ${error.message}`);
      }
      if (!index.has(target.key)) {
        throw new Error(`${file}: linked note "${target.decoded}" does not exist or is unpublished.`);
      }
    }
  }

  return index;
}

let cachedIndex;
let cachedFingerprint;

// Rebuild only when a note file changed, so the dev server picks up edits without re-reading on every link.
function getWikilinkIndex() {
  const fingerprint = markdownFiles(resolve(process.cwd(), NOTES_DIRECTORY))
    .map((file) => {
      const stat = statSync(file);
      return `${file}:${stat.size}:${stat.mtimeMs}`;
    })
    .sort()
    .join('|');
  if (!cachedIndex || fingerprint !== cachedFingerprint) {
    cachedIndex = buildWikilinkIndex();
    cachedFingerprint = fingerprint;
  }
  return cachedIndex;
}

export function resolveWikilink(rawTarget, index = getWikilinkIndex()) {
  const target = parseTarget(rawTarget);
  const entry = index.get(target.key);
  if (!entry) return undefined;
  rejectBlockReference(target);
  const { fragment } = target;
  return { ...entry, href: fragment ? `${entry.href}#${headingSlug(fragment)}` : entry.href };
}

export function extractWikilinkTargets(markdown) {
  return [...markdown.matchAll(/(?<!!)\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)].map((match) => match[1].trim());
}

export function wikilinkRoutesPlugin() {
  return {
    name: 'wikilink-routes',
    link(node, context) {
      const resolved = resolveWikilink(node.url);
      if (!resolved) return;

      context.setProperty(node, 'url', resolved.href);
      context.setProperty(node, 'data', {
        ...node.data,
        hProperties: { ...node.data?.hProperties, className: ['wikilink'] },
      });
    },
  };
}
