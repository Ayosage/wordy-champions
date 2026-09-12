import { describe, expect, it } from 'vitest'
import { solveTime, standings } from '../src/ui/scoreboardLogic'

describe('standings', () => {
  it('sorts by points, then fewer guesses, and names seats', () => {
    const rows = standings(
      { 0: { points: 31, guesses: 9, solves: 3, lastSolveAt: 5 }, 1: { points: 38, guesses: 7, solves: 3, lastSolveAt: 4 }, 2: { points: 31, guesses: 8, solves: 3, lastSolveAt: 6 } },
      ['Ayo', '', 'Fay'],
    )
    expect(rows.map((r) => r.seat)).toEqual([1, 2, 0])
    expect(rows[0]!.name).toBe('Player 2')
    expect(rows[2]!.name).toBe('Ayo')
  })
})

describe('solveTime', () => {
  it('formats m:ss and names a failed board', () => {
    expect(solveTime(4100)).toBe('0:04')
    expect(solveTime(61_400)).toBe('1:01')
    expect(solveTime(null)).toBe('failed')
  })
})
