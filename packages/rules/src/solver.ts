import { markGuess, type Mark } from './marks'
import { ANSWERS } from './words'
import type { Rng } from './match'

/** Test-only bot brain: a candidate from the answer list consistent with every mark so far. */
export function solverGuess(history: readonly { word: string; marks: readonly Mark[] }[], rng: Rng): string {
  if (history.length === 0) return 'crane'
  const fits = (candidate: string) =>
    history.every((h) => {
      const m = markGuess(h.word, candidate)
      return m.every((mark, i) => mark === h.marks[i])
    })
  const candidates = ANSWERS.filter(fits)
  if (candidates.length === 0) return ANSWERS[Math.floor(rng.next() * ANSWERS.length)]!
  return candidates[Math.floor(rng.next() * candidates.length)]!
}
