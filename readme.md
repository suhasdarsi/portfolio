# Suhas Darsi — AI Security Notes

A focused collection of practical writing about AI security, agent systems, and network risk, built with Astro, Tailwind CSS, and Bun.

## 🚀 Project Structure

```
/
├── public/
├── src/
│   ├── components/
│   │   ├── Backlinks.astro           # Shows notes that link to the current note
│   │   ├── CopyCode.astro            # Copy-to-clipboard button for code blocks
│   │   ├── Footer.astro              # Site footer
│   │   ├── Header.astro              # Site header with global search
│   │   ├── ReadingProgress.astro     # Reading progress bar at top of viewport
│   │   ├── SearchData.astro          # Injects search data on every page
│   │   └── TableOfContents.astro     # Auto-generated TOC from headings
│   ├── content/                      # Open this folder as the Obsidian vault
│   │   ├── .obsidian/                # Shared vault settings
│   │   ├── blog/                     # Long-form notes published at /notes
│   │   ├── cards/                    # Short-form cards published at /cards
│   │   └── templates/note.md         # Template for new blog notes
│   ├── layouts/
│   │   └── BlogLayout.astro          # Base layout for note pages
│   ├── pages/
│   │   ├── index.astro               # Homepage — hybrid landing + recent notes
│   │   ├── 404.astro                 # 404 page with inline search
│   │   ├── rss.xml.ts                # RSS feed endpoint
│   │   └── notes/
│   │       ├── index.astro           # Notes listing with topic filters + search
│   │       └── [slug].astro          # Dynamic note pages with prev/next nav
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
- [Fuse.js](https://fusejs.io) — Client-side fuzzy search
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
| `bun test`       | Run integrity tests                  |
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

Backlinks are generated from these wikilinks during the Astro build.

### Draft notes

Set `draft: true` to hide a note from listings, search, and RSS. It remains accessible by direct URL.

## 🌐 Deployment

This site is deployed on [Cloudflare Pages](https://pages.cloudflare.com/) with automatic builds on push to the main branch.

**Build settings:**

- Build command: `bun run build`
- Build output directory: `dist`
- Root directory: `/`

Can also be deployed to any static host: Vercel, Netlify, GitHub Pages, etc.

## 🎯 Features

- **Digital garden structure** — Notes with maturity indicators and wiki-style linking
- **Global search** — Fuse.js-powered fuzzy search across all notes (title, description, body)
- **Topic filtering** — Filter notes by topic on the notes listing page
- **Dark/light mode** — System-aware with manual toggle, persisted in localStorage
- **Table of contents** — Auto-generated from h2 headings with scroll-spy highlighting
- **Backlinks** — Shows which notes link to the current note
- **Prev/next navigation** — Chronological navigation between notes
- **Reading time** — Calculated from word count, displayed on note pages
- **Last updated timestamps** — Optional `updatedDate` field shows when a note was revised
- **RSS feed** — Available at `/rss.xml`
- **Responsive design** — Mobile-first, works across all screen sizes
- **SEO-friendly** — Open Graph, Twitter cards, sitemap, structured data
- **Integrity tests** — Validates file structure and build output

---

_Built with ❤️ by Suhas Darsi_
