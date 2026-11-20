import { expect, test } from 'vitest';
import { mermaidDiagramsPlugin } from '../src/notes/diagrams.mjs';

const render = (value: string, meta?: string) =>
  (mermaidDiagramsPlugin()() as { code: (node: { lang: string; value: string; meta?: string }) => { value: string } })
    .code({ lang: 'mermaid', value, meta }).value;

const fanOut = `flowchart LR
  accTitle: One hub, many companies
  accDescr: A provider linked to three companies.
  H((Shared <provider>)):::hub --> a[One] & b[Two] & c[Three]`;

test('a hub pointing at three or more nodes is drawn as an accessible animated SVG', () => {
  const html = render(fanOut, 'Illustration caption');
  expect(html).toMatch(/^<figure class="fig"><svg class="hubfig" viewBox="0 0 \d+ \d+"[^>]* role="img"><title>One hub, many companies<\/title><desc>A provider linked to three companies\.<\/desc>/);
  expect(html.match(/class="hf-link"/g)).toHaveLength(3);
  expect(html.match(/<animateMotion /g)).toHaveLength(3);
  expect(html).toContain('Shared &lt;provider&gt;');
  expect(html).toContain('<figcaption class="caption">Illustration caption</figcaption>');
});

test('other flowcharts keep the box layout', () => {
  expect(render('flowchart LR\n  H((Hub)):::hub --> a[One] & b[Two]')).toContain('class="fig-panels"');
  expect(render('flowchart LR\n  H((Hub)) --> a[One] & b[Two] & c[Three]')).toContain('class="fig-panels"');
  expect(render('flowchart LR\n  subgraph s["Panel"]\n    H((Hub)):::hub --> a[One] & b[Two] & c[Three]\n  end')).toContain('class="fig-panels"');
});

const animated = (body: string) => render(`flowchart LR\n  %% animate\n  accTitle: T\n  accDescr: D.\n${body}`);

test('%% animate draws an accessible network SVG, and leaves other flowcharts alone', () => {
  const html = animated('  A((Hub)):::hub --> b[B] --> c[C]');
  expect(html).toMatch(/^<figure class="fig"><svg class="gf" viewBox="0 0 \d+ \d+"[^>]* role="img"><title>T<\/title><desc>D\.<\/desc>/);
  expect(html.match(/class="gf-link"/g)).toHaveLength(2);
  expect(html.match(/class="gf-arrow"/g)).toHaveLength(2);
  expect(html).toContain('class="gf-pulse"');
  expect(render('flowchart LR\n  A --> b[B] --> c[C]')).toContain('class="fig-panels"');
});

test('a failure spreads hop by hop from an alert node, and stops at cut links', () => {
  const html = animated('  P((P)):::alert --> C((C)):::hub --> x[X] & y[Y]\n  C -.- z[Z]:::faded');
  expect(html.match(/class="gf-link wave"/g)).toHaveLength(3);
  expect(html.match(/class="gf-link dead"/g)).toHaveLength(1);
  expect(html.match(/class="gf-dot wave"/g)).toHaveLength(3);
  expect(html.match(/class="gf-hit wave"/g)).toHaveLength(3); // C, X and Y light up; Z never does
  const hops = [...html.matchAll(/keyPoints="0;0;1;1" keyTimes="0;([\d.]+);/g)].map((m) => Number(m[1]));
  expect(hops[0]).toBeLessThan(hops[1]); // P → C goes before C → X
  expect(hops[1]).toBe(hops[2]); // C → X and C → Y go together
});

test('a loop is walked step by step, round the loop and then out', () => {
  const html = animated('  A((Start)):::hub --> B[Do] --> C{Check}\n  C -- Fail --> D[Fix]:::alert --> B\n  C -- Pass --> E[Done]');
  expect(html.match(/<circle class="gf-dot"/g)).toHaveLength(6); // A→B, B→C, C→D, D→B, B→C, C→E
  expect(html).toContain('<polygon class="gf-b"');
  expect(html).toContain('>Fail</text>');
});

test('subgraphs become titled panels inside one labelled image', () => {
  const html = animated('  subgraph one["First"]\n    H((Hub)):::hub --- a((A)) & b((B))\n  end\n  subgraph two["Second"]\n    X((Hub)):::alert -.- c((C)):::faded\n  end');
  expect(html).toMatch(/<div class="gf-panels" role="img" aria-label="T\. D\.">/);
  expect(html.match(/<svg class="gf"[^>]*aria-hidden="true"/g)).toHaveLength(2);
  expect(html).toContain('<span class="panel-t">Second</span>');
  expect(html).not.toContain('gf-pulse alert'); // a hub whose links are all cut doesn't pulse
});
