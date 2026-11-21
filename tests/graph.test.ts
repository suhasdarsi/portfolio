import { describe, it, expect } from 'vitest';
import { labelLines, noteGraph } from '../src/notes/graph';
import type { NoteLinks } from '../src/notes/notes';

// Six notes shaped like the real garden: one note linked with all the others, four linked with each other, and one
// linked only with the hub.
const ids = ['hub', 'a', 'b', 'c', 'd', 'leaf'];
const pairs: [string, string][] = [['hub', 'a'], ['hub', 'b'], ['hub', 'c'], ['hub', 'd'], ['leaf', 'hub'], ['a', 'b'], ['a', 'c'], ['b', 'd'], ['c', 'd'], ['a', 'd']];
const linksFor = (ids: string[], pairs: [string, string][]) => new Map<string, NoteLinks>(ids.map((id) => [id, {
  linksTo: pairs.filter(([from]) => from === id).map(([, to]) => to),
  linkedFrom: pairs.filter(([, to]) => to === id).map(([from]) => from),
} as NoteLinks]));
const links = linksFor(ids, pairs);
const labels = new Map(ids.map((id) => [id, id === 'hub' ? 'Resilient AI systems' : id === 'leaf' ? 'Artifact and verifier' : `Note about ${id} things`]));

// The label's box as drawn: lines of 22.5px with the first baseline 16px below the top. Widths are the same estimate
// the layout uses, so this checks the layout against itself, not against a browser (the browser test does that).
type Graph = ReturnType<typeof noteGraph>;
function box(node: Graph['nodes'][number]) {
  const label = node.label!;
  if (label.pill) return { left: label.pill.x, top: label.pill.y, right: label.pill.x + label.pill.width, bottom: label.pill.y + label.pill.height };
  const width = Math.max(...label.lines.map((line) => line.length)) * 7.9;
  const left = label.anchor === 'start' ? label.x : label.anchor === 'end' ? label.x - width : label.x - width / 2;
  return { left, top: label.y - 16, right: left + width, bottom: label.y - 16 + label.lines.length * 22.5 };
}

// Every name drawn sits inside the frame and covers no other name.
function expectTidy(graph: Graph) {
  const named = graph.nodes.filter((node) => node.label);
  const boxes = named.map(box);
  for (const b of boxes) {
    expect(b.left).toBeGreaterThanOrEqual(0);
    expect(b.top).toBeGreaterThanOrEqual(0);
    expect(b.right).toBeLessThanOrEqual(graph.width);
    expect(b.bottom).toBeLessThanOrEqual(graph.height);
  }
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i], b = boxes[j];
    expect(a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom, `${named[i].id} and ${named[j].id}`).toBe(false);
  }
}

describe('graph of notes', () => {
  for (const [width, height] of [[580, 400], [420, 340], [300, 300]]) {
    it(`names every note inside a ${width}×${height} frame without names covering each other`, () => {
      const graph = noteGraph(ids, links, { width, height, labels });
      expect(graph.nodes.every((node) => node.label)).toBe(true);
      expectTidy(graph);
    });
  }

  it("names a note's own neighbours in the rail without names covering each other", () => {
    const graph = noteGraph(ids, links, { width: 320, height: 320, here: 'a', labels });
    expect(graph.nodes.every((node) => node.label)).toBe(true);
    expectTidy(graph);
  });

  it('leaves a name off rather than letting it run off the frame or cover another', () => {
    // A long title with no short name, on the hub's tag in a small frame.
    const pair = ['first', 'second'];
    const long = new Map([['first', 'Designing Resilient AI Systems Through Network Science and Much More Besides'], ['second', 'Another note']]);
    expectTidy(noteGraph(pair, linksFor(pair, [['first', 'second']]), { width: 300, height: 300, labels: long }));
    // Ten notes with no links and long names: too many to name in the space.
    const many = Array.from({ length: 10 }, (_, i) => `note-${i}`);
    expectTidy(noteGraph(many, linksFor(many, []), { width: 300, height: 300, labels: new Map(many.map((id, i) => [id, `Note number ${i} about systems`])) }));
  });

  it('draws a single note', () => {
    const graph = noteGraph(['only'], linksFor(['only'], []), { width: 300, height: 300, labels: new Map([['only', 'The only note']]) });
    expect(graph.nodes).toHaveLength(1);
    expect(graph.nodes[0].hub).toBe(true);
    expectTidy(graph);
  });

  it('draws the most-linked note as the hub, on a tag, with every link to it marked', () => {
    const graph = noteGraph(ids, links, { width: 580, height: 400, labels });
    expect(graph.nodes.filter((node) => node.hub).map((node) => node.id)).toEqual(['hub']);
    expect(graph.nodes.find((node) => node.hub)!.label!.pill).toBeDefined();
    expect(graph.edges.filter((edge) => edge.spoke)).toHaveLength(5);
  });

  it('gives every named note a target a finger can hit (48px across at full size)', () => {
    for (const node of noteGraph(ids, links, { width: 300, height: 300, labels }).nodes) expect(node.hit).toBeGreaterThanOrEqual(24);
  });

  it("on a note, the note being read is the hub and only its own links are drawn", () => {
    const graph = noteGraph(ids, links, { width: 320, height: 320, here: 'a', labels });
    expect(graph.nodes.find((node) => node.hub)!.id).toBe('a');
    expect(graph.nodes.map((node) => node.id).sort()).toEqual(['a', 'b', 'c', 'd', 'hub']);
    expect(graph.edges.every((edge) => edge.a.id === 'a' || edge.b.id === 'a')).toBe(true);
  });

  it('is the same drawing every build, whatever order the notes load in', () => {
    const drawing = noteGraph(ids, links, { width: 580, height: 400, labels });
    expect(noteGraph(ids, links, { width: 580, height: 400, labels })).toEqual(drawing);
    const shuffled = linksFor([...ids].reverse(), [...pairs].reverse());
    expect(noteGraph([...ids].reverse(), shuffled, { width: 580, height: 400, labels })).toEqual(drawing);
    // Two notes with the same number of links: the hub is chosen by id, not by which came first.
    const tie = ['beta', 'alpha'];
    expect(noteGraph(tie, linksFor(tie, [['beta', 'alpha']]), { width: 300, height: 300 }).nodes.find((node) => node.hub)!.id).toBe('alpha');
  });

  it('splits a long name over two lines at most', () => {
    expect(labelLines('Small worlds')).toEqual(['Small worlds']);
    expect(labelLines('Why AI security is different')).toEqual(['Why AI security', 'is different']);
    expect(labelLines('Designing Resilient AI Systems Through Network Science')).toHaveLength(2);
  });
});
