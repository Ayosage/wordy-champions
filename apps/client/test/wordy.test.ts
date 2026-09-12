import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useWordyStore } from '../src/store'
import { tokenStorage } from '../src/net/tokenStorage'
import { configureLobby, createWordyMatch, describeJoinError, joinWordyMatch, reconnectWordy, sendGuess, startMatch } from '../src/net/wordy'
import { FakeWs } from './fakeWs'

const lobby = () => ({ phase: 'waiting', seats: ['seat-0'], connected: [true], targetPlayers: 4, botCount: 0, seatNames: [] })
const calls: { url: string; init?: RequestInit }[] = []
function stubFetch(routes: Record<string, () => Response>) {
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    calls.push({ url, init })
    const key = `${init?.method ?? 'GET'} ${new URL(url).pathname}`
    return routes[key]?.() ?? new Response('not found', { status: 404 })
  })
}
function welcomeAll(seat = 0, token = 'tok-1') {
  FakeWs.script = (ws) => {
    ws.open()
    ws.receive({ t: 'welcome', seat, token })
  }
}
const emptyBoard = { guesses: [], solved: false, failed: false, solveMs: null }
const view = (phase = 'round') => ({
  you: 0, players: 2, rounds: 6, roundsPlayed: 0, phase, interludeUntil: null, lastRound: null, winner: null,
  round: { index: 0, startedAt: 0, endsAt: 180_000, boards: { 0: emptyBoard, 1: emptyBoard } },
  totals: { 0: { points: 0, guesses: 0, solves: 0, lastSolveAt: null }, 1: { points: 0, guesses: 0, solves: 0, lastSolveAt: null } },
})

beforeEach(() => {
  useWordyStore.getState().reset()
  tokenStorage.clearFor('ROOM1')
  tokenStorage.clearFor('old-room')
  FakeWs.reset()
  calls.length = 0
  vi.stubGlobal('WebSocket', FakeWs)
  stubFetch({
    'POST /matches/open': () => Response.json({ code: 'ROOM1', joinUrl: 'http://x/?join=ROOM1' }, { status: 201 }),
    'GET /matches/ROOM1': () => Response.json(lobby()),
  })
})
afterEach(() => vi.unstubAllGlobals())

describe('wordy net', () => {
  it('createWordyMatch opens a room, dials it, and persists the token', async () => {
    welcomeAll()
    await createWordyMatch(4, 0)
    expect(calls[0]?.url).toMatch(/\/matches\/open$/)
    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual({ players: 4, bots: 0, knobs: {} })
    expect(useWordyStore.getState()).toMatchObject({ roomId: 'ROOM1', seat: 0, status: 'waiting' })
    expect(tokenStorage.getFor('ROOM1')).toBe('tok-1')
  })
  it('lobby, snapshot, error and ended messages land in the store', async () => {
    welcomeAll()
    await createWordyMatch(2, 0)
    FakeWs.last.receive({ t: 'lobby', ...lobby(), seats: ['seat-0', 'seat-1'], connected: [true, true] })
    expect(useWordyStore.getState().seats).toEqual(['seat-0', 'seat-1'])
    FakeWs.last.receive({ t: 'snapshot', seq: 0, view: view() })
    expect(useWordyStore.getState().status).toBe('playing')
    FakeWs.last.receive({ t: 'error', code: 'NOT_A_WORD', message: 'That is not in the word list.' })
    expect(useWordyStore.getState().toast).toBe('That is not in the word list.')
    expect(useWordyStore.getState().shake).toBe(1)
    FakeWs.last.receive({ t: 'ended', reason: 'win', winner: 1 })
    expect(useWordyStore.getState().status).toBe('ended')
    expect(tokenStorage.getFor('ROOM1')).toBeNull()
  })
  it('sendGuess, configureLobby and startMatch go out as envelopes', async () => {
    welcomeAll()
    await createWordyMatch(2, 0)
    sendGuess('crane')
    configureLobby(3, 0)
    startMatch()
    expect(FakeWs.last.sentMessages().slice(1)).toEqual([
      { t: 'intent', intent: { type: 'guess', word: 'crane' } },
      { t: 'configure', players: 3, bots: 0 },
      { t: 'start' },
    ])
  })
  it('joinWordyMatch probes the lobby and carries ?seat= into hello', async () => {
    vi.stubGlobal('window', { location: { search: '?join=ROOM1&seat=st_x' } })
    welcomeAll(1)
    await joinWordyMatch('room1')
    expect(FakeWs.last.sentMessages()[0]).toEqual({ t: 'hello', seatToken: 'st_x' })
    let err: unknown
    try {
      await joinWordyMatch('ZZZZ')
    } catch (e) {
      err = e
    }
    expect(describeJoinError(err)).toMatch(/No match with that code/)
  })
  it('reconnectWordy retries then clears a dead token', async () => {
    tokenStorage.setFor('old-room', 'old-tok')
    FakeWs.script = (ws) => ws.close(1006)
    expect(await reconnectWordy({ attempts: 2, delayMs: 0 })).toBe(false)
    expect(tokenStorage.getFor('old-room')).toBeNull()
    expect(useWordyStore.getState().status).toBe('idle')
  })
})
