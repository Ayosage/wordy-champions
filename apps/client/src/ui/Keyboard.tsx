import type { Mark } from '@wordy/rules'

const ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm']

export function Keyboard({ states, onKey }: { states: Record<string, Mark>; onKey: (key: string) => void }) {
  return (
    <div className="keys" aria-label="Keyboard">
      {ROWS.map((row, i) => (
        <div key={row}>
          {i === 2 && (
            <button type="button" className="key wide unused" data-key="Enter" data-state="unused" onClick={() => onKey('Enter')}>enter</button>
          )}
          {row.split('').map((c) => (
            <button key={c} type="button" className={`key ${states[c] ?? 'unused'}`} data-key={c} data-state={states[c] ?? 'unused'} onClick={() => onKey(c)} aria-label={c.toUpperCase()}>
              {c}
            </button>
          ))}
          {i === 2 && (
            <button type="button" className="key wide unused" data-key="Backspace" data-state="unused" onClick={() => onKey('Backspace')} aria-label="Backspace">
              <svg width="18" height="14" viewBox="0 0 18 14" aria-hidden="true"><path d="M6 1h11v12H6L1 7l5-6zm3 3 6 6m0-6-6 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round"/></svg>
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
