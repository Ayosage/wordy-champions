import { z } from 'zod'
import type { GameAdapter, Placement } from '@ayosage/match-core'
import {
  applyGuess,
  createMatch,
  deadline,
  expire,
  expireEvents,
  guessEvents,
  placements,
  solverGuess,
  viewFor,
  type WordyEvent,
  type WordyState,
  type WordyView,
} from '@wordy/rules'

export type WordyIntent = { type: 'guess'; word: string }

export const wordyAdapter: GameAdapter<WordyState, WordyIntent, WordyView, WordyEvent> = {
  slug: 'wordy',
  players: { min: 2, max: 8 },
  intentSchema: z.object({ type: z.literal('guess'), word: z.string().min(1).max(16) }).strict(),
  create(opts, rng) {
    const knobs = {
      ...(typeof opts.rounds === 'number' ? { rounds: opts.rounds } : {}),
      ...(typeof opts.roundMs === 'number' ? { roundMs: opts.roundMs } : {}),
      ...(typeof opts.interludeMs === 'number' ? { interludeMs: opts.interludeMs } : {}),
    }
    return createMatch(opts.playerCount, opts.seed, opts.now, rng, knobs)
  },
  apply: (state, intent, _rng, now) => applyGuess(state, intent.player, intent.word, now),
  view: viewFor,
  events: (before, intent, after) => guessEvents(before, after, intent.player),
  redactEvent: (e) => e,
  drive(state, seat, kind, rng, memory) {
    // Pilots (disconnected humans) do nothing: the round cap handles them. Bots (test only) solve.
    if (kind !== 'bot' || state.phase !== 'round' || !state.round) return { intent: null, memory }
    const board = state.round.boards[seat]
    if (!board || board.solvedAt !== null || board.failed) return { intent: null, memory }
    return { intent: { type: 'guess', word: solverGuess(board.guesses, rng), player: seat }, memory }
  },
  driveDelayMs: () => 1500,
  offerWindow: () => ({ open: false, everyoneAnswered: false }),
  offerWindowMs: 0,
  isEnded: (state) => state.phase === 'ended',
  winner: (state) => state.winner,
  result: (state): Placement[] => placements(state),
  turnNumber: (state) => state.history.length,
  currentSeat: () => 0,
  deadline,
  expire: (state, now, rng) => {
    const next = expire(state, now, rng)
    return { state: next, events: expireEvents(state, next) }
  },
}
