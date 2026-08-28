# Design System — hamiltonulmer.com

A personal-portfolio design language built on a warm, paper-like palette, restrained
typography, and a single centered column. The site is fast, quiet, and feels more like a
well-set document than a marketing page.

---

## 1. Overall character

- **Voice**: calm, editorial, minimal. Content first, chrome second.
- **Layout**: single column, `max-width: 640px`, centered on the page.
- **Density**: generous but not airy. Rows are tight and scannable; sections are separated
  by large vertical gaps (`pt-16` = 4rem) rather than rules or cards.
- **Structure**: a header block (name, tagline, social row), an interactive diagram, then a
  series of titled list sections. No persistent top navigation bar.
- **Tech**: Astro, Tailwind CSS (utility classes), View Transitions, dark-mode class toggling,
  `prefers-reduced-motion` support throughout.

---

## 2. Color palette

### Light theme (default)

| Token | Value | Usage |
| --- | --- | --- |
| Background | `#f7f0e7` | Off-white / warm paper. The dominant surface. |
| Text (off-black) | warm near-black | Body and headings. `text-offblack`. |
| Muted text | `#565350` | Secondary hover state, darker warm gray. |
| Faint text / gray | `#a4a09e` | Inactive social icons. |
| Section labels | `text-gray-500` | The small uppercase-feeling section headings. |
| Diagram stroke | `hsl(30, 7%, 34%)` | Warm gray-brown. Used for the Crossroads SVG lines. |
| Diagram fill (old plane) | `#eee7db` / `#ddd2bf` | Warm dither pattern. |
| Diagram fill (new plane) | `#ddd3c2` / `#c9bda7` | Warm hatch pattern. |
| Tooltip bg (light) | `#535161` | Dark slate, used for social tooltips. |
| Tooltip text (light) | `#f7f0e7` | Inverse of background. |
| Diagram tip bg | `#23262f` | Near-black charcoal for the interactive diagram tips. |
| Diagram tip text | `#f3efe6` | Warm off-white. |

### Dark theme

| Token | Value | Usage |
| --- | --- | --- |
| Background | dark off-black | `bg-offwhite` flips via `.dark`. |
| Text | `#f7f0e7` | Off-white foreground. |
| Muted icon | `#76716e` | Warm dark gray. |
| Muted icon hover | `#f7f0e7` | Brightens to foreground. |
| Tooltip bg (dark) | `#f7f0e7` | Light, inverse. |
| Tooltip text (dark) | `#535161` | Dark slate. |
| Hover row | `white/[0.04]` | Subtle translucent white wash on rows. |

### Semantic notes

- Hover treatments on rows use translucent overlays: `hover:bg-black/[0.03]` (light) and
  `dark:hover:bg-white/[0.04]` (dark). This keeps surfaces flat without solid tint blocks.
- Focus outline uses an accent: `#df4b91` (cerise/pink). Used sparingly for interactive
  diagram labels and talk rows.
- Text color hierarchy is achieved with opacity + a single warm gray, not multiple hues.

---

## 3. Typography

### Fonts

| Role | Family | Stack |
| --- | --- | --- |
| Primary / headings | **Pensum Pro** | `"Pensum Pro", Georgia, serif` |
| UI / body / sans | **Inter Variable** | `"Inter", system-ui, sans-serif` |

- Fonts are self-hosted (`.woff2`), preloaded, and loaded asynchronously via `fonts-loading`
  class that hides text until `document.fonts.ready` resolves (prevents FOUT/FOIT flash).
- Weights used: Inter `500` (medium), `600` (semibold); Pensum Pro `500` and `700`.

### Scale & style

- **Name (H1)**: serif, large, acts as the site title. Link styled to match body color.
- **Tagline**: `text-gray-500`, small, one line.
- **Section headings**: `font-semibold text-gray-500`, baseline-aligned with small leading
  gap. They read as quiet, uppercase-ish labels rather than bold headlines.
- **Body**: `Inter`, normal weight, with `<b>` for lead-in emphasis on key sentences.
- **Emphasis**: italic serif used sparingly for the closing rhetorical line
  ("*Where will this technology take us?*").
- **Tabular numbers**: all dates/year ranges use `tabular-nums` so columns align vertically.
- **No uppercase tracking**: headings are sentence case; nothing is `text-transform: uppercase`.

---

## 4. Layout & spacing

### Page shell

- Outer container: `max-w-[640px] relative m-auto mt-16 mb-8 w-full`.
- Bottom padding on the whole page: `pb-48`.
- Content starts at `mt-16` (4rem from top), giving a clear, centered focal start.

### Section rhythm

- Each section heading has `pt-16` (4rem top padding) — large, consistent breathing room.
- Section list containers use `-mx-3 mt-4` (negative horizontal margin) so list rows can
  bleed slightly wider than the column, with inner `px-3` padding restoring alignment.

### List rows (work / talks / posts)

- Grid: `grid-cols-[auto_1fr_auto]` on mobile, `sm:grid-cols-[150px_1fr_105px]` on desktop.
  - Column 1: brand/organization/name (fixed 150px).
  - Column 2: title / description (flexible).
  - Column 3: date / year range (fixed 105px, right-aligned, `tabular-nums`).
