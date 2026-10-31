import { describe, it, expect, vi } from 'vitest';
import { issueFor, validateToolRequest } from '../src/utils/toolshed-request';
import { toolshedRequestResponse } from '../worker/toolshed';

const good = { kind: 'add', name: 'Acme Guard', url: 'https://acme.example', categories: ['AI security'], details: 'Scans MCP servers on laptops.', affiliated: false, relationship: '' };
const env = { TURNSTILE_SECRET: 'secret', TURNSTILE_HOSTNAMES: 'suhasdarsi.com', GITHUB_TOKEN: 'gh', GITHUB_REPO: 'suhasdarsi/portfolio' };
const post = (body: unknown, headers: Record<string, string> = {}) => new Request('https://suhasdarsi.com/api/toolshed/request', {
  method: 'POST',
  headers: { origin: 'https://suhasdarsi.com', 'content-type': 'application/json', 'CF-Connecting-IP': '203.0.113.9', ...headers },
  body: JSON.stringify(body),
});
const verified = (overrides = {}) => Response.json({ success: true, action: 'toolshed_request', hostname: 'suhasdarsi.com', ...overrides });

describe('Toolshed requests', () => {
  it('validates requests', () => {
    expect(validateToolRequest(good).url).toBe('https://acme.example/');
    expect(() => validateToolRequest({ ...good, url: 'javascript:alert(1)' })).toThrow();
    expect(() => validateToolRequest({ ...good, url: 'http://acme.example' })).toThrow();
    expect(() => validateToolRequest({ ...good, name: 'Acme\nGuard' })).toThrow();
    expect(() => validateToolRequest({ ...good, categories: ['Gardening'] })).toThrow();
    expect(() => validateToolRequest({ ...good, details: 'short' })).toThrow();
    expect(() => validateToolRequest({ ...good, affiliated: true })).toThrow();
    expect(validateToolRequest({ ...good, affiliated: true, relationship: 'I work there' }).relationship).toBe('I work there');
  });

  it('keeps submitted text inert in the public issue', () => {
    const { title, body, labels } = issueFor(validateToolRequest({ ...good, details: 'Ping @someone about #12 <script>x</script> `code`' }));
    expect(title).toBe('Toolshed: add Acme Guard');
    expect(labels).toEqual(['toolshed-request', 'add-tool']);
    expect(body).not.toMatch(/@someone|#12|<script>|`code`/);
    expect(body).toContain('nobody can pay to be included');
  });

  it('refuses the wrong method, origin and content type, and stays closed without secrets', async () => {
    expect((await toolshedRequestResponse(new Request('https://suhasdarsi.com/api/toolshed/request'), env)).status).toBe(405);
    expect((await toolshedRequestResponse(post({}, { origin: 'https://evil.example' }), env)).status).toBe(403);
    expect((await toolshedRequestResponse(post({}, { 'content-type': 'text/plain' }), env)).status).toBe(415);
    expect((await toolshedRequestResponse(post({ request: good, token: 't' }), {})).status).toBe(503);
  });

  it('rate limits by IP', async () => {
    const limit = vi.fn<(options: { key: string }) => Promise<{ success: boolean }>>().mockResolvedValue({ success: false });
    expect((await toolshedRequestResponse(post({ request: good, token: 't' }), { ...env, TOOLSHED_LIMIT: { limit } })).status).toBe(429);
    expect(limit).toHaveBeenCalledWith({ key: '203.0.113.9' });
  });

  it('quietly drops honeypot submissions without filing anything', async () => {
    const fetcher = vi.fn<typeof fetch>();
    const response = await toolshedRequestResponse(post({ request: good, token: 't', website: 'spam' }), env, fetcher);
    expect(response.status).toBe(200);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('requires a Turnstile token with the right action and hostname, failing closed', async () => {
    const run = (fetcher: typeof fetch, token: unknown = 'token') => toolshedRequestResponse(post({ request: good, token }), env, fetcher);
    expect((await run(vi.fn<typeof fetch>(), '')).status).toBe(403);
    expect((await run(vi.fn<typeof fetch>().mockResolvedValue(verified({ success: false })))).status).toBe(403);
    expect((await run(vi.fn<typeof fetch>().mockResolvedValue(verified({ action: 'signup' })))).status).toBe(403);
    expect((await run(vi.fn<typeof fetch>().mockResolvedValue(verified({ hostname: 'localhost' })))).status).toBe(403);
    expect((await run(vi.fn<typeof fetch>().mockRejectedValue(new Error('network'))))).toHaveProperty('status', 403);
  });

  it('files a labelled GitHub issue and returns its link', async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(verified())
      .mockResolvedValueOnce(Response.json({ html_url: 'https://github.com/suhasdarsi/portfolio/issues/1' }, { status: 201 }));
    const response = await toolshedRequestResponse(post({ request: good, token: 'token' }), env, fetcher);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, url: 'https://github.com/suhasdarsi/portfolio/issues/1' });
    const [siteverifyUrl, siteverify] = fetcher.mock.calls[0];
    expect(siteverifyUrl).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify');
    expect(String(siteverify!.body)).toContain('remoteip=203.0.113.9');
    const [issueUrl, issue] = fetcher.mock.calls[1];
    expect(issueUrl).toBe('https://api.github.com/repos/suhasdarsi/portfolio/issues');
    expect((issue!.headers as Record<string, string>).Authorization).toBe('Bearer gh');
    expect(JSON.parse(String(issue!.body)).labels).toContain('toolshed-request');
  });

  it('reports a GitHub failure instead of pretending it worked', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(verified()).mockResolvedValueOnce(new Response('', { status: 500 }));
    expect((await toolshedRequestResponse(post({ request: good, token: 'token' }), env, fetcher)).status).toBe(502);
  });
});
