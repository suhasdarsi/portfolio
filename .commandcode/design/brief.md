# Design Brief — Suhas Darsi Portfolio

## Register

**Brand.** Personal portfolio / digital garden. No authentication, dashboards, tables, or forms. Every surface is editorial — the visual experience IS the work.

## Users & Context

- **Primary**: Recruiters, engineering managers, design leads evaluating Suhas Darsi's thinking, writing, and product sensibility
- **Secondary**: AI safety researchers, security practitioners, product people interested in AI governance topics
- **Tertiary**: Casual readers who found a note via search, social share, or wiki-link traversal

**Arrival state**: Usually landing on a note page from an external link or search result. Reading time ranges from 30-second skim (homepage) to 15-minute deep read (long-form notes). User trusts the content, not the visual decoration.

## Purpose

**Learn** — long-form reading, progressive disclosure, wiki-link navigation, topic exploration.

The site has three work modes:
1. **Decide** (homepage) — quick assessment: who is this person, what do they think about, should I invest time here
2. **Learn** (article pages) — comfortable long-form reading with table of contents, backlinks, prev/next navigation
3. **Explore** (notes index) — topic filtering, search, scannable list of entries

## Voice

Warm, editorial, tactile — like a well-worn field notebook. The physical-object metaphor is a **letterpress-printed journal**: cream paper, dark ink, slight texture, nothing glossy or digital-feeling.

Concrete words: serious but not academic, warm but not casual, personal but not confessional. The reader should feel like they're reading something thoughtful, not generated.

## Anti-References

- No SaaS gradient hero (blue-purple-cyan)
- No glassmorphism, no floating nav bars
- No profile photo circle with greeting wave
- No card-grid-as-default layout
- No tech-badge stripes (TypeScript/React/Python logos)
- No animated particle backgrounds or decorative canvas effects
- No pure grays — everything leans warm
- No "Subscribe to my newsletter" popup

## Visual Foundation

**Colors** — Warm earth palette in OKLCH family:
- Background: eggshell (#f8f5eb), dark: near-black (#0c0b09)
- Foreground: obsidian (#302e23), dark: inverted eggshell (#f8f5eb)
- Accent: ember (#cd5f37) — used sparingly for link hover and accent moments
- Secondary accent: signal-blue (#517cd9) — external link indicator

**Typography** — Three-font system, each with a distinct job:
- Display: Lora Variable (serif) — headings, titles, display typography
- Body: Inter Variable (sans) — UI, body copy, metadata
- Code: Fira Code (mono) — code blocks, search input, keyboard shortcuts

**Scale** — Editorial: display (3rem) → title (2rem) → subtitle (1.125rem) → body (0.875rem) → small (0.75rem) → caption (0.625rem). Prose body at 1.375rem (22px) with 1.82 line-height.

**Layout** — Single-column centered at 48rem shell width. Content at 75ch max. No sidebars. Generous vertical rhythm (1-4-9 spacing system).

**Motion** — Subtle: fadeUp entrances at 0.6s, overlay fades at 0.2s. No bounce, no parallax. Respects `prefers-reduced-motion`.

## Accessibility Baseline

- Skip-to-content link on every page
- Full keyboard navigation with visible focus-visible rings (2px, 2px offset)
- All icon-only buttons have aria-labels
- Search overlay has Tab trap, arrow keys, Esc, ⌘K
- Color contrast passes WCAG AA at minimum (body text and body text on backgrounds)
- Dark mode mirrors warm palette — not a simple invert
- `prefers-reduced-motion: reduce` disables all animation
- Responsive from 320px to ultrawide

## Component Rules

- **Cards** only when content is genuinely discrete (Currently/Previously sections). Never nest cards.
- **Buttons** show border, foreground color on hover, arrow translation on hover. No pill shape except theme toggle/search trigger.
- **Links** use underline with custom underline-color (slate/ember/signal-blue depending on context), not the default `text-decoration: underline`.
- **Topic tags** are `#`-prefixed pills, filterable. They are not badges.
- **Code blocks** have a copy button (fades in on hover), visible on focus.
- **Search overlay** is full-screen modal with backdrop blur. Requires keyboard nav parity.
- **Prose headings** never use `!important`. Use `:is()` selector wrapping for specificity.
- **Uppercase labels** use consistent 0.06em tracking.

## File Structure for Design Work

```
src/
  components/     — .astro components (Header, Footer, Backlinks, etc.)
  layouts/        — .astro layout wrappers (BlogLayout)
  pages/          — .astro page routes (index, notes/[slug], uses)
  styles/         — global.css (design tokens, theme, prose, component utilities)
```

Design tokens live in `src/styles/global.css` inside the `@theme {}` block. Dark mode overrides in `html.dark {}`. Component-specific styles are scoped inside each `.astro` file's `<style>` tag.
