// Draws a mermaid flowchart as an animated network figure (.gf in site.css): an inline SVG per panel, laid out in
// ranks left to right, or top to bottom when that is what fits a phone. Opt in with a `%% animate` line.
//
// The motion comes from the diagram itself, so the Markdown stays the only source:
// - a link out of an `:::alert` node carries the failure: red dots spread hop by hop and each node they reach
//   flashes, then the whole wave starts again (a cascade);
// - when the links form a loop, one dot walks the loop step by step, round it and out (a process);
// - every other solid link carries steady traffic, as in the hub fan-out;
// - a dotted link (`-.-`, `-.->`) is cut: drawn faint and still.
// Hubs pulse and nodes rise in as they scroll into view. CSS and SMIL only; reduced motion shows the still picture,
// which keeps alert colours, cut links and arrowheads, so it reads without the motion.

import { escapeHtml } from './obsidian.mjs';

const CH = 7.6; // average width of a 15px Geist character
const LINE = 18;
const BOX_H = 30;
const PAD = 12;
const R = 22;
const GAP_MAIN = 36;
const GAP_CROSS = 14;
const SLOT = 0.8; // seconds for one hop of a wave or one step of a walk

/** Breaks a label into lines of at most `max` characters, at spaces. */
export function wrap(label, max) {
  const lines = [];
  for (const word of label.split(/\s+/)) {
    const last = lines.at(-1);
    if (last && `${last} ${word}`.length <= max) lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word);
  }
  return lines;
}

const n2 = (value) => Math.round(value * 10) / 10;

// Ranks by longest path along forward links; a link back to a node still being visited closes a loop.
function rank(panel) {
  const back = new Set();
  const state = new Map();
  const visit = (node) => {
    state.set(node, 'open');
    for (const edge of panel.edges.filter((e) => e.from === node)) {
      if (state.get(edge.to) === 'open') back.add(edge);
      else if (!state.has(edge.to)) visit(edge.to);
    }
    state.set(node, 'done');
  };
  panel.nodes.forEach((node) => state.has(node) || visit(node));
  const forward = panel.edges.filter((e) => !back.has(e));
  const ranks = new Map(panel.nodes.map((node) => [node, 0]));
  for (let changed = true; changed;) {
    changed = false;
    for (const { from, to } of forward) {
      if (ranks.get(to) < ranks.get(from) + 1) {
        ranks.set(to, ranks.get(from) + 1);
        changed = true;
      }
    }
  }
  return { ranks, forward, back };
}

function measure(node, wrapAt, across) {
  const inside = node.shape === 'circle' && node.label.length <= 3;
  const lines = inside ? [node.label] : wrap(node.label, wrapAt);
  const textW = Math.max(...lines.map((l) => l.length)) * CH;
  if (node.shape === 'circle') {
    const w = inside ? 2 * R : Math.max(2 * R, textW);
    const h = inside ? 2 * R : 2 * R + 6 + lines.length * LINE;
    // The anchor is the circle's centre; a label hangs below it.
    return { lines, inside, w, h, before: R, after: h - R, crossBefore: across ? w / 2 : R, crossAfter: across ? w / 2 : h - R };
  }
  const w = textW + 2 * PAD + (node.shape === 'decision' ? 20 : 0);
  const h = BOX_H + (lines.length - 1) * LINE;
  return { lines, w, h, before: h / 2, after: h / 2, crossBefore: across ? w / 2 : h / 2, crossAfter: across ? w / 2 : h / 2 };
}

