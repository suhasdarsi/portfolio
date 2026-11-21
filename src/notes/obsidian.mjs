// Obsidian syntax the Markdown parser doesn't know, so a note reads the same on the site as in Obsidian:
// callouts (`> [!note] Title`), highlights (`==text==`), comments (`%%private%%`, never published) and
// embeds (`![[picture.png]]`, found anywhere in the notes folder like Obsidian's shortest-path links).
// An SVG in the notes folder placed alone on a line (`![alt](illustrations/x.svg)`) is inlined as a figure, so it
// takes the site's colours, fonts, dark theme and reduced-motion rule (.ill in site.css).
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NOTES_DIRECTORY } from './publishing.mjs';
import { resolveWikilink, safeDecode } from './wikilinks.mjs';

const IMAGE = /\.(png|jpe?g|gif|webp|avif|svg)$/i;
const COMMENT = /%%[\s\S]*?%%/g;
const FENCE = /(^```[\s\S]*?^```[^\n]*$)/m;

export function escapeHtml(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Markdown without `%%comments%%`. Code fences are left alone: `%%` means something else in mermaid. */
export function stripComments(markdown) {
  return markdown
    .split(FENCE)
    .map((part, i) => (i % 2 ? part : part.replace(COMMENT, '')))
    .join('');
}

function files(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name.startsWith('.')) return [];
    const path = join(directory, entry.name);
    return entry.isDirectory() ? files(path) : [path];
  });
}

// "picture.png" or "attachments/picture.png" → the file, wherever it is in the vault.
function findInVault(target) {
  const wanted = target.replace(/\\/g, '/').toLowerCase();
  const root = resolve(process.cwd(), NOTES_DIRECTORY);
  const matches = files(root).filter((file) => {
    const path = relative(root, file).split(sep).join('/').toLowerCase();
    return path === wanted || path.endsWith(`/${wanted}`);
  });
  if (matches.length > 1) throw new Error(`"${target}" matches more than one file in the notes folder: ${matches.join(', ')}.`);
  return matches[0];
}

export function obsidianSyntaxPlugin() {
  return {
    name: 'obsidian-syntax',

    // > [!warning] Title  → a titled callout box. A fold marker (+ or -) is accepted and ignored.
    blockquote(node, context) {
      const paragraph = node.children[0];
      const first = paragraph?.type === 'paragraph' ? paragraph.children[0] : undefined;
      const match = first?.type === 'text' ? first.value.match(/^\[!([\w-]+)\][+-]?[ \t]*([^\n]*)\n?/) : null;
      if (!match) return;
      const kind = match[1].toLowerCase();
      const title = match[2].trim() || kind.charAt(0).toUpperCase() + kind.slice(1);
      context.setProperty(node, 'data', { hName: 'aside', hProperties: { className: ['callout', `callout-${kind}`] } });
      context.setProperty(first, 'value', first.value.slice(match[0].length));
      context.insertBefore(paragraph, {
        type: 'paragraph',
        data: { hProperties: { className: ['callout-title'] } },
        children: [{ type: 'text', value: title }],
      });
    },

    text(node, context) {
      if (!node.value.includes('%%') && !node.value.includes('==')) return;
      const visible = node.value.replace(COMMENT, '');
      // A comment that starts here and ends in another node can't be removed safely: stop rather than publish it.
      if (visible.includes('%%')) {
        throw new Error(`${fileOf(context)}: a %%comment%% contains formatting or a blank line. Keep comments as plain text in one paragraph.`);
      }
      const parts = visible.split(/==(?=\S)(.+?)(?<=\S)==/);
      if (parts.length === 1) {
        if (visible !== node.value) context.setProperty(node, 'value', visible);
        return;
      }
      context.replaceNode(node, {
        type: 'html',
        value: parts.map((part, i) => (i % 2 ? `<mark>${escapeHtml(part)}</mark>` : escapeHtml(part))).join(''),
      });
    },

    // A paragraph that is only a local .svg image becomes <figure class="fig"><svg …></figure>.
    paragraph(node, context) {
      const parts = node.children.filter((child) => !(child.type === 'text' && !child.value.trim()));
      const image = parts.length === 1 && parts[0].type === 'image' ? parts[0] : undefined;
      const url = safeDecode(image?.url ?? '').trim();
      if (!image || !/\.svg$/i.test(url) || /^[a-z][\w+.-]*:|^\//i.test(url)) return;
      const from = fileOf(context);
      const near = resolve(dirname(from), url);
      const file = existsSync(near) ? near : findInVault(url);
      if (!file) throw new Error(`${from}: illustration "${url}" is not in ${NOTES_DIRECTORY}.`);
      const svg = readFileSync(file, 'utf8').replace(/<\?xml[^>]*>|<!--[\s\S]*?-->/g, '').trim();
      if (!/^<svg\b[^>]*\brole="img"/.test(svg) || !/<title>[^<]+<\/title>/.test(svg) || /<script\b|<style\b|\bon\w+=/i.test(svg)) {
        throw new Error(`${file}: an inlined illustration must be an <svg role="img"> with a <title>, and no <script>, <style> or event handlers.`);
      }
      context.replaceNode(node, { type: 'html', value: `<figure class="fig">${svg.replace(/>\s+</g, '><')}</figure>` });
    },

    // ![[picture.png]] and ![[picture.png|300]]. The parser has already made these image nodes.
    image(node, context) {
      const url = safeDecode(node.url ?? '');
      if (node.alt?.includes('%%')) context.setProperty(node, 'alt', node.alt.replace(COMMENT, '').trim());
      const embeds = [...context.source.matchAll(/!\[\[([^\]|]+)/g)].map((match) => match[1].trim());
      if (!embeds.includes(url.trim())) return; // an ordinary Markdown image
      if (!IMAGE.test(url)) {
        // ![[Another note]]: Obsidian shows that note inline; here it becomes a link to it.
        const note = resolveWikilink(url);
        const label = escapeHtml(note?.title ?? url);
        context.replaceNode(node, {
          type: 'html',
          value: note ? `<a class="wikilink" href="${escapeHtml(note.href)}">${label}</a>` : `<span class="wikilink unwritten">${label}</span>`,
        });
        return;
      }
      const file = findInVault(url);
      const from = fileOf(context);
      if (!file) throw new Error(`${from}: embedded image "${url}" is not in ${NOTES_DIRECTORY}. Paste images into the note in Obsidian, or move the file there.`);
      const path = relative(dirname(from), file).split(sep).join('/');
      context.setProperty(node, 'url', encodeURI(path.startsWith('.') ? path : `./${path}`));
      // Obsidian puts the file name, or a display width, where the alt text goes.
      if (!node.alt || node.alt === url || /^\d+(x\d+)?$/.test(node.alt)) {
        context.setProperty(node, 'alt', basename(url, extname(url)).replace(/[-_]+/g, ' '));
      }
    },
  };
}

function fileOf(context) {
  const url = context.fileURL;
  return url ? fileURLToPath(url) : resolve(process.cwd(), NOTES_DIRECTORY, 'unknown.md');
}
