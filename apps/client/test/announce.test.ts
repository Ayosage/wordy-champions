import { describe, expect, it } from 'vitest'
import { announceGuess } from '../src/ui/announce'

describe('announceGuess', () => {
  it('reads the word and every letter’s mark, so the marks are not colour alone', () => {
    const marks = ['ok', 'near', 'miss', 'miss', 'ok'] as const
    expect(announceGuess({ word: 'crane', marks: [...marks] })).toBe(
      'CRANE: C correct, R in the word, A not in the word, N not in the word, E correct.',
    )
  })
  it('says nothing for an opponent row (no word) or no row at all', () => {
    expect(announceGuess({ word: null, marks: ['ok', 'ok', 'ok', 'ok', 'ok'] })).toBe('')
    expect(announceGuess(undefined)).toBe('')
  })
})
