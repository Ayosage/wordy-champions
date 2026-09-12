import { matchFetch, type MatchEnv } from '@ayosage/match-core/worker'
import type { WordyMatch } from './match'
export { WordyMatch } from './match'

export interface Env extends MatchEnv {
  MATCH: DurableObjectNamespace<WordyMatch>
}

export default {
  fetch: (request: Request, env: Env) => matchFetch(request, env, { botsRequireTestKnobs: true }),
} satisfies ExportedHandler<Env>
