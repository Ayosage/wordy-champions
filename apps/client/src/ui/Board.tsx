import type { Mark } from '@wordy/rules'

const SYMBOL: Record<Mark, string> = { ok: '●', near: '◐', miss: '○' }
const LABEL: Record<Mark, string> = { ok: 'correct', near: 'in the word', miss: 'not in the word' }

export interface BoardGuess {
  word: string | null
  marks: Mark[]
}

/** Six rows of five tiles. Marked rows come first, then the draft row, then empties. */
export function Board({ guesses, draft, marksOnly, shake }: { guesses: BoardGuess[]; draft: string; marksOnly: boolean; shake: number }) {
  const rows: { letters: string[]; marks: (Mark | null)[]; current: boolean }[] = []
  for (const g of guesses) rows.push({ letters: marksOnly ? ['', '', '', '', ''] : (g.word ?? '').toUpperCase().padEnd(5, ' ').split('').map((c) => c.trim()), marks: g.marks, current: false })
  if (rows.length < 6 && !marksOnly) rows.push({ letters: draft.toUpperCase().padEnd(5, ' ').split('').map((c) => c.trim()), marks: [null, null, null, null, null], current: true })
  while (rows.length < 6) rows.push({ letters: ['', '', '', '', ''], marks: [null, null, null, null, null], current: false })
  return (
    <div className="board" role="grid" aria-label={marksOnly ? 'Board' : 'Your guesses'}>
      {rows.map((row, r) => (
        <div key={r} role="row" className={`row${row.current && shake ? ' shake' : ''}`} data-shake={row.current ? shake : undefined}>
          {row.letters.map((letter, c) => {
            const m = row.marks[c]
            const mark = m ?? (row.current && letter ? 'cur' : 'empty')
            return (
              <div key={c} role="gridcell" data-tile data-mark={mark} className={`tile${m ? ` ${m}` : mark === 'cur' ? ' cur' : ''}`}
                aria-label={m ? `${letter || 'letter'}, ${LABEL[m]}` : undefined}>
                {marksOnly ? (m ? SYMBOL[m] : '') : letter}
                {m && !marksOnly && <i aria-hidden="true">{SYMBOL[m]}</i>}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
