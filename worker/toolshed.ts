import { issueFor, validateToolRequest } from '../src/utils/toolshed-request';

export interface ToolshedEnv {
  // Turnstile widget secret and the frontend hostnames its tokens may come from (comma-separated).
  TURNSTILE_SECRET?: string;
  TURNSTILE_HOSTNAMES?: string;
  // A fine-grained token that can only create issues in GITHUB_REPO ("owner/name").
  GITHUB_TOKEN?: string;
  GITHUB_REPO?: string;
  TOOLSHED_LIMIT?: { limit(options: { key: string }): Promise<{ success: boolean }> };
}

const TURNSTILE_ACTION = 'toolshed_request';

// POST /api/toolshed/request: a "suggest a tool" form submission becomes a labelled public GitHub issue.
export async function toolshedRequestResponse(
  request: Request,
  env: ToolshedEnv,
  fetcher: typeof fetch = fetch
): Promise<Response> {
  const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
  const fail = (message: string, status: number) =>
    Response.json({ error: message }, { status, headers });
  if (request.method !== 'POST') return fail('Use the form on the Toolshed page.', 405);
  if (request.headers.get('origin') !== new URL(request.url).origin)
    return fail('Open the form on this website.', 403);
  if (
    request.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase() !==
    'application/json'
  )
    return fail('Invalid request.', 415);
  if (!env.TURNSTILE_SECRET || !env.TURNSTILE_HOSTNAMES || !env.GITHUB_TOKEN || !env.GITHUB_REPO)
    return fail('Requests are not open yet. Please use GitHub for now.', 503);
  const ip = request.headers.get('CF-Connecting-IP') ?? '';
  if (env.TOOLSHED_LIMIT && !(await env.TOOLSHED_LIMIT.limit({ key: ip || 'local' })).success)
    return fail('Please wait a minute before sending another request.', 429);

  let payload: Record<string, unknown>;
  const reader = request.body?.getReader();
  try {
    let bytes = 0;
    let text = '';
    const decoder = new TextDecoder();
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > 8192) {
          await reader.cancel();
          return fail('That request is too large.', 413);
        }
        text += decoder.decode(value, { stream: true });
      }
    }
    text += decoder.decode();
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
      return fail('Invalid request.', 400);
    payload = parsed as Record<string, unknown>;
  } catch {
    return fail('Invalid request.', 400);
  } finally {
    reader?.releaseLock();
  }
  // A field people can't see: anything in it came from a bot. Pretend it worked.
  if (payload.website) return Response.json({ ok: true }, { headers });

  let toolRequest;
  try {
    toolRequest = validateToolRequest(payload.request);
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Invalid request.', 400);
  }

  // Canonical Turnstile siteverify: require success, the expected action and an approved hostname. Fail closed.
  const token = payload.token;
  const hostnames = new Set(
    env.TURNSTILE_HOSTNAMES.split(',')
      .map((hostname) => hostname.trim())
      .filter(Boolean)
  );
  if (
    typeof token !== 'string' ||
    token.length === 0 ||
    token.length > 2048 ||
    hostnames.size === 0
  )
    return fail('Please complete the check and try again.', 403);
  let verdict: { success?: boolean; action?: string; hostname?: string };
  try {
    const response = await fetcher('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      signal: AbortSignal.timeout(10_000),
      body: new URLSearchParams({
        secret: env.TURNSTILE_SECRET,
        response: token,
        ...(ip ? { remoteip: ip } : {}),
      }),
    });
    if (!response.ok) throw new Error(`siteverify ${response.status}`);
    verdict = await response.json();
  } catch {
    return fail('Please complete the check and try again.', 403);
  }
  if (
    !verdict ||
    verdict.success !== true ||
    verdict.action !== TURNSTILE_ACTION ||
    !hostnames.has(verdict.hostname ?? '')
  )
    return fail('Please complete the check and try again.', 403);

  try {
    const response = await fetcher(`https://api.github.com/repos/${env.GITHUB_REPO}/issues`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'User-Agent': 'suhasdarsi-toolshed',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      signal: AbortSignal.timeout(10_000),
      body: JSON.stringify(issueFor(toolRequest)),
    });
    if (!response.ok) throw new Error(`github ${response.status}`);
    const issue = (await response.json()) as { html_url?: string };
    return Response.json({ ok: true, url: issue.html_url }, { headers });
  } catch {
    return fail('Your request could not be filed. Please try again later or use GitHub.', 502);
  }
}
