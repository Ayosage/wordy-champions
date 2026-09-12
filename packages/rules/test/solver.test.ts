import { describe, expect, it } from 'vitest'
import { markGuess } from '../src/marks'
import { solverGuess } from '../src/solver'
import { ANSWERS, isWord } from '../src/words'

const rng = { next: () => 0.5 }

function play(answer: string) {
  const history: { word: string; marks: ReturnType<typeof markGuess> }[] = []
  for (let i = 0; i < 6; i++) {
    const g = solverGuess(history, rng)
    if (!isWord(g)) throw new Error(`not a word: ${g}`)
    history.push({ word: g, marks: markGuess(g, answer) })
    if (g === answer) return history
  }
  return null
}

describe('solverGuess', () => {
  it('opens with crane and solves a common word within six real guesses', () => {
    expect(solverGuess([], rng)).toBe('crane')
    const h = play('house')
    expect(h).not.toBeNull()
    expect(h!.length).toBeLessThanOrEqual(6)
  })
  it('solves most answers within six guesses', () => {
    const sample = ANSWERS.filter((_, i) => i % 40 === 0)
    const solved = sample.filter((a) => play(a) !== null).length
    expect(solved / sample.length).toBeGreaterThan(0.9)
  })
})
