// @ts-check
import { defineConfig } from 'astro/config';
import { satteri } from '@astrojs/markdown-satteri';
import sitemap from '@astrojs/sitemap';

import tailwindcss from '@tailwindcss/vite';
import { wikilinkRoutesPlugin } from './src/utils/wikilinks.mjs';
import { mermaidDiagramsPlugin } from './src/utils/diagrams.mjs';

// https://astro.build/config
export default defineConfig({
  site: 'https://suhasdarsi.com',
  output: 'static',
  trailingSlash: 'never',
  // Emit /notes/x.html (not /notes/x/index.html) so Cloudflare serves /notes/x with a 200
  // instead of 307-redirecting to /notes/x/, which conflicts with canonical + sitemap URLs.
  build: { format: 'file' },
  compressHTML: true,
  integrations: [
    sitemap({
      filter: (page) => {
        const path = new URL(page).pathname.replace(/\/$/, '');
        // Pocket Card is noindex; Toolshed stays out of search while it's in alpha.
        return path !== '/pocket-card' && path !== '/toolshed' && !path.startsWith('/toolshed/');
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
  markdown: {
    processor: satteri({
      features: { wikilinks: true },
      mdastPlugins: [wikilinkRoutesPlugin(), mermaidDiagramsPlugin()],
    }),
  },
});
