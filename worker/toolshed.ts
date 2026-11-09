import { site } from '../src/site/site';
import { REQUEST_REPO, TURNSTILE_ACTION, issueFor, validateToolRequest } from '../src/toolshed/request';
import { fail, readJsonPost, reply, type RateLimiter } from './json-post';

export interface ToolshedEnv {
  // Turnstile widget secret, and the frontend hostnames its tokens may come from (comma-separated; defaults to the site host).
  TURNSTILE_SECRET?: string;
  TURNSTILE_HOSTNAMES?: string;
  // A fine-grained token that can only create issues in REQUEST_REPO.
  GITHUB_TOKEN?: string;
  TOOLSHED_LIMIT?: RateLimiter;
}

// POST /api/toolshed/request: a "suggest a tool" form submission becomes a labelled public GitHub issue.
export async function toolshedRequestResponse(
  request: Request,
  env: ToolshedEnv,
  fetcher: typeof fetch = fetch
): Promise<Response> {
  const { TURNSTILE_SECRET: secret = '', TURNSTILE_HOSTNAMES: allowedHosts = new URL(site.url).hostname, GITHUB_TOKEN: githubToken = '' } = env;
  const read = await readJsonPost(request, {
    ready: Boolean(secret && githubToken),
    limiter: env.TOOLSHED_LIMIT,
    messages: {
      wrongMethod: 'Use the form on the Toolshed page.',
      notReady: 'Requests are not open yet. Please use GitHub for now.',
      rateLimited: 'Please wait a minute before sending another request.',
      tooLarge: 'That request is too large.',
      invalid: 'Invalid request.',
    },
  });
  if (read instanceof Response) return read;
  const { payload, ip } = read;

  // A field people can't see: anything in it came from a bot. Pretend it worked.
  if (payload.website) return reply({ ok: true });

  let toolRequest;
  try {
    toolRequest = validateToolRequest(payload.request);
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Invalid request.', 400);
  }

  // Canonical Turnstile siteverify: require success, the expected action and an approved hostname. Fail closed.
  const token = payload.token;
  const hostnames = new Set(
    allowedHosts.split(',')
      .map((hostname) => hostname.trim())
      .filter(Boolean)
  );
  const notVerified = () => fail('Please complete the check and try again.', 403);
  if (typeof token !== 'string' || token.length === 0 || token.length > 2048 || hostnames.size === 0) return notVerified();
  let verdict: { success?: boolean; action?: string; hostname?: string } | null;
  try {
    const response = await fetcher('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      signal: AbortSignal.timeout(10_000),
      body: new URLSearchParams({
        secret,
        response: token,
        ...(ip ? { remoteip: ip } : {}),
      }),
    });
    if (!response.ok) return notVerified();
    verdict = await response.json();
  } catch {
    return notVerified();
  }
  if (verdict?.success !== true || verdict.action !== TURNSTILE_ACTION || !hostnames.has(verdict.hostname ?? '')) return notVerified();

  try {
    const response = await fetcher(`https://api.github.com/repos/${REQUEST_REPO}/issues`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${githubToken}`,
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
    return reply({ ok: true, url: issue.html_url });
  } catch {
    return fail('Your request could not be filed. Please try again later or use GitHub.', 502);
  }
}