- Row padding: `px-3 py-3.5` (14px vertical), `rounded-md`.
- Rows are full-width anchors (`col-span-2` / `col-span-3`) and have a subtle hover
  background. No borders, no dividers — whitespace does the separation.
- A right-aligned "go" arrow appears on hover for work rows (animated nudge).

### Social row

- `display: flex; gap: 16px`, icons are inline SVG with `padding: 0 8px` and negative margin
  to expand the hit area.
- Icons sit at `#a4a09e`, brighten to `#565350` on hover (light), and `#76716e` → `#f7f0e7`
  (dark).

---

## 5. Components & interactions

### Crossroads diagram

- An interactive inline SVG (`The Crossroads`), built with masks, patterns, and gradients
  rather than external images.
- Illustrates the "automate the old vs. leverage the new" idea: two perpendicular planes, a
  rising technological-advance curve, and a spark at the intersection.
- **Intro choreography** (~6s): ground fades in, the advance curve draws in, the reveal mask
  radiates outward, spark fades, then arrows/labels ride out. All eased with custom cubic
  beziers; `prefers-reduced-motion` collapses everything to the final static state.
- **Hover focus**: hovering one choice (old/new) dims everything else to `opacity: 0.12`,
  keeping the hovered arrow, its label, and the relevant plane lit. The ground-plane radial
  fade eases in/out on focus.
- **Labels**: "Leverage the new" (Pensum Pro 700), "Automate the old" (Pensum Pro 500),
  "Technological advance" (Inter 500). These are focusable/tab-indexed and dispatch custom
  `crossroads:tip` events.
- **Tooltips**: dark charcoal (`#23262f`) in light mode, warm off-white in dark mode, with a
  small arrow and a subtle drop shadow. Text is Inter 12px, `line-height: 1.45`.

### Social icons + tooltips

- Icons: X, GitHub, LinkedIn, Bluesky, and a mail-to link.
- Hover/focus reveals a tooltip with the platform name and a one-line description
  (e.g. "X, where I work in the open").
- Tooltip: positioned above the icon, `background: #535161`, `color: #f7f0e7`, 12px medium,
  rounded 8px, with a 9px rotated-square arrow. Entrance: opacity + scale + translate,
  `cubic-bezier(.22, 1, .36, 1)`.
- The mail icon has a **copy-to-clipboard** interaction: clicking copies
  `hamilton.ulmer@gmail.com` and animates the tooltip text through "copied to clipboard ✓".
  It falls back to `mailto:` if clipboard is unavailable.

### Talk rows

- Each talk row is a `role="button"` (clickable, keyboard-accessible via Enter/Space).
- Expanding a row opens an inline panel (`grid-template-rows: 0fr → 1fr`) that embeds the
  YouTube `youtube-nocookie` player with `autoplay=1` and a "Watch on YouTube ↗" link.
- Only one talk panel is open at a time; opening one closes the others.
- Focus outline: `2px solid #df4b91`, `outline-offset: -2px`, rounded 2px.

### Blog post rows

- Two-column grid (`[1fr_auto]`): title (medium weight) + date (right-aligned, muted,
  tabular). Full-width anchor with the same hover wash.
- Posts use `data-astro-prefetch="load"` for view-transition prefetching.

---

## 6. Motion

- **View Transitions** (Astro) enabled, with fallback `animate`.
- Standard transition set: `astroFadeInOut`, `astroFadeIn`/`FadeOut` (using
  `mix-blend-mode: plus-lighter`), `astroSlideFromLeft/Right`, `astroSlideToLeft/Right`.
- All motion respects `prefers-reduced-motion: reduce` — view-transition groups, talk panels,
  social tooltips, and the diagram all disable animation.
- Easing language favors soft "out" curves: `cubic-bezier(.22, 1, .36, 1)`,
  `cubic-bezier(.33, 1, .68, 1)`, and `cubic-bezier(.34, 1.4, .5, 1)` for the playful
  arrow-nudge bounce.

---

## 7. Accessibility

- `prefers-reduced-motion` honored everywhere.
- Full keyboard support: interactive labels and talk rows are `tabindex="0"` with visible
  focus states and Enter/Space activation.
- ARIA: talk rows expose `aria-expanded` / `aria-controls`; the diagram has `role="img"` and
  a descriptive `<desc>`; social links have `aria-label`s.
- Dark mode is a `.dark` class on `<html>`, toggled client-side.
- Font loading avoids flash via the `fonts-loading` visibility strategy.

---

## 8. Reference values (quick tokens)

```
--bg:        #f7f0e7
--fg:        (warm near-black, "offblack")
--gray-500:  #a4a09e-ish muted
--ink-warm:  hsl(30, 7%, 34%)  ≈ #56514b
--focus:     #df4b91
--font-serif: "Pensum Pro", Georgia, serif
--font-sans:  "Inter", system-ui, sans-serif
--col-max:   640px
--section-gap: 4rem (pt-16)
--row-pad-y: 14px (py-3.5)
--radius:    6px (panels) / 8px (tooltips) / rounded-md (rows)
```
