import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { walletResponse } from '../worker/wallet';
const directory = process.env.WALLET_CREDENTIAL_DIR ?? '/Users/suhas/.wallet-contact';
const env = {
  WALLET_SIGNER_KEY: await readFile(join(directory, 'pass.com.suhasdarsi.contact.key.pem'), 'utf8'),
  WALLET_SIGNER_CERT: await readFile(
    join(directory, 'pass.com.suhasdarsi.contact.cert.pem'),
    'utf8'
  ),
  WALLET_WWDR_CERT: await readFile(join(directory, 'wwdr.pem'), 'utf8'),
  ASSETS: {
    async fetch(request: Request) {
      const path = decodeURIComponent(new URL(request.url).pathname);
      if (path.includes('..')) return new Response(null, { status: 400 });
      const file = Bun.file(join(process.cwd(), 'dist', path === '/' ? 'index.html' : path));
      if (await file.exists()) return new Response(file);
      const page = Bun.file(join(process.cwd(), 'dist', `${path.replace(/\/$/, '')}.html`));
      return (await page.exists())
        ? new Response(page)
        : new Response('Not found', { status: 404 });
    },
  },
};
Bun.serve({
  hostname: '127.0.0.1',
  port: 4324,
  fetch(request: Request) {
    return new URL(request.url).pathname === '/api/wallet'
      ? walletResponse(request, env)
      : env.ASSETS.fetch(request);
  },
});
console.log('Wallet preview: http://127.0.0.1:4324/pocket-card');
