import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parseFrontmatter } from 'astro/markdown';
import { isPublishedContent } from '../src/utils/content-routes.mjs';
import {
  editorialQueue,
  getCurrentReviewItem,
  getWaitingReviewItems,
} from '../src/utils/editorial-queue';

const BLOG = join(__dirname, '..', 'src', 'content', 'blog');

describe('editorial review queue', () => {
  it('keeps queued notes as unpublished drafts without auto-publish due dates', () => {
    expect(getCurrentReviewItem()?.id).toBe('shadow-ai-as-unauthorized-hubs');
    expect(getWaitingReviewItems().map((item) => item.id)).toEqual([
      'mcp-servers-as-hub-to-hub-bridges',
      'the-endpoint-is-where-the-agent-becomes-a-hub',
    ]);

    for (const item of editorialQueue) {
      const markdown = readFileSync(join(BLOG, `${item.id}.md`), 'utf8');
      const { frontmatter } = parseFrontmatter(markdown);
      expect(frontmatter.draft).toBe(true);
      expect(frontmatter.dueDate).toBeUndefined();
      expect(isPublishedContent(frontmatter)).toBe(false);
    }
  });
});
