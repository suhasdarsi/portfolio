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
  // Two lanes: an open gate the first dot passes, a closed gate that stops the second.
  'next-foundation-model-lab-should-come-from-cybersecurity': () =>
    line([110, 40], [110, 180]) + line([210, 40], [210, 180]) + line([84, 110], [102, 110], 'cut') + line([118, 110], [136, 110], 'cut') + line([184, 110], [236, 110], 'bad')
    + node([110, 150], 7, 'hub') + node([210, 92], 7, 'bad'),
  // A route of four boxes: one solid (your app), three dashed hops, a faint copy left under each dashed one.
  'your-prompt-has-more-hops-than-your-contract': () => {
    const xs = [52, 124, 196, 268];
    const box = (x: number, cls: string) => `<rect class="${cls}" x="${x - 26}" y="88" width="52" height="40" rx="6"/>`;
    const bracket = (a: number, b: number) => line([a, 152], [a, 160]) + line([a, 160], [b, 160]) + line([b, 152], [b, 160]);
    return line([52, 108], [268, 108]) + xs.map((x, i) => box(x, i ? 'zone' : 'n')).join('')
      + xs.slice(1).map((x) => `<circle class="n hub" cx="${x}" cy="140" r="3" opacity=".5"/>`).join('')
      + node([268, 108], 6, 'hub') + bracket(26, 78) + bracket(98, 294);
  },
  // Five questions as five checkpoints: each row asks one question of an agent, and one is cut off.
  'questions-boards-should-ask-ai-agent-security': () => {
    const ys = [40, 75, 110, 145, 180];
    return ys.map((y, i) => line([70, y], [160, y], i === 3 ? 'cut' : '') + line([160, y], [250, y], i === 3 ? 'cut' : '')).join('')
      + ys.map((y) => `<rect class="gate" x="153" y="${y - 7}" width="14" height="14" transform="rotate(45 160 ${y})"/>`).join('')
      + ys.map((y) => node([70, y], 6)).join('') + ys.map((y, i) => node([250, y], i === 3 ? 6 : 8, i === 3 ? 'bad' : 'hub')).join('');
  },
};

// A labelled, animated drawing that replaces the cover at the top of one note's own page (cards, previews and the
// share image keep the plain cover above). Two drawings: side by side from 761px, stacked below. Styles: `.lanes` in site.css.
const lane = (x: number, title: string, sub: string) =>
  `<text class="h c" x="${x}" y="40">${title}</text><text class="m c" x="${x}" y="62">${sub}</text>`;
const banners: Record<string, string> = {
  'next-foundation-model-lab-should-come-from-cybersecurity':
    `<svg class="lanes lanes-wide" viewBox="0 0 680 298" role="img"><title>An open gate and a closed one</title><desc>Models in an evaluation, with cyber refusals turned down, got through. Responders asking for help, with safeguards on, were refused.</desc><g aria-hidden="true">`
    + lane(200, 'Models in an evaluation', 'cyber refusals turned down') + lane(480, 'Responders asking for help', 'safeguards on')
    + '<line class="track" x1="200" y1="92" x2="200" y2="262"/><line class="track" x1="480" y1="92" x2="480" y2="262"/>'
    + '<line class="open" x1="160" y1="176" x2="186" y2="176"/><line class="open" x1="214" y1="176" x2="240" y2="176"/><text class="m" x="256" y="181">got through</text>'
    + '<line class="shut" x1="440" y1="176" x2="520" y2="176"/><text class="w" x="536" y="181">refused</text>'
    + '<circle class="dot go" cx="200" cy="240" r="6"/><circle class="dot stop" cx="480" cy="164" r="6"/></g></svg>'
    + `<svg class="lanes lanes-tall" viewBox="0 0 360 252" role="img"><title>An open gate and a closed one</title><desc>Models in an evaluation, with cyber refusals turned down, got through. Responders asking for help, with safeguards on, were refused.</desc><g aria-hidden="true">`
    + '<text class="h" x="20" y="32">Models in an evaluation</text><text class="m" x="20" y="54">cyber refusals turned down</text>'
    + '<line class="track" x1="20" y1="82" x2="340" y2="82"/><line class="open" x1="200" y1="64" x2="200" y2="76"/><line class="open" x1="200" y1="88" x2="200" y2="100"/><text class="m" x="212" y="108">got through</text>'
    + '<text class="h" x="20" y="158">Responders asking for help</text><text class="m" x="20" y="180">safeguards on</text>'
    + '<line class="track" x1="20" y1="208" x2="340" y2="208"/><line class="shut" x1="200" y1="190" x2="200" y2="226"/><text class="w" x="212" y="234">refused</text>'
    + '<circle class="dot go" cx="300" cy="82" r="6"/><circle class="dot stop" cx="188" cy="208" r="6"/></g></svg>',
  // A route: your app, then three hops not in your contract. The dot walks it and leaves a fading copy at each hop.
  'your-prompt-has-more-hops-than-your-contract': (() => {
    const title = '<title>A route with more hops than the contract</title><desc>A prompt leaves your app, which is in your contract, then passes a router, a reseller and a host, which are not. Each of those three keeps a copy.</desc>';
    const names = ['Your app', 'Router', 'Reseller', 'Host'];
    // Wide: left to right, brackets below.
    const wx = [100, 260, 420, 580];
    const wide = `<svg class="lanes route route-wide lanes-wide" viewBox="0 0 680 298" role="img">${title}<g aria-hidden="true">`
      + '<line class="track" x1="100" y1="124" x2="580" y2="124"/>'
      + wx.map((x, i) => `<rect class="${i ? 'hop' : 'own'}" x="${x - 60}" y="72" width="120" height="84" rx="10"/><text class="h c" x="${x}" y="105">${names[i]}</text>`).join('')
      + wx.slice(1).map((x, i) => `<circle class="copy c${i + 1}" cx="${x}" cy="141" r="4"/>`).join('')
      + '<circle class="dot walk" cx="580" cy="124" r="6"/>'
      + '<path class="brace" d="M40 178v8h120v-8M200 178v8h440v-8"/>'
      + '<text class="m c" x="100" y="214">in your contract</text><text class="w c" x="420" y="214">not in your contract</text></g></svg>';
    // Tall (phones): top to bottom, brackets on the right.
    const ty = [42, 114, 186, 258];
    const tall = `<svg class="lanes route route-tall lanes-tall" viewBox="0 0 296 300" role="img">${title}<g aria-hidden="true">`
      + '<line class="track" x1="144" y1="42" x2="144" y2="258"/>'
      + ty.map((y, i) => `<rect class="${i ? 'hop' : 'own'}" x="16" y="${y - 24}" width="148" height="48" rx="10"/><text class="h" x="32" y="${y + 5}">${names[i]}</text>`).join('')
      + ty.slice(1).map((y, i) => `<circle class="copy c${i + 1}" cx="124" cy="${y}" r="4"/>`).join('')
      + '<circle class="dot walk" cx="144" cy="258" r="6"/>'
      + '<path class="brace" d="M180 20h8v44h-8M180 92h8v188h-8"/>'
      + '<text class="m" x="200" y="38">in your</text><text class="m" x="200" y="58">contract</text>'
      + '<text class="w" x="200" y="180">not in your</text><text class="w" x="200" y="200">contract</text></g></svg>';
    return wide + tall;
  })(),
};

/** The drawing for the top of a note's page, when the note has its own; otherwise the page shows its cover. */
export function noteBanner(id: string): string | undefined {
  return banners[id];
}

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