/** Positions every node for one direction and wrap width. `x`/`y` are the anchors (a circle's centre). */
function layout(panel, graph, tb, wrapAt) {
  const { ranks, forward, back } = graph;
  const box = new Map(panel.nodes.map((node) => [node, measure(node, wrapAt, tb)]));
  const depth = Math.max(0, ...ranks.values());
  const byRank = Array.from({ length: depth + 1 }, (_, r) => panel.nodes.filter((n) => ranks.get(n) === r));
  const parents = (n) => forward.filter((e) => e.to === n).map((e) => e.from);
  const children = (n) => forward.filter((e) => e.from === n).map((e) => e.to);
  const mean = (values) => values.reduce((a, b) => a + b, 0) / values.length;

  // Across: each node wants to sit by its parents (going down) and then centred on its children (going up).
  const cross = new Map();
  const settle = (list, want) => {
    let prev;
    const placed = list.map((n) => {
      let p = want(n);
      if (prev) p = Math.max(p, prev.p + box.get(prev.n).crossAfter + GAP_CROSS + box.get(n).crossBefore);
      prev = { n, p };
      return p;
    });
    const shift = mean(list.map((n, i) => want(n) - placed[i]));
    list.forEach((n, i) => cross.set(n, placed[i] + shift));
  };
  byRank.forEach((list, r) => {
    if (r > 0) list.sort((a, b) => mean(parents(a).map((p) => cross.get(p))) - mean(parents(b).map((p) => cross.get(p))));
    settle(list, (n) => (r > 0 && parents(n).length ? mean(parents(n).map((p) => cross.get(p))) : 0));
  });
  for (let r = depth - 1; r >= 0; r--) {
    settle(byRank[r], (n) => (children(n).length ? mean(children(n).map((c) => cross.get(c))) : cross.get(n)));
  }

  // Along: ranks follow each other with room for the widest (or tallest) node in each.
  const main = new Map();
  let at = 0;
  byRank.forEach((list) => {
    // A labelled link needs room for its label between the ranks.
    if (forward.some((e) => e.label && list.includes(e.to))) at += 20;
    const before = Math.max(...list.map((n) => (tb ? box.get(n).before : box.get(n).w / 2)));
    const after = Math.max(...list.map((n) => (tb ? box.get(n).after : box.get(n).w / 2)));
    const start = at;
    list.forEach((n) => {
      const b = box.get(n);
      // Left to right, boxes line up on their left edge; circles centre in the column.
      main.set(n, tb || n.shape === 'circle' ? start + before : start + b.w / 2);
    });
    at = start + before + after + GAP_MAIN;
  });

  const nodes = new Map(panel.nodes.map((n) => [n, { ...box.get(n), shape: n.shape, x: tb ? cross.get(n) : main.get(n), y: tb ? main.get(n) : cross.get(n), rank: ranks.get(n) }]));
  const edges = panel.edges.map((edge) => besideLink({ ...edge, ...route(nodes.get(edge.from), nodes.get(edge.to), back.has(edge), tb) }, tb));

  // Bounds: node footprints, the outside of loops and the edge labels.
  const xs = [];
  const ys = [];
  for (const n of nodes.values()) {
    xs.push(n.x - n.w / 2, n.x + n.w / 2);
    ys.push(n.y - (tb ? n.before : n.crossBefore), n.y + (tb ? n.after : n.crossAfter));
  }
  for (const e of edges) {
    if (e.outside !== undefined) (tb ? xs : ys).push(e.outside);
    if (e.label) {
      const w = e.label.length * CH;
      xs.push(e.mid[0] - w / 2 - 4, e.mid[0] + w / 2 + 4);
      ys.push(e.mid[1] - 12, e.mid[1] + 12);
    }
  }
  const margin = 4;
  return { nodes, edges, tb, minX: Math.min(...xs) - margin, minY: Math.min(...ys) - margin, width: Math.max(...xs) - Math.min(...xs) + 2 * margin, height: Math.max(...ys) - Math.min(...ys) + 2 * margin };
}

