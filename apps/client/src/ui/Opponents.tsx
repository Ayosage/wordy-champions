import { useWordyStore } from '../store'
import { seatLabel } from './waitingRoomLogic'

/** Everyone else's board as marks only, with a solved or failed badge. */
export function Opponents() {
  const view = useWordyStore((s) => s.view)
  const seat = useWordyStore((s) => s.seat)
  const seatNames = useWordyStore((s) => s.seatNames)
  if (!view?.round) return null
  const others = Object.entries(view.round.boards).filter(([s]) => Number(s) !== seat)
  return (
    <div className="opps" aria-label="Other players">
      {others.map(([s, b]) => (
        <div className="opp" key={s} data-testid={`opp-${s}`}>
          <span className="name">{seatLabel(seatNames, Number(s))}</span>
          <div className="mini" aria-hidden="true">
            {Array.from({ length: 6 }).flatMap((_, r) =>
              Array.from({ length: 5 }).map((_, c) => {
                const m = b.guesses[r]?.marks[c]
                return <b key={`${r}-${c}`} className={m ?? 'none'} />
              }),
            )}
          </div>
          <span className={`badge${b.solved ? ' solved' : ''}`}>
            {b.solved ? `solved · ${b.guesses.length}` : b.failed ? 'failed' : `guess ${b.guesses.length + 1}`}
          </span>
        </div>
      ))}
    </div>
  )
}
