# Suhas Darsi — Digital Garden

A personal digital garden built with Astro, Tailwind CSS, and Bun. A place for thinking in public — polished posts, developing ideas, and early thoughts, all connected through wiki-style links.

## 🚀 Project Structure

```
/
├── public/
├── src/
│   ├── components/
│   │   ├── Backlinks.astro           # Shows notes that link to the current note
│   │   ├── Footer.astro              # Site footer
│   │   ├── Header.astro              # Site header with global search
│   │   ├── MaturityBadge.astro       # Reusable maturity indicator component
│   │   ├── SearchData.astro          # Injects search data on every page
│   │   └── TableOfContents.astro     # Auto-generated TOC from headings
│   ├── content/
│   │   └── blog/                     # Notes stored as Markdown files
│   │       └── *.md                  # Each file is a note
│   ├── layouts/
│   │   └── BlogLayout.astro          # Base layout for note pages
│   ├── pages/
│   │   ├── index.astro               # Homepage — hybrid landing + recent notes
│   │   ├── about.astro               # About page
│   │   ├── rss.xml.ts                # RSS feed endpoint
│   │   └── notes/
│   │       ├── index.astro           # Notes listing with topic filters
│   │       └── [slug].astro          # Dynamic note pages with prev/next nav
│   ├── styles/
│   │   └── global.css                # Global styles and design tokens
│   └── utils/
│       └── date.ts                   # Date formatting and reading time utilities
├── tests/
│   └── integrity.test.ts             # File structure and build integrity tests
├── astro.config.mjs                  # Astro + remark-wiki-link configuration
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
- [Remark Wiki Link](https://github.com/remarkjs/remark-wiki-link) — Wiki-style `[[links]]` in markdown

## 🧞 Commands

All commands run from the project root:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `bun install`             | Install dependencies                             |
| `bun dev`                 | Start dev server at `localhost:4321`             |
| `bun build`               | Build production site to `./dist/`               |
| `bun preview`             | Preview production build locally                 |
| `bun astro`               | Run Astro CLI commands                           |
| `bun test`                | Run integrity tests                              |
| `bun test:watch`          | Run tests in watch mode                          |

## 📝 Adding New Notes

Notes are stored as Markdown files in `src/content/blog/`. To add a new note:

1. Create a new `.md` file in `src/content/blog/`
2. Add frontmatter:
   ```markdown
   ---
   title: "Your Note Title"
   description: "A brief description"
   pubDate: "YYYY-MM-DD"
   author: "Suhas Darsi"
   maturity: "seedling"        # seedling | budding | evergreen
   draft: false                # true = hidden from listings/search
   topics: ["AI Safety"]       # From: AI Safety, Product, Bags, Travel, Infrastructure
   ---
   ```
3. Write content in Markdown below the frontmatter
4. Use `[[wiki-style links]]` to connect notes (e.g., `[[slug|display text]]`)

### Maturity Levels

| Level | Meaning |
|---|---|
| `seedling` | Early thinking, rough notes |
| `budding` | Developing, being refined |
| `evergreen` | Polished, complete |

### Draft Notes

Set `draft: true` to hide a note from all listings, search, and RSS. It remains accessible via direct URL — useful for work-in-progress notes you want to link to from other notes.

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

*Built with ❤️ by Suhas Darsi*
