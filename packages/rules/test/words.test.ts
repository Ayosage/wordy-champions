import { describe, expect, it } from 'vitest'
import { ANSWERS, GUESSES, isWord } from '../src/words'

describe('word lists', () => {
  it('answers are common lowercase five-letter words, plenty of them, no repeats', () => {
    expect(ANSWERS.length).toBeGreaterThan(800)
    for (const w of ANSWERS) expect(w).toMatch(/^[a-z]{5}$/)
    expect(new Set(ANSWERS).size).toBe(ANSWERS.length)
    expect(ANSWERS).toContain('house')
  })
  it('every answer is a valid guess, and the guess list is much larger', () => {
    for (const w of ANSWERS) expect(GUESSES.has(w)).toBe(true)
    expect(GUESSES.size).toBeGreaterThan(8000)
  })
  it('isWord is case-insensitive and rejects junk', () => {
    expect(isWord('HOUSE')).toBe(true)
    expect(isWord('zzzzz')).toBe(false)
    expect(isWord('hous')).toBe(false)
  })
})
