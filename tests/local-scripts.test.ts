import { expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
it('rejects pass output inside a double-dot-prefixed repository directory before reading credentials', () => {
  try {
    execFileSync(
      'bun',
      [
        'scripts/build-wallet-pass.ts',
        '--output',
        join(process.cwd(), '..passes', 'regression.pkpass'),
      ],
      { stdio: 'pipe', timeout: 10_000 }
    );
    throw new Error('Expected the output guard to reject the path');
  } catch (error) {
    expect(String((error as { stderr?: Buffer }).stderr)).toContain(
      'Save Wallet passes outside the website repository.'
    );
  }
});
it('serves file-format Astro routes in the wallet preview', async () => {
  const source = readFileSync('scripts/preview-wallet.ts', 'utf8');
  const body = (() => {
    const file = ts.createSourceFile('preview-wallet.ts', source, ts.ScriptTarget.Latest, true);
    let result = '';
    function visit(node: ts.Node) {
      if (
        !result &&
        ts.isMethodDeclaration(node) &&
        node.name.getText(file) === 'fetch' &&
        node.body
      )
        result = node.body.getText(file).slice(1, -1);
      ts.forEachChild(node, visit);
    }
    visit(file);
    if (!result) throw new Error('Preview asset handler not found');
    return result;
  })();
  const fetchAsset = runInNewContext(
    ts.transpile('(async function(request: Request) {' + body + '})', {
      target: ts.ScriptTarget.ES2022,
    }),
    {
      URL,
      Response,
      decodeURIComponent,
      join,
      process: { cwd: () => '/repo' },
      Bun: {
        file: (path: string) => ({
          path,
          exists: async () => path === '/repo/dist/pocket-card.html',
        }),
      },
    }
  );
  const response = await fetchAsset(new Request('http://localhost/pocket-card'));
  expect(response.status).toBe(200);
});
