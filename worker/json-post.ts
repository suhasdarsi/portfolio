// The gate in front of every form endpoint: same-origin JSON POSTs only, rate limited per IP, at most 8 KB.
export type RateLimiter = { limit(options: { key: string }): Promise<{ success: boolean }> };

const MAX_BYTES = 8192;
export const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };

export const reply = (body: unknown, status = 200) => Response.json(body, { status, headers });
export const fail = (message: string, status: number) => reply({ error: message }, status);

interface Messages {
  /** For a request that isn't a POST: where the form lives. */
  wrongMethod: string;
  /** Shown when the endpoint has no credentials yet; checked before the body is read. */
  notReady: string;
  rateLimited: string;
  tooLarge: string;
  invalid: string;
}

/** The request's JSON object and the caller's IP, or the error Response to send instead. */
export async function readJsonPost(
  request: Request,
  { ready, limiter, messages }: { ready: boolean; limiter?: RateLimiter; messages: Messages }
): Promise<{ payload: Record<string, unknown>; ip: string } | Response> {
  if (request.method !== 'POST') return fail(messages.wrongMethod, 405);
  if (request.headers.get('origin') !== new URL(request.url).origin) return fail('Open the form on this website.', 403);
  if (request.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase() !== 'application/json')
    return fail('Invalid request.', 415);
  if (!ready) return fail(messages.notReady, 503);
  const ip = request.headers.get('CF-Connecting-IP') ?? '';
  if (limiter && !(await limiter.limit({ key: ip || 'local' })).success) return fail(messages.rateLimited, 429);

  const reader = request.body?.getReader();
  let text = '';
  try {
    const decoder = new TextDecoder();
    let bytes = 0;
    while (reader) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_BYTES) {
        await reader.cancel();
        return fail(messages.tooLarge, 413);
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    const payload: unknown = JSON.parse(text);
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return fail(messages.invalid, 400);
    return { payload: payload as Record<string, unknown>, ip };
  } catch {
    return fail(messages.invalid, 400);
  } finally {
    reader?.releaseLock();
  }
}
