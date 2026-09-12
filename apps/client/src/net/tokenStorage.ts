const ROOM_PREFIX = 'wordy:token:'
const LAST_ROOM_KEY = 'wordy:lastRoom'
const memoryByRoom = new Map<string, string>()
let memoryLastRoom: string | null = null

function hasSession(): boolean {
  return typeof sessionStorage !== 'undefined'
}

/** Reconnect tokens keyed by room: sessionStorage in the browser, in-memory in tests. */
export const tokenStorage = {
  setFor(roomId: string, token: string): void {
    if (hasSession()) {
      sessionStorage.setItem(ROOM_PREFIX + roomId, token)
      sessionStorage.setItem(LAST_ROOM_KEY, roomId)
    } else memoryByRoom.set(roomId, token)
    memoryLastRoom = roomId
  },
  getFor(roomId: string): string | null {
    return hasSession() ? sessionStorage.getItem(ROOM_PREFIX + roomId) : (memoryByRoom.get(roomId) ?? null)
  },
  clearFor(roomId: string): void {
    if (hasSession()) {
      sessionStorage.removeItem(ROOM_PREFIX + roomId)
      if (sessionStorage.getItem(LAST_ROOM_KEY) === roomId) sessionStorage.removeItem(LAST_ROOM_KEY)
    }
    memoryByRoom.delete(roomId)
    if (memoryLastRoom === roomId) memoryLastRoom = null
  },
  /** Any persisted room token, most recent first, for auto-resume on load. */
  getAny(): { roomId: string; token: string } | null {
    if (hasSession()) {
      const last = sessionStorage.getItem(LAST_ROOM_KEY)
      if (last) {
        const token = sessionStorage.getItem(ROOM_PREFIX + last)
        if (token) return { roomId: last, token }
      }
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i)
        if (!key?.startsWith(ROOM_PREFIX)) continue
        const token = sessionStorage.getItem(key)
        if (token) return { roomId: key.slice(ROOM_PREFIX.length), token }
      }
      return null
    }
    if (memoryLastRoom) {
      const token = memoryByRoom.get(memoryLastRoom)
      if (token) return { roomId: memoryLastRoom, token }
    }
    for (const [roomId, token] of memoryByRoom) return { roomId, token }
    return null
  },
}
