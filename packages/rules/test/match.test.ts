import { describe, expect, it } from 'vitest'
import { applyGuess, createMatch, deadline, endRound, expire, placements, viewFor, type WordyState } from '../src/match'
import { ANSWERS } from '../src/words'

const rng = (seed: number) => {
  let a = seed >>> 0
  return { next: () => ((a = (a * 1664525 + 1013904223) >>> 0) / 4294967296) }
}
const T0 = 1_000_000

function fresh(players = 3, knobs = {}): WordyState {
  return createMatch(players, 42, T0, rng(42), { rounds: 2, roundMs: 1000, interludeMs: 100, ...knobs })
}
const answerOf = (s: WordyState) => s.round!.answer

describe('createMatch', () => {
  it('starts round 1 at once with a distinct answer per round and a deadline', () => {
    const s = fresh()
    expect(s.phase).toBe('round')
    expect(s.round).toMatchObject({ index: 0, startedAt: T0, endsAt: T0 + 1000 })
    expect(ANSWERS).toContain(answerOf(s))
    expect(new Set(s.answers).size).toBe(2)
    expect(deadline(s)).toBe(T0 + 1000)
    expect(Object.keys(s.round!.boards)).toEqual(['0', '1', '2'])
  })
  it('is deterministic for a seed', () => {
    expect(answerOf(createMatch(3, 7, T0, rng(7)))).toBe(answerOf(createMatch(3, 7, T0, rng(7))))
  })
})

describe('applyGuess', () => {
  it('refuses words outside the dictionary, wrong lengths, and guesses after a board is done', () => {
    const s = fresh()
    expect(applyGuess(s, 0, 'zzzzz', T0 + 1)).toMatchObject({ code: 'NOT_A_WORD' })
    expect(applyGuess(s, 0, 'hous', T0 + 1)).toMatchObject({ code: 'NOT_A_WORD' })
    const solved = applyGuess(s, 0, answerOf(s), T0 + 5) as WordyState
    expect(applyGuess(solved, 0, 'house', T0 + 6)).toMatchObject({ code: 'BOARD_DONE' })
  })
  it('records marks and the arrival time; solving stamps solvedAt; six misses fail the board', () => {
    let s = fresh()
    const a = answerOf(s)
    const wrong = ANSWERS.find((w) => w !== a)!
    s = applyGuess(s, 1, wrong.toUpperCase(), T0 + 10) as WordyState
    expect(s.round!.boards[1]!.guesses[0]).toMatchObject({ word: wrong, at: T0 + 10 })
    expect(s.round!.boards[1]!.guesses[0]!.marks).toHaveLength(5)
    s = applyGuess(s, 0, a, T0 + 20) as WordyState
    expect(s.round!.boards[0]!.solvedAt).toBe(T0 + 20)
    for (let i = 1; i < 6; i++) s = applyGuess(s, 1, wrong, T0 + 30 + i) as WordyState
    expect(s.round!.boards[1]!.failed).toBe(true)
  })
  it('ends the round when every board is done, scores it, and opens the interlude', () => {
    let s = fresh(2)
    const a = answerOf(s)
    s = applyGuess(s, 0, a, T0 + 20) as WordyState
    s = applyGuess(s, 1, a, T0 + 30) as WordyState
    expect(s.phase).toBe('interlude')
    expect(s.interludeUntil).toBe(T0 + 30 + 100)
    expect(s.history).toHaveLength(1)
    // seat 0: 1 guess = 6 points, placed first of 2 = 2 points
    expect(s.history[0]!.scores[0]).toEqual({ guesses: 1, solveMs: 20, guessPoints: 6, placementPoints: 2 })
    expect(s.history[0]!.scores[1]).toEqual({ guesses: 1, solveMs: 30, guessPoints: 6, placementPoints: 1 })
    expect(s.totals[0]).toMatchObject({ points: 8, guesses: 1, solves: 1 })
    expect(deadline(s)).toBe(T0 + 130)
  })
})

describe('expire and endRound', () => {
  it('the cap fails unfinished boards and scores the round', () => {
    let s = fresh(2)
    s = applyGuess(s, 0, answerOf(s), T0 + 20) as WordyState
    s = expire(s, T0 + 1000, rng(1))
    expect(s.phase).toBe('interlude')
    expect(s.history[0]!.scores[1]).toEqual({ guesses: null, solveMs: null, guessPoints: 0, placementPoints: 0 })
  })
  it('the interlude expiring starts the next round; after the last round the match ends with a winner', () => {
    let s = fresh(2)
    const first = answerOf(s)
    s = endRound(s, T0 + 50)
    s = expire(s, T0 + 150, rng(1))
    expect(s.phase).toBe('round')
    expect(s.round!.index).toBe(1)
    const second = answerOf(s)
    expect(second).not.toBe(first)
    s = applyGuess(s, 0, second, T0 + 160) as WordyState
    s = applyGuess(s, 1, second, T0 + 170) as WordyState
    expect(s.phase).toBe('ended')
    expect(s.winner).toBe(0)
    expect(deadline(s)).toBeNull()
    const p = placements(s)
    expect(p[0]).toMatchObject({ seat: 0, placement: 1, winner: true })
    expect(p[0]!.stats).toMatchObject({ points: expect.any(Number), solves: 1, guesses: 1 })
  })
  it('a tie on points breaks on fewer total guesses', () => {
    let s = fresh(2, { rounds: 1 })
    const a = answerOf(s)
    const wrong = ANSWERS.find((w) => w !== a)!
    // seat 0 solves in 2 (5 pts) and places first (2): 7. seat 1 solves in 1 (6) and places second (1): 7.
    s = applyGuess(s, 0, wrong, T0 + 1) as WordyState
    s = applyGuess(s, 0, a, T0 + 2) as WordyState
    s = applyGuess(s, 1, a, T0 + 3) as WordyState
    expect(s.phase).toBe('ended')
    expect(s.winner).toBe(1)
  })
})

describe('viewFor', () => {
  it('hides the answer and other players letters while the round runs, reveals both after', () => {
    let s = fresh(2)
    const a = answerOf(s)
    s = applyGuess(s, 1, a, T0 + 5) as WordyState
    const v = viewFor(s, 0)
    expect(JSON.stringify(v)).not.toContain(a)
    expect(v.round!.boards[1]!.guesses[0]!.word).toBeNull()
    expect(v.round!.boards[1]!.guesses[0]!.marks).toEqual(['ok', 'ok', 'ok', 'ok', 'ok'])
    expect(v.roundsPlayed).toBe(0)
    s = applyGuess(s, 0, a, T0 + 9) as WordyState
    const after = viewFor(s, 0)
    expect(after.phase).toBe('interlude')
    expect(after.roundsPlayed).toBe(1)
    expect(after.lastRound!.answer).toBe(a)
    expect(after.lastRound!.boards[1]!.guesses[0]!.word).toBe(a)
  })
})
