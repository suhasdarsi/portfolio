# Design Review — Suhas Darsi Portfolio

**Date**: 2026-06-30
**Mode**: review
**Score**: 33/50

## Gut Reaction

This reads like a person, not a template. The warm eggshell palette, Literata-everywhere commitment, and zero-radius aesthetic combine into something that feels like a well-made journal rather than a templated blog. The "digital garden" framing sets expectations honestly, and the reading experience on article pages is genuinely pleasant.

What holds it back is execution discipline. The design system declares rules that components then ignore. Accessibility coverage is spotty on the most-used controls. The mobile experience has a fundamental padding problem.

## Scores

| Lens | Score | One-line takeaway |
|------|:-----:|-------------------|
| First impression | 7/10 | Distinctive editorial identity undermined by missing mobile padding and radius inconsistencies |
| Hierarchy | 6/10 | Three identical text-size tokens and a counterintuitive dim-on-hover pattern flatten the visual structure |
| Color voice | 7/10 | Warm, cohesive palette with thoughtful dark mode, but no real accent and muted text likely fails WCAG AA in light mode |
| Type voice | 7/10 | Committed Literata-everywhere identity with excellent prose settings, but serif at 14px for UI chrome and inconsistent input font choices |
| Interaction feel | 6/10 | Search and copy-code are genuinely excellent, but focus ring gaps on primary controls, no system theme detection, and missing input labels are significant accessibility failures |

## Primary Flow Walkthrough

**Arrive** → Homepage greets with a large serif name, three bio paragraphs, a CTA row, a "currently/previously" timeline, and three recent notes. Header is sticky with nav, ⌘K search trigger, and theme toggle.

**Read** → Clicking a note opens the article page with a back-link, topic tags, title, description, date/reading-time meta, the prose body, backlinks section, and prev/next navigation. A reading progress bar sits at the top.

**Navigate** → The Notes listing provides topic filter pills, a text filter input, and a count display. Global ⌘K search opens a Fuse.js-powered overlay with keyboard navigation. The Uses page is a flat list. A 404 page offers recovery paths plus inline search.

## Findings by Lens

### First Impression (7/10)

**Working**: Distinct, committed identity. Warm eggshell palette, Literata serif everywhere, zero-radius aesthetic. The "digital garden" framing sets expectations honestly. Prose settings show someone who cares about long-form reading.

**Not working**:
- No horizontal padding on mobile — `<main>` is `max-w-3xl mx-auto` with no `px-*`. On 375px viewport, content touches both screen edges. Header-inner explicitly sets `padding: 0`. Footer is `padding: 2rem 0`. The entire site looks broken on phones.
- Radius system says 0px, components override with hardcoded values: topic tags `6px`, code blocks `8px`, backlink items `8px`, copy-code buttons `4px`, kbd elements `4px`. Visual inconsistency undermines the intended architectural feel.

### Hierarchy (6/10)

**Working**: Within article prose, hierarchy is well-tuned: H2 at 1.75rem, H3 at 1.375rem, body at 1rem→1.25rem, with `scroll-margin-top: 5rem`. Article title uses responsive `clamp()`. Timeline uses uppercase tracked labels for clear section breaks.

**Not working**:
- Three type tokens collapse to the same size: `--text-body: 0.875rem`, `--text-body-sm: 0.875rem`, `--text-small: 0.875rem`. Three "levels" of text are identical at 14px. Nav links, body text, metadata, and "small" labels all read at the same visual weight.
- The dim-on-hover pattern inverts expectations. Hovering over a link reduces prominence to muted-foreground. Users expect hover to signal interactivity by increasing prominence. This reads more like a state error than a hover cue.

### Color Voice (7/10)

**Working**: Cohesive and intentional palette. Warm earthy spectrum creates a paper-like warmth. Dark mode maintains warm character. Two accent colors (signal-blue for external links, ember on link hover) used exclusively within prose. Body text color deliberately lighter than foreground for tonal step.