// A link leaves the source's far side and enters the target's near side; a link back runs round the outside.
function route(a, b, back, tb) {
  // Top to bottom, a circle's links leave from under its label; left to right, from the circle itself.
  const port = (n, out) => {
    if (tb) return out ? n.after + (n.shape === 'circle' && !n.inside ? 2 : 0) : n.before;
    return n.shape === 'circle' ? R : n.w / 2;
  };
  const along = (n, out) => (tb ? n.y : n.x) + (out ? port(n, true) : -port(n, false) - 2);
  const point = (m, c) => (tb ? [c, m] : [m, c]);
  let s;
  let t;
  let c1;
  let c2;
  let outside;
  if (back) {
    // Out of the side of each node and round, on the side that comes first across.
    const side = (n) => (tb ? n.x - n.crossBefore : n.y - n.crossBefore);
    outside = Math.min(side(a), side(b)) - 32;
    s = point(tb ? a.y : a.x, side(a));
    t = point(tb ? b.y : b.x, side(b) - 2);
    c1 = point(tb ? a.y : a.x, outside);
    c2 = point(tb ? b.y : b.x, outside);
  } else {
    const ma = along(a, true);
    const mb = along(b, false);
    const mid = (ma + mb) / 2;
    const ca = tb ? a.x : a.y;
    const cb = tb ? b.x : b.y;
    s = point(ma, ca);
    t = point(mb, cb);
    c1 = point(mid, ca);
    c2 = point(mid, cb);
  }
  const mid = [0, 1].map((i) => (s[i] + 3 * c1[i] + 3 * c2[i] + t[i]) / 8);
  return { s, t, c1, c2, mid, outside };
}

// An edge label sits beside its link, on the side the link bends towards, so the line doesn't run through it.
function besideLink(e, tb) {
  if (!e.label) return e;
  const w = e.label.length * CH;
  const lean = Math.sign((tb ? e.t[0] - e.s[0] : e.t[1] - e.s[1]) || 1);
  return { ...e, mid: tb ? [e.mid[0] + lean * (w / 2 + 6), e.mid[1]] : [e.mid[0], e.mid[1] - 14] };
}

// Which links move, and how: a wave out of each alert node, a walk round a loop, steady traffic otherwise.
function motion(panel, graph) {
  const live = panel.edges.filter((e) => !e.dotted);
  const plan = new Map();
  if (graph.back.size) {
    const root = panel.nodes.find((n) => !live.some((e) => e.to === n && !graph.back.has(e))) ?? panel.nodes[0];
    const used = new Set();
    const steps = [];
    const nextUnused = (from) => {
      // The first link of the shortest path to a node that still has an unwalked link.
      const seen = new Set([from]);
      let frontier = [[from, undefined]];
      while (frontier.length) {
        const next = [];
        for (const [node, first] of frontier) {
          if (live.some((e) => e.from === node && !used.has(e))) return first;
          for (const e of live.filter((l) => l.from === node && !seen.has(l.to))) {
            seen.add(e.to);
            next.push([e.to, first ?? e]);
          }
        }
        frontier = next;
      }
      return undefined;
    };
    for (let at = root; used.size < live.length && steps.length < live.length * 3;) {
      const edge = live.find((e) => e.from === at && !used.has(e)) ?? nextUnused(at);
      if (!edge) break;
      used.add(edge);
      steps.push(edge);
      at = edge.to;
    }
    return { mode: 'walk', steps, cycle: (steps.length + 1.5) * SLOT };
  }
  let hops = 0;
  for (const source of panel.nodes.filter((n) => n.style === 'alert' && live.some((e) => e.from === n))) {
    let frontier = [source];
    for (let hop = 0; frontier.length; hop++) {
      const next = [];
      for (const node of frontier) {
        for (const e of live.filter((l) => l.from === node && !plan.has(l))) {
          plan.set(e, hop);
          next.push(e.to);
          hops = Math.max(hops, hop + 1);
        }
      }
      frontier = next;
    }
  }
  return { mode: 'wave', plan, cycle: (hops + 1.75) * SLOT };
}

// `inner` is SMIL to animate the shape with; a shape with any starts hidden.
function nodeShape(n, cls, grow = 0, inner = '') {
  const close = (tag, attrs) => (inner ? `<${tag} class="${cls}" ${attrs} opacity="0">${inner}</${tag}>` : `<${tag} class="${cls}" ${attrs}/>`);
  if (n.shape === 'circle') return close('circle', `cx="${n2(n.x)}" cy="${n2(n.y)}" r="${R + grow}"`);
  const x = n.x - n.w / 2 - grow;
  const y = n.y - n.h / 2 - grow;
  const w = n.w + 2 * grow;
  const h = n.h + 2 * grow;
  if (n.shape === 'decision') {
    const pts = [[x, n.y], [x + 10, y], [x + w - 10, y], [x + w, n.y], [x + w - 10, y + h], [x + 10, y + h]];
    return close('polygon', `points="${pts.map((p) => p.map(n2).join(',')).join(' ')}"`);
  }
  const rx = { rounded: h / 2, database: 12 }[n.shape] ?? 8;
  return close('rect', `x="${n2(x)}" y="${n2(y)}" width="${n2(w)}" height="${n2(h)}" rx="${n2(Math.min(rx, h / 2))}"`);
}

