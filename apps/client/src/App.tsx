import { useEffect } from 'react'
import { DEAD_LINK_MESSAGE, joinWordyMatch, launchJoinCode, reconnectWordy } from './net/wordy'
import { useWordyStore } from './store'
import { Lobby } from './ui/Lobby'
import { Round } from './ui/Round'
import { WaitingRoom } from './ui/WaitingRoom'

export function App() {
  const status = useWordyStore((s) => s.status)
  const view = useWordyStore((s) => s.view)

  useEffect(() => {
    const code = launchJoinCode(window.location.search)
    if (code) {
      joinWordyMatch(code).catch(() => {
        useWordyStore.getState().setToast(DEAD_LINK_MESSAGE)
        useWordyStore.getState().setStatus('error')
      })
      // keep test knobs in the url for the E2E; drop the join and seat params so a reload does not rejoin a dead room
      const u = new URL(window.location.href)
      u.searchParams.delete('join')
      u.searchParams.delete('seat')
      window.history.replaceState(null, '', u.pathname + (u.search || ''))
    } else {
      void reconnectWordy()
    }
  }, [])

  if (status === 'idle' || status === 'connecting' || status === 'error') return <Lobby />
  if (status === 'waiting') return <WaitingRoom />
  if (view === null) return <Lobby />
  return <Round />
}
