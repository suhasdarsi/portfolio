import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

/*
 * Styling verifier (static). Reads the live stylesheet (src/styles/site.css), the style blocks of the
 * .astro files that pages actually import, and the built HTML in dist/. No browser.
 * Rendered styling (overflow, gutters, theme switch, focus, hover, fonts, motion) is in
 * tests/browser/styling.spec.ts.
 *
 * Already covered elsewhere and NOT repeated here:
 *   - type scale 13/16/28px: tests/browser/typography.spec.ts
 *   - axe contrast and general a11y: tests/browser/site.spec.ts
 *   - reading controls: tests/browser/reading.spec.ts; swatch page: tests/browser/swatchbook.spec.ts
 *   - single column and mobile gutter rule exist in the CSS: tests/layout-widths.test.ts
 *   - body size, line length, paragraph gap: tests/quality/readability.test.ts, tests/browser/readability.spec.ts
 *
 * Scope note: only files reachable from src/pages through imports are checked, so dead code cannot
 * fail or mask the checks.
 */
const FONT_FALLBACK_MIN = 1; // a font stack needs at least one generic family (sans-serif, serif, monospace), and it must come last

const ROOT = resolve(__dirname, '..', '..');
const SRC = join(ROOT, 'src');
const DIST = join(ROOT, 'dist');
const SITE_CSS = join(SRC, 'styles', 'site.css');

const GENERIC_FAMILIES = ['sans-serif', 'serif', 'monospace', 'system-ui', 'ui-monospace', 'ui-sans-serif'];
const COLOUR_LITERAL = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/g;

/* Colour literals that are allowed outside the token definitions. One entry per file and value, each with a reason. */
const COLOUR_ALLOWLIST: Record<string, string[]> = {
  // QR code modules must be true white and near-black to scan reliably, whatever the theme.
  'src/pages/index.astro': ['#ffffff', '#16171a'],
  'src/pages/pocket-card.astro': ['#ffffff'],
  // White text on the accent-filled hub node; accent is dark enough in both themes for white to pass contrast.
  'src/styles/site.css': ['#ffffff', 'rgba(0,0,0,.35)'],
};

/* Colour tokens that are deliberately the same in light and dark. */
const THEME_INVARIANT_TOKENS: Record<string, string> = {
  '--accent': 'brand blue; dark mode lightens it through --accent-text instead, so fills keep one colour',
};

function walk(dir: string, ext: string[], out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, ext, out);
    else if (ext.some((e) => name.endsWith(e))) out.push(p);
  }
  return out;
}

const rel = (p: string) => p.slice(ROOT.length + 1);

/* Every .astro file reachable from src/pages (live code), found by following relative imports. */
function liveAstroFiles(): string[] {
  const seen = new Set<string>();
  const queue = walk(join(SRC, 'pages'), ['.astro']);
  while (queue.length) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    const text = readFileSync(file, 'utf8');
    for (const m of text.matchAll(/from\s+['"](\.[^'"]+\.astro)['"]/g)) queue.push(resolve(dirname(file), m[1]));
  }
  return [...seen];
}

function styleBlocks(astro: string): string {
  return [...astro.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n');
}

function liveCss(): { file: string; css: string }[] {
  const out = [{ file: rel(SITE_CSS), css: readFileSync(SITE_CSS, 'utf8') }];
  for (const f of liveAstroFiles()) {
    const css = styleBlocks(readFileSync(f, 'utf8'));
    if (css) out.push({ file: rel(f), css });
  }
  return out;
}

const stripComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '');

/* Declarations of a rule whose selector matches `selector` exactly (first match). */
function ruleBody(css: string, selector: string): string {
  const clean = stripComments(css);
  const re = new RegExp('(?:^|\\})\\s*' + selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\{([^}]*)\\}');
  return clean.match(re)?.[1] ?? '';
}

function customProps(body: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const m of body.matchAll(/(--[a-zA-Z0-9-]+)\s*:\s*([^;]+);?/g)) map.set(m[1], m[2].trim());
  return map;
}

function distHtml(): { file: string; html: string }[] {
  if (!existsSync(DIST) || walk(DIST, ['.html']).length === 0) {
    throw new Error('dist/ is missing or empty. Run `bun run build` before this test.');
  }
  return walk(DIST, ['.html']).map((f) => ({ file: rel(f), html: readFileSync(f, 'utf8') }));
}

