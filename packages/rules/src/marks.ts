export type Mark = 'ok' | 'near' | 'miss'

const RANK: Record<Mark, number> = { miss: 0, near: 1, ok: 2 }

/** Standard two-pass marking: exact letters first, then remaining copies from the answer's pool. */
export function markGuess(guess: string, answer: string): Mark[] {
  const marks: Mark[] = Array.from({ length: 5 }, () => 'miss')
  const pool: Record<string, number> = {}
  for (let i = 0; i < 5; i++) {
    if (guess[i] === answer[i]) marks[i] = 'ok'
    else pool[answer[i]!] = (pool[answer[i]!] ?? 0) + 1
  }
  for (let i = 0; i < 5; i++) {
    if (marks[i] === 'ok') continue
    const c = guess[i]!
    if ((pool[c] ?? 0) > 0) {
      marks[i] = 'near'
      pool[c]! -= 1
    }
  }
  return marks
}

/** Per-letter keyboard state: the best mark that letter has received across all guesses. */
export function keyStates(guesses: readonly { word: string; marks: readonly Mark[] }[]): Record<string, Mark> {
  const out: Record<string, Mark> = {}
  for (const g of guesses) {
    for (let i = 0; i < 5; i++) {
      const c = g.word[i]!
      const m = g.marks[i]!
      if (out[c] === undefined || RANK[m] > RANK[out[c]!]) out[c] = m
    }
  }
  return out
}
