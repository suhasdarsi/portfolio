import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { toolCategories } from './data/toolshed';

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
    revisions: z.array(z.object({ date: dateSchema, summary: z.string().trim().min(1) })).default([]),
    author: z.string().default('Suhas Darsi'),
    draft: z.boolean().default(false),
    published: z.boolean().optional(),
    dueDate: dateSchema.optional(),
    topics: z.array(z.enum(['AI Security'])).default([]),
  }),
});

// Toolshed reviews: one file per security tool I've tried, named after the tool's slug in
// src/data/security-tools.ts. Name, link and tags come from there; a tool that isn't listed
// must set them here. Only my own feedback goes in these files.
const tools = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/tools" }),
  schema: z.object({
    title: z.string().optional(),
    url: z.url().optional(),
    tags: z.array(z.string()).default([]),
    rating: z.number().int().min(1).max(5).optional(),
    verdict: z.string().trim().min(1).optional(),
    tried: dateSchema.optional(),
    updated: dateSchema.optional(),
    pricing: z.string().optional(),
    openSource: z.boolean().optional(),
    platforms: z.array(z.string()).default([]),
    pros: z.array(z.string()).default([]),
    cons: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

// Toolshed category guides: src/content/toolshed/<category-slug>.md explains a category and its kinds of tools.
const toolshed = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/toolshed" }),
  schema: z.object({
    category: z.enum(toolCategories),
    summary: z.string().trim().min(1),
  }),
});

// Toolshed market guides: src/content/toolshed-market/<category-slug>.md explains how a category's market
// is shaped. `asOf` dates it, because vendors merge and rebrand often.
const toolshedMarket = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/toolshed-market" }),
  schema: z.object({
    category: z.enum(toolCategories),
    summary: z.string().trim().min(1),
    asOf: dateSchema,
  }),
});

export const collections = { blog, tools, toolshed, toolshedMarket };