describe('design tokens', () => {
  const css = readFileSync(SITE_CSS, 'utf8');
  const light = customProps(ruleBody(css, '.sd'));

  it('site.css defines colour, spacing-free surface and type tokens on the .sd scope', () => {
    // The site has no spacing tokens: spacing is a fixed 4-96px scale written in px (see swatchbook).
    for (const token of ['--bg', '--surface', '--soft', '--ink', '--body', '--muted', '--faint', '--line', '--line-strong', '--accent', '--accent-text', '--alert']) {
      expect(light.has(token), `${token} missing from .sd`).toBe(true);
    }
    expect(stripComments(css)).toMatch(/\.sd\s*\{[^}]*font-size:\s*16px/);
  });

  it('every var(--x) used by live styles is defined somewhere in live styles or inline', () => {
    const live = liveCss();
    const defined = new Set<string>();
    for (const { css: c } of live) for (const m of stripComments(c).matchAll(/(--[a-zA-Z0-9-]+)\s*:/g)) defined.add(m[1]);
    // Custom properties set inline in markup (style="--panel-pad: 12px") count as definitions too.
    for (const f of liveAstroFiles()) for (const m of readFileSync(f, 'utf8').matchAll(/(--[a-zA-Z0-9-]+)\s*:/g)) defined.add(m[1]);
    const undefinedTokens: string[] = [];
    for (const { file, css: c } of live) {
      for (const m of stripComments(c).matchAll(/var\(\s*(--[a-zA-Z0-9-]+)\s*(,[^)]*)?\)/g)) {
        // A var() with a fallback value is allowed to be undefined.
        if (!defined.has(m[1]) && !m[2]) undefinedTokens.push(`${file}: ${m[1]}`);
      }
    }
    expect([...new Set(undefinedTokens)], 'undefined tokens').toEqual([]);
  });
});

