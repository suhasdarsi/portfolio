// Turns ```mermaid fences into figures drawn from boxes (.fig, .panel, .flow, .nd, .barchart in site.css),
// so the Markdown stays the source of truth and pages ship no diagram JS.
//
// Three kinds of diagram are supported:
// - flowchart: each subgraph becomes a panel (or one panel titled by accTitle when there are none), and each
//   statement becomes a row of nodes and connectors. `:::hub`, `:::alert` and `:::faded` style a node.
//   A statement that starts with a labelled edge (`Q -- Yes --> B`) reads as that branch: "Yes → B".
// - a hub fan-out: a flowchart that is only one statement, a `:::hub` node pointing at three or more nodes
//   (`H((Hub)):::hub --> a[A] & b[B] & c[C]`), is drawn as an animated SVG (.hubfig in site.css): flowing links,
//   dots travelling from the hub and a gentle pulse, all CSS and SMIL. Reduced motion shows it still.
// - any flowchart with a `%% animate` line is drawn as an animated network (netfig.mjs, .gf in site.css): a red
//   wave out of `:::alert` nodes, a dot walking any loop, steady traffic elsewhere, cut links for dotted ones.
// - xychart-beta: the `bar` series becomes a bar chart labelled by the x-axis; the last bar is highlighted.

import { renderNet, wrap } from './netfig.mjs';
import { escapeHtml } from './obsidian.mjs';

