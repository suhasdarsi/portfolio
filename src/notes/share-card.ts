// The share card (og:image) for a note or the site: a 1200x630 SVG for sharp to turn into a PNG.
// The text is drawn as glyph outlines from the site's own font files, so the card looks the same on any machine
// (sharp's SVG renderer otherwise falls back to whatever sans-serif the build machine has).
// Left: the title in Geist Serif, fitted into a fixed box (largest size that fits in 3 lines, lines balanced).
// Right: the note's cover diagram (or, for the site card, the graph of every note) on the card colour.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as fontkit from 'fontkit';

const CARD = { width: 1200, height: 630 };

// Light theme colours from `.sd` in site.css.
const color = { bg: '#f6f5f1', soft: '#eeebe4', line: '#e4e1dc', ink: '#2b2b28', muted: '#5f5c57', accent: '#2f3e9e', alert: '#b42318' };

interface Face { layout(text: string): { glyphs: { path: { toSVG(): string }; id: number }[]; positions: { xAdvance: number }[] }; unitsPerEm: number }

let faces: { serif: Face; sans: Face; sansBold: Face } | undefined;
function loadFaces() {
  if (faces) return faces;
  const open = (file: string) => fontkit.create(readFileSync(resolve(process.cwd(), 'public/fonts', file))) as unknown as Face & { getVariation(v: Record<string, number>): Face };
  const sans = open('geist-latin.woff2');
  faces = { serif: open('geist-serif.woff2'), sans: sans.getVariation({ wght: 450 }), sansBold: sans.getVariation({ wght: 600 }) };
  return faces;
}

/** Width in pixels of `text` set in `face` at `size`, with `tracking` (em) added after each glyph. */
function measure(face: Face, text: string, size: number, tracking = 0) {
  const run = face.layout(text);
  const units = run.positions.reduce((sum, p) => sum + p.xAdvance, 0);
  return (units / face.unitsPerEm) * size + tracking * size * run.glyphs.length;
}

/** `text` as outlines, starting at (x, baseline). `anchor: 'end'` puts the end of the text at x. */
function draw(face: Face, text: string, x: number, baseline: number, size: number, fill: string, { tracking = 0, anchor = 'start' } = {}) {
  const run = face.layout(text);
  const scale = size / face.unitsPerEm;
  let pen = anchor === 'end' ? x - measure(face, text, size, tracking) : x;
  const paths: string[] = [];
  run.glyphs.forEach((glyph, i) => {
    const d = glyph.path.toSVG();
    if (d) paths.push(`<path transform="translate(${pen.toFixed(2)} ${baseline}) scale(${scale.toFixed(5)} ${(-scale).toFixed(5)})" d="${d}"/>`);
    pen += run.positions[i].xAdvance * scale + tracking * size;
  });
  return `<g fill="${fill}">${paths.join('')}</g>`;
}

/** Greedy word wrap of `words` into lines no wider than `width`. */
function wrap(face: Face, words: string[], size: number, width: number, tracking: number) {
  const lines: string[] = [];
  for (const word of words) {
    const joined = lines.length ? `${lines.at(-1)} ${word}` : word;
    if (lines.length && measure(face, joined, size, tracking) <= width) lines[lines.length - 1] = joined;
    else lines.push(word);
  }
  return lines;
}

export const TITLE = { width: 560, maxLines: 3, largest: 80, smallest: 44, leading: 1.1, tracking: -0.015 };

/** Width in pixels of one title line at `size`. */
export const titleWidth = (line: string, size: number) => measure(loadFaces().serif, line, size, TITLE.tracking);

