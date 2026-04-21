// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import remarkWikiLink from 'remark-wiki-link';
import { readdirSync } from 'node:fs';

import tailwindcss from '@tailwindcss/vite';

import cloudflare from '@astrojs/cloudflare';

// Build list of existing blog post slugs for wikilink resolution
const blogDir = './src/content/blog';
const existingSlugs = readdirSync(blogDir)
  .filter((f) => f.endsWith('.md'))
  .map((f) => f.replace(/\.md$/, ''));

// https://astro.build/config
export default defineConfig({
  site: 'https://suhasdarsi.com',
  trailingSlash: 'never',
  compressHTML: true,
  integrations: [sitemap()],

  vite: {
    plugins: [tailwindcss()]
  },

  markdown: {
    remarkPlugins: [
      [
        remarkWikiLink,
        {
          permalinks: existingSlugs,
          pageResolver: (name) => [name.replace(/ /g, '-').toLowerCase()],
          hrefTemplate: (permalink) => `/notes/${permalink}`,
          wikiLinkClassName: 'wikilink',
          newClassName: 'wikilink-broken',
          aliasDivider: '|',
        },
      ],
    ],
  },

  adapter: cloudflare(),
});