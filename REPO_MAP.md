<!-- commit: b0c87ee3 -->
# suhas-darsi-portfolio — personal site: AI-security notes plus tiny apps (Pocket Card, Swatchbook, Toolshed)

## Stack
Astro 7 (static, `build.format: 'file'`), TypeScript, Bun, plain CSS (`src/styles/site.css`), Cloudflare Workers
static assets + a small Worker for `/api/*`. Markdown via `@astrojs/markdown-satteri` with local wikilink and
mermaid plugins. Tests: Vitest (unit + build) and Playwright (desktop + Pixel 7).

## Commands
- install: `bun install` (browsers once: `bunx playwright install chromium`)
- dev: `bun run dev` · build: `bun run build` · preview: `bun run preview`
- typecheck: `bun run typecheck` · lint: `bun run lint` · dead code: `bun run deadcode` (knip)
- test: `bun run test` (Vitest; builds the site twice) · browser: `bun run test:browser` (builds, serves on 4322)
- verifiers (need `dist/`): `bun run verify` · everything: `bun run check`
- Wallet art: `bun scripts/build-pocket-art.ts` · local pass: `bun scripts/build-wallet-pass.ts` · Wallet preview: `bun scripts/preview-wallet.ts`

## Layout
- `src/pages/` — routes only; each page reads from the feature modules below.
- `src/site/` — bottom layer: `site.ts` (name, URL, email, profiles, `roles`, `absoluteUrl`, `cleanPath`, `isIndexed`), `sections.ts` (apps/pages/nav for header, footer, search, llms.txt), `structured-data.ts`, `format.ts`, `slug.mjs`, `theme.ts` (theme storage key).
- `src/notes/` — `publishing.mjs` (notes dir, `noteHref`, draft/due-date rule), `notes.ts` (`getNotes`, links, reading time), `wikilinks.mjs`, `diagrams.mjs` (mermaid → HTML boxes).
- `src/search/` — `index.ts` (entries for `/search.json` and the overlay), `client.ts` (ranking, loader, `liveSearch`).
- `src/toolshed/` — `categories.ts`, `catalog.ts` (every tool + tag taxonomy), `tools.ts` (`getTools`, every Toolshed URL helper), `request.ts` (suggest-a-tool validation, GitHub issue body).
- `src/pocket-card/` — `contact.ts` (fields, validation, vCard, `walletPass` identity, `pocketCardColors` used by the pass, the page preview and the artwork), `mark.ts` (Wallet artwork SVG; `bun scripts/build-pocket-art.ts` renders it).
- `src/swatchbook/design-systems.ts` — Swatchbook data.
- `src/components/` (`site/`, `toolshed/`), `src/layouts/` (`SiteLayout`, `ToolshedLayout`), `src/content/` (Obsidian vault: `blog/`, `tools/`, `toolshed/`, `toolshed-market/`).
- `worker/` — `index.ts` routes `/api/wallet` and `/api/toolshed/request`; `json-post.ts` is the shared same-origin/JSON/rate-limit/8 KB gate.
- `scripts/` — local Wallet tooling (`wallet-credentials.ts`, `dist-assets.ts`).
- `tests/` — unit/build tests; `tests/browser/` Playwright; `tests/quality/` SEO/AEO/readability/styling verifiers over `dist/`.

## Entry points & data flow
- Notes: Markdown in `src/content/blog` → `getNotes()` (published + newest first) → pages, `/rss.xml`, `/llms.txt`, `/search.json`, `/og/<id>.png`.
- `SiteHead` owns the whole `<head>`: canonical from `absoluteUrl`, robots + JSON-LD from `isIndexed`; the sitemap filter in `astro.config.mjs` uses the same `isIndexed`; `robots.txt` is generated from `site.url`.
- Toolshed: `catalog.ts` + reviews in `src/content/tools` → `getTools()` → `/toolshed/**` and `/toolshed/tools.json`.
- Forms: Pocket Card → `POST /api/wallet` (signs a pkpass); Toolshed suggest → `POST /api/toolshed/request` (Turnstile → GitHub issue in `REQUEST_REPO`; allowed Turnstile hosts default to the `site.url` host, override with `TURNSTILE_HOSTNAMES`).

## Conventions & gotchas
- Never build URLs by hand: `noteHref`, `categoryHref`, `tagHref`, `toolHref`/`toolLink`, `absoluteUrl`.
- New app or page: add it to `src/site/sections.ts`; mark it unindexed in `site.ts` if search engines should skip it.
- `[hidden]` is enforced globally in `site.css`; type scale is 13/16/28px only (browser tests enforce it).
- Unit tests run sequentially (`fileParallelism: false`) because two of them run full Astro builds.
- Toolshed category slugs must not collide with `tools`, `about`, `suggest` (tested).
