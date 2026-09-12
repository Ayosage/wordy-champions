import { markGuess, type Mark } from './marks'
import { guessPoints, placementPoints } from './scoring'
import { ANSWERS, isWord } from './words'

export interface Rng {
  next(): number
}

export interface Guess {
  word: string
  marks: Mark[]
  at: number
}
export interface Board {
  guesses: Guess[]
  solvedAt: number | null
  failed: boolean
}
export interface RoundScore {
  guesses: number | null
  solveMs: number | null
  guessPoints: number
  placementPoints: number
}
export interface Totals {
  points: number
  guesses: number
  solves: number
  lastSolveAt: number | null
}
export interface Round {
  index: number
  answer: string
  startedAt: number
  endsAt: number
  boards: Record<number, Board>
}
export interface ViewGuess {
  /** null for another player's guess while the round runs */
  word: string | null
  marks: Mark[]
}
export interface ViewBoard {
  guesses: ViewGuess[]
  solved: boolean
  failed: boolean
  solveMs: number | null
}
export interface WordyState {
  seed: number
  players: number
  rounds: number
  roundMs: number
  interludeMs: number
  phase: 'round' | 'interlude' | 'ended'
  round: Round | null
  interludeUntil: number | null
  totals: Record<number, Totals>
  history: { answer: string; scores: Record<number, RoundScore> }[]
  /** The finished round's boards, letters included, for the scoreboard. */
  lastBoards: Record<number, ViewBoard> | null
  /** The same boards raw, so events for the guess that ended a round can still read them. */
  lastBoardsRaw: Record<number, Board> | null
  answers: string[]
  winner: number | null
}
export interface WordyKnobs {
  rounds?: number
  roundMs?: number
  interludeMs?: number
}
export type WordyIntent = { type: 'guess'; word: string }
export type WordyEvent =
  | { kind: 'guess'; seat: number; marks: Mark[] }
  | { kind: 'solved'; seat: number; guesses: number; solveMs: number }
  | { kind: 'failed'; seat: number }
  | { kind: 'roundEnded'; index: number; answer: string; scores: Record<number, RoundScore> }
  | { kind: 'matchEnded'; winner: number | null }

export interface WordyView {
  you: number
  players: number
  rounds: number
  roundsPlayed: number
  phase: WordyState['phase']
  round: { index: number; startedAt: number; endsAt: number; boards: Record<number, ViewBoard> } | null
  interludeUntil: number | null
  lastRound: { answer: string; scores: Record<number, RoundScore>; boards: Record<number, ViewBoard> } | null
  totals: Record<number, Totals>
  winner: number | null
}

export const DEFAULT_ROUNDS = 6
export const DEFAULT_ROUND_MS = 180_000
export const DEFAULT_INTERLUDE_MS = 8_000

function pickAnswers(count: number, rng: Rng): string[] {
  const chosen: string[] = []
  const used = new Set<string>()
  while (chosen.length < count) {
    const w = ANSWERS[Math.floor(rng.next() * ANSWERS.length)]!
    if (!used.has(w)) {
      used.add(w)
      chosen.push(w)
    }
  }
  return chosen
}

function emptyBoards(players: number): Record<number, Board> {
  const out: Record<number, Board> = {}
  for (let s = 0; s < players; s++) out[s] = { guesses: [], solvedAt: null, failed: false }
  return out
}

function startRound(state: WordyState, index: number, now: number): WordyState {
  return {
    ...state,
    phase: 'round',
    interludeUntil: null,
    round: { index, answer: state.answers[index]!, startedAt: now, endsAt: now + state.roundMs, boards: emptyBoards(state.players) },
  }
}

export function createMatch(players: number, seed: number, now: number, rng: Rng, knobs: WordyKnobs = {}): WordyState {
  const rounds = knobs.rounds ?? DEFAULT_ROUNDS
  const totals: Record<number, Totals> = {}
  for (let s = 0; s < players; s++) totals[s] = { points: 0, guesses: 0, solves: 0, lastSolveAt: null }
  const base: WordyState = {
    seed,
    players,
    rounds,
    roundMs: knobs.roundMs ?? DEFAULT_ROUND_MS,
    interludeMs: knobs.interludeMs ?? DEFAULT_INTERLUDE_MS,
    phase: 'round',
    round: null,
    interludeUntil: null,
    totals,
    history: [],
    lastBoards: null,
    lastBoardsRaw: null,
    answers: pickAnswers(rounds, rng),
    winner: null,
  }
  return startRound(base, 0, now)
}