describe('dark mode tokens', () => {
  const css = readFileSync(SITE_CSS, 'utf8');
  const light = customProps(ruleBody(css, '.sd'));
  const dark = customProps(ruleBody(css, '.sd.dark, .dark .sd'));

  it('every colour token is redefined for dark, unless listed as invariant', () => {
    const colourTokens = [...light].filter(([, v]) => /^#|^rgb|^hsl/.test(v)).map(([k]) => k);
    expect(colourTokens.length).toBeGreaterThan(8);
    const missing = colourTokens.filter((t) => !dark.has(t) && !(t in THEME_INVARIANT_TOKENS));
    expect(missing, 'colour tokens with no dark value').toEqual([]);
  });

  it('dark values differ from light values', () => {
    const same = [...dark].filter(([k, v]) => light.get(k) === v && !(k in THEME_INVARIANT_TOKENS)).map(([k]) => k);
    expect(same).toEqual([]);
  });

  it('dark mode declares color-scheme so form controls and scrollbars follow', () => {
    expect(ruleBody(css, '.sd.dark, .dark .sd')).toMatch(/color-scheme:\s*dark/);
  });

  it('the theme is set before paint from storage or prefers-color-scheme, and the button flips the same class', () => {
    // The site resolves prefers-color-scheme in script (class "dark" on <html>) instead of a CSS media query,
    // so the choice and the system setting share one code path and there is no light/dark flash.
    const init = readFileSync(join(SRC, 'components', 'ThemeInit.astro'), 'utf8');
    expect(init).toMatch(/prefers-color-scheme:\s*dark/);
    expect(init).toMatch(/classList\.toggle\('dark'/);
    const button = readFileSync(join(SRC, 'components', 'site', 'ThemeButton.astro'), 'utf8');
    expect(button).toMatch(/classList\.toggle\('dark'/);
    expect(button).toMatch(/try\s*\{[^}]*localStorage\.setItem/);
  });
});

describe('colour literals and !important', () => {
  it('no hard-coded colours outside the token definitions (allowlist in this file)', () => {
    const offenders: string[] = [];
    for (const { file, css } of liveCss()) {
      let text = stripComments(css);
      if (file === 'src/styles/site.css') {
        // The two token blocks are where literals belong.
        text = text.split('\n').filter((l) => !/^\.sd(\.dark, \.dark \.sd)? \{ --/.test(l)).join('\n');
      }
      const allowed = (COLOUR_ALLOWLIST[file] ?? []).map((v) => v.toLowerCase());
      for (const m of text.matchAll(COLOUR_LITERAL)) {
        let value = m[0];
        if (/^(rgba?|hsla?)\(/.test(value)) value = text.slice(m.index!).match(/^[^)]*\)/)![0].replace(/\s+/g, '');
        if (!allowed.includes(value.toLowerCase())) offenders.push(`${file}: ${value}`);
      }
    }
    expect([...new Set(offenders)], 'colour literals; use a token or add an allowlist entry with a reason').toEqual([]);
  });

  it('!important is used only where a comment on the same line says why', () => {
    const bad: string[] = [];
    readFileSync(SITE_CSS, 'utf8').split('\n').forEach((line, i) => {
      if (line.includes('!important') && !/\/\*.*\*\//.test(line)) bad.push(`site.css:${i + 1}: ${line.trim().slice(0, 80)}`);
    });
    expect(bad).toEqual([]);
  });
});

describe('fonts', () => {
  const css = readFileSync(SITE_CSS, 'utf8');
  const faces = [...css.matchAll(/@font-face\s*\{[^}]*\}/g)].map((m) => m[0]);

  it('Geist and Geist Serif are declared with swap, and their files exist in public/ and dist/', () => {
    const families = faces.map((f) => f.match(/font-family:\s*"([^"]+)"/)?.[1]);
    expect(families).toContain('Geist');
    expect(families).toContain('Geist Serif');
    for (const face of faces) {
      expect(face).toMatch(/font-display:\s*swap/);
      const url = face.match(/url\("([^"]+)"\)/)![1];
      expect(existsSync(join(ROOT, 'public', url)), `public${url}`).toBe(true);
      expect(existsSync(join(DIST, url)), `dist${url} (run bun run build)`).toBe(true);
    }
  });

  it('every font-family stack ends with a generic fallback', () => {
    const stacks = [...stripComments(css).replace(/@font-face\s*\{[^}]*\}/g, '').matchAll(/font-family:\s*([^;}]+)[;}]/g)].map((m) => m[1].trim());
    expect(stacks.length).toBeGreaterThan(0);
    for (const stack of stacks) {
      if (stack === 'inherit') continue;
      const parts = stack.split(',').map((p) => p.trim().replace(/["']/g, ''));
      const generic = parts.filter((p) => GENERIC_FAMILIES.includes(p));
      expect(generic.length, `no generic fallback in: ${stack}`).toBeGreaterThanOrEqual(FONT_FALLBACK_MIN);
      expect(GENERIC_FAMILIES, `generic family must come last in: ${stack}`).toContain(parts[parts.length - 1]);
    }
  });

  it('the body font is Geist and headings use Geist Serif', () => {
    expect(ruleBody(css, '.sd')).toMatch(/font-family:\s*Geist,\s*sans-serif/);
    expect(stripComments(css)).toMatch(/h1, h2, h3[^{]*\{\s*font-family:\s*"Geist Serif",\s*serif/);
  });

  it('every built page links the stylesheet that carries the font-face rules', () => {
    const missing = distHtml()
      .filter((p) => !/<link[^>]+rel="stylesheet"[^>]+href="\/_astro\/[^"]+\.css"|<style[^>]*>[\s\S]*@font-face/.test(p.html))
      .map((p) => p.file);
    expect(missing).toEqual([]);
  });
});

describe('built HTML', () => {
  it('every <img> has width and height attributes, or an aspect-ratio rule', () => {
    const css = readFileSync(SITE_CSS, 'utf8') + liveCss().map((c) => c.css).join('\n');
    const hasAspectRule = /aspect-ratio\s*:/.test(css);
    const bad: string[] = [];
    for (const { file, html } of distHtml()) {
      for (const m of html.matchAll(/<img\b[^>]*>/g)) {
        const tag = m[0];
        if (/\swidth="\d+"/.test(tag) && /\sheight="\d+"/.test(tag)) continue;
        if (hasAspectRule && /\sclass="/.test(tag)) continue;
        bad.push(`${file}: ${tag.slice(0, 100)}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('inline style attributes carry layout only, never a colour literal', () => {
    const bad: string[] = [];
    for (const { file, html } of distHtml()) {
      for (const m of html.matchAll(/\sstyle="([^"]*)"/g)) {
        if (COLOUR_LITERAL.test(m[1])) bad.push(`${file}: ${m[1].slice(0, 100)}`);
        COLOUR_LITERAL.lastIndex = 0;
        for (const decl of m[1].split(';')) {
          const [prop, value = ''] = decl.split(':').map((s) => s.trim());
          // Colour properties must take a token (var()), inherit, or currentColor; named colours are flagged.
          if (/^(color|background(-color)?|border(-\w+)?-color|fill|stroke)$/.test(prop) && !/^(var\(|inherit|currentColor|transparent|none)/.test(value)) {
            bad.push(`${file}: ${decl.trim()}`);
          }
        }
      }
    }
    expect([...new Set(bad)]).toEqual([]);
  });
});
