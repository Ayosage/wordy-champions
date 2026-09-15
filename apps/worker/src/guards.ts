/**
 * Abuse guards in front of the match routes. The launcher contract itself
 * lives in match-core; everything here is about who may knock and how often.
 *
 * Two limiters, both keyed by client IP:
 *   OPEN_LIMIT   creating rooms, the expensive one (a room is a Durable Object)
 *   LOOKUP_LIMIT reading a room by code, which is what makes a four-letter
 *                code space walkable if it is free
 *
 * Refusals come back in the `{ error }` shape the create route already uses,
 * so the client's existing message path reads them without a special case.
 */

/** A create body is a few tens of bytes (two counts and the test knobs). 16 KB is generous. */
export const MAX_BODY_BYTES = 16 * 1024

/** Both limiter windows are a minute, so this is what a refused caller waits. */
const RETRY_AFTER = '60'

export interface Limiters {
  /** Bound in wrangler.jsonc. Absent under `vitest` and a plain `wrangler dev`, which then do not throttle. */
  OPEN_LIMIT?: RateLimit
  LOOKUP_LIMIT?: RateLimit
}

const refusal = (error: string, status: number, headers: Record<string, string> = {}): Response =>
  Response.json({ error }, { status, headers: { 'cache-control': 'no-store', ...headers } })

/** The caller's address. `cf-connecting-ip` is written by the edge, so a client cannot set it. */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return request.headers.get('cf-connecting-ip') ?? forwarded ?? 'unknown'
}

/** 429 when the caller is over the window, null when they may pass. */
export async function throttle(limiter: RateLimit | undefined, key: string): Promise<Response | null> {
  if (!limiter) return null
  const { success } = await limiter.limit({ key })
  if (success) return null
  return refusal('Too many requests. Wait a minute and try again.', 429, { 'retry-after': RETRY_AFTER })
}

export const bodyTooLarge = (): Response => refusal('Request body is too large.', 413)

/**
 * The same request with a body known to be at or under the cap, or null when
 * it is over. The body is read here rather than trusted: `content-length` is
 * only a fast path, and a chunked upload does not have to send one.
 */
export async function capBody(request: Request): Promise<Request | null> {
  const declared = Number(request.headers.get('content-length') ?? '0')
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return null
  if (!request.body) return request
  const body = await readCapped(request.body, MAX_BODY_BYTES)
  if (body === null) return null
  return new Request(request, { body })
}

/** The stream's text, or null as soon as it passes `cap`, so an 8 MB POST is never buffered. */
async function readCapped(stream: ReadableStream<Uint8Array>, cap: number): Promise<string | null> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let text = ''
  let size = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > cap) {
      await reader.cancel()
      return null
    }
    text += decoder.decode(value, { stream: true })
  }
  return text + decoder.decode()
}
