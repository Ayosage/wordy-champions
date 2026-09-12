import { useRef, type CSSProperties } from 'react'
import type { Mark } from '@wordy/rules'

const SYMBOL: Record<Mark, string> = { ok: '●', near: '◐', miss: '○' }
const LABEL: Record<Mark, string> = { ok: 'correct', near: 'in the word', miss: 'not in the word' }

export interface BoardGuess {
  word: string | null
  marks: Mark[]
}

/**
 * Six rows of five tiles. Marked rows come first, then the draft row, then empties.
 * A row that lands after the board mounted flips its tiles left to right; a row
 * that was already there (a reconnect, the scoreboard replay) shows as-is.
 */
export function Board({ guesses, draft, marksOnly, shake }: { guesses: BoardGuess[]; draft: string; marksOnly: boolean; shake: number }) {
  const atMount = useRef(guesses.length)
  const rows: { letters: string[]; marks: (Mark | null)[]; current: boolean; reveal: boolean; win: boolean }[] = []
  for (const [r, g] of guesses.entries()) {
    const reveal = !marksOnly && r >= atMount.current
    rows.push({
      letters: marksOnly ? ['', '', '', '', ''] : (g.word ?? '').toUpperCase().padEnd(5, ' ').split('').map((c) => c.trim()),
      marks: g.marks,
      current: false,
      reveal,
      win: reveal && g.marks.every((m) => m === 'ok'),
    })
  }
  if (rows.length < 6 && !marksOnly) rows.push({ letters: draft.toUpperCase().padEnd(5, ' ').split('').map((c) => c.trim()), marks: [null, null, null, null, null], current: true, reveal: false, win: false })
  while (rows.length < 6) rows.push({ letters: ['', '', '', '', ''], marks: [null, null, null, null, null], current: false, reveal: false, win: false })
  return (
    <div className="board" role="grid" aria-label={marksOnly ? 'Board' : 'Your guesses'}>
      {rows.map((row, r) => (
        <div key={r} role="row" className={`row${row.current && shake ? ' shake' : ''}${row.win ? ' win' : ''}`} data-shake={row.current ? shake : undefined}>
          {row.letters.map((letter, c) => {
            const m = row.marks[c]
            const mark = m ?? (row.current && letter ? 'cur' : 'empty')
            const cls = `tile${m ? ` ${m}` : mark === 'cur' ? ' cur' : ''}${row.reveal ? ' reveal' : ''}`
            return (
              <div key={c} role="gridcell" data-tile data-mark={mark} data-reveal={row.reveal ? '' : undefined} className={cls}
                style={{ '--i': c } as CSSProperties}
                aria-label={m ? `${letter || 'letter'}, ${LABEL[m]}` : undefined}>
                {marksOnly ? (m ? SYMBOL[m] : '') : letter}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
