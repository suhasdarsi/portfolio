import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro:content';

const dateSchema = z.coerce.date().refine((date) => !Number.isNaN(date.valueOf()), {
  message: 'Invalid date',
});

const blog = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: dateSchema,
    updatedDate: dateSchema.optional(),
    author: z.string().default('Suhas Darsi'),
    draft: z.boolean().default(false),
    maturity: z.enum(['seedling', 'budding', 'evergreen']).default('seedling'),
    topics: z.array(z.enum(['AI Safety', 'Product', 'Bags', 'Travel', 'Infrastructure'])).default([]),
  }),
});

export const collections = { blog };
