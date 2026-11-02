// Turns ```mermaid fences into figures drawn from boxes (.fig, .panel, .flow, .nd, .barchart in site.css),
// so the Markdown stays the source of truth and pages ship no diagram JS or SVG.
//
// Two kinds of diagram are supported:
// - flowchart: each subgraph becomes a panel (or one panel titled by accTitle when there are none), and each
//   statement becomes a row of nodes and connectors. `:::hub`, `:::alert` and `:::faded` style a node.
//   A statement that starts with a labelled edge (`Q -- Yes --> B`) reads as that branch: "Yes → B".
// - xychart-beta: the `bar` series becomes a bar chart labelled by the x-axis; the last bar is highlighted.

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const unquote = (value) => value.trim().replace(/^["']|["']$/g, '');

function directive(lines, name) {
  const line = lines.find((l) => l.startsWith(`${name}:`));
  return line ? line.slice(name.length + 1).trim() : undefined;
}

// Connectors, labelled forms first: `-- label -->`, `-->|label|`, then the plain arrows and lines.
const LINK = /\s*(?:--\s+([^-]+?)\s+(-->|---)|(-->|---|-\.->|-\.-)(?:\|([^|]+)\|)?)\s*/g;
const SYMBOL = { '-->': '→', '---': '—', '-.->': '- -', '-.-': '- -' };
const NODE = /^([\w-]+)\s*(?:\(\((.+)\)\)|\[\((.+)\)\]|\[(.+)\]|\{(.+)\}|\((.+)\))?\s*(?::::(\w+))?$/;

function parseFlowchart(lines) {
  const nodes = new Map();
  const panels = [];
  let panel;

  const node = (source) => {
    const match = source.trim().match(NODE);
    if (!match) throw new Error(`Unsupported mermaid node "${source.trim()}".`);
    const [, id, ...rest] = match;
    const style = rest.pop();
    const label = rest.find((value) => value !== undefined);
    const known = nodes.get(id) ?? { label: id };
    if (label) known.label = unquote(label);
    if (style) known.style = style;
    nodes.set(id, known);
    return { node: known };
  };

  for (const line of lines) {
    if (/^(flowchart|graph|direction|classDef|class |style |acc|%%)/.test(line)) continue;
    const subgraph = line.match(/^subgraph\s+[\w-]+\s*(?:\[(.+)\])?$/);
    if (subgraph) {
      panel = { title: unquote(subgraph[1] ?? ''), rows: [] };
      panels.push(panel);
      continue;
    }
    if (line === 'end') {
      panel = undefined;
      continue;
    }
    if (!panel) {
      panel = { title: '', rows: [] };
      panels.push(panel);
    }

    const row = [];
    let last = 0;
    let first = true;
    for (const link of line.matchAll(LINK)) {
      const group = line.slice(last, link.index).split('&').map(node);
      const label = link[1] ?? link[4];
      row.push(...(first && label ? [{ text: unquote(label) }] : group), { to: SYMBOL[link[2] ?? link[3]] });
      last = link.index + link[0].length;
      first = false;
    }
    row.push(...line.slice(last).split('&').map(node));
    panel.rows.push(row);
  }

  return panels;
}

function renderToken(token) {
  if (token.to) return `<span class="to" aria-hidden="true">${escapeHtml(token.to)}</span>`;
  const { label, style } = token.node ?? { label: token.text };
  const cls = ['hub', 'alert', 'faded'].includes(style) ? `nd ${style}` : 'nd';
  return `<span class="${cls}">${escapeHtml(label)}</span>`;
}

function renderPanels(panels, title, description) {
  const html = panels.map((panel) => {
    const rows = panel.rows.map((row) => `<div class="flow">${row.map(renderToken).join('')}</div>`).join('');
    return `<div class="panel"><span class="panel-t">${escapeHtml(panel.title || title || '')}</span>${rows}</div>`;
  }).join('');
  const label = description ? ` role="img" aria-label="${escapeHtml(description)}"` : '';
  return `<div class="fig-panels"${label}>${html}</div>`;
}

function parseList(source) {
  return [...source.matchAll(/"([^"]*)"|([^,\s\[\]][^,\]]*)/g)].map((m) => (m[1] ?? m[2]).trim());
}

function parseBars(lines) {
  const axis = (name) => lines.find((l) => l.startsWith(name))?.match(/^\S+\s+"([^"]+)"\s*(?:\[(.*)\])?/);
  const x = axis('x-axis');
  const y = axis('y-axis');
  const bar = lines.find((l) => l.startsWith('bar'))?.match(/\[(.*)\]/);
  if (!x?.[2] || !bar) throw new Error('A mermaid bar chart needs an x-axis with labels and a bar series.');
  return {
    labels: parseList(x[2]),
    values: bar[1].split(',').map(Number),
    summary: y ? `${y[1]} by ${x[1].toLowerCase()}.` : '',
  };
}

function renderBars({ labels, values }, label) {
  const max = Math.max(...values);
  const bars = values.map((value, i) => {
    const height = Math.max(2, Math.round((value / max) * 100));
    const cls = i === values.length - 1 ? 'bc-bar top' : 'bc-bar';
    return `<div class="bc"><div class="${cls}" style="height: ${height}%;"></div><span class="bc-l">${escapeHtml(labels[i] ?? '')}</span></div>`;
  }).join('');
  return `<div class="barchart" role="img" aria-label="${escapeHtml(label)}">${bars}</div>`;
}

// The fence meta is used as the caption: ```mermaid Caption text here
export function renderDiagram(source, { caption } = {}) {
  const lines = source.split('\n').map((line) => line.trim()).filter(Boolean);
  const title = directive(lines, 'accTitle');
  const description = directive(lines, 'accDescr');
  let body;
  let text = caption ?? '';

  if (lines[0].startsWith('xychart')) {
    const chart = parseBars(lines);
    text = [caption, chart.summary].filter(Boolean).join(' ');
    body = renderBars(chart, description ?? text);
  } else if (/^(flowchart|graph)\b/.test(lines[0])) {
    body = renderPanels(parseFlowchart(lines), title, description);
  } else {
    throw new Error(`Unsupported mermaid diagram "${lines[0]}".`);
  }

  const figcaption = text ? `<figcaption class="caption">${escapeHtml(text)}</figcaption>` : '';
  return `<figure class="fig">${body}${figcaption}</figure>`;
}

export function mermaidDiagramsPlugin() {
  return () => ({
    name: 'mermaid-diagrams',
    code(node) {
      if (node.lang !== 'mermaid') return;
      const caption = node.meta?.trim().replace(/^["']|["']$/g, '') || undefined;
      return { type: 'html', value: renderDiagram(node.value, { caption }) };
    },
  });
}

// Drops ```mermaid fences from raw Markdown, for text-only uses like search and reading time.
export function stripDiagramSource(markdown) {
  return markdown.replace(/^(`{3,}|~{3,})mermaid\b[^\n]*\n[\s\S]*?^\1[ \t]*$/gm, '');
}
