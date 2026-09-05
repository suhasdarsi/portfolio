# Suhas Darsi — AI Security Notes

A focused collection of practical writing about AI security, agent systems, and network risk, built with Astro, Tailwind CSS, and Bun.

## 🚀 Project Structure

```
/
├── public/
├── src/
│   ├── components/
│   │   ├── CopyCode.astro            # Copy-to-clipboard button for code blocks
│   │   ├── Header.astro              # Site header with global search
│   │   ├── ReadingProgress.astro     # Reading progress bar at top of viewport
│   │   └── ThemeInit.astro           # Initial theme before first paint
│   ├── content/                      # Open this folder as the Obsidian vault
│   │   ├── .obsidian/                # Shared vault settings
│   │   ├── blog/                     # Long-form notes published at /notes
│   │   └── templates/note.md         # Template for new blog notes
│   ├── layouts/
│   │   └── BlogLayout.astro          # Base layout for note pages
│   ├── pages/
│   │   ├── index.astro               # Homepage — hybrid landing + recent notes
│   │   ├── 404.astro                 # 404 page with inline search
│   │   ├── rss.xml.ts                # RSS feed endpoint
│   │   └── notes/
│   │       ├── index.astro           # Notes listing with topic labels
│   │       └── [slug].astro          # Static note pages with sharing
│   ├── styles/
│   │   └── global.css                # Global styles and design tokens
│   └── utils/
│       └── date.ts                   # Date formatting and reading time utilities
├── tests/
│   └── integrity.test.ts             # File structure and build integrity tests
├── astro.config.mjs                  # Astro, sitemap, and Tailwind configuration
├── content.config.ts                 # Content collection schema
├── package.json
├── tsconfig.json
└── README.md
```

## 🛠️ Technologies Used

- [Astro](https://astro.build) — Static site builder
- [Tailwind CSS](https://tailwindcss.com) — Utility-first CSS framework
- [Bun](https://bun.sh) — Fast JavaScript runtime & package manager
- [TypeScript](https://www.typescriptlang.org) — Type safety
- [Vite](https://vitejs.dev) — Build tool (via Astro)
- [Obsidian](https://obsidian.md) — Local Markdown authoring and linked-note graph

## 🧞 Commands

All commands run from the project root:

| Command          | Action                               |
| :--------------- | :----------------------------------- |
| `bun install`    | Install dependencies                 |
| `bun dev`        | Start dev server at `localhost:4321` |
| `bun build`      | Build production site to `./dist/`   |
| `bun preview`    | Preview production build locally     |
| `bun astro`      | Run Astro CLI commands               |
| `bun run test`       | Run integrity tests                  |
| `bun test:watch` | Run tests in watch mode              |

## 📝 Writing in Obsidian

Open `src/content/` as a vault in Obsidian using **Open folder as vault**. The vault is configured to create new files in `blog/`, use shortest-path wikilinks, and update links when files are renamed.

### New notes

1. Create a note in Obsidian. New files default to `src/content/blog/`.
2. Run **Templates: Insert template** and select `templates/note`.
3. Fill in `description`, `pubDate`, and `topics`.
4. Write the note using normal Markdown and wikilinks.
5. Set `draft: false` when the note is ready to publish.

### Linked notes

- Link by filename or exact title: `[[ai-as-the-ultimate-hub]]`
- Add display text: `[[ai-as-the-ultimate-hub|AI as a hub]]`
- Link to a heading: `[[ai-as-the-ultimate-hub#The Implications|hub risks]]`
- Builds fail when a target is missing or ambiguous.
- Obsidian block references such as `[[note#^block-id]]` are not supported.


### Draft notes

Set `draft: true` to exclude a note from generated pages, listings, search, and RSS. A draft with a past `dueDate` is published on the next build. Set `published: false` to keep it excluded regardless of due date.

## 🌐 Deployment

This static site is deployed with [Cloudflare Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/) and can be built automatically on pushes to the main branch.

**Build settings:**

- Build command: `bun run build`
- Build output directory: `dist`
- Deploy command: `bunx wrangler deploy`
- Root directory: `/`

`wrangler.jsonc` declares `dist` as static assets. Keep Astro in static mode; the Cloudflare Astro adapter is only needed for server-rendered routes.

Can also be deployed to any static host: Vercel, Netlify, GitHub Pages, etc.

## 🎯 Features

- **Digital garden structure** — Notes with wiki-style linking
- **Global search** — Local ranked search across all notes (title, description, body)
- **Dark/light mode** — System-aware with manual toggle, persisted in localStorage
- **Reading time** — Calculated from word count, displayed on note pages
- **Last updated timestamps** — Optional `updatedDate` field shows when a note was revised
- **RSS feed** — Available at `/rss.xml`
- **Responsive design** — Mobile-first, works across all screen sizes
- **SEO-friendly** — Open Graph, Twitter cards, sitemap, structured data
- **Integrity tests** — Validates file structure and build output

---

_Built with ❤️ by Suhas Darsi_

## Quality checks and publishing

- `bun run lint` checks source and tests.
- `bun run test` runs unit and generated-site checks.
- `bunx playwright install chromium` installs the browser once.
- `bun run test:browser` builds the site and tests desktop and mobile Chromium, keyboard search, URL history, storage failures, preview images, viewport overflow, and accessibility in light and dark themes.
- `bun run check` runs the complete suite. Automated accessibility checks supplement manual keyboard and screen-reader review.

The `Quality and publishing` GitHub Actions workflow checks pull requests and main-branch pushes. After checks pass on main, it deploys the exact tested `dist` artifact to Cloudflare. It also rebuilds and publishes daily at 00:17 UTC (05:47 India time), so due drafts are published on the next successful run. GitHub schedules can run late; they are not exact-time publishing guarantees.

To activate publishing, commit the workflow to the default branch and configure repository secrets `CLOUDFLARE_API_TOKEN` (scoped to deploying this Worker) and `CLOUDFLARE_ACCOUNT_ID`. Avoid a second automatic production deploy in Cloudflare that bypasses these checks. In GitHub branch protection, require the workflow's `checks` job before merging. Manual runs are available through Actions → Quality and publishing → Run workflow.

## Search links and previews

`/notes?q=network` opens a shareable search. Submit a new query to add it to browser history; Back and Forward restore earlier searches. Results show matching excerpts with highlighted terms. The global search dialog also links to the shareable search page.

Each published note receives a generated 1200×630 PNG at `/og/<note-id>.png`, referenced by Open Graph and Twitter metadata. Published notes are included in the sitemap; unpublished notes and their preview images are omitted.

## Article revisions

Add factual changes to a note's frontmatter when you revise it:

```yaml
revisions:
  - date: '2026-09-05'
    summary: 'Describe the substantive change you actually made.'
```

The article displays these entries in a collapsible revision history, newest first. Its updated date and structured metadata use the latest revision or explicit `updatedDate`. Leave `revisions` out when there is no recorded history.
