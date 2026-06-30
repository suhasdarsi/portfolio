# Design Review — Suhas Darsi Portfolio

**Date**: 2026-06-30
**Mode**: review

## Gut Reaction

This reads like a person, not a template. The warm earth palette, zero-radius sharpness, and earnest Literata-everywhere choice give it a distinctive warmth that sets it apart from both the cream-and-rounded personal blog genre and the dark-terminal developer aesthetic. The absence of icon-toppers, stat monuments, feature tiles, and gradient heroes is genuinely refreshing — those omissions take discipline.

What holds it back from greatness is spatial uniformity. Every page feels like the same page wearing a different content costume. The homepage, the notes listing, the article pages, the /uses page — they all render as a single centered serif column. That flatness works for long-form reading but deadens the entry experience.

## Scores

| Lens | Score | Notes |
|---|---|---|
| First impression | 7/10 | Warm, distinctive, no generic tells — but the uniform center-stack makes everything feel same-y |
| Hierarchy | 6/10 | Heading scale is clear on articles, but homepage lacks distinct visual zones — name, bio, Currently/Previously, and recent notes all sit at similar visual weight |
| Color voice | 8/10 | Custom earth-tone system with dark mode warmth and two surgical accents. Signal-blue for external links is a smart micro-interaction |
| Type voice | 7/10 | Literata everywhere has warmth but creates zero contrast between reading surfaces and UI surfaces. Nav links and body text have the same font |
| Composition | 5/10 | Every page is a 75ch center column. No spatial distinction between landing, listing, and long-read. Most significant weakness |
| Interaction feel | 7/10 | Search overlay is well-implemented, focus rings are consistent, transitions are fast. Missing: no scroll-to-top on long articles |
| Responsive | 7/10 | Grids collapse cleanly at 640px. Prose clamps at 480px. Safe-area handling not used |
| Surface polish | 7/10 | Reading progress bar, copy-code button, language labels on code blocks all present. Reading time in article header is a nice touch |

**Overall: 7/10** — Distinctive and authored, held back by spatial monotony.

## What Works

- Color system avoids the entire B2B SaaS and personal blog color cliché space
- 0px radii everywhere is a deliberate counter-signal — sharp, editorial, no pill-shaped comfort
- Reading experience features are genuinely useful: progress bar, reading time, language labels on code
- Search with keyboard navigation is better than most production sites
- Dark mode maintains warmth instead of going cold nav
- Zero icon-toppers, stat monuments, feature tiles, or gradient heroes — genuine restraint

## Priority Issues

### P0 — Every page has the same spatial identity

All pages render as a single centered 48rem column. The homepage should feel like an arrival — it gets the same spatial treatment as a 404 page. Add a distinct header area, a wider hero band, or some spatial variation between page types.

### P1 — No typographic contrast

`--font-sans: var(--font-serif)` means headings, body, nav, buttons, and search are all the same serif. The reading experience benefits from serif body text, but the UI layer (nav, buttons, search, labels) would benefit from a clean sans to create hierarchy between "chrome" and "content."

### P2 — Minimal visual index on homepage

Everything on the homepage sits at similar visual weight — the name, bio, CTA, Currently/Previously, and recent notes all receive similar spacing and type treatment. The name deserves to dominate the arrival moment more than the description text.

### P3 — No scroll position memory on notes listing

When navigating back from an article to the notes listing, scroll position is not restored. Browser default behavior may handle this but it's unreliable with Astro's client-side navigation.
