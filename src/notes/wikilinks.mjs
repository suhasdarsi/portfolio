import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, extname, join, relative, resolve, sep } from 'node:path';
import { parseFrontmatter } from 'astro/markdown';
import { NOTES_DIRECTORY, isHiddenFolder, isPublished, noteHref, noteId } from './publishing.mjs';
import { slugify } from '../site/slug.mjs';
import { escapeHtml, stripComments } from './obsidian.mjs';

function markdownFiles(directory) {
  if (!existsSync(directory)) return [];

  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return isHiddenFolder(entry.name) ? [] : markdownFiles(path);
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

export function safeDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value; // not percent-encoded; use it as written
  }
}

// "Note title#Heading" → the note part and the heading part.
function parseTarget(rawTarget) {
  const decoded = safeDecode(rawTarget);
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

    const path = relative(root, file).slice(0, -extname(file).length).split(sep).join('/');
    const id = noteId(path);
    const sameAddress = documents.slice(0, -1).find((other) => other.id === id);
    if (sameAddress) throw new Error(`${file} and ${sameAddress.file} would both be published at ${noteHref(id)}. Rename one.`);
    document.id = id;
    const title = typeof document.data.title === 'string' && document.data.title.trim()
      ? document.data.title.trim()
      : basename(file, extname(file));
    const entry = { id, title, href: noteHref(id) };

    const aliases = [document.data.aliases].flat().filter((alias) => typeof alias === 'string' && alias.trim());
    for (const key of new Set([id, path, basename(path), title, slugify(title), ...aliases])) {
      const normalized = normalizeTarget(key);
      const existing = index.get(normalized);
      if (existing && existing.id !== entry.id) {
        throw new Error(`Ambiguous wikilink target "${key}" matches both ${existing.href} and ${entry.href}.`);
      }
      index.set(normalized, entry);
    }
  }

  // A link to a note that isn't written or published yet is allowed: it shows as plain text until that note
  // goes live (see wikilinkRoutesPlugin). Block references can't be shown at all, so they stop the build.
  for (const { file, content } of documents) {
    for (const rawTarget of extractWikilinkTargets(content)) {
      try {
        rejectBlockReference(parseTarget(rawTarget));
      } catch (error) {
        throw new Error(`${file}: ${error.message}`);
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
  return [...stripComments(markdown).matchAll(/(?<!!)\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)].map((match) => match[1].trim());
}

export function wikilinkRoutesPlugin() {
  return {
    name: 'wikilink-routes',
    link(node, context) {
      const resolved = resolveWikilink(node.url);
      if (!resolved) {
        // Written as [[link]] to a note that isn't live: show the words, not a dead link. Ordinary Markdown
        // links ([text](file.pdf), [text](https://…)) never come through here.
        if (!extractWikilinkTargets(context.source).includes(safeDecode(node.url).trim())) return;
        context.replaceNode(node, {
          type: 'html',
          value: `<span class="wikilink unwritten" title="This note isn’t published yet">${escapeHtml(context.textContent(node))}</span>`,
        });
        return;
      }

      context.setProperty(node, 'url', resolved.href);
      context.setProperty(node, 'data', {
        ...node.data,
        hProperties: { ...node.data?.hProperties, className: ['wikilink'] },
      });
    },
  };
}