function boardDone(b: Board): boolean {
  return b.solvedAt !== null || b.failed
}

/** A player's guess. Returns the next state, or a rule error the object sends back to that seat. */
export function applyGuess(state: WordyState, seat: number, raw: string, now: number): WordyState | { code: string; message: string } {
  if (state.phase !== 'round' || !state.round) return { code: 'NOT_IN_ROUND', message: 'No round is running right now.' }
  const board = state.round.boards[seat]
  if (!board) return { code: 'NO_SEAT', message: 'You have no board in this match.' }
  if (boardDone(board)) return { code: 'BOARD_DONE', message: 'Your board is finished for this round.' }
  const word = raw.toLowerCase()
  if (!/^[a-z]{5}$/.test(word) || !isWord(word)) return { code: 'NOT_A_WORD', message: 'That is not in the word list.' }
  const marks = markGuess(word, state.round.answer)
  const guesses = [...board.guesses, { word, marks, at: now }]
  const solved = word === state.round.answer
  const next: Board = { guesses, solvedAt: solved ? now : null, failed: !solved && guesses.length >= 6 }
  const boards = { ...state.round.boards, [seat]: next }
  const withGuess: WordyState = { ...state, round: { ...state.round, boards } }
  const everyoneDone = Object.values(boards).every(boardDone)
  return everyoneDone ? endRound(withGuess, now) : withGuess
}

function viewBoard(b: Board, reveal: boolean, startedAt: number): ViewBoard {
  return {
    guesses: b.guesses.map((g) => ({ word: reveal ? g.word : null, marks: g.marks })),
    solved: b.solvedAt !== null,
    failed: b.failed,
    solveMs: b.solvedAt !== null ? b.solvedAt - startedAt : null,
  }
}

function decideWinner(totals: Record<number, Totals>): number {
  const seats = Object.keys(totals).map(Number)
  seats.sort((a, b) => {
    const A = totals[a]!
    const B = totals[b]!
    return B.points - A.points || A.guesses - B.guesses || (A.lastSolveAt ?? Infinity) - (B.lastSolveAt ?? Infinity) || a - b
  })
  return seats[0]!
}

/** Score the running round and open the interlude (or end the match after the last round). */
export function endRound(state: WordyState, now: number): WordyState {
  if (state.phase !== 'round' || !state.round) return state
  const r = state.round
  const entries = Object.entries(r.boards).map(([s, b]) => ({
    seat: Number(s),
    guesses: b.solvedAt !== null ? b.guesses.length : null,
    solveMs: b.solvedAt !== null ? b.solvedAt - r.startedAt : null,
  }))
  const placed = placementPoints(entries, state.players)
  const scores: Record<number, RoundScore> = {}
  const totals: Record<number, Totals> = { ...state.totals }
  for (const e of entries) {
    const gp = guessPoints(e.guesses)
    const pp = placed[e.seat] ?? 0
    scores[e.seat] = { guesses: e.guesses, solveMs: e.solveMs, guessPoints: gp, placementPoints: pp }
    const t = totals[e.seat]!
    const b = r.boards[e.seat]!
    totals[e.seat] = {
      points: t.points + gp + pp,
      guesses: t.guesses + b.guesses.length,
      solves: t.solves + (e.guesses !== null ? 1 : 0),
      lastSolveAt: b.solvedAt ?? t.lastSolveAt,
    }
  }
  const history = [...state.history, { answer: r.answer, scores }]
  const lastBoards = Object.fromEntries(Object.entries(r.boards).map(([s, b]) => [s, viewBoard(b, true, r.startedAt)]))
  const last = r.index + 1 >= state.rounds
  const base: WordyState = { ...state, totals, history, round: null, lastBoards, lastBoardsRaw: r.boards }
  if (last) return { ...base, phase: 'ended', interludeUntil: null, winner: decideWinner(totals) }
  return { ...base, phase: 'interlude', interludeUntil: now + state.interludeMs }
}

