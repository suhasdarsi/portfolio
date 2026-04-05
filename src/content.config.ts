import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro:content';

const blog = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.string().transform((str) => new Date(str)),
    updatedDate: z.string().transform((str) => new Date(str)).optional(),
    author: z.string().default('Author'),
    draft: z.boolean().default(false),
    maturity: z.enum(['seedling', 'budding', 'evergreen']).default('seedling'),
    topics: z.array(z.enum(['AI Safety', 'Product', 'Bags', 'Travel', 'Infrastructure'])).default([]),
  }),
});

export const collections = { blog };
