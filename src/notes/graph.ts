// The graph of notes, laid out the way Obsidian and Quartz lay theirs out: a force simulation (d3-force) where
// linked notes pull together and every note pushes the others away. It runs when the site is built, so the page
// gets a finished drawing and needs no script to show it. d3-force is deterministic: the same notes give the same drawing.
//
// The drawing shows what the notes are about: one note is the hub (the most-linked note, or the note being read),
// drawn solid with rings around it; the rest are open circles sized by how many links they have. With labels on,
// every note gets its short name, placed where it covers the fewest other names, circles and lines.
import { forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY, type SimulationNodeDatum } from 'd3-force';
import type { NoteLinks } from './notes';

interface GraphLabel {
  lines: string[];
  /** Where the first line's baseline starts (or centres, or ends: see `anchor`). */
  x: number;
  y: number;
  anchor: 'start' | 'middle' | 'end';
  /** The hub's name sits on a rounded tag so lines crossing behind it can't cut through it. */
  pill?: { x: number; y: number; width: number; height: number };
}

interface GraphNode {
  id: string;
  x: number;
  y: number;
  r: number;
  /** Radius of the invisible target round the circle: at least 24 when the notes are named, so a finger gets 44px or more. */
  hit: number;
  /** The note being read, when the graph is a note's own. */
  here: boolean;
  /** The note drawn as the hub: `here` when there is one, otherwise the most-linked note. */
  hub: boolean;
  label?: GraphLabel;
}

interface GraphEdge {
  a: GraphNode;
  b: GraphNode;
  /** A gentle curve, bowed away from the middle of the drawing. */
  d: string;
  /** A link to the hub. */
  spoke: boolean;
}

export interface NoteGraph {
  width: number;
  height: number;
  nodes: GraphNode[];
  edges: GraphEdge[];
  /** Linked notes left out because the drawing would be too crowded. */
  hidden: number;
}

export interface GraphOptions {
  width: number;
  height: number;
  /** The note being read: draw only it and the notes linked with it. */
  here?: string;
  /** Short names by note id. Given, every note is labelled. */
  labels?: Map<string, string>;
}

const MOST_NEIGHBOURS = 16; // more than this and the nodes touch at rail width
const PADDING = 20;
const MIN_HIT = 24; // 48px across when drawn at full size, still over 44px when a narrow phone shrinks it a little
// Label metrics: Geist at 15px, line height 1.5 (the interface text role). Widths are estimated, not measured, since
// this runs at build time with no browser; the estimate leans wide so labels never collide in practice.
const LINE = 22.5;
const CHAR = { 500: 7.9, 600: 8.3 };
const LINE_CHARS = 16;
const GAP = 8;

const neighbours = (links: NoteLinks) => [...new Set([...links.linksTo, ...links.linkedFrom])];

/** Splits a short name into at most two lines of about 16 characters (or `most`). */
export function labelLines(text: string, most = LINE_CHARS): string[] {
  const lines: string[] = [];
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const last = lines.length - 1;
    if (last >= 0 && (lines[last] + ' ' + word).length <= most) lines[last] += ' ' + word;
    else lines.push(word);
  }
  if (lines.length <= 2) return lines;
  return [lines[0], `${lines.slice(1).join(' ').slice(0, most - 1).trimEnd()}…`];
}

interface Box { left: number; top: number; right: number; bottom: number }
const area = (a: Box, b: Box) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
/** The box grown by `by` on every side. */
const pad = (box: Box, by: number): Box => ({ left: box.left - by, top: box.top - by, right: box.right + by, bottom: box.bottom + by });
const inside = (box: Box, x: number, y: number) => x >= box.left && x <= box.right && y >= box.top && y <= box.bottom;

function curve(a: GraphNode, b: GraphNode, cx: number, cy: number) {
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, dx = b.x - a.x, dy = b.y - a.y;
  const length = Math.hypot(dx, dy) || 1;
  let nx = -dy / length, ny = dx / length;
  if ((mx - cx) * nx + (my - cy) * ny < 0) { nx = -nx; ny = -ny; }
  const bow = length * 0.08;
  const qx = mx + nx * bow, qy = my + ny * bow;
  // Points along the curve, for checking where labels would cover a line.
  const points: [number, number][] = [];
  for (let i = 1; i < 12; i++) {
    const t = i / 12, u = 1 - t;
    points.push([u * u * a.x + 2 * u * t * qx + t * t * b.x, u * u * a.y + 2 * u * t * qy + t * t * b.y]);
  }
  return { d: `M${a.x} ${a.y}Q${Math.round(qx)} ${Math.round(qy)} ${b.x} ${b.y}`, points };
}

