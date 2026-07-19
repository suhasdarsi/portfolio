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
    published: z.boolean().optional(),
    dueDate: dateSchema.optional(),
    topics: z.array(z.enum(['AI Security'])).default([]),
  }),
});

const cards = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/cards" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: dateSchema,
    updatedDate: dateSchema.optional(),
    topic: z.enum(['AI Security', 'Agent Systems', 'Network Risk', 'Resilience']),
    related: z.array(z.string()).default([]),
    source: z.string().optional(),
    order: z.number(),
    draft: z.boolean().default(false),
    published: z.boolean().optional(),
    dueDate: dateSchema.optional(),
  }),
});

export const collections = { blog, cards };
