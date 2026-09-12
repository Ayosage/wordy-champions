import { leaveMatch } from '../net/wordy'
import { useWordyStore } from '../store'
import { Board } from './Board'
import { Countdown } from './Countdown'
import { solveTime, standings } from './scoreboardLogic'
import { seatLabel } from './waitingRoomLogic'

/** The interlude between rounds, and the final standings once the match has ended. */
export function Scoreboard() {
  const view = useWordyStore((s) => s.view)
  const seat = useWordyStore((s) => s.seat)
  const seatNames = useWordyStore((s) => s.seatNames)
  if (!view) return null
  const rows = standings(view.totals, seatNames)
  const last = view.lastRound
  const ended = view.phase === 'ended'
  const champion = ended ? (view.winner ?? rows[0]?.seat ?? null) : null
  const name = (s: number) => (s === seat ? 'You' : seatLabel(seatNames, s))

  return (
    <main className="screen scoreboard">
      <div className="strip">
        <span className="round" data-testid="round-label">
          {ended ? 'Final' : <>Round {view.roundsPlayed} <span>/ {view.rounds}</span></>}
        </span>
        {!ended && view.interludeUntil !== null && <Countdown until={view.interludeUntil} calm label="next in" />}
      </div>

      {ended && champion !== null && (
        <div className="podium" data-testid="final-standings">
          <div className="label">Champion</div>
          <div className="who"><span>{seatLabel(seatNames, champion)}</span> wins</div>
          <div className="small">{view.totals[champion]?.points ?? 0} points · {view.totals[champion]?.guesses ?? 0} guesses</div>
        </div>
      )}

      {last && (
        <div className="answer">
          <div className="label">The word was</div>
          <div className="word" data-testid="answer">{last.answer.toUpperCase()}</div>
        </div>
      )}

      {last && Object.keys(last.boards).length > 0 && (
        <div className="minis" aria-label="Everyone's boards">
          {Object.entries(last.boards).map(([s, b]) => (
            <div className="opp" key={s}>
              <span className="name">{name(Number(s))}</span>
              <Board guesses={b.guesses} draft="" marksOnly={false} shake={0} />
              <span className={`badge${b.solved ? ' solved' : ' failed'}`}>{b.solved ? `${b.guesses.length} · ${solveTime(b.solveMs)}` : 'failed'}</span>
            </div>
          ))}
        </div>
      )}

      <div className="table" data-testid="standings" role="table" aria-label="Standings">
        {rows.map((r, i) => {
          const sc = last?.scores[r.seat]
          return (
            <div className={`rowline${r.seat === seat ? ' me' : ''}`} key={r.seat} role="row">
              <span className="place">{i + 1}</span>
              <span className="who">{r.name}</span>
              <span className="pts">{sc ? `${sc.guessPoints} + ${sc.placementPoints}` : ''}</span>
              <span className="sum">{r.points}</span>
            </div>
          )
        })}
      </div>

      {ended && (
        <button type="button" className="btn link" data-testid="back-to-lobby" onClick={leaveMatch}>Back to lobby</button>
      )}
    </main>
  )
}