// Places every label at whichever spot round its circle covers the least: other labels, circles, lines, and the edge
// of the drawing. A first pass goes hub first, then the busiest notes; two more passes move each label again now that
// all the others are known. Returns how much is still covered, so callers can compare layouts.
function placeLabels(nodes: GraphNode[], curves: [number, number][][], texts: Map<string, string>, width: number, height: number) {
  const circles: Box[] = nodes.map((n) => ({ left: n.x - n.r - 3, top: n.y - n.r - 3, right: n.x + n.r + 3, bottom: n.y + n.r + 3 }));
  const order = [...nodes].sort((a, b) => Number(b.hub) - Number(a.hub) || b.r - a.r).filter((node) => texts.has(node.id));
  const items = order.map((node) => {
    const pill = node.hub;
    // The hub's tag takes a longer line: a tag split in two reads as two things.
    const lines = labelLines(texts.get(node.id)!, pill ? 24 : LINE_CHARS);
    const textWidth = Math.max(...lines.map((line) => line.length)) * CHAR[pill ? 600 : 500];
    const w = pill ? textWidth + 28 : textWidth, h = pill ? lines.length * LINE + 7.5 : lines.length * LINE;
    // Candidate spots: below, above, right, left and the four corners, then the corners slid level with the circle,
    // close to it and a little further out.
    const spots: Box[] = [];
    for (const d of [node.r + GAP, node.r + GAP + 14]) {
      const c = d * 0.7;
      for (const [left, top] of [[node.x - w / 2, node.y + d], [node.x - w / 2, node.y - d - h], [node.x + d, node.y - h / 2], [node.x - d - w, node.y - h / 2],
        [node.x + c, node.y + c], [node.x - c - w, node.y + c], [node.x + c, node.y - c - h], [node.x - c - w, node.y - c - h],
        [node.x - w + d, node.y + d], [node.x - d, node.y + d], [node.x - w + d, node.y - d - h], [node.x - d, node.y - d - h]]) spots.push({ left, top, right: left + w, bottom: top + h });
    }
    return { node, pill, lines, w, h, spots, at: -1 };
  });
  const costOf = (item: (typeof items)[number], box: Box) => {
    let c = 0;
    for (const other of items) if (other !== item && other.at >= 0) c += area(pad(box, 3), other.spots[other.at]) * 20;
    circles.forEach((circle, i) => { if (nodes[i] !== item.node) c += area(box, circle) * 20; });
    // A line through a name is worse than a little crowding; under the hub's tag a line just disappears.
    for (const points of curves) for (const [x, y] of points) if (inside(box, x, y)) c += item.pill ? 150 : 300;
    const out = Math.max(0, 4 - box.left) + Math.max(0, box.right - (width - 4)) + Math.max(0, 4 - box.top) + Math.max(0, box.bottom - (height - 4));
    // Spots further out cost a little, so a label stays by its circle when there's room.
    return c + out * item.h * 50 + (item.spots.indexOf(box) >= 12 ? 40 : 0);
  };
  let total = 0;
  for (let pass = 0; pass < 3; pass++) {
    total = 0;
    for (const item of items) {
      item.at = -1;
      let best = 0, bestCost = Infinity;
      item.spots.forEach((box, i) => { const c = costOf(item, box); if (c < bestCost) { best = i; bestCost = c; } });
      item.at = best;
      total += bestCost;
    }
  }
  // A name that still covers another name, or runs off the drawing, is left off rather than drawn badly: the busiest
  // notes keep theirs, and every note is still named by its link and its preview.
  const kept: Box[] = [];
  for (const { node, pill, lines, w, h, spots, at } of items) {
    const box = spots[at];
    node.label = undefined; // this runs once per inset tried: forget the last try's name
    // 1px of slack at the frame and 2px between names, so rounding the coordinates can't push a name over either.
    if (box.left < 1 || box.top < 1 || box.right > width - 1 || box.bottom > height - 1 || kept.some((other) => area(pad(box, 2), other) > 0)) { total += 1e6; continue; } // a layout that drops a name loses to one that doesn't
    kept.push(box);
    const anchor = box.right <= node.x - node.r ? 'end' : box.left >= node.x + node.r ? 'start' : 'middle';
    const x = anchor === 'middle' ? box.left + w / 2 : anchor === 'end' ? box.right : box.left;
    node.label = pill
      ? { lines, x: Math.round(box.left + w / 2), y: Math.round(box.top + 20), anchor: 'middle', pill: { x: Math.round(box.left), y: Math.round(box.top), width: Math.round(w), height: h } }
      : { lines, x: Math.round(x), y: Math.round(box.top + 16), anchor };
  }
  return total;
}