const unquote = (value) => value.trim().replace(/^["']|["']$/g, '');

function directive(lines, name) {
  const line = lines.find((l) => l.startsWith(`${name}:`));
  return line ? line.slice(name.length + 1).trim() : undefined;
}

// Connectors, labelled forms first: `-- label -->`, `-->|label|`, then the plain arrows and lines.
const LINK = /\s*(?:--\s+([^-]+?)\s+(-->|---)|(-->|---|-\.->|-\.-)(?:\|([^|]+)\|)?)\s*/g;
const SYMBOL = { '-->': '→', '---': '—', '-.->': '- -', '-.-': '- -' };
// The bracket groups in NODE, in order: ((circle)), [(database)], [box], {decision}, (rounded).
const SHAPES = ['circle', 'database', 'box', 'decision', 'rounded'];
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
    const index = rest.findIndex((value) => value !== undefined);
    const known = nodes.get(id) ?? { label: id, shape: 'box' };
    if (index >= 0) {
      known.label = unquote(rest[index]);
      known.shape = SHAPES[index];
    }
    if (style) known.style = style;
    nodes.set(id, known);
    if (!panel.nodes.includes(known)) panel.nodes.push(known);
    return { node: known };
  };

  for (const line of lines) {
    if (/^(flowchart|graph|direction|classDef|class |style |acc|%%)/.test(line)) continue;
    const subgraph = line.match(/^subgraph\s+[\w-]+\s*(?:\[(.+)\])?$/);
    if (subgraph) {
      panel = { title: unquote(subgraph[1] ?? ''), rows: [], nodes: [], edges: [] };
      panels.push(panel);
      continue;
    }
    if (line === 'end') {
      panel = undefined;
      continue;
    }
    if (!panel) {
      panel = { title: '', rows: [], nodes: [], edges: [] };
      panels.push(panel);
    }

    const row = [];
    let last = 0;
    let first = true;
    let previous;
    // Every node in one group links to every node in the next: `A --> b & c` is two edges.
    const connect = (group, link) => {
      if (previous) {
        for (const from of previous.group) for (const to of group) panel.edges.push({ from: from.node, to: to.node, ...previous.link });
      }
      previous = { group, link };
    };
    for (const link of line.matchAll(LINK)) {
      const group = line.slice(last, link.index).split('&').map(node);
      const label = link[1] ?? link[4];
      const arrow = link[2] ?? link[3];
      row.push(...(first && label ? [{ text: unquote(label) }] : group), { to: SYMBOL[arrow] });
      connect(group, { label: label && unquote(label), dotted: arrow.startsWith('-.'), directed: arrow.endsWith('>') });
      last = link.index + link[0].length;
      first = false;
    }
    const tail = line.slice(last).split('&').map(node);
    row.push(...tail);
    connect(tail);
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

// The flowchart's only row, when it is a hub pointing at three or more nodes: `H:::hub --> a & b & c`.
function hubFanOut(panels) {
  if (panels.length !== 1 || panels[0].title || panels[0].rows.length !== 1) return undefined;
  const [hub, link, ...targets] = panels[0].rows[0];
  if (hub?.node?.style !== 'hub' || link?.to !== '→' || targets.length < 3 || targets.some((t) => !t.node)) return undefined;
  return { hub: hub.node.label, targets: targets.map((t) => t.node.label) };
}

// Drawn at 1:1 in a phone-width box: 15px labels stay readable when the figure scales down.
function renderHub({ hub, targets }, title, description) {
  const gap = 48;
  const height = Math.max(200, 50 + (targets.length - 1) * gap);
  const cx = 64;
  const cy = height / 2;
  const r = 26;
  const nodeX = 180;
  const nodeW = Math.max(...targets.map((label) => label.length)) * 8 + 24;
  const width = nodeX + nodeW + 4;
  const top = cy - ((targets.length - 1) * gap) / 2;
  const curve = (y) => `M${cx + r} ${cy} C ${nodeX - 48} ${cy}, ${nodeX - 48} ${y}, ${nodeX} ${y}`;
  const dur = 2.4;

  const links = targets.map((_, i) => `<path class="hf-link" d="${curve(top + i * gap)}"/>`).join('');
  const dots = targets.map((_, i) => {
    const begin = -((i * dur) / targets.length).toFixed(2);
    return `<circle class="hf-dot" r="3"><animateMotion dur="${dur}s" begin="${begin}s" repeatCount="indefinite" path="${curve(top + i * gap)}"/></circle>`;
  }).join('');
  const nodes = targets.map((label, i) => {
    const y = top + i * gap;
    return `<g class="hf-co" style="--i:${i}"><rect class="hf-node" x="${nodeX}" y="${y - 15}" width="${nodeW}" height="30" rx="8"/><text x="${nodeX + 12}" y="${y + 5}">${escapeHtml(label)}</text></g>`;
  }).join('');
  const hubLines = wrap(hub, 18).map((line, i) => `<tspan x="${cx}" dy="${i ? 18 : 0}">${escapeHtml(line)}</tspan>`).join('');
  const hubText = `<text class="hf-hub-t" x="${cx}" y="${cy + r + 24}" text-anchor="middle">${hubLines}</text>`;
  const a11y = `<title>${escapeHtml(title ?? hub)}</title>${description ? `<desc>${escapeHtml(description)}</desc>` : ''}`;
  return `<svg class="hubfig" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img">${a11y}`
    + `<g aria-hidden="true">${links}<circle class="hf-pulse" cx="${cx}" cy="${cy}" r="${r}"/><circle class="hf-hub" cx="${cx}" cy="${cy}" r="${r}"/>${dots}${hubText}${nodes}</g></svg>`;
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
function renderDiagram(source, { caption } = {}) {
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
    const panels = parseFlowchart(lines);
    const fan = hubFanOut(panels);
    if (lines.some((line) => /^%%\s*animate\b/.test(line))) body = renderNet(panels, title, description);
    else body = fan ? renderHub(fan, title, description) : renderPanels(panels, title, description);
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
      return { type: /** @type {const} */ ('html'), value: renderDiagram(node.value, { caption }) };
    },
  });
}

// Drops ```mermaid fences from raw Markdown, for text-only uses like search and reading time.
export function stripDiagramSource(markdown) {
  return markdown.replace(/^(`{3,}|~{3,})mermaid\b[^\n]*\n[\s\S]*?^\1[ \t]*$/gm, '');
}
