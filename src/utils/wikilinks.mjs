import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { parseFrontmatter } from 'astro/markdown';
import { contentCollections, isPublishedContent } from './content-routes.mjs';

function resolveCollectionDirectory(collection) {
  return isAbsolute(collection.directory) ? collection.directory : resolve(process.cwd(), collection.directory);
}

function markdownFiles(directory) {
  if (!existsSync(directory)) return [];

  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return markdownFiles(path);
    return extname(entry.name).toLowerCase() === '.md' ? [path] : [];
  });
}

function parseMarkdownDocument(file) {
  const raw = readFileSync(file, 'utf8');
  const parsed = parseFrontmatter(raw, { frontmatter: 'empty-with-spaces' });
  return {
    file,
    content: parsed.content,
    data: parsed.frontmatter ?? {},
  };
}

function decodeTarget(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function normalizeTarget(value) {
  return value
    .normalize('NFKC')
    .trim()
    .replace(/\\/g, '/')
    .replace(/\.md$/i, '')
    .toLocaleLowerCase();
}

function slugify(value) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function headingSlug(value) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-');
}

export function buildWikilinkIndex(collections = contentCollections) {
  const index = new Map();
  const documents = [];

  for (const collection of collections) {
    const directory = resolveCollectionDirectory(collection);

    for (const file of markdownFiles(directory)) {
      const id = relative(directory, file)
        .slice(0, -extname(file).length)
        .split(sep)
        .join('/');
      const document = parseMarkdownDocument(file);

      if (!isPublishedContent(document.data)) continue;

      documents.push(document);
      const title = typeof document.data.title === 'string' && document.data.title.trim()
        ? document.data.title.trim()
        : basename(file, extname(file));
      const entry = {
        collection: collection.name,
        id,
        title,
        href: `${collection.routePrefix}${id}`,
      };
      const keys = new Set([id, basename(id), title, slugify(title)]);

      for (const key of keys) {
        const normalized = normalizeTarget(key);
        const existing = index.get(normalized);
        if (existing && (existing.collection !== entry.collection || existing.id !== entry.id)) {
          throw new Error(
            `Ambiguous wikilink target "${key}" matches both ${existing.href} and ${entry.href}.`
          );
        }
        index.set(normalized, entry);
      }
    }
  }

  for (const { file, content } of documents) {
    for (const rawTarget of extractWikilinkTargets(content)) {
      const decoded = decodeTarget(rawTarget);
      const hashIndex = decoded.indexOf('#');
      const target = hashIndex >= 0 ? decoded.slice(0, hashIndex) : decoded;
      const fragment = hashIndex >= 0 ? decoded.slice(hashIndex + 1) : '';
      if (fragment.startsWith('^')) {
        throw new Error(`${file}: block-reference wikilinks are not supported yet: "${decoded}".`);
      }
      if (!index.has(normalizeTarget(target))) {
        throw new Error(`${file}: linked note "${decoded}" does not exist or is unpublished.`);
      }
    }
  }

  return index;
}

let cachedIndex;
let cachedFingerprint;

function contentFingerprint(collections = contentCollections) {
  return collections.flatMap((collection) => {
    const directory = resolveCollectionDirectory(collection);
    return markdownFiles(directory).map((file) => {
      const stat = statSync(file);
      return `${file}:${stat.size}:${stat.mtimeMs}`;
    });
  }).sort().join('|');
}

export function getWikilinkIndex(collections = contentCollections) {
  const fingerprint = contentFingerprint(collections);
  if (!cachedIndex || fingerprint !== cachedFingerprint) {
    cachedIndex = buildWikilinkIndex(collections);
    cachedFingerprint = fingerprint;
  }
  return cachedIndex;
}

export function resolveWikilink(rawTarget, index = getWikilinkIndex()) {
  const decoded = decodeTarget(rawTarget);
  const hashIndex = decoded.indexOf('#');
  const target = hashIndex >= 0 ? decoded.slice(0, hashIndex) : decoded;
  const fragment = hashIndex >= 0 ? decoded.slice(hashIndex + 1) : '';
  const entry = index.get(normalizeTarget(target));

  if (!entry) return undefined;
  if (fragment.startsWith('^')) {
    throw new Error(`Block-reference wikilinks are not supported yet: "${decoded}".`);
  }

  return {
    ...entry,
    href: fragment ? `${entry.href}#${headingSlug(fragment)}` : entry.href,
  };
}

export function extractWikilinkTargets(markdown) {
  return [...markdown.matchAll(/(?<!!)\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)].map((match) =>
    match[1].trim()
  );
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
        hProperties: {
          ...node.data?.hProperties,
          className: ['wikilink'],
        },
      });
    },
  };
}