function nodeText(n, style) {
  if (n.shape === 'circle' && n.inside) return `<text class="gf-in${style ? ` ${style}` : ''}" x="${n2(n.x)}" y="${n2(n.y + 5)}" text-anchor="middle">${escapeHtml(n.lines[0])}</text>`;
  const first = n.shape === 'circle' ? n.y + R + 20 : n.y - ((n.lines.length - 1) * LINE) / 2 + 5;
  const cls = n.shape === 'circle' && style ? `gf-t ${style}` : 'gf-t';
  const lines = n.lines.map((line, i) => `<tspan x="${n2(n.x)}" y="${n2(first + i * LINE)}">${escapeHtml(line)}</tspan>`).join('');
  return `<text class="${cls}" text-anchor="middle">${lines}</text>`;
}

const keyTime = (t, cycle) => Math.min(1, Math.max(0, t / cycle)).toFixed(4);

// A dot that crosses one link between `t0` and `t1` of each cycle, hidden the rest of the time.
function timedDot(d, cls, t0, t1, cycle) {
  const k0 = keyTime(t0, cycle);
  const k1 = keyTime(t1, cycle);
  return `<circle class="${cls}" r="3.5" opacity="0"><animateMotion dur="${cycle}s" repeatCount="indefinite" calcMode="linear" keyPoints="0;0;1;1" keyTimes="0;${k0};${k1};1" path="${d}"/>`
    + `<animate attributeName="opacity" dur="${cycle}s" repeatCount="indefinite" calcMode="discrete" values="0;1;0" keyTimes="0;${k0};${k1}"/></circle>`;
}

// A ring that lights when a dot arrives: it stays lit to the end of a wave, or fades after one step of a walk.
function hitRing(n, cls, at, until, cycle) {
  const times = [0, at, at + 0.15, until, until + 0.3].map((t) => keyTime(t, cycle)).join(';');
  const fade = `<animate attributeName="opacity" dur="${cycle}s" repeatCount="indefinite" values="0;0;1;1;0;0" keyTimes="${times};1"/>`;
  return nodeShape(n, cls, 4, fade);
}

