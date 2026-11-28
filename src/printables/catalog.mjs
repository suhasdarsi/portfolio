// The printable sheets that go with notes. Each sheet is a static page in public/printables/<id>.html.
// The /printables page lists these, a note links one by a paragraph that is only a link to /printables/<id>
// (printablesPlugin turns it into a card), and a note named in `note` gets a takeaway line under its cover.

/** @type {{ id: string, title: string, note: string, kind: string, description: string, rows: number }[]} */
export const printables = [
  {
    id: 'board-scorecard',
    title: 'Board scorecard: AI agent security',
    note: 'questions-boards-should-ask-ai-agent-security',
    kind: 'Scorecard',
    description: 'Five questions to ask every quarter, with room to write the answer, rate it and name an owner. One A4 page.',
    rows: 5,
  },
];

export const printableHref = (id) => `/printables/${id}`;
export const printableFor = (noteSlug) => printables.find((p) => p.note === noteSlug);

const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** A small drawing of the sheet: header, then one numbered row per question. Decorative only. */
export function miniSheet(rows) {
  let out = '<div class="mini"><span class="mini-eyebrow"></span><span class="mini-title"></span><span class="mini-rule"></span>';
  for (let n = 1; n <= rows; n++) {
    out += `<div class="mini-q"><span class="mini-n">${String(n).padStart(2, '0')}</span><div class="mini-body"><span class="mini-h"></span><span class="mini-guide"><i></i><i class="g"></i><i class="w"></i></span><span class="mini-line"></span></div></div>`;
  }
  return out + '</div>';
}

/** The card a note shows where it links a printable. */
export function printableCard(p) {
  const href = printableHref(p.id);
  return `<aside class="takeaway" id="takeaway" aria-label="${escape(p.kind)} to print">`
    + `<a class="sheet-thumb" href="${href}" aria-hidden="true" tabindex="-1">${miniSheet(p.rows)}</a>`
    + `<div class="takeaway-text"><span class="takeaway-kicker">Printable ${escape(p.kind.toLowerCase())}</span>`
    + `<a class="takeaway-title" href="${href}">${escape(p.title)}</a>`
    + `<p>${escape(p.description)}</p>`
    + `<span class="takeaway-actions"><a class="takeaway-btn" href="${href}">Open and fill in</a><a class="takeaway-more" href="/printables">All printables</a></span>`
    + '</div></aside>';
}

// A paragraph that is only a link to /printables/<id> becomes the printable's card.
export function printablesPlugin() {
  return {
    name: 'printables',
    paragraph(node, context) {
      const parts = node.children.filter((child) => !(child.type === 'text' && !child.value.trim()));
      const link = parts.length === 1 && parts[0].type === 'link' ? parts[0] : undefined;
      const match = link?.url?.match(/^\/printables\/([\w-]+)$/);
      if (!match) return;
      const p = printables.find((item) => item.id === match[1]);
      if (!p) throw new Error(`No printable "${match[1]}" in src/printables/catalog.mjs.`);
      context.replaceNode(node, { type: 'html', value: printableCard(p) });
    },
  };
}
