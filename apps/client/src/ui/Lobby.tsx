import { useState } from 'react'
import { createWordyMatch, describeJoinError, joinWordyMatch } from '../net/wordy'
import { useWordyStore } from '../store'
import { BOT_COUNTS, PLAYER_COUNTS, Segmented } from './Segmented'
import { WaitingRoom } from './WaitingRoom'

/** `?bots=` in the URL is the developer's switch for the test-bot control; the Worker refuses bots anyway unless TEST_KNOBS=1. */
const TEST = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('bots')

export function Lobby() {
  const status = useWordyStore((s) => s.status)
  const toast = useWordyStore((s) => s.toast)
  const setToast = useWordyStore((s) => s.setToast)
  const [code, setCode] = useState('')
  const [players, setPlayers] = useState(4)
  const [bots, setBots] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const busy = status === 'connecting'

  async function withCatch(fn: () => Promise<void>) {
    try {
      setError(null)
      setToast(null)
      await fn()
    } catch (e) {
      setError(describeJoinError(e))
      useWordyStore.getState().setStatus('idle')
    }
  }

  if (status === 'waiting') return <WaitingRoom />

  const shown = error ?? (status === 'error' ? toast : null)
  return (
    <main className="screen">
      <h1 className="wordmark">Wordy<br /><em>Champions</em></h1>
      <p className="small">Same five-letter word for everyone. Fewest guesses wins the round, fastest breaks the tie. Six rounds.</p>
      <fieldset className="field">
        <legend className="label">Players</legend>
        <Segmented label="Players" options={PLAYER_COUNTS} value={players} prefix="players" disabled={busy}
          onChange={(n) => { setPlayers(n); setBots((b) => Math.min(b, n - 1)) }} />
      </fieldset>
      {TEST && (
        <fieldset className="field">
          <legend className="label">Test bots</legend>
          <Segmented label="Bots" options={BOT_COUNTS} value={bots} prefix="bots" disabled={busy} isDisabled={(n) => n > players - 1} onChange={setBots} />
        </fieldset>
      )}
      <button type="button" className="btn primary" data-testid="create-button" disabled={busy} onClick={() => void withCatch(() => createWordyMatch(players, bots))}>
        Create match
      </button>
      <div className="field">
        <label className="label" htmlFor="join-code">Or join with a code</label>
        <input id="join-code" className="input" data-testid="join-input" value={code} maxLength={4} placeholder="ABCD" autoCapitalize="characters" autoComplete="off" spellCheck={false}
          onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
          onKeyDown={(e) => { if (e.key === 'Enter' && code.length === 4 && !busy) void withCatch(() => joinWordyMatch(code)) }} />
        <button type="button" className="btn quiet" data-testid="join-button" disabled={busy || code.length !== 4} onClick={() => void withCatch(() => joinWordyMatch(code))}>
          Join
        </button>
      </div>
      {shown && <p className="small" role="alert" data-testid="lobby-error">{shown}</p>}
    </main>
  )
}