/** The time the game wants to be woken at. */
export function deadline(state: WordyState): number | null {
  if (state.phase === 'round' && state.round) return state.round.endsAt
  if (state.phase === 'interlude' && state.interludeUntil !== null) return state.interludeUntil
  return null
}

/** That time passed: a round cap fails the unfinished boards; an interlude starts the next round. */
export function expire(state: WordyState, now: number, _rng: Rng): WordyState {
  if (state.phase === 'round' && state.round) {
    const boards: Record<number, Board> = {}
    for (const [s, b] of Object.entries(state.round.boards)) boards[Number(s)] = boardDone(b) ? b : { ...b, failed: true }
    return endRound({ ...state, round: { ...state.round, boards } }, now)
  }
  if (state.phase === 'interlude') return startRound(state, state.history.length, now)
  return state
}

export function viewFor(state: WordyState, seat: number): WordyView {
  const lastHist = state.history[state.history.length - 1] ?? null
  return {
    you: seat,
    players: state.players,
    rounds: state.rounds,
    roundsPlayed: state.history.length,
    phase: state.phase,
    round: state.round
      ? {
          index: state.round.index,
          startedAt: state.round.startedAt,
          endsAt: state.round.endsAt,
          boards: Object.fromEntries(
            Object.entries(state.round.boards).map(([s, b]) => [s, viewBoard(b, Number(s) === seat, state.round!.startedAt)]),
          ),
        }
      : null,
    interludeUntil: state.interludeUntil,
    lastRound: lastHist ? { answer: lastHist.answer, scores: lastHist.scores, boards: state.lastBoards ?? {} } : null,
    totals: state.totals,
    winner: state.winner,
  }
}

function roundEvents(before: WordyState, after: WordyState): WordyEvent[] {
  const out: WordyEvent[] = []
  if (after.history.length > before.history.length) {
    const h = after.history[after.history.length - 1]!
    out.push({ kind: 'roundEnded', index: after.history.length - 1, answer: h.answer, scores: h.scores })
  }
  if (after.phase === 'ended' && before.phase !== 'ended') out.push({ kind: 'matchEnded', winner: after.winner })
  return out
}

/** Events for the seat's own guess (marks only; letters never travel in events). */
export function guessEvents(before: WordyState, after: WordyState, seat: number): WordyEvent[] {
  const out: WordyEvent[] = []
  const b = after.round?.boards[seat] ?? after.lastBoardsRaw?.[seat]
  const prev = before.round?.boards[seat]
  const last = b?.guesses[prev?.guesses.length ?? 0]
  if (last) out.push({ kind: 'guess', seat, marks: last.marks })
  if (b && b.solvedAt !== null && prev?.solvedAt === null)
    out.push({ kind: 'solved', seat, guesses: b.guesses.length, solveMs: b.solvedAt - (before.round?.startedAt ?? 0) })
  if (b?.failed && !prev?.failed) out.push({ kind: 'failed', seat })
  return [...out, ...roundEvents(before, after)]
}

/** Events for a deadline passing. */
export function expireEvents(before: WordyState, after: WordyState): WordyEvent[] {
  return roundEvents(before, after)
}

export function placements(state: WordyState): { seat: number; placement: number; winner: boolean; stats: Record<string, unknown> }[] {
  const seats = Object.keys(state.totals).map(Number)
  seats.sort((a, b) => {
    const A = state.totals[a]!
    const B = state.totals[b]!
    return B.points - A.points || A.guesses - B.guesses || (A.lastSolveAt ?? Infinity) - (B.lastSolveAt ?? Infinity) || a - b
  })
  return seats.map((seat, i) => {
    const t = state.totals[seat]!
    return {
      seat,
      placement: i + 1,
      winner: state.winner === seat,
      stats: { points: t.points, solves: t.solves, guesses: t.guesses, avgGuesses: t.solves ? Math.round((t.guesses / t.solves) * 10) / 10 : null },
    }
  })
}