// Given `here`, the drawing is that note and only the notes linked with it (in either direction), with only its own
// links drawn. Without it, the drawing is every note and every link.
export function noteGraph(ids: string[], links: Map<string, NoteLinks>, { width, height, here, labels }: GraphOptions): NoteGraph {
  // Sorted, so the drawing doesn't depend on the order the notes were loaded in.
  const around = (here ? neighbours(links.get(here)!) : [...ids]).sort();
  const shown = here ? [here, ...around.slice(0, MOST_NEIGHBOURS)] : around;
  const hidden = here ? around.length + 1 - shown.length : 0;
  const degree = (id: string) => neighbours(links.get(id)!).length;
  const hubId = here ?? [...shown].sort((a, b) => degree(b) - degree(a) || (a < b ? -1 : 1))[0];
  // Bigger for each link, up to a limit so a very well-linked note doesn't swallow its neighbours. The hub is always biggest.
  const nodes = shown.map((id, i): GraphNode & SimulationNodeDatum => {
    const angle = (i / shown.length) * Math.PI * 2;
    const hub = id === hubId;
    const r = hub ? 10 : Math.min(3 + degree(id) * 1.2, 9);
    return { id, here: id === here, hub, r, hit: labels ? Math.max(r + 10, MIN_HIT) : r + 8, x: Math.cos(angle) * 40, y: Math.sin(angle) * 40 };
  });
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const pairs: [GraphNode, GraphNode][] = [];
  const seen = new Set<string>();
  for (const from of nodes) for (const id of [...links.get(from.id)!.linksTo].sort()) {
    const to = byId.get(id);
    const key = [from.id, id].sort().join(' ');
    if (!to || to === from || seen.has(key) || (here && !from.here && !to.here)) continue;
    seen.add(key);
    pairs.push([from, to]);
  }

  forceSimulation(nodes)
    .force('link', forceLink(pairs.map(([source, target]) => ({ source, target }))).distance(60))
    .force('charge', forceManyBody().strength(-220))
    .force('collide', forceCollide<GraphNode>((node) => node.r + 6))
    // Pulled to the middle less along the frame's long side, so the drawing spreads to the frame's shape.
    .force('x', forceX(0).strength(0.08 * Math.sqrt(height / width)))
    .force('y', forceY(0).strength(0.08 * Math.sqrt(width / height)))
    .stop()
    .tick(300);

  // A force layout has no up or down, so turn it to whichever angle lets it fill the frame best.
  let raw = nodes.map((node) => ({ x: node.x, y: node.y }));
  let bestTurn = { fill: 0, points: raw };
  for (let degrees = 0; degrees < 180; degrees += 15) {
    const a = (degrees * Math.PI) / 180, cos = Math.cos(a), sin = Math.sin(a);
    const points = raw.map(({ x, y }) => ({ x: x * cos - y * sin, y: x * sin + y * cos }));
    const px = points.map((p) => p.x), py = points.map((p) => p.y);
    const fill = Math.min(width / Math.max(Math.max(...px) - Math.min(...px), 1), height / Math.max(Math.max(...py) - Math.min(...py), 1));
    if (fill > bestTurn.fill + 1e-9) bestTurn = { fill, points };
  }
  raw = bestTurn.points;
  const xs = raw.map((p) => p.x), ys = raw.map((p) => p.y);
  const left = Math.min(...xs), top = Math.min(...ys);
  const spanX = Math.max(...xs) - left, spanY = Math.max(...ys) - top;
  // Fit the finished layout into the frame, keeping its proportions. With labels, try a range of side and top margins
  // (names are wide and short, so the two differ) and keep the pair whose names cover the least: more margin leaves
  // room for names at the edges, less keeps the drawing large.
  // A link is drawn no longer than half the frame, so two or three notes don't stretch corner to corner.
  const meanLink = pairs.length ? pairs.reduce((sum, [a, b]) => sum + Math.hypot(raw[nodes.indexOf(a)].x - raw[nodes.indexOf(b)].x, raw[nodes.indexOf(a)].y - raw[nodes.indexOf(b)].y), 0) / pairs.length : 60;
  const most = labels ? (Math.min(width, height) * 0.5) / Math.max(meanLink, 1) : 2.5;
  const fit = (insetX: number, insetY: number) => {
    const scale = Math.min((width - insetX * 2) / Math.max(spanX, 1), (height - insetY * 2) / Math.max(spanY, 1), most);
    nodes.forEach((node, i) => {
      node.x = Math.round((width - spanX * scale) / 2 + (raw[i].x - left) * scale);
      node.y = Math.round((height - spanY * scale) / 2 + (raw[i].y - top) * scale);
    });
    return pairs.map(([a, b]) => curve(a, b, width / 2, height / 2));
  };
  let curves = fit(PADDING, PADDING);
  if (labels) {
    let best = { x: PADDING, y: PADDING, cost: Infinity };
    for (const x of [28, 44, 60, 76, 92, 108]) for (const y of [24, 36, 48, 60, 72]) {
      // Each pixel of margin costs about as much as a little crowding, so a few notes spread out instead of sitting in a knot.
      const cost = placeLabels(nodes, fit(x, y).map((c) => c.points), labels, width, height) + (x + y) * 25;
      if (cost < best.cost) best = { x, y, cost };
    }
    curves = fit(best.x, best.y);
    placeLabels(nodes, curves.map((c) => c.points), labels, width, height);
  }
  return {
    width,
    height,
    nodes: nodes.map(({ id, x, y, r, hit, here, hub, label }) => ({ id, x, y, r: Math.round(r * 10) / 10, hit: Math.round(hit * 10) / 10, here, hub, label })),
    edges: pairs.map(([a, b], i) => ({ a, b, d: curves[i].d, spoke: a.hub || b.hub })),
    hidden,
  };
}
