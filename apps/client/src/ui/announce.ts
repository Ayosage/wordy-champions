import type { Mark } from '@wordy/rules'

const LABEL: Record<Mark, string> = { ok: 'correct', near: 'in the word', miss: 'not in the word' }

/**
 * What a screen reader hears when a guess finishes flipping. The tiles carry
 * the same words per letter, but nothing moves focus when a row lands, so the
 * result has to be announced as well as labelled.
 */
export function announceGuess(guess: { word: string | null; marks: readonly Mark[] } | null | undefined): string {
  if (!guess?.word) return ''
  const letters = guess.word.toUpperCase().split('')
  const read = letters.map((letter, i) => {
    const mark = guess.marks[i]
    return mark ? `${letter} ${LABEL[mark]}` : letter
  })
  return `${letters.join('')}: ${read.join(', ')}.`
}
