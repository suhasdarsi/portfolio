// @ts-check
import { existsSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import { satteri } from '@astrojs/markdown-satteri';
import sitemap from '@astrojs/sitemap';

import tailwindcss from '@tailwindcss/vite';
import { wikilinkRoutesPlugin } from './src/utils/wikilinks.mjs';

function omitReviewRoute() {
  return {
    name: 'omit-review-route',
    hooks: {
      'astro:build:done': ({ dir }) => {
        for (const name of ['review', 'review.html']) {
          const path = fileURLToPath(new URL(`./${name}`, dir));
          if (existsSync(path)) rmSync(path, { recursive: true, force: true });
        }
      },
    },
  };
}

// https://astro.build/config
export default defineConfig({
  site: 'https://suhasdarsi.com',
  output: 'static',
  trailingSlash: 'never',
  compressHTML: true,
  integrations: [
    omitReviewRoute(),
    sitemap({
      filter: (page) => !page.includes('/review'),
    }),
  ],
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
