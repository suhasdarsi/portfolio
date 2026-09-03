# Design Review — Bag Finder (/bags)

**Date**: 2026-08-01
**Mode**: review
**Score**: 31/50

## Gut Reaction

The Bag Finder is the most "product-like" surface on this portfolio, and it shows. A genuine two-column compare layout, a compliance meter that reads as a real metric, a sticky filter rail, and a price slider that behaves like a filter control should. It is the first page on the site that stops being a centered article and becomes a tool.

What holds it back is that the rest of the site's design system has not caught up. The whole surface is crammed into the site-wide 48rem shell, so the two-column layout has to fight for room it never gets. The accent color (`--color-ember`) is literal near-black in light mode, so the compliance meter — the one element that should feel like a signal — reads as a flat dark bar. And the card grid, at 15.5rem columns inside a 48rem shell, produces cards so narrow they feel like an afterthought rather than a deliberate comparison grid.

## Scores

| Lens | Score | One-line takeaway |
|------|:-----:|-------------------|
| First impression | 7/10 | A real tool exists, but it is compressed into a shell that cannot show it off |
| Hierarchy | 6/10 | Compliance meter leads, but shell width flattens the rail/grid relationship |
| Color voice | 5/10 | Accent is near-black in light mode; the one color moment reads as no color |
| Type voice | 7/10 | Fira Mono for the metric and prices is a genuine improvement; serif title still wins |
| Interaction feel | 6/10 | Price slider and URL sync are excellent; compliance tooltip is not a real state |

## Primary Flow Walkthrough

**Arrive** → The page opens with a kicker, serif "Bag Finder" heading, intro copy, and a meta line (6 bags · 50 airlines · data verified). Below that, a two-column layout: a filter rail on the left (airline select, compliance slider, price slider, brand input, clear button) and a grid of bag cards on the right.

**Filter** → The user picks an airline, drags the compliance or price slider, or types a brand. The grid updates instantly, the URL gains query params, and an empty state appears if nothing matches. The rail is sticky on desktop so filters stay reachable while scanning.

**Compare** → Each card shows brand, name, a compliance % with a meter bar, a description, a dim/cap/wt spec row, a price, and an affiliate "Check price" button. Hovering the compliance number reveals a tooltip listing example airlines that fit and those that are tight.

**Act** → The user clicks "Check price", which opens the affiliate link in a new tab with `rel="sponsored noopener noreferrer"`. An FTC-style disclosure sits above the grid.

## Findings by Lens

### First Impression (7/10)

**Working**: The page is clearly a tool, not another article. The two-column split reads differently from every other page on the site. The compliance % as the hero number per card is the right call.

**Not working**: The entire surface is constrained by `max-w-3xl mx-auto` (48rem) from `BlogLayout`. A 48rem shell with a 15.5rem filter rail leaves ~28rem for the grid — roughly two narrow cards. The layout "wants" to be a wide comparison surface but is forced into article width. This is the single biggest structural issue.

### Hierarchy (6/10)

**Working**: Within a card, the compliance meter is unambiguously first, specs second, price third. The mono font on the metric separates it from the serif title. The rail/grid split is a real hierarchy device.

**Not working**: At 48rem the rail and grid compete for the same visual space rather than the rail supporting the grid. The intro paragraph sits above the fold alongside the meta line, diluting the immediate "this is a filterable finder" message. The compliance % number and the meter bar are good, but the label under the meter ("fits 50/50 airlines") is the same muted color as everything else and reads as noise at small size.

### Color Voice (5/10)

**Working**: The palette stays warm and on-brand. The meter fill uses `--color-accent`, which is at least the designated accent.

**Not working**: In light mode, `--color-accent` resolves to `--color-ember: #242421` — essentially near-black. The compliance meter, the single element that should feel like a live signal (green = good, amber = marginal, red = tight), renders as a dark gray bar. There is no compliance color coding at all: 100% and 82% look identical. The affiliate CTA button is also near-black-on-cream, which reads as a primary action but with no distinct hue. The `--color-signal-blue` token exists in the theme but is unused.

### Type Voice (7/10)

**Working**: Fira Mono for compliance % and price is a sharp, data-forward choice that fits a comparison surface. Inter for labels/specs keeps density legible. The Literata serif title keeps continuity with the rest of the site.

**Not working**: Small mono label under the meter at 0.66rem is very small for the amount of information it carries. The `dt` spec labels (Dim/Cap/Wt) at 0.62rem uppercase approach illegibility. The card title at 1.05rem serif inside a 15.5rem column wraps to three lines for longer names like "Peak Design Travel Backpack 45L", and the description at 0.82rem compounds the density.

### Interaction Feel (6/10)

**Working**: The price slider replacing the select is a genuine improvement — direct manipulation with a live `$` output, synced to `?maxPrice=` in the URL. All four filters compose correctly (verified against real data). The affiliate links carry correct `rel` attributes. Focus-visible rings exist on filters and the CTA.

**Not working**: The compliance tooltip is a `title` attribute — hover-only, no keyboard access, no visible affordance (no info glyph or underline on the number), and no mobile equivalent. The "Clear filters" button only appears once a filter is active, which is good, but there is no visible count of how many bags match. The empty state text ("No bags match those filters. Try widening them.") is serviceable but does not tell the user which filter to loosen. The compliance meter has no hover state of its own, so the only interactive signal on a card is the pill CTA.

## Priority Recommendations

| Priority | Issue | Fix mode |
|----------|-------|----------|
| P0 | The 48rem shell starves the two-column compare layout; grid cards are too narrow | `relayout` — widen the /bags page container (e.g. max-w-6xl) so the rail + grid breathe |
| P0 | Compliance meter and CTA use near-black accent; no compliance color coding (100% vs 82% look identical) | `recolor` — introduce a real signal hue (or use `--color-signal-blue`) for the meter fill; keep ember for the CTA |
| P1 | Compliance tooltip is a hover-only `title` attribute with no keyboard/mobile access | `interaction` — replace with a real disclosure pattern (button + accessible tooltip, or an inline "which airlines" toggle) |
| P1 | Cards at 15.5rem inside 48rem shell wrap long titles to 3 lines; specs labels near illegible | `typeset` — bump title/label sizes and widen the grid as part of the P0 relayout |
| P2 | No visible match count; empty state doesn't say which filter to loosen | `interaction` — show "N of 6 bags" in the rail, make empty state prescriptive |
| P2 | Intro paragraph + meta line crowd the top of a tool surface | `refine` — tighten header so the tool starts sooner |
| P2 | Unused `--color-signal-blue` token | `recolor` — either use it or remove it |