**Not working**:
- No real accent color in the UI. `--color-accent` is literally the foreground. No visual "pop" anywhere in interface chrome. Every interactive element is some combination of foreground/muted-foreground/border.
- Muted text likely fails WCAG AA in light mode. `#847f6b` on `#f8f5eb` yields ~3.7:1 contrast — below 4.5:1 threshold. Used extensively for nav links, dates, reading time, section labels, footer text.
- Redundant tokens: `--color-chalk` and `--color-fog` are both `#d8d3c1`. `--color-subtle` (`#fefcf6`) nearly indistinguishable from background (`#f8f5eb`).

### Type Voice (7/10)

**Working**: Literata everywhere is a bold, successful commitment. Variable font with good optical sizing, designed for screen reading, literary character. Prose readability is excellent: 1rem→1.25rem, 1.7 line-height, dark mode bumps to 1.8. `text-wrap: pretty` on paragraphs, `balance` on headings. Fira Code for monospace is a good pairing.

**Not working**:
- Serif at 14px for UI text hurts legibility. Nav links, kbd elements, topic filter labels, meta info, search footer text all render at 14px in Literata. Serifs get muddy at small sizes on lower-DPI displays.
- Inconsistent font choices for search inputs: header search dialog uses `--font-mono`, notes page filter uses `--font-serif`, 404 page search uses `--font-mono`.
- `font-weight: 500` on headings sits in awkward middle ground. H3 at 1.125rem/500 vs body at 1rem/400 is a subtle step. Using 600 for headings would create stronger separation.

### Interaction Feel (6/10)

**Working**: The ⌘K search is genuinely excellent — keyboard nav, Tab trap, focus return, body scroll lock, fuzzy search, styled empty state. Copy-code button is well-executed with toast feedback. Reading progress bar is minimal and correct. Topic filters with URL sync. `prefers-reduced-motion` globally respected.

**Not working**:
- Focus ring coverage has significant gaps. Search trigger and theme toggle — the two most important header controls — have no focus indicators. Card-style links (note items, recent items, backlinks, uses items) also lack focus rings.
- Theme toggle ignores `prefers-color-scheme`. Defaults to `'light'` when no localStorage value exists. A user with OS set to dark mode gets blasted with light mode on first visit.
- Inputs lack labels. All three search inputs use `placeholder` as the only label. Screen readers may not announce these clearly.
- Search dialog lacks `role="dialog"` and `aria-modal="true"`.
- Duplicate `outline-offset` in nav links CSS.
- Transition timing inconsistent: `0.15s`, `0.2s`, `0.3s` across components with no rationale.

## Priority Recommendations

| Priority | Issue | Fix mode |
|---|---|---|
| P0 | No mobile horizontal padding | `finish` — add `px-4` to main, header, footer |
| P0 | Focus ring gaps on search trigger, theme toggle, card links | `finish` — add `:focus-visible` to all interactive elements |
| P0 | Theme toggle ignores system preference | `finish` — use `matchMedia('(prefers-color-scheme: dark)')` as fallback |
| P1 | Three identical text-size tokens | `tokenize` — differentiate `--text-small` from `--text-body` |
| P1 | Radius overrides contradict 0px system | `finish` — remove hardcoded radii or commit to a radius scale |
| P1 | Muted text fails WCAG AA in light mode | `recolor` — darken `--color-muted-foreground` to pass 4.5:1 |
| P1 | Inputs lack accessible labels | `finish` — add `aria-label` to all search inputs |
| P2 | Dim-on-hover pattern inverts expectations | `refine` — change to foreground-on-hover |
| P2 | Inconsistent search input fonts | `finish` — standardize to one font family |
| P2 | Search dialog missing ARIA roles | `finish` — add `role="dialog"` and `aria-modal="true"` |
| P3 | Redundant color tokens | `tokenize` — consolidate duplicate tokens |
| P3 | Heading weight too light | `typeset` — bump headings to 600 |
