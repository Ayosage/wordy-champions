import { create } from 'zustand'
import type { WordyView } from '@wordy/rules'

export type Status = 'idle' | 'connecting' | 'waiting' | 'playing' | 'ended' | 'reconnecting' | 'error'

interface WordyStore {
  status: Status
  roomId: string | null
  seat: number | null
  seq: number
  view: WordyView | null
  seats: string[]
  connected: boolean[]
  seatNames: string[]
  targetPlayers: number | null
  botCount: number
  toast: string | null
  toastSeq: number
  /** The letters typed into the current row, before Enter. */
  draft: string
  /** Bumps when a guess is refused so the row can shake. */
  shake: number
  ended: { reason: 'win' | 'forfeit' | 'abandoned'; winner: number | null } | null

  setStatus(status: Status): void
  setJoined(roomId: string): void
  setSeat(seat: number): void
  setLobby(seats: string[], connected: boolean[], targetPlayers: number, botCount: number, seatNames?: string[]): void
  ingestSnapshot(seq: number, view: WordyView): void
  setToast(message: string | null): void
  ruleError(message: string): void
  setEnded(reason: 'win' | 'forfeit' | 'abandoned', winner: number | null): void
  typeLetter(c: string): void
  backspace(): void
  clearDraft(): void
  reset(): void
}

const INITIAL = {
  status: 'idle' as Status,
  roomId: null as string | null,
  seat: null as number | null,
  seq: -1,
  view: null as WordyView | null,
  seats: [] as string[],
  connected: [] as boolean[],
  seatNames: [] as string[],
  targetPlayers: null as number | null,
  botCount: 0,
  toast: null as string | null,
  toastSeq: 0,
  draft: '',
  shake: 0,
  ended: null as WordyStore['ended'],
}

export const useWordyStore = create<WordyStore>((set, get) => ({
  ...INITIAL,
  setStatus: (status) => set({ status }),
  setJoined: (roomId) => set({ roomId, status: 'waiting' }),
  setSeat: (seat) => set({ seat }),
  setLobby: (seats, connected, targetPlayers, botCount, seatNames = []) => set({ seats, connected, targetPlayers, botCount, seatNames }),
  ingestSnapshot: (seq, view) => {
    const { view: prev, seat, draft } = get()
    if (prev !== null && seq <= get().seq) return
    const me = seat ?? -1
    const mine = view.round?.boards[me]?.guesses.length ?? 0
    const prevMine = prev?.round?.boards[me]?.guesses.length ?? 0
    // a new round, a round ending, or our own guess landing clears what was being typed
    const clear = prev?.round?.index !== view.round?.index || prev?.phase !== view.phase || mine > prevMine
    set({ seq, view, status: view.phase === 'ended' ? 'ended' : 'playing', draft: clear ? '' : draft })
  },
  setToast: (toast) => set(toast === null ? { toast } : { toast, toastSeq: get().toastSeq + 1 }),
  ruleError: (message) => set({ toast: message, toastSeq: get().toastSeq + 1, shake: get().shake + 1 }),
  setEnded: (reason, winner) => set({ ended: { reason, winner }, status: 'ended' }),
  typeLetter: (c) => {
    const d = get().draft
    if (d.length >= 5 || !/^[a-z]$/i.test(c)) return
    set({ draft: d + c.toLowerCase() })
  },
  backspace: () => set({ draft: get().draft.slice(0, -1) }),
  clearDraft: () => set({ draft: '' }),
  reset: () => set({ ...INITIAL }),
}))
