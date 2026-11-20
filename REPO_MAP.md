<!-- commit: 10e131c3 -->
# suhas-darsi-portfolio — personal site: AI-security notes plus tiny apps (Pocket Card, Swatchbook, Toolshed)

## Stack
Astro 7 (static, `build.format: 'file'`), TypeScript, Bun, plain CSS (`src/styles/site.css`), Cloudflare Workers
static assets + a small Worker for `/api/*`. Markdown via `@astrojs/markdown-satteri` with local wikilink and
mermaid plugins. Tests: Vitest (unit + build) and Playwright (desktop + Pixel 7).

## Commands
- install: `bun install` (its `prepare` script points `core.hooksPath` at `scripts/git-hooks`; browsers once: `bunx playwright install chromium`)
- pre-commit hook: `scripts/git-hooks/pre-commit` runs `bun run lint` + `bun run typecheck` (~2s); tests stay in CI; skip once with `--no-verify`
- notes: `bun run notes` (what's live, changed, new or draft) · `bun run notes publish` (build check, commit the new/changed/removed notes and their images but never drafts, push when on `main`)
- dev: `bun run dev` · build: `bun run build` · preview: `bun run preview`
- typecheck: `bun run typecheck` · lint: `bun run lint` · dead code: `bun run deadcode` (knip)
- test: `bun run test` (Vitest; builds the site twice; `vitest.config.ts` runs `tests/build.test.ts` first because the `tests/quality` verifiers read the `dist/` it writes) · browser: `bun run test:browser` (builds, serves on 4322)
- verifiers (need `dist/`): `bun run verify` · everything: `bun run check`
- Wallet art: `bun scripts/build-pocket-art.ts` · local pass: `bun scripts/build-wallet-pass.ts` · Wallet preview: `bun scripts/preview-wallet.ts`

## Layout
- `src/pages/` — routes only; each page reads from the feature modules below. Home (`index.astro`) is the introduction and the Notes section only (newest note cards beside `NoteGraph.astro` with no `here`, a graph of every note drawn by `noteGraph` in `graph.ts`); the tiny apps are listed on `apps.astro` (`/apps`, the header's Apps link).
- `src/site/` — bottom layer: `site.ts` (name, URL, email, profiles, `roles`, `absoluteUrl`, `cleanPath`, `isIndexed`), `sections.ts` (apps/pages/nav for header, footer, search, llms.txt), `structured-data.ts`, `format.ts`, `slug.mjs`, `theme.ts` (theme storage key).
- `src/notes/` — `publishing.mjs` (notes dir, `noteHref`, draft/due-date rule), `notes.ts` (`getNotes`, links, reading time), `wikilinks.mjs`, `obsidian.mjs` (callouts, `==highlights==`, `%%comments%%`, `![[embeds]]` found anywhere in the vault), `diagrams.mjs` (mermaid → HTML boxes; a lone `:::hub` fanning out to 3+ nodes becomes an animated SVG, `.hubfig`; a flowchart with a `%% animate` line goes to `netfig.mjs`: ranked SVG layout, red wave out of `:::alert` nodes, a dot walking any loop, cut `-.-` links, `.gf` in `site.css`; tests in `tests/diagrams.test.ts`), `cover.ts` (SVG cover diagram per note, for the home cards and the top of each note; styles are `.g-cover` in `site.css`; drawn by hand per slug, else from the note's links).
- `src/search/` — `index.ts` (entries for `/search.json` and the overlay), `client.ts` (ranking, loader, `liveSearch`).
- `src/toolshed/` — `categories.ts`, `catalog.ts` (every tool + tag taxonomy), `tools.ts` (`getTools`, every Toolshed URL helper), `request.ts` (suggest-a-tool validation, GitHub issue body).
- `src/pocket-card/` — `contact.ts` (fields, validation, vCard, `walletPass` identity, `pocketCardColors` used by the pass, the page preview and the artwork), `mark.ts` (Wallet artwork SVG; `bun scripts/build-pocket-art.ts` renders it).
- `src/swatchbook/design-systems.ts` — Swatchbook data.
- `src/components/` (`site/`, `toolshed/`), `src/layouts/` (`SiteLayout`, `ToolshedLayout`), `src/content/` (Toolshed Markdown: `tools/`, `toolshed/`, `toolshed-market/`, `templates/tool.md`).
- `content/` — the Obsidian vault and the only place notes live: every `.md` at any depth is a note, except in folders starting with `_` or `.` (`_templates/note.md`, `.obsidian/`); pasted images go to `attachments/`.
- `worker/` — `index.ts` routes `/api/wallet` and `/api/toolshed/request`; `json-post.ts` is the shared same-origin/JSON/rate-limit/8 KB gate.
- `scripts/` — local Wallet tooling (`wallet-credentials.ts`, `dist-assets.ts`), `notes.ts` (the `notes` command), `git-hooks/pre-commit`.
- `tests/` — unit/build tests; `tests/browser/` Playwright; `tests/quality/` SEO/AEO/readability/styling verifiers over `dist/`.

## Entry points & data flow
- Notes: Markdown in `content/` → `getNotes()` (published + newest first) → pages, `/rss.xml`, `/llms.txt`, `/search.json`, `/og/<id>.png`.
- `SiteHead` owns the whole `<head>`: canonical from `absoluteUrl`, robots + JSON-LD from `isIndexed`; the sitemap filter in `astro.config.mjs` uses the same `isIndexed`; `robots.txt` is generated from `site.url`.
- Toolshed: `catalog.ts` + reviews in `src/content/tools` → `getTools()` → `/toolshed/**` and `/toolshed/tools.json`.
- Forms: Pocket Card → `POST /api/wallet` (signs a pkpass); Toolshed suggest → `POST /api/toolshed/request` (Turnstile → GitHub issue in `REQUEST_REPO`; allowed Turnstile hosts default to the `site.url` host, override with `TURNSTILE_HOSTNAMES`).

## Conventions & gotchas
- Notes are written in Obsidian (vault = `content/`, `NOTES_DIRECTORY`). The file name is the title (`noteTitle`; a `title` property overrides it) and the address (`noteId`: "My Note.md" → `/notes/my-note`; a `slug` property pins it). `author` defaults to the site owner; `pubDate` is written by `bun run notes publish` on first publish, is today in local previews, and a published note without one fails the build on CI (`withNoteDefaults`). Tests read notes through `tests/note-files.ts`, never by file name. A `[[link]]` to a draft or unwritten note renders as plain text, not an error. `draft: true` keeps a note off the site; `%%comments%%` are stripped from pages, search, RSS and llms.txt.
- Garden features on note pages: `NoteStage.astro` (growth stage from the optional `stage` frontmatter: seedling/budding/evergreen; "Planted" = `pubDate`, "Last tended" = `lastRevised()`), `NoteGraph.astro` (one graph component: with `here`, the note and its direct neighbours; without, every note, as on home; in the rail; layout from `noteGraph` in `src/notes/graph.ts`, a d3-force simulation run at build time), `NotePreviews.astro` (hover cards for `.prose a.wikilink` and graph nodes; built with the page, mouse and keyboard only).
- After changing the note schema in `src/content.config.ts`, the dev server can serve stale note data: stop it, delete `.astro/data-store.json` and `node_modules/.astro/data-store.json`, start again.
- Never build URLs by hand: `noteHref`, `categoryHref`, `tagHref`, `toolHref`/`toolLink`, `absoluteUrl`.
- New app or page: add it to `src/site/sections.ts`; mark it unindexed in `site.ts` if search engines should skip it.
- The site's one call to action is getting in touch: `ContactCta.astro` (booking button + copy email) closes the home page and every note; the home and About introductions carry the same booking button.
- Font checker: `bun run fonts` (`tests/browser/fonts.spec.ts`) crawls every linked page on desktop and phone and fails on any text that fits no role in `tests/browser/type-roles.ts` (typeface, size, weight, line height, letter spacing). It runs with `test:browser`. Small text is always Geist; the serif is 18px and up, weight 400 only. Mark drawings of other things with `data-type-drawing`.
- `[hidden]` is enforced globally in `site.css`; type scale is one size per role (browser tests enforce it): 15px all interface text, 22px reading text and intros (18px on phones), 28px note section headings, 44px page titles, 80px home headline. Form fields stay 16px so phones don't zoom.
- Geist Serif ships as one weight (400): bold or light serif text will not render. Note bodies use the `Geist Serif Text` name (same file, declared 400) so the browser synthesises bold there.
- Note cards (`.g-card`, `.g-cover`, `.g-title`, `.g-desc`, `.g-meta` in `site.css`) are shared by the home page and the notes index (`src/pages/notes/index.astro`, a card grid with topic chips).
- Note pages (`src/pages/notes/[slug].astro`) are a 680px text column on the left with a sticky rail on the right (contents list first): 22px serif body on desktop, 18px under 760px; The rail also holds the local graph and one "Linked notes" list (links in either direction, never split into to/from); under 1000px only that list remains, below the note.
- Motion lives in the "Motion" block of `site.css`: every link and button already transitions colour, `translate` and `scale` (curves `--ease-out`, `--ease-spring`), so a component only sets the hover or pressed value. Nothing over 300ms (tested); hover must not change the size of header controls (tested). `ReadingGuide.astro` marks the section being read (`.on`, `.past`).
- Every page sits in one 1180px frame (`.page`) with the same `.page-head` (64px above, 48px below), `h1.title` and `.lede` (22px serif). Don't give a page its own width or header spacing. The home page is the one exception: its hero has an 80px headline in place of `.page-head`. Section headings are `.sec-label h2`, `.g-kind` or `h2.sec-h` (all 22px Geist 600, 16px under 760px).
- Dependency pins and overrides (TypeScript 6, `minimatch`, `@emnapi/*`) are explained in `docs/dependency-maintenance.md`; read it before upgrading.
- Unit tests run sequentially (`fileParallelism: false`) because two of them run full Astro builds.
- Toolshed category slugs must not collide with `tools`, `about`, `suggest` (tested).
