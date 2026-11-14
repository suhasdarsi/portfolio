// The graph of notes, laid out the way Obsidian and Quartz lay theirs out: a force simulation (d3-force) where
// linked notes pull together and every note pushes the others away. It runs when the site is built, so the page
// gets a finished drawing and needs no script to show it. d3-force is deterministic: the same notes give the same drawing.
import { forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY, type SimulationNodeDatum } from 'd3-force';
import type { NoteLinks } from './notes';

interface GraphNode {
  id: string;
  x: number;
  y: number;
  /** Radius: a little bigger for each note this one is linked with, as in Obsidian. */
  r: number;
  /** The note being read, when the graph is a note's own. */
  here: boolean;
}

interface NoteGraph {
  nodes: GraphNode[];
  /** Pairs of linked notes. */
  edges: [GraphNode, GraphNode][];
  /** Linked notes left out because the drawing would be too crowded. */
  hidden: number;
}

const MOST_NEIGHBOURS = 16; // more than this and the nodes touch at rail width
const PADDING = 20;

const neighbours = (links: NoteLinks) => [...new Set([...links.linksTo, ...links.linkedFrom])];

// Given `here`, the drawing is that note and only the notes linked with it (in either direction), with only its own
// links drawn. Without it, the drawing is every note and every link. `size` is the side of the square drawing in pixels.
export function noteGraph(ids: string[], links: Map<string, NoteLinks>, size: number, here?: string): NoteGraph {
  const around = here ? neighbours(links.get(here)!) : ids;
  const shown = here ? [here, ...around.slice(0, MOST_NEIGHBOURS)] : around;
  const hidden = here ? around.length + 1 - shown.length : 0;
  // Sizes grow with the square root of the link count, so a well-linked note is bigger without dwarfing the rest.
  const nodes = shown.map((id, i): GraphNode & SimulationNodeDatum => {
    const angle = (i / shown.length) * Math.PI * 2;
    return { id, here: id === here, r: 4 + Math.sqrt(neighbours(links.get(id)!).length), x: Math.cos(angle) * 40, y: Math.sin(angle) * 40 };
  });
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const edges: [GraphNode, GraphNode][] = [];
  const seen = new Set<string>();
  for (const from of nodes) for (const id of links.get(from.id)!.linksTo) {
    const to = byId.get(id);
    const key = [from.id, id].sort().join(' ');
    if (!to || to === from || seen.has(key) || (here && !from.here && !to.here)) continue;
    seen.add(key);
    edges.push([from, to]);
  }

  forceSimulation(nodes)
    .force('link', forceLink(edges.map(([source, target]) => ({ source, target }))).distance(60))
    .force('charge', forceManyBody().strength(-220))
    .force('collide', forceCollide<GraphNode>((node) => node.r + 6))
    .force('x', forceX(0).strength(0.08))
    .force('y', forceY(0).strength(0.08))
    .stop()
    .tick(300);

  // Fit the finished layout into the square, keeping its proportions.
  const xs = nodes.map((node) => node.x), ys = nodes.map((node) => node.y);
  const left = Math.min(...xs), top = Math.min(...ys);
  const width = Math.max(...xs) - left, height = Math.max(...ys) - top;
  const room = size - PADDING * 2;
  const scale = Math.min(room / Math.max(width, 1), room / Math.max(height, 1), 2.5);
  for (const node of nodes) {
    node.x = Math.round((size - width * scale) / 2 + (node.x - left) * scale);
    node.y = Math.round((size - height * scale) / 2 + (node.y - top) * scale);
  }
  return { nodes: nodes.map(({ id, x, y, r, here }) => ({ id, x, y, r: Math.round(r * 10) / 10, here })), edges: edges.map(([a, b]) => [a, b]), hidden };
}
