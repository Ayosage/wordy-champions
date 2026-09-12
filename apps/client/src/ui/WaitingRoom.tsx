import { useState } from 'react'
import { configureLobby, leaveMatch, startMatch } from '../net/wordy'
import { useWordyStore } from '../store'
import { BOT_COUNTS, PLAYER_COUNTS, Segmented } from './Segmented'
import { humanTarget, inviteLink, maxBots, seatLabel, startPlan, tableSummary } from './waitingRoomLogic'

function useCopy(): [string | null, (what: string, text: string) => void] {
  const [copied, setCopied] = useState<string | null>(null)
  return [
    copied,
    (what, text) => {
      void navigator.clipboard?.writeText(text).then(() => {
        setCopied(what)
        setTimeout(() => setCopied(null), 1500)
      })
    },
  ]
}

export function WaitingRoom() {
  const roomId = useWordyStore((s) => s.roomId)
  const seat = useWordyStore((s) => s.seat)
  const seats = useWordyStore((s) => s.seats)
  const connected = useWordyStore((s) => s.connected)
  const targetPlayers = useWordyStore((s) => s.targetPlayers)
  const botCount = useWordyStore((s) => s.botCount)
  const seatNames = useWordyStore((s) => s.seatNames)
  const [copied, copy] = useCopy()

  const code = roomId ?? ''
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const humans = humanTarget(targetPlayers, botCount)
  const isHost = seat === 0
  const table = targetPlayers ?? 4
  const start = startPlan({ isHost, seated: seats.length, targetPlayers, botCount })
  const botCap = maxBots(table, seats.length)
  const seated = seats.length

  return (
    <main className="screen">
      <h1 className="wordmark" style={{ fontSize: 28 }}>Wordy <em>Champions</em></h1>
      <section aria-labelledby="wr-code-label">
        <div id="wr-code-label" className="label" style={{ textAlign: 'center' }}>Match code</div>
        <div className="code" data-testid="join-code">{code}</div>
        <p className="small" style={{ textAlign: 'center', marginTop: 8 }}>
          Send the code or the link to your friends. The match starts when {isHost ? 'you press Start' : 'the host presses Start'}. Open seats are dropped.
        </p>
      </section>
      <div className="wr-actions">
        <button type="button" className="btn quiet" data-testid="copy-code" onClick={() => copy('code', code)}>{copied === 'code' ? 'Copied' : 'Copy code'}</button>
        <button type="button" className="btn quiet" data-testid="copy-link" onClick={() => copy('link', inviteLink(origin, code))}>{copied === 'link' ? 'Copied' : 'Copy invite link'}</button>
      </div>
      <ul className="seats" aria-label="seats">
        {seats.map((_, i) => (
          <li className="seat" key={i}>
            <span className={`dot${connected[i] ? '' : ' off'}`} aria-hidden="true" />
            {seatLabel(seatNames, i)}{i === seat ? ' (you)' : ''}
            {i === 0 && <span className="host">Host</span>}
            <span className="visually-hidden">{connected[i] ? ', connected' : ', disconnected'}</span>
          </li>
        ))}
        {Array.from({ length: botCount }, (_, i) => (
          <li className="seat" key={`bot-${i}`} data-testid={`bot-seat-${i}`}><span className="dot" aria-hidden="true" />Bot {i + 1}</li>
        ))}
        {Array.from({ length: Math.max(0, humans - seated) }, (_, i) => (
          <li className="seat empty" key={`empty-${i}`}>Open seat</li>
        ))}
      </ul>
      <div className="small" role="status" aria-live="polite" data-testid="status" style={{ textAlign: 'center' }}>
        Waiting for players ({seated}/{humans > 0 ? humans : '?'})
      </div>
      {isHost ? (
        <>
          <fieldset className="field">
            <legend className="label">Players at the table</legend>
            <Segmented label="Players" options={PLAYER_COUNTS} value={table} prefix="players" onChange={(n) => configureLobby(n, Math.min(botCount, maxBots(n, seated)))} />
          </fieldset>
          {botCount > 0 && (
            <fieldset className="field">
              <legend className="label">Test bots</legend>
              <Segmented label="Bots" options={BOT_COUNTS} value={botCount} prefix="bots" isDisabled={(n) => n > botCap} onChange={(n) => configureLobby(table, n)} />
            </fieldset>
          )}
          {start.kind === 'ready' && (
            <button type="button" className="btn primary" data-testid="start-now" onClick={startMatch}>
              Start with {seated} {seated === 1 ? 'player' : 'players'}
            </button>
          )}
        </>
      ) : (
        <p className="small" data-testid="table-summary" style={{ textAlign: 'center' }}>Table: {tableSummary(table, botCount)}. The host can change it before the match starts.</p>
      )}
      <button type="button" className="btn link" data-testid="leave-match" onClick={leaveMatch}>Leave match</button>
    </main>
  )
}
