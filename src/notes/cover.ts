// Cover diagrams for note cards: a small network drawing per note, returned as SVG markup for a
// 320x220 viewBox. Notes listed in `drawn` get a diagram of their idea; every other note gets a
// drawing of its own links, so a new note has a cover without anyone drawing one.
// Classes (styled where the cover is shown): n = node, hub = the main node, bad = failed,
// cut = isolated link, zone = boundary, gate = checkpoint.
import type { NoteLinks } from './notes';

type Point = [number, number];

const node = ([x, y]: Point, r = 5, cls = '') => `<circle class="n ${cls}" cx="${x}" cy="${y}" r="${r}"/>`;
const line = (a: Point, b: Point, cls = '') => `<line class="${cls}" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/>`;
const ring = ([cx, cy]: Point, r: number, count: number, turn = 0): Point[] =>
  Array.from({ length: count }, (_, i) => {
    const a = turn + (i / count) * Math.PI * 2;
    return [Math.round(cx + r * Math.cos(a)), Math.round(cy + r * Math.sin(a))];
  });

const centre: Point = [160, 110];

const drawn: Record<string, () => string> = {
  // A ring of neighbours with a few long shortcuts through one hub.
  'small-world-networks-and-hubs': () => {
    const p = ring(centre, 78, 12, -Math.PI / 2);
    const shortcuts = [[0, 4], [0, 6], [0, 9], [3, 8]];
    return p.map((q, i) => line(q, p[(i + 1) % p.length])).join('') + shortcuts.map(([a, b]) => line(p[a], p[b])).join('') + p.map((q, i) => node(q, i ? 5 : 10, i ? '' : 'hub')).join('');
  },
  // One node connected to everything.
  'ai-as-the-ultimate-hub': () => {
    const p = ring(centre, 62, 16).map((q, i) => (i % 2 ? q : ring(centre, 90, 16)[i]));
    return p.map((q) => line(centre, q)).join('') + p.map((q) => node(q, 4)).join('') + node(centre, 14, 'hub');
  },
  // A failed hub passing the failure to the hub beside it.
  'the-cascade-risk-of-hub-to-hub-ai-networks': () => {
    const left: Point = [100, 110], right: Point = [220, 110], failed = 5;
    const a = ring(left, 54, 8, 0.4), b = ring(right, 54, 8, 0.4);
    return a.map((q, i) => line(left, q, i < failed ? 'bad' : '')).join('') + b.map((q) => line(right, q)).join('') + line(left, right, 'bad')
      + a.map((q, i) => node(q, 4, i < failed ? 'bad' : '')).join('') + b.map((q) => node(q, 4)).join('') + node(left, 12, 'bad') + node(right, 12, 'hub');
  },
  // A boundary, and a hub whose links go straight through it.
  'why-ai-security-is-fundamentally-different': () => {
    const inside: Point[] = [[90, 80], [140, 70], [100, 140], [150, 130]], outside: Point[] = [[270, 60], [285, 120], [262, 170]], hub: Point = [228, 110];
    return '<rect class="zone" x="62" y="42" width="122" height="134" rx="8"/>' + [[0, 1], [0, 2], [2, 3], [1, 3]].map(([a, b]) => line(inside[a], inside[b])).join('')
      + inside.map((q) => line(hub, q, 'bad')).join('') + outside.map((q) => line(hub, q)).join('') + [...inside, ...outside].map((q) => node(q)).join('') + node(hub, 12, 'hub');
  },
  // A mesh with one failed node cut off by a breaker.
  'rethinking-ai-safety-through-network-science': () => {
    const at = (col: number, row: number): Point => [70 + col * 60, 55 + row * 55];
    const failed = (col: number, row: number) => col === 1 && row === 1;
    let lines = '', nodes = '';
    for (let row = 0; row < 3; row++) for (let col = 0; col < 4; col++) {
      if (col < 3) lines += line(at(col, row), at(col + 1, row), failed(col, row) || failed(col + 1, row) ? 'cut' : '');
      if (row < 2) lines += line(at(col, row), at(col, row + 1), failed(col, row) || failed(col, row + 1) ? 'cut' : '');
      nodes += node(at(col, row), 6, failed(col, row) ? 'bad' : '');
    }
    return lines + nodes + '<circle class="zone" cx="130" cy="110" r="22"/>';
  },
  // A chain of steps with a checkpoint between each.
  'design-with-an-artifact-ship-with-a-verifier': () => {
    const xs = [48, 123, 198, 273];
    const gates = xs.slice(1).map((x, i) => (xs[i] + x) / 2);
    return xs.slice(1).map((x, i) => line([xs[i], 110], [x, 110])).join('') + gates.map((x) => `<rect class="gate" x="${x - 7}" y="103" width="14" height="14" transform="rotate(45 ${x} 110)"/>`).join('')
      + xs.map((x, i) => node([x, 110], 10, i === xs.length - 1 ? 'hub' : '')).join('');
  },
};

const MOST_SPOKES = 14; // more than this and the spokes blur together at card size

// The note as a hub: a near node for each note it links to, a far node for each note linking to it.
function fromLinks(id: string, links: NoteLinks): string {
  const turn = ([...id].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % 60) / 10; // each note starts at its own angle
  const near = Math.min(links.linksTo.length, MOST_SPOKES);
  const far = Math.min(links.linkedFrom.length, MOST_SPOKES - near);
  const count = Math.max(near + far, 3); // a note with no links yet still gets three open spokes
  const outer = ring(centre, 86, count, turn), inner = ring(centre, 56, count, turn);
  const points = outer.map((q, i) => (i < near ? inner[i] : q));
  return points.map((q) => line(centre, q, near + far ? '' : 'cut')).join('') + points.map((q) => node(q, 4)).join('') + node(centre, 12, 'hub');
}

export function noteCover(id: string, links: NoteLinks): string {
  return drawn[id]?.() ?? fromLinks(id, links);
}

export interface GraphNode {
  id: string;
  x: number;
  y: number;
}

export const GRAPH_SIZE = 220;
const MOST_NEIGHBOURS = 16; // more than this and the nodes touch at rail width

// The note and the notes linked with it (in either direction) only, so the drawing stays readable however many notes there are.
export function localGraph(id: string, links: NoteLinks): { nodes: GraphNode[]; hidden: number } {
  const ids = [...new Set([...links.linksTo, ...links.linkedFrom])];
  const shown = ids.slice(0, MOST_NEIGHBOURS);
  const turn = ([...id].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % 60) / 10;
  const middle = GRAPH_SIZE / 2;
  const points = ring([middle, middle], middle - 24, shown.length, turn);
  const nodes = shown.map((neighbour, i): GraphNode => ({ id: neighbour, x: points[i][0], y: points[i][1] }));
  return { nodes, hidden: ids.length - shown.length };
}
