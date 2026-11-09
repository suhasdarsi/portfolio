// Serves the built site the way Cloudflare does with build.format 'file': /pocket-card → dist/pocket-card.html.
import { existsSync, statSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export function distAssets(root: string) {
  const file = (path: string) => {
    const full = join(root, path);
    return existsSync(full) && statSync(full).isFile() ? full : undefined;
  };
  return async (request: Request): Promise<Response> => {
    const path = decodeURIComponent(new URL(request.url).pathname);
    if (path.includes('..')) return new Response(null, { status: 400 });
    const found = file(path === '/' ? 'index.html' : path) ?? file(`${path.replace(/\/$/, '')}.html`);
    return found ? new Response(await readFile(found)) : new Response('Not found', { status: 404 });
  };
}
