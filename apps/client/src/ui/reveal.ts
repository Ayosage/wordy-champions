import { useEffect, useState } from 'react'

/** Gap between one tile starting its flip and the next; the flip itself. */
export const REVEAL_STAGGER_MS = 250
export const REVEAL_FLIP_MS = 450

/** When the last tile of a five-tile row has landed. */
export const REVEAL_DONE_MS = REVEAL_STAGGER_MS * 4 + REVEAL_FLIP_MS

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * How many of `count` guesses have finished revealing. Lags one reveal behind a
 * new guess so the keyboard and the done note wait for the last tile to land;
 * a drop in `count` (a new round) snaps down at once.
 */
export function useSettled(count: number): number {
  const [settled, setSettled] = useState(count)
  useEffect(() => {
    if (count <= settled) {
      if (count < settled) setSettled(count)
      return
    }
    if (prefersReducedMotion()) {
      setSettled(count)
      return
    }
    const id = setTimeout(() => setSettled(count), REVEAL_DONE_MS)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count])
  return settled
}
