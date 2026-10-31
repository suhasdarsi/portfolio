import { describe, expect, it, vi } from 'vitest';
import { toolshedRequestResponse } from '../worker/toolshed';
import { debounce } from '../src/utils/search-loader';
import { inert } from '../src/utils/toolshed-request';
import { walletResponse } from '../worker/wallet';

const env = {
  TURNSTILE_SECRET: 'secret',
  TURNSTILE_HOSTNAMES: 'suhasdarsi.com',
  GITHUB_TOKEN: 'gh',
  GITHUB_REPO: 'suhasdarsi/portfolio',
};
const post = (body: unknown) =>
  new Request('https://suhasdarsi.com/api/toolshed/request', {
    method: 'POST',
    headers: { origin: 'https://suhasdarsi.com', 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
describe('maintenance regressions', () => {
  it.each([null, [], 'text', 1])('rejects non-object JSON: %j', async (body) => {
    expect((await toolshedRequestResponse(post(body), env)).status).toBe(400);
  });
  it('rejects oversized UTF-8 bodies by bytes', async () => {
    expect((await toolshedRequestResponse(post({ website: '😀'.repeat(2500) }), env)).status).toBe(
      413
    );
  });
  it('fails closed on a null Turnstile verdict', async () => {
    const request = {
      kind: 'add',
      name: 'Acme',
      url: 'https://acme.example',
      categories: [],
      details: 'An example security tool.',
      affiliated: false,
    };
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(null));
    expect(
      (await toolshedRequestResponse(post({ request, token: 't' }), env, fetcher)).status
    ).toBe(403);
  });
  it('settles a debounced synchronous exception', async () => {
    const errors: unknown[] = [];
    const handler = (error: unknown) => errors.push(error);
    process.on('uncaughtException', handler);
    try {
      const settled = await Promise.race([
        debounce(() => {
          throw new Error('boom');
        }, 0)().then(() => true),
        new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 50)),
      ]);
      expect(settled).toBe(true);
      expect(errors).toEqual([]);
    } finally {
      process.off('uncaughtException', handler);
    }
  });
  it('escapes Markdown images, links and entity-based mentions', () => {
    expect(inert('![spam](https://example.com)')).toContain('\\[');
    expect(inert('&#64;someone')).toContain('&amp;');
  });
});
it('rejects lookalike JSON media types at both API endpoints', async () => {
  const request = post({});
  request.headers.set('content-type', 'application/json-invalid');
  expect((await toolshedRequestResponse(request.clone(), env)).status).toBe(415);
  expect(
    (await walletResponse(request, { ASSETS: { fetch: async () => new Response() } })).status
  ).toBe(415);
});
it('handles a failed Wallet body stream as a bad request', async () => {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.error(new Error('disconnected'));
    },
  });
  const request = new Request('https://suhasdarsi.com/api/wallet', {
    method: 'POST',
    headers: { origin: 'https://suhasdarsi.com', 'content-type': 'application/json' },
    body,
    duplex: 'half',
  } as RequestInit);
  const response = await walletResponse(request, {
    WALLET_SIGNER_CERT: 'test',
    WALLET_SIGNER_KEY: 'test',
    WALLET_WWDR_CERT: 'test',
    ASSETS: { fetch: async () => new Response() },
  });
  expect(response.status).toBe(400);
  expect(body.locked).toBe(false);
});
