import { expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { distAssets } from '../scripts/dist-assets';

it('rejects pass output inside a double-dot-prefixed repository directory before reading credentials', () => {
  try {
    execFileSync('bun', ['scripts/build-wallet-pass.ts', '--output', join(process.cwd(), '..passes', 'regression.pkpass')], {
      stdio: 'pipe',
      timeout: 10_000,
    });
    throw new Error('Expected the output guard to reject the path');
  } catch (error) {
    expect(String((error as { stderr?: Buffer }).stderr)).toContain('Save Wallet passes outside the website repository.');
  }
});

it('serves file-format Astro routes in the wallet preview', async () => {
  const dist = mkdtempSync(join(tmpdir(), 'dist-assets-'));
  try {
    writeFileSync(join(dist, 'index.html'), 'home');
    writeFileSync(join(dist, 'pocket-card.html'), 'card');
    mkdirSync(join(dist, 'wallet'));
    writeFileSync(join(dist, 'wallet', 'icon.png'), 'png');
    const serve = distAssets(dist);
    const text = async (path: string) => {
      const response = await serve(new Request(`http://localhost${path}`));
      return `${response.status} ${response.status === 200 ? await response.text() : ''}`.trim();
    };
    expect(await text('/')).toBe('200 home');
    expect(await text('/pocket-card')).toBe('200 card');
    expect(await text('/wallet/icon.png')).toBe('200 png');
    expect(await text('/wallet')).toBe('404');
    expect(await text('/wallet%2F..%2F..%2Fsecret')).toBe('400');
  } finally {
    rmSync(dist, { recursive: true, force: true });
  }
});
