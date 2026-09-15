import { describe, expect, it } from 'vitest'
import { humanTarget, inviteLink, maxBots, seatLabel, startPlan, tableSummary } from '../src/ui/waitingRoomLogic'

describe('inviteLink', () => {
  it('is the ?join= deep link App.tsx accepts', () => {
    expect(inviteLink('https://play.example', 'ABCD')).toBe('https://play.example/?join=ABCD')
  })
})

describe('humanTarget', () => {
  it('is the seats bots do not fill', () => {
    expect(humanTarget(4, 3)).toBe(1)
    expect(humanTarget(4, 0)).toBe(4)
    expect(humanTarget(null, 0)).toBe(0)
  })
})

describe('startPlan (mirrors the object: open seats are dropped, bots only fill a room that asked for them)', () => {
  it('is hidden for everyone but the host, and until the table is known', () => {
    expect(startPlan({ isHost: false, seated: 3, targetPlayers: 4, botCount: 0 })).toEqual({ kind: 'hidden' })
    expect(startPlan({ isHost: true, seated: 1, targetPlayers: null, botCount: 0 })).toEqual({ kind: 'hidden' })
  })
  it('makes the host alone at the table wait for a real second player', () => {
    expect(startPlan({ isHost: true, seated: 1, targetPlayers: 4, botCount: 0 })).toEqual({ kind: 'wait', need: 1 })
    expect(startPlan({ isHost: true, seated: 0, targetPlayers: 2, botCount: 0 })).toEqual({ kind: 'wait', need: 2 })
  })
  it('lets the host start once someone else is here; the empty seats are dropped, not filled', () => {
    expect(startPlan({ isHost: true, seated: 2, targetPlayers: 4, botCount: 0 })).toEqual({ kind: 'ready', fill: 0 })
    expect(startPlan({ isHost: true, seated: 5, targetPlayers: 8, botCount: 0 })).toEqual({ kind: 'ready', fill: 0 })
  })
  it('a room created with test bots keeps the old fill-the-table behaviour', () => {
    expect(startPlan({ isHost: true, seated: 1, targetPlayers: 4, botCount: 2 })).toEqual({ kind: 'ready', fill: 3 })
    expect(startPlan({ isHost: true, seated: 2, targetPlayers: 4, botCount: 1 })).toEqual({ kind: 'ready', fill: 2 })
  })
})

describe('maxBots', () => {
  it('leaves a seat for everyone already here and one for the host', () => {
    expect(maxBots(4, 2)).toBe(2)
    expect(maxBots(4, 1)).toBe(3)
    expect(maxBots(3, 3)).toBe(0)
    expect(maxBots(8, 1)).toBe(7)
    expect(maxBots(4, 0)).toBe(3)
  })
})

describe('tableSummary', () => {
  it('reads as a sentence fragment for the non-host view', () => {
    expect(tableSummary(4, 1)).toBe('4 players, 1 bot')
    expect(tableSummary(3, 0)).toBe('3 players, no bots')
    expect(tableSummary(5, 2)).toBe('5 players, 2 bots')
  })
})

describe('seatLabel', () => {
  it('uses the name when there is one, Player N otherwise', () => {
    expect(seatLabel(['Ayo', ''], 0)).toBe('Ayo')
    expect(seatLabel(['Ayo', ''], 1)).toBe('Player 2')
    expect(seatLabel([], 3)).toBe('Player 4')
  })
})
