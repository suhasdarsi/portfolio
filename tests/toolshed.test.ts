import { describe, it, expect } from 'vitest';
import { readdirSync } from 'fs';
import { join } from 'path';
import { categoryTags, securityTools } from '../src/data/security-tools';
import { toolCategories, toolSlug } from '../src/data/toolshed';

const tags = Object.entries(categoryTags).flatMap(([category, groups]) => groups.flatMap((group) => group.tags.map((tag) => ({ ...tag, category, group }))));
const tagNames = tags.map((tag) => tag.name);

describe('Toolshed directory', () => {
  it('gives every tool a unique slug, so each review file maps to one tool', () => {
    const slugs = securityTools.map((tool) => toolSlug(tool.name));
    expect(slugs.filter((slug, index) => slugs.indexOf(slug) !== index)).toEqual([]);
    expect(slugs.every(Boolean)).toBe(true);
  });

  it('lists each link once, over https', () => {
    const urls = securityTools.map((tool) => tool.url);
    expect(urls.filter((url, index) => urls.indexOf(url) !== index)).toEqual([]);
    expect(urls.every((url) => new URL(url).protocol === 'https:')).toBe(true);
  });

  it('gives each tag one category, so a tag says which categories a tool is in', () => {
    expect(tagNames.filter((name, index) => tagNames.indexOf(name) !== index)).toEqual([]);
    for (const tag of tags) expect(tag.summary.trim(), tag.name).not.toBe('');
  });

  it('tags every tool with known tags, and uses every tag', () => {
    for (const tool of securityTools) {
      expect(tool.tags.length, tool.name).toBeGreaterThan(0);
      for (const tag of tool.tags) expect(tagNames, `${tool.name}: ${tag}`).toContain(tag);
      expect(new Set(tool.tags).size, tool.name).toBe(tool.tags.length);
    }
    const used = new Set(securityTools.flatMap((tool) => tool.tags));
    expect(tagNames.filter((name) => !used.has(name))).toEqual([]);
  });

  it('lets a tool appear in more than one category', () => {
    const categoriesOf = (name: string) => new Set(securityTools.find((tool) => tool.name === name)!.tags.map((tag) => tags.find((t) => t.name === tag)!.category));
    expect([...categoriesOf('Prompt Security')].sort()).toEqual(['AI security', 'Browser']);
  });

  it('draws AI security agent types as a full 2x2: who built it × who runs it', () => {
    const group = categoryTags['AI security'].find((g) => g.axes)!;
    expect(group.axes).toEqual({ columns: ['Run by the vendor', 'Run in your environment'], rows: ['Built by a vendor', 'Built by your team'] });
    const cells = group.tags.map((tag) => tag.cell?.join(','));
    expect(cells.sort()).toEqual(['0,0', '0,1', '1,0', '1,1']);
    expect(group.tags.find((tag) => tag.cell?.join(',') === '1,1')!.name).toBe('Custom agents');
  });

  it('has a guide and a market page for every category', () => {
    for (const dir of ['toolshed', 'toolshed-market']) {
      const guides = readdirSync(join(__dirname, '../src/content', dir)).map((file) => file.replace(/\.md$/, ''));
      expect(guides.sort(), dir).toEqual(toolCategories.map(toolSlug).sort());
    }
  });

  it('keeps category pages clear of the fixed Toolshed routes', () => {
    for (const reserved of ['tools', 'about', 'suggest']) expect(toolCategories.map(toolSlug)).not.toContain(reserved);
  });

  it('marks only SuperAlign as affiliated', () => {
    expect(securityTools.filter((tool) => tool.affiliated).map((tool) => tool.name)).toEqual(['SuperAlign']);
  });

  it('slugs names the way review files are named', () => {
    expect(toolSlug('HashiCorp Vault')).toBe('hashicorp-vault');
    expect(toolSlug('Detection & response')).toBe('detection-and-response');
  });
});
