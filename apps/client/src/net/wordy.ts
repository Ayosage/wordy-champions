import type { ClientEnvelope, ServerEnvelope } from '@ayosage/match-core/envelope'
import { MatchSocket, httpOrigin, wsUrl } from '@ayosage/match-core/client'
import type { WordyView } from '@wordy/rules'
import { useWordyStore } from '../store'
import { tokenStorage } from './tokenStorage'

/** The Worker's origin. http(s) for the create/lookup calls; the socket url is derived from it. */
const SERVER_ORIGIN: string = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:8787'
const HTTP = httpOrigin(SERVER_ORIGIN)

type Hello = Extract<ClientEnvelope, { t: 'hello' }>

let socket: MatchSocket | null = null
let currentCode: string | null = null

/** The object refused to seat us; `code` is the protocol error code. */
class JoinRefused extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message)
  }
}

function param(name: string): string | null {
  if (typeof window === 'undefined') return null
  return new URLSearchParams(window.location.search).get(name)
}

function numberParam(name: string): number | undefined {
  const raw = param(name)
  if (raw === null) return undefined
  const value = Number(raw)
  return Number.isFinite(value) ? value : undefined
}

/** Test knobs ride in the create body; the Worker ignores them unless TEST_KNOBS=1. */
export async function createWordyMatch(players: number, bots: number): Promise<void> {
  useWordyStore.getState().setStatus('connecting')
  const knobs: Record<string, number> = {}
  for (const k of ['seed', 'rounds', 'roundMs', 'interludeMs'] as const) {
    const v = numberParam(k)
    if (v !== undefined) knobs[k] = v
  }
  const res = await fetch(`${HTTP}/matches/open`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ players, bots, knobs }),
  })
  if (res.status !== 201) {
    let detail = `create failed (${res.status})`
    try {
      const body = (await res.json()) as { error?: string }
      if (body.error) detail = body.error
    } catch {
      // keep the status text
    }
    throw new JoinRefused('CREATE_FAILED', detail)
  }
  const { code } = (await res.json()) as { code: string }
  await enterRoom(code, { t: 'hello' })
}

/** ?join=CODE from a launch link: normalized room code, or null. */
export function launchJoinCode(search: string): string | null {
  const raw = new URLSearchParams(search).get('join')?.trim().toUpperCase() ?? ''
  return /^[A-Z0-9]{1,12}$/.test(raw) ? raw : null
}

/** One sentence for the lobby's error line. */
export function describeJoinError(e: unknown): string {
  const err = e as { code?: unknown; message?: unknown } | null
  const code = err?.code
  const message = typeof err?.message === 'string' ? err.message : ''
  if (code === 'FULL') return 'That match is full.'
  if (code === 'NOT_WAITING') return 'That match has already started.'
  if (code === 'CREATE_FAILED') return `Could not create the match: ${message}`
  if (code === 'NOT_FOUND' || /not found|no such match/i.test(message)) {
    return 'No match with that code. Check the four letters and try again.'
  }
  return 'Could not reach the game server. Check your connection and try again.'
}

/** Shown when a `?join=` link points at a room that has ended or expired. */
export const DEAD_LINK_MESSAGE = 'That match has ended or the link has expired.'

export async function joinWordyMatch(code: string): Promise<void> {
  useWordyStore.getState().setStatus('connecting')
  const c = code.toUpperCase()
  // The personal Steward link carries ?seat=<token>; App strips the query right after calling us, so read it now.
  const seatToken = param('seat')
  const probe = await fetch(`${HTTP}/matches/${c}`)
  if (probe.status === 404) throw new JoinRefused('NOT_FOUND', 'no such match (404)')
  if (!probe.ok) throw new Error(`lobby lookup failed (${probe.status})`)
  await enterRoom(c, { t: 'hello', ...(seatToken ? { seatToken } : {}) })
}

export interface ReconnectOptions {
  attempts?: number
  delayMs?: number
}

/** Try to resume via a persisted token for any known room. Clears it if dead. */
export async function reconnectWordy({ attempts = 6, delayMs = 400 }: ReconnectOptions = {}): Promise<boolean> {
  const saved = tokenStorage.getAny()
  if (!saved) return false
  useWordyStore.getState().setStatus('reconnecting')
  let delay = delayMs
  for (let attempt = 1; ; attempt++) {
    try {
      await enterRoom(saved.roomId, { t: 'hello', token: saved.token }, true)
      return true
    } catch (e) {
      if (e instanceof JoinRefused || attempt >= attempts) break
      await new Promise((resolve) => setTimeout(resolve, delay))
      delay = Math.min(5000, delay * 2)
    }
  }
  tokenStorage.clearFor(saved.roomId)
  useWordyStore.getState().setStatus('idle')
  return false
}

export function sendGuess(word: string): void {
  socket?.send({ t: 'intent', intent: { type: 'guess', word } })
}

/** Host only, while waiting: resize the table. */
export function configureLobby(players: number, bots: number): void {
  socket?.send({ t: 'configure', players, bots })
}

/** Host only, while waiting: start with the people present. */
export function startMatch(): void {
  socket?.send({ t: 'start' })
}

export function leaveMatch(): void {
  if (currentCode) tokenStorage.clearFor(currentCode)
  socket?.close()
  socket = null
  currentCode = null
  useWordyStore.getState().reset()
}

async function enterRoom(code: string, hello: Hello, isReconnect = false): Promise<void> {
  const s = new MatchSocket()
  const store = () => useWordyStore.getState()
  let welcomed = false
  const welcome = new Promise<void>((resolve, reject) => {
    s.onMessage((m) => {
      if (welcomed) return
      if (m.t === 'welcome') {
        welcomed = true
        tokenStorage.setFor(code, m.token)
        store().setJoined(code)
        store().setSeat(m.seat)
        if (isReconnect) store().setStatus('reconnecting')
        resolve()
      } else if (m.t === 'error') {
        reject(new JoinRefused(m.code, m.message))
      }
    })
    s.onClose((c) => {
      if (!welcomed) reject(new Error(`socket closed before welcome (${c})`))
    })
  })
  welcome.catch(() => undefined)
  s.onMessage((m) => {
    if (welcomed) handleMessage(m)
  })
  s.onClose(() => {
    if (socket !== s) return
    if (store().status === 'ended' || store().status === 'idle') return
    void reconnectWordy().then((ok) => {
      if (!ok) {
        store().setToast('Connection to the match was lost.')
        store().setStatus('error')
      }
    })
  })
  try {
    await s.connect(wsUrl(SERVER_ORIGIN, code), hello)
    await welcome
  } catch (e) {
    s.close()
    throw e
  }
  const previous = socket
  socket = s
  currentCode = code
  if (previous && previous !== s) previous.close()
}

function handleMessage(m: ServerEnvelope): void {
  const store = useWordyStore.getState()
  switch (m.t) {
    case 'lobby':
      store.setLobby(m.seats, m.connected, m.targetPlayers, m.botCount, m.seatNames)
      if (m.phase === 'waiting') store.setStatus('waiting')
      break
    case 'snapshot':
      store.ingestSnapshot(m.seq, m.view as WordyView)
      break
    case 'error':
      store.ruleError(m.message)
      break
    case 'ended':
      if (currentCode) tokenStorage.clearFor(currentCode)
      store.setEnded(m.reason, m.winner)
      break
    case 'welcome':
      store.setSeat(m.seat)
      break
  }
}
