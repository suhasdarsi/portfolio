import { describe, expect, it } from 'vitest';
import { plainText, searchExcerpt } from '../src/utils/search-display';

describe('search excerpts', () => {
  it('removes markup and keeps readable link labels', () => {
    expect(plainText('## **Read** [[note|this note]] and [a link](/notes)')).toBe('Read this note and a link');
  });
  it('includes matches deep into long notes', () => {
    const excerpt = searchExcerpt('Introduction. '.repeat(300) + 'Distinctive keyword appears here.', 'distinctive');
    expect(excerpt).toContain('Distinctive keyword');
    expect(excerpt.length).toBeLessThanOrEqual(192);
  });
});
