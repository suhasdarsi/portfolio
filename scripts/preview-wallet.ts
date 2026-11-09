// Serves dist/ with the Wallet endpoint signing real passes from the local credentials.
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { walletResponse } from '../worker/wallet';
import { credentials } from './wallet-credentials';
import { distAssets } from './dist-assets';

const env = {
  WALLET_SIGNER_KEY: await readFile(credentials.key, 'utf8'),
  WALLET_SIGNER_CERT: await readFile(credentials.certificate, 'utf8'),
  WALLET_WWDR_CERT: await readFile(credentials.intermediate, 'utf8'),
  ASSETS: { fetch: distAssets(join(process.cwd(), 'dist')) },
};
Bun.serve({
  hostname: '127.0.0.1',
  port: 4324,
  fetch(request: Request) {
    return new URL(request.url).pathname === '/api/wallet' ? walletResponse(request, env) : env.ASSETS.fetch(request);
  },
});
console.log('Wallet preview: http://127.0.0.1:4324/pocket-card');
