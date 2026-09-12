import type { WordyView } from '@wordy/rules'
import { seatLabel } from './waitingRoomLogic'

export interface StandingRow {
  seat: number
  name: string
  points: number
  guesses: number
  lastSolveAt: number | null
}

/** Same order as the rules' placements: points, fewer guesses, earlier last solve, seat. */
export function standings(totals: WordyView['totals'], seatNames: readonly string[]): StandingRow[] {
  return Object.entries(totals)
    .map(([s, t]) => ({ seat: Number(s), name: seatLabel(seatNames, Number(s)), points: t.points, guesses: t.guesses, lastSolveAt: t.lastSolveAt }))
    .sort((a, b) => b.points - a.points || a.guesses - b.guesses || (a.lastSolveAt ?? Infinity) - (b.lastSolveAt ?? Infinity) || a.seat - b.seat)
}

export function solveTime(ms: number | null): string {
  if (ms === null) return 'failed'
  const s = Math.round(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