/** The largest size at which the title fits the box in at most 3 lines, with the lines evened out (like `text-wrap: balance`). */
export function fitTitle(title: string) {
  const { serif } = loadFaces();
  const words = title.trim().split(/\s+/);
  for (let size = TITLE.largest; size >= TITLE.smallest; size -= 2) {
    const lines = wrap(serif, words, size, TITLE.width, TITLE.tracking);
    if (lines.length > TITLE.maxLines || lines.some((line) => measure(serif, line, size, TITLE.tracking) > TITLE.width)) continue;
    // Narrow the box until one more step would add a line, so the last line is not left short.
    let narrow = TITLE.width;
    while (narrow > 200 && wrap(serif, words, size, narrow - 8, TITLE.tracking).length === lines.length) narrow -= 8;
    return { size, lines: wrap(serif, words, size, narrow, TITLE.tracking) };
  }
  // Too long even at the smallest size: keep 3 lines and end the last with an ellipsis.
  const size = TITLE.smallest;
  const all = wrap(serif, words, size, TITLE.width, TITLE.tracking);
  const fits = (text: string) => measure(serif, text, size, TITLE.tracking) <= TITLE.width;
  const lines = all.slice(0, TITLE.maxLines).map((line, i) => {
    const cut = i === TITLE.maxLines - 1 && all.length > TITLE.maxLines;
    if (!cut && fits(line)) return line;
    // Drop characters (a word wider than the box) or trailing words until the line and its ellipsis fit.
    let text = line;
    while (/\s/.test(text) && !fits(`${text}…`)) text = text.replace(/\s+\S+$/, '');
    while (text && !fits(`${text}…`)) text = text.slice(0, -1);
    return `${text.trimEnd()}…`;
  });
  return { size, lines };
}

interface CardInput {
  title: string;
  /** Small line above the title. */
  kicker: string;
  /** Diagram markup and the part of its own coordinates to show (x, y, width, height). */
  figure: { markup: string; viewBox: [number, number, number, number] };
  author: string;
  host: string;
}

// Panel on the right that holds the drawing.
const PANEL = { x: 704, y: 64, width: 432, height: 502, radius: 24, padding: 28 };

export function shareCardSvg({ title, kicker, figure, author, host }: CardInput): string {
  const { serif, sans, sansBold } = loadFaces();
  const { size, lines } = fitTitle(title);
  const step = size * TITLE.leading;
  // Centre the title block (cap height to last baseline) between the kicker and the byline.
  const capHeight = size * 0.7;
  const blockHeight = capHeight + step * (lines.length - 1);
  const top = 150, bottom = 470;
  const firstBaseline = Math.round(top + (bottom - top - blockHeight) / 2 + capHeight);
  const titleSvg = lines.map((line, i) => draw(serif, line, 80, Math.round(firstBaseline + i * step), size, color.ink, { tracking: TITLE.tracking })).join('');

  const [vx, vy, vw, vh] = figure.viewBox;
  const inner = { x: PANEL.x + PANEL.padding, y: PANEL.y + PANEL.padding, width: PANEL.width - PANEL.padding * 2, height: PANEL.height - PANEL.padding * 2 };
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD.width}" height="${CARD.height}" viewBox="0 0 ${CARD.width} ${CARD.height}">
  <style>
    .fig line { stroke: ${color.ink}; stroke-width: 2; stroke-opacity: .6; stroke-linecap: round; }
    .fig .n { fill: #fcfbf7; stroke: ${color.ink}; stroke-width: 2.2; }
    .fig .hub { fill: ${color.accent}; stroke: ${color.accent}; }
    .fig .n.bad { fill: ${color.alert}; stroke: ${color.alert}; }
    .fig line.bad { stroke: ${color.alert}; stroke-width: 2.8; stroke-opacity: 1; }
    .fig line.cut { stroke-dasharray: 3 4; }
    .fig .zone { fill: none; stroke: ${color.ink}; stroke-width: 1.6; stroke-dasharray: 4 5; stroke-opacity: .6; }
    .fig .gate { fill: ${color.ink}; }
  </style>
  <rect width="${CARD.width}" height="${CARD.height}" fill="${color.bg}"/>
  <rect x="${PANEL.x}" y="${PANEL.y}" width="${PANEL.width}" height="${PANEL.height}" rx="${PANEL.radius}" fill="${color.soft}" stroke="${color.line}" stroke-width="2"/>
  <svg class="fig" x="${inner.x}" y="${inner.y}" width="${inner.width}" height="${inner.height}" viewBox="${vx} ${vy} ${vw} ${vh}" preserveAspectRatio="xMidYMid meet" overflow="visible">${figure.markup}</svg>
  <circle cx="87" cy="96" r="7" fill="${color.accent}"/>
  ${draw(sansBold, kicker, 106, 105, 24, color.muted, { tracking: 0.01 })}
  ${titleSvg}
  ${draw(sansBold, author, 80, 528, 28, color.ink)}
  ${draw(sans, host, 80, 564, 24, color.muted)}
</svg>`;
}
