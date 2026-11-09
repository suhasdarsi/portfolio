// @ts-check
import { defineConfig } from 'astro/config';
import { satteri } from '@astrojs/markdown-satteri';
import sitemap from '@astrojs/sitemap';

import { wikilinkRoutesPlugin } from './src/notes/wikilinks.mjs';
import { mermaidDiagramsPlugin } from './src/notes/diagrams.mjs';
import { isIndexed, site } from './src/site/site';

// https://astro.build/config
export default defineConfig({
  site: site.url,
  output: 'static',
  trailingSlash: 'never',
  // Emit /notes/x.html (not /notes/x/index.html) so Cloudflare serves /notes/x with a 200
  // instead of 307-redirecting to /notes/x/, which conflicts with canonical + sitemap URLs.
  build: { format: 'file' },
  compressHTML: true,
  integrations: [sitemap({ filter: (page) => isIndexed(new URL(page).pathname) })],
  markdown: {
    processor: satteri({
      features: { wikilinks: true },
      mdastPlugins: [wikilinkRoutesPlugin(), mermaidDiagramsPlugin()],
    }),
  },
});
