import { useWordyStore } from '../store'
import { seatLabel } from './waitingRoomLogic'

/**
 * Everyone else's progress as colours only. Phones show each player's latest
 * row in a thin strip under the header; desktops show the whole mini board in
 * the side column. Both are rendered; CSS picks one.
 */
export function Opponents() {
  const view = useWordyStore((s) => s.view)
  const seat = useWordyStore((s) => s.seat)
  const seatNames = useWordyStore((s) => s.seatNames)
  if (!view?.round) return null
  const others = Object.entries(view.round.boards).filter(([s]) => Number(s) !== seat)
  return (
    <div className="opps" aria-label="Other players">
      {others.map(([s, b]) => {
        const n = b.guesses.length
        const latest = b.guesses[n - 1]?.marks
        const badge = b.solved ? `solved · ${n}` : b.failed ? 'out' : `${n}/6`
        return (
          <div className="opp" key={s} data-testid={`opp-${s}`} aria-label={`${seatLabel(seatNames, Number(s))}, ${b.solved ? `solved in ${n}` : b.failed ? 'out of guesses' : `${n} of 6 guesses`}`}>
            <span className="name">{seatLabel(seatNames, Number(s))}</span>
            <div className="mini" aria-hidden="true">
              {Array.from({ length: 6 }).flatMap((_, r) =>
                Array.from({ length: 5 }).map((_, c) => {
                  const m = b.guesses[r]?.marks[c]
                  return <b key={`${r}-${c}`} className={m ?? 'none'} />
                }),
              )}
            </div>
            <div className="last" aria-hidden="true">
              {Array.from({ length: 5 }).map((_, c) => <b key={c} className={latest?.[c] ?? 'none'} />)}
            </div>
            <span className={`badge${b.solved ? ' solved' : ''}`}>{badge}</span>
          </div>
        )
      })}
    </div>
  )
}
