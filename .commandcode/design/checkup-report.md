# Design Checkup — Suhas Darsi Portfolio

**Date**: 2026-06-30
**Mode**: checkup
**Score**: 56/60

## TL;DR

Warm, authored editorial design with excellent typography and intentional color. The
palette, composition, and motion all signal a personal digital garden, not a template.
Two small surface issues — mobile search affordance and prose overflow risk on very
narrow viewports — are the only things keeping this from a clean bill of health.

**Primary recommendation**: `/design surface` to harden the search trigger and
review narrow-viewport prose rendering.

---

## Heuristic Scores

| # | Heuristic | Score | Key Finding |
|---|---|---|---|
| 1 | Intentionality | 10/10 | Warm earth palette, serif/sans pairing, type scale, and staggered entrance motion all feel authored — not assembled from defaults |
| 2 | Readability | 10/10 | Prose at 1.375rem / 1.82 leading / 75ch measure is excellent. Light and dark mode contrast both pass comfortably |
| 3 | Usability | 9/10 | Skip link, sticky header, keyboard-driven search overlay with Tab trap, ⌘K toggle, prev/next navigation. Only gap: mobile search trigger is icon-only |
| 4 | Responsiveness | 8/10 | Works at 640, 768, 1024px. Grids collapse cleanly. Prose at 22px on 320px phones may overflow its container — needs verification on actual hardware |
| 5 | Speed | 10/10 | Static output, no framework runtime, minimal client JS (search + theme), ~1s build. No layout shift |
| 6 | Accessibility | 9/10 | Skip link, semantic HTML, aria-labels on icon-only buttons, full keyboard search, reduced-motion support, focus-visible outlines, structured data. Only concern: placeholder-only search input without associated `<label>` |

---

## What's Working

| Area | Description |
|---|---|
| **Color** | Warm earth palette (eggshell, obsidian, gravel) avoids generic tech hues entirely. Dark mode mirrors the same warmth rather than switching to cool neutrals. Palette feels tactile, paper-like |
| **Typography** | Lora serif for headings + Inter sans for UI creates clear hierarchy. The prose scale (1.375rem) is generous and editorial — noticeably bigger than most blogs, which signals "this is worth reading" |
| **Motion** | Staggered fadeUp entrance animation on homepage is restrained and purposeful. Respects `prefers-reduced-motion`. Overlay transitions are crisp at 0.2s |
| **Layout** | Single-column centered at 48rem is appropriate for a reading-focused personal site. The Currently/Previously grid gives the homepage structure without feeling dashboard-like |
| **Search** | Full keyboard navigation, Tab trap inside overlay, ⌘K global shortcut, arrow keys, Esc — genuinely well-implemented UX |
| **Content-first character** | The design steps back and lets writing lead. No decorative flourishes, no stock imagery, no layout gymnastics. This restraint is the site's strongest quality |

## Priority Issues

### P0 — Mobile search trigger has no visible label

**Evidence**: On viewports < 640px, the search button shows only a 12×12px magnifying glass icon. The `aria-label` is present for screen readers, but sighted users on mobile see an unlabeled icon with no textual context.

**Fix**: `/design interaction` on the search trigger to add a visible label or tooltip on all viewport sizes, or make the icon itself meaningfully larger.

### P1 — Prose may overflow on very narrow viewports

**Evidence**: `.prose-custom` sets `font-size: 1.375rem` (22px) with `max-width: var(--max-width-content)` which resolves to 75ch. At 22px per character, 75ch ≈ 1650px — the `overflow-wrap: break-word` prevents hard breakage, but on a 320px phone, large inline elements (long unbroken strings, wide tables, oversize images) may force horizontal scroll.

**Fix**: `/design responsive` on `.prose-custom` to clamp the font size on narrow viewports and add safe overflow handling for embedded content.

### P2 — Orphan accent colors defined but unused

**Evidence**: `--color-signal-blue: #517cd9` and `--color-ember: #cd5f37` are defined in the theme but never referenced in any component or page. They're not harmful but signal unfinished color-system work.

**Fix**: Either remove them, or use them intentionally (e.g., ember for links in prose, signal-blue for external link indicators).

### P3 — Fragile CSS in prose-custom

**Evidence**: All heading rules in `.prose-custom` use `!important` on every property — 21 declarations total. This creates a specificity trap where any override must also use `!important`.

**Fix**: `/design tokenize` to restructure prose-custom with higher-specificity selectors instead of `!important`.

---

## Recommended Next Modes

`/design interaction` — fix mobile search affordance
`/design responsive` — harden narrow-viewport prose
`/design surface` — harden states and polish remaining surface issues
`/design tokenize` — restructure fragile CSS in prose-custom
