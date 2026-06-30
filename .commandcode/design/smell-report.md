# Design Smell Report — Suhas Darsi Portfolio

**Date**: 2026-06-30
**Mode**: smell

## Summary

Surprisingly clean. Of 11 AI-generated design tells checked, only one registers as strong, three as faint, and seven are completely absent. The color system, motion restraint, and absence of generic kitsch all signal real human decisions.

## Findings

### STRONG — Center Stack (safe-centered layout)

**Location**: Every page
**Evidence**: Single `max-w-3xl mx-auto` centered column at 48rem/75ch. Homepage, notes listing, article pages, /uses, 404 — all share identical spatial treatment.
**Why it smells**: A centered 75ch column is the default for every CMS theme and SSG starter. Zero layout variation between landing, listing, and long-read contexts.
**Fix mode**: `/design relayout`

### FAINT — Unearned Blur

**Location**: `Header.astro` search overlay
**Evidence**: `backdrop-filter: blur(8px)` on search modal only. No other component participates in a depth system.
**Why it's faint**: Modal blur is legitimate, just isolated.

### FAINT — Default Type

**Location**: `global.css` — Literata used as universal typeface
**Evidence**: `--font-sans: var(--font-serif)` — headings, body, UI labels, navigation all the same serif. No typographic contrast.
**Why it's faint**: Literata is a well-crafted reading face with genuine warmth. The choice has taste, just no visible project-specific argument.

### FAINT — Domain Default (warm palette)

**Location**: `global.css` color tokens
**Evidence**: Warm cream/eggshell palette. Counter-signal: every radius is 0px (sharp corners throughout).
**Why it's faint**: The palette is custom-crafted with its own taxonomy (obsidian, cinder, gravel, slate, fog, chalk, powder, eggshell) and dark mode equivalents.

### ABSENT (7 of 11)

- Tech gradient (blue-violet/purple-teal)
- Generic blue-purple identity
- Feature tile grid with icons
- Accent rail / colored stripes
- Stat monument clusters
- Icon topper / rounded-square heading ornaments
- Bounce/elastic easing everywhere
