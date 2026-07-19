// @ts-check
import { defineConfig } from 'astro/config';
import { satteri } from '@astrojs/markdown-satteri';
import sitemap from '@astrojs/sitemap';

import tailwindcss from '@tailwindcss/vite';
import { wikilinkRoutesPlugin } from './src/utils/wikilinks.mjs';

// https://astro.build/config
export default defineConfig({
  site: 'https://suhasdarsi.com',
  output: 'static',
  trailingSlash: 'never',
  compressHTML: true,
  integrations: [sitemap({ filter: (page) => !page.includes('/notes') })],
  vite: {
    plugins: [tailwindcss()],
  },
  markdown: {
    processor: satteri({
      features: { wikilinks: true },
      mdastPlugins: [wikilinkRoutesPlugin()],
    }),
  },
});
