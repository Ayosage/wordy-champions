/** Solve on try n scores 7 - n; a fail scores nothing. */
export function guessPoints(guesses: number | null): number {
  return guesses === null ? 0 : 7 - guesses
}

/**
 * Solvers ranked by fewest guesses, then fastest. First place is worth the
 * number of players, each place after one fewer. Equal (guesses, time) share
 * the higher value. Fails score 0.
 */
export function placementPoints(
  entries: readonly { seat: number; guesses: number | null; solveMs: number | null }[],
  players: number,
): Record<number, number> {
  const out: Record<number, number> = {}
  const solvers = entries
    .filter((e): e is { seat: number; guesses: number; solveMs: number } => e.guesses !== null && e.solveMs !== null)
    .sort((a, b) => a.guesses - b.guesses || a.solveMs - b.solveMs)
  let rank = 0
  for (let i = 0; i < solvers.length; i++) {
    const s = solvers[i]!
    const prev = solvers[i - 1]
    if (!prev || prev.guesses !== s.guesses || prev.solveMs !== s.solveMs) rank = i + 1
    out[s.seat] = Math.max(0, players - rank + 1)
  }
  for (const e of entries) if (out[e.seat] === undefined) out[e.seat] = 0
  return out
}
