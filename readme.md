# Suhas Darsi - Personal Portfolio & Blog

A personal portfolio and blog site built with Astro, Tailwind CSS, and Bun.

## 🚀 Project Structure

```
/
├── public/
├── src/
│   ├── components/
│   │   ├── Backlinks.astro
│   │   ├── Search.astro
│   │   └── TableOfContents.astro
│   ├── content/
│   │   └── blog/                 # Blog posts in MDX format
│   │       ├── ai-as-the-ultimate-hub.md
│   │       ├── cost-per-use-revolution.md
│   │       ├── efficiency-through-self-hosting.md
│   │       ├── rethinking-ai-safety-through-network-science.md
│   │       ├── small-world-networks-and-hubs.md
│   │       ├── stop-building-features.md
│   │       ├── the-cascade-risk-of-hub-to-hub-ai-networks.md
│   │       └── why-ai-security-is-fundamentally-different.md
│   ├── layouts/
│   │   └── BlogLayout.astro      # Base layout for blog pages
│   └── pages/
│       ├── index.astro           # Homepage
│       ├── blog/
│       │   ├── index.astro       # Blog listing page
│       │   └── [slug].astro      # Dynamic blog post pages
│       └── ...                   # Other static pages
├── astro.config.mjs              # Astro configuration
├── package.json                  # Dependencies and scripts
├── tsconfig.json                 # TypeScript configuration
└── README.md
```

## 🛠️ Technologies Used

- [Astro](https://astro.build) - Static site builder
- [Tailwind CSS](https://tailwindcss.com) - Utility-first CSS framework
- [Bun](https://bun.sh) - Fast JavaScript runtime & package manager
- [TypeScript](https://www.typescriptlang.org) - For type safety
- [Vite](https://vitejs.dev) - Build tool (via Astro)
- [Fuse.js](https://fusejs.io) - Lightweight fuzzy-search for client-side search
- [Remark Wiki Link](https://github.com/remarkjs/remark-wiki-link) - For [[wiki-style links]] in markdown

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `bun install`             | Installs dependencies                            |
| `bun dev`                 | Starts local dev server at `localhost:4321`      |
| `bun build`               | Build your production site to `./dist/`          |
| `bun preview`             | Preview your build locally, before deploying     |
| `bun astro`               | Run CLI commands like `astro add`, `astro check` |
| `bun astro -- --help`     | Get help using the Astro CLI                     |
| `bun test`                | Run tests with Vitest                            |
| `bun test:watch`          | Run tests in watch mode                          |

## 📝 Adding New Blog Posts

Blog posts are stored as Markdown files in `src/content/blog/`. To add a new post:

1. Create a new `.md` file in `src/content/blog/`
2. Add frontmatter with:
   ```markdown
   ---
   title: "Your Post Title"
   description: "A brief description of your post"
   pubDate: "YYYY-MM-DD"
   author: "Suhas Darsi"
   ---
   ```
3. Write your content in Markdown below the frontmatter
4. Use `[[wiki-style links]]` to link to other posts (they'll be automatically converted)

## 🔧 Development

The site uses Tailwind CSS for styling. Custom styles can be added to:
- `src/styles/global.css` - Global styles
- Individual component Astro files - Scoped styles

Fonts are loaded from Google Fonts in the BlogLayout.astro component:
- Lora (serif) for body text
- Fira Code (monospace) for code snippets

## 🌐 Deployment

This site can be deployed to any static hosting provider:
- Vercel
- Netlify
- Cloudflare Pages
- GitHub Pages
- Or any other static site host

To build for production:
```bash
bun build
```

The output will be in the `dist/` directory.

## 🎯 Features

- Responsive design
- Dark/light mode aware (through CSS system preferences)
- Client-side search functionality
- Table of contents generation
- Backlinks showing related content
- Syntax highlighting for code blocks
- Optimized font loading
- SEO-friendly metadata
- RSS feed generation (built into Astro)

---

*Built with ❤️ by Suhas Darsi*