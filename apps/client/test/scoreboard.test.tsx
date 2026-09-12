// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'
import type { Mark } from '@wordy/rules'
import { useWordyStore } from '../src/store'
import { Scoreboard } from '../src/ui/Scoreboard'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
vi.mock('../src/net/wordy', () => ({ leaveMatch: vi.fn() }))

function render(el: React.ReactElement): string {
  const host = document.createElement('div')
  const root = createRoot(host)
  act(() => root.render(el))
  const html = host.innerHTML
  act(() => root.unmount())
  return html
}
const board = (word: string, solved: boolean) => ({ guesses: [{ word, marks: ['ok', 'ok', 'ok', 'ok', 'ok'] as Mark[] }], solved, failed: !solved, solveMs: solved ? 4100 : null })

describe('Scoreboard', () => {
  it('between rounds: the answer, revealed boards, round points, totals, and the countdown', () => {
    const s = useWordyStore.getState()
    s.reset()
    s.setSeat(0)
    s.setLobby(['seat-0', 'seat-1'], [true, true], 2, 0, ['Ayo', 'Fay'])
    s.ingestSnapshot(3, {
      you: 0, players: 2, rounds: 6, roundsPlayed: 1, phase: 'interlude', round: null, interludeUntil: Date.now() + 8000, winner: null,
      lastRound: { answer: 'blunt', scores: { 0: { guesses: 1, solveMs: 4100, guessPoints: 6, placementPoints: 2 }, 1: { guesses: null, solveMs: null, guessPoints: 0, placementPoints: 0 } }, boards: { 0: board('blunt', true), 1: board('crane', false) } },
      totals: { 0: { points: 8, guesses: 1, solves: 1, lastSolveAt: 1 }, 1: { points: 0, guesses: 1, solves: 0, lastSolveAt: null } },
    })
    const html = render(<Scoreboard />)
    expect(html).toContain('BLUNT')
    expect(html).toContain('6 + 2')
    expect(html).toContain('Round 1')
    expect(html).toContain('Ayo')
    expect(html).toContain('data-testid="countdown"')
    expect(html).not.toContain('data-testid="back-to-lobby"')
  })
  it('at the end: the winner and a way out', () => {
    const s = useWordyStore.getState()
    s.reset()
    s.setSeat(1)
    s.setLobby(['seat-0', 'seat-1'], [true, true], 2, 0, ['Ayo', 'Fay'])
    s.ingestSnapshot(9, {
      you: 1, players: 2, rounds: 1, roundsPlayed: 1, phase: 'ended', round: null, interludeUntil: null, winner: 0,
      lastRound: { answer: 'blunt', scores: {}, boards: {} },
      totals: { 0: { points: 8, guesses: 1, solves: 1, lastSolveAt: 1 }, 1: { points: 0, guesses: 6, solves: 0, lastSolveAt: null } },
    })
    const html = render(<Scoreboard />)
    expect(html).toContain('Ayo</span> wins')
    expect(html).toContain('data-testid="back-to-lobby"')
    expect(html).toContain('data-testid="final-standings"')
  })
})
