import { matchFetch, type MatchEnv } from '@ayosage/match-core/worker'
import { bodyTooLarge, capBody, clientIp, throttle, type Limiters } from './guards'
import type { WordyMatch } from './match'
export { WordyMatch } from './match'

export interface Env extends MatchEnv, Limiters {
  MATCH: DurableObjectNamespace<WordyMatch>
}

const CODE_ROUTE = /^\/matches\/[A-Z0-9]{1,12}(\/ws)?$/

/** Same allow-list match-core answers with, so a guard's refusal is readable by the client. */
function cors(env: Env, res: Response): Response {
  const headers = new Headers(res.headers)
  headers.set('access-control-allow-origin', env.CLIENT_ORIGIN)
  headers.set('vary', 'origin')
  return new Response(res.body, { status: res.status, headers })
}

/** Either a refusal to send back, or the request to hand on (a create carries a body read down to the cap). */
type Guarded = { refused: Response; request?: undefined } | { refused?: undefined; request: Request }

/**
 * Creating a room makes a Durable Object, and reading one by code is how a
 * four-letter code space gets walked, so both are capped per IP. The
 * bearer-authenticated launcher route (Steward) is not: one server creates
 * every room it launches, and throttling it would break `/wordy`.
 */
async function guard(request: Request, env: Env): Promise<Guarded> {
  const url = new URL(request.url)
  if (request.method === 'POST' && (url.pathname === '/matches' || url.pathname === '/matches/open')) {
    if (url.pathname === '/matches/open') {
      const refused = await throttle(env.OPEN_LIMIT, `open:${clientIp(request)}`)
      if (refused) return { refused }
    }
    const capped = await capBody(request)
    return capped === null ? { refused: bodyTooLarge() } : { request: capped }
  }
  if (request.method === 'GET' && CODE_ROUTE.test(url.pathname)) {
    const refused = await throttle(env.LOOKUP_LIMIT, `lookup:${clientIp(request)}`)
    if (refused) return { refused }
  }
  return { request }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const checked = await guard(request, env)
    if (checked.refused) return cors(env, checked.refused)
    return matchFetch(checked.request, env, { botsRequireTestKnobs: true })
  },
} satisfies ExportedHandler<Env>