function renderPanel(panel, budget) {
  const graph = rank(panel);
  const attempts = [[false, 16], [false, 10], [true, 16], [true, 10]].map(([tb, w]) => layout(panel, graph, tb, w));
  const fit = attempts.find((a) => a.width <= budget) ?? attempts.reduce((a, b) => (b.width < a.width ? b : a));
  const { nodes, edges, minX, minY, width, height } = fit;
  const move = motion(panel, graph);
  const ox = -minX;
  const oy = -minY;
  for (const n of nodes.values()) {
    n.x += ox;
    n.y += oy;
  }
  const shift = (p) => [p[0] + ox, p[1] + oy];
  for (const e of edges) {
    for (const key of ['s', 't', 'c1', 'c2', 'mid']) e[key] = shift(e[key]);
    e.d = `M${e.s.map(n2).join(' ')} C ${e.c1.map(n2).join(' ')}, ${e.c2.map(n2).join(' ')}, ${e.t.map(n2).join(' ')}`;
  }
  const at = (node) => nodes.get(node);
  const waveOf = (e) => (move.mode === 'wave' ? move.plan.get(e) : undefined);

  const links = edges.map((e, i) => {
    const kind = e.dotted ? ' dead' : waveOf(panel.edges[i]) !== undefined ? ' wave' : '';
    let arrow = '';
    if (e.directed) {
      const dx = e.t[0] - e.c2[0];
      const dy = e.t[1] - e.c2[1];
      const len = Math.hypot(dx, dy) || 1;
      const [ux, uy] = [dx / len, dy / len];
      const back = (k, side) => [e.t[0] - ux * k - uy * side, e.t[1] - uy * k + ux * side].map(n2).join(' ');
      arrow = `<path class="gf-arrow${kind}" d="M${back(6, 4)} L${e.t.map(n2).join(' ')} L${back(6, -4)}"/>`;
    }
    return `<path class="gf-link${kind}" d="${e.d}"/>${arrow}`;
  }).join('');

  const sources = new Set(panel.edges.filter((e) => !e.dotted).map((e) => e.from));
  const pulses = [...nodes.entries()]
    .filter(([node]) => node.shape === 'circle' && sources.has(node) && (node.style === 'hub' || node.style === 'alert'))
    .map(([node, n]) => `<circle class="gf-pulse${node.style === 'alert' ? ' alert' : ''}" cx="${n2(n.x)}" cy="${n2(n.y)}" r="${R}"/>`).join('');

  const hits = new Map(panel.nodes.map((node) => [node, []]));
  const dots = [];
  if (move.mode === 'walk') {
    move.steps.forEach((edge, i) => {
      const e = edges[panel.edges.indexOf(edge)];
      const t0 = (i + 0.5) * SLOT;
      dots.push(timedDot(e.d, 'gf-dot', t0, t0 + SLOT, move.cycle));
      hits.get(edge.to).push(hitRing(at(edge.to), 'gf-hit', t0 + SLOT, t0 + SLOT * 1.6, move.cycle));
    });
  }
  panel.edges.forEach((edge, i) => {
    if (edge.dotted || move.mode === 'walk') return;
    const e = edges[i];
    const hop = waveOf(edge);
    if (hop === undefined) {
      const dur = 2.4;
      const begin = -((i * dur) / panel.edges.length).toFixed(2);
      dots.push(`<circle class="gf-dot" r="3"><animateMotion dur="${dur}s" begin="${begin}s" repeatCount="indefinite" path="${e.d}"/></circle>`);
      return;
    }
    const t0 = (hop + 0.25) * SLOT;
    dots.push(timedDot(e.d, 'gf-dot wave', t0, t0 + SLOT, move.cycle));
    if (!hits.get(edge.to).length) hits.get(edge.to).push(hitRing(at(edge.to), 'gf-hit wave', t0 + SLOT, move.cycle - 0.4, move.cycle));
  });

  const labels = edges.filter((e) => e.label).map((e) => `<text class="gf-el" x="${n2(e.mid[0])}" y="${n2(e.mid[1] + 5)}" text-anchor="middle">${escapeHtml(e.label)}</text>`).join('');
  const shapes = [...nodes.entries()].map(([node, n]) => {
    const style = ['hub', 'alert', 'faded'].includes(node.style) ? node.style : '';
    const kind = n.shape === 'circle' ? 'gf-c' : 'gf-b';
    return `<g class="gf-n" style="--i:${n.rank}">${nodeShape(n, style ? `${kind} ${style}` : kind)}${nodeText(n, style)}${hits.get(node).join('')}</g>`;
  }).join('');

  return { width: Math.ceil(width), height: Math.ceil(height), body: `<g aria-hidden="true">${links}${pulses}${shapes}${dots.join('')}${labels}</g>` };
}

/** The whole figure: one SVG for a single panel, or a row of titled panels that wraps on a phone. */
export function renderNet(panels, title, description) {
  if (panels.length === 1 && !panels[0].title) {
    const { width, height, body } = renderPanel(panels[0], 330);
    const a11y = `<title>${escapeHtml(title ?? 'Diagram')}</title>${description ? `<desc>${escapeHtml(description)}</desc>` : ''}`;
    return `<svg class="gf" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img">${a11y}${body}</svg>`;
  }
  const html = panels.map((panel) => {
    const { width, height, body } = renderPanel(panel, 300);
    const svg = `<svg class="gf" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" aria-hidden="true">${body}</svg>`;
    return `<div class="panel" style="flex-basis:${width + 26}px"><span class="panel-t">${escapeHtml(panel.title || title || '')}</span>${svg}</div>`;
  }).join('');
  const label = [title, description].filter(Boolean).join('. ');
  return `<div class="gf-panels" role="img"${label ? ` aria-label="${escapeHtml(label)}"` : ''}>${html}</div>`;
}
