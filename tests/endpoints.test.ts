import { describe, expect, it } from 'vitest';
import { toolshedRequestResponse } from '../worker/toolshed';
import { walletResponse } from '../worker/wallet';
import type { RateLimiter } from '../worker/json-post';

// Both form endpoints, configured as in production, sit behind the same gate.
const endpoints = {
  wallet: (request: Request, limiter?: RateLimiter) =>
    walletResponse(request, {
      WALLET_SIGNER_CERT: 'cert',
      WALLET_SIGNER_KEY: 'key',
      WALLET_WWDR_CERT: 'wwdr',
      ASSETS: { fetch: async () => new Response() },
      WALLET_LIMIT: limiter,
    }),
  toolshed: (request: Request, limiter?: RateLimiter) =>
    toolshedRequestResponse(request, { TURNSTILE_SECRET: 's', GITHUB_TOKEN: 'gh', TOOLSHED_LIMIT: limiter }),
};

const post = (body: BodyInit | null, headers: Record<string, string> = {}) =>
  new Request('https://suhasdarsi.com/api/endpoint', {
    method: 'POST',
    headers: { origin: 'https://suhasdarsi.com', 'content-type': 'application/json', ...headers },
    body,
    duplex: 'half',
  } as RequestInit);

describe.each(Object.entries(endpoints))('%s endpoint', (_, respond) => {
  it('accepts only same-origin JSON POSTs', async () => {
    expect((await respond(new Request('https://suhasdarsi.com/api/endpoint'))).status).toBe(405);
    expect((await respond(post('{}', { origin: 'https://evil.example' }))).status).toBe(403);
    expect((await respond(post('{}', { 'content-type': 'text/plain' }))).status).toBe(415);
    expect((await respond(post('{}', { 'content-type': 'application/json-invalid' }))).status).toBe(415);
  });

  it.each(['null', '[]', '"text"', '1', '{'])('rejects %s as a bad request', async (body) => {
    const response = await respond(post(body));
    expect(response.status).toBe(400);
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it('turns away a visitor over the rate limit before reading the body', async () => {
    const keys: string[] = [];
    const limiter: RateLimiter = { limit: async ({ key }) => (keys.push(key), { success: false }) };
    const body = new ReadableStream<Uint8Array>();
    const response = await respond(post(body, { 'cf-connecting-ip': '203.0.113.7' }), limiter);
    expect(response.status).toBe(429);
    expect(keys).toEqual(['203.0.113.7']);
    expect(body.locked).toBe(false);
  });

  it('rejects bodies over 8 KB, counted in bytes', async () => {
    expect((await respond(post(JSON.stringify({ website: '😀'.repeat(2500) })))).status).toBe(413);
  });

  it('treats a broken body stream as a bad request and releases it', async () => {
    const body = new ReadableStream<Uint8Array>({ start: (controller) => controller.error(new Error('disconnected')) });
    expect((await respond(post(body))).status).toBe(400);
    expect(body.locked).toBe(false);
  });
});

it('the Wallet endpoint stays closed without signing credentials', async () => {
  const response = await walletResponse(post('{}'), { ASSETS: { fetch: async () => new Response() } });
  expect(response.status).toBe(503);
});
