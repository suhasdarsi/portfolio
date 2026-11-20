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
