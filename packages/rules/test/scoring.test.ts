import { describe, expect, it } from 'vitest'
import { guessPoints, placementPoints } from '../src/scoring'

describe('guessPoints', () => {
  it('pays 7 minus the try, nothing for a fail', () => {
    expect([1, 2, 3, 4, 5, 6].map(guessPoints)).toEqual([6, 5, 4, 3, 2, 1])
    expect(guessPoints(null)).toBe(0)
  })
})

describe('placementPoints', () => {
  it('ranks solvers by guesses then time; first gets the player count; fails get 0', () => {
    const pts = placementPoints(
      [
        { seat: 0, guesses: 3, solveMs: 70_000 },
        { seat: 1, guesses: 2, solveMs: 41_000 },
        { seat: 2, guesses: 3, solveMs: 86_000 },
        { seat: 3, guesses: null, solveMs: null },
      ],
      4,
    )
    expect(pts).toEqual({ 1: 4, 0: 3, 2: 2, 3: 0 })
  })
  it('ties on both keys share the higher points', () => {
    const pts = placementPoints(
      [
        { seat: 0, guesses: 2, solveMs: 10_000 },
        { seat: 1, guesses: 2, solveMs: 10_000 },
        { seat: 2, guesses: 4, solveMs: 5_000 },
      ],
      3,
    )
    expect(pts).toEqual({ 0: 3, 1: 3, 2: 1 })
  })
})
