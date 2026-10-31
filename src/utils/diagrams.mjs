import { render } from 'pele';

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// The fence meta is used as the caption: ```mermaid Caption text here
export function renderDiagram(source, { id, caption } = {}) {
  const { svg } = render(source, {
    idPrefix: id,
    responsive: true,
    fontFamily: 'Inter Variable, Inter, system-ui, sans-serif',
  });
  const figcaption = caption ? `<figcaption>${escapeHtml(caption)}</figcaption>` : '';
  return `<figure class="diagram">${svg}${figcaption}</figure>`;
}

// Renders ```mermaid fences to static SVG at build time, so pages ship no diagram JS.
// A factory, so each document gets its own counter and SVG ids never collide on a page.
export function mermaidDiagramsPlugin() {
  return () => {
    let count = 0;
    return {
      name: 'mermaid-diagrams',
      code(node) {
        if (node.lang !== 'mermaid') return;
        count += 1;
        const caption = node.meta?.trim().replace(/^["']|["']$/g, '') || undefined;
        return { type: 'html', value: renderDiagram(node.value, { id: `d${count}`, caption }) };
      },
    };
  };
}

// Drops ```mermaid fences from raw Markdown, for text-only uses like search and reading time.
export function stripDiagramSource(markdown) {
  return markdown.replace(/^(`{3,}|~{3,})mermaid\b[^\n]*\n[\s\S]*?^\1[ \t]*$/gm, '');
}
