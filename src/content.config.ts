import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { toolCategories } from './toolshed/categories';
import { NOTES_DIRECTORY, noteId, noteStages, withNoteDefaults } from './notes/publishing.mjs';
import { site } from './site/site';

const dateSchema = z.coerce.date().refine((date) => !Number.isNaN(date.valueOf()), {
  message: 'Invalid date',
});

// Notes: every Markdown file in the vault. The file name is the title and the address comes from it, so a
// note needs no title, author or date typed in (see withNoteDefaults).
const noteFiles = glob({ pattern: ["**/*.md", "!**/_*/**"], base: `./${NOTES_DIRECTORY}`, generateId: ({ entry, data }) => noteId(entry, data) });
const blog = defineCollection({
  loader: {
    ...noteFiles,
    load: (context) => noteFiles.load({
      ...context,
      parseData: (entry) => context.parseData({ ...entry, data: withNoteDefaults(entry.filePath ?? entry.id, entry.data) }),
    }),
  },
  schema: z.object({
    title: z.string(),
    // Pins the note's address when the file is renamed. Without it the address comes from the file name.
    slug: z.string().optional(),
    description: z.string().default(''),
    pubDate: dateSchema,
    updatedDate: dateSchema.optional(),
    revisions: z.array(z.object({ date: dateSchema, summary: z.string().trim().min(1) })).default([]),
    author: z.string().default(site.name),
    draft: z.boolean().default(false),
    dueDate: dateSchema.optional(),
    topics: z.array(z.enum(['AI Security', 'Building with AI'])).default([]),
    // How finished the note is: a rough idea, a working draft of the idea, or settled. Shown beside the dates.
    stage: z.enum(noteStages).optional(),
  }),
});

// Toolshed reviews: one file per security tool I've tried, named after the tool's slug in
// src/toolshed/catalog.ts. Name, link and tags come from there; a tool that isn't listed
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
