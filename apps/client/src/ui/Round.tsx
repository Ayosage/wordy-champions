import { useEffect } from 'react'
import { keyStates, type Mark } from '@wordy/rules'
import { sendGuess } from '../net/wordy'
import { useWordyStore } from '../store'
import { announceGuess } from './announce'
import { Board } from './Board'
import { Countdown } from './Countdown'
import { Keyboard } from './Keyboard'
import { Opponents } from './Opponents'
import { useSettled } from './reveal'
import { Scoreboard } from './Scoreboard'

export function Round() {
  const view = useWordyStore((s) => s.view)
  const seat = useWordyStore((s) => s.seat)
  const draft = useWordyStore((s) => s.draft)
  const shake = useWordyStore((s) => s.shake)
  const toast = useWordyStore((s) => s.toast)
  const toastSeq = useWordyStore((s) => s.toastSeq)
  const status = useWordyStore((s) => s.status)
  const typeLetter = useWordyStore((s) => s.typeLetter)
  const backspace = useWordyStore((s) => s.backspace)

  const mine = view?.round && seat !== null ? view.round.boards[seat] : null
  const guessCount = mine?.guesses.length ?? 0
  // the keyboard and the done note wait for the newest row to finish flipping
  const settled = useSettled(guessCount)
  const done = !!mine && (mine.solved || mine.failed)
  const canType = view?.phase === 'round' && !done && status === 'playing'

  function press(key: string) {
    if (!canType) return
    if (key === 'Enter') {
      if (draft.length === 5) sendGuess(draft)
      else useWordyStore.getState().ruleError('Five letters, then Enter.')
      return
    }
    if (key === 'Backspace') return backspace()
    typeLetter(key)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'Enter' || e.key === 'Backspace' || /^[a-zA-Z]$/.test(e.key)) {
        e.preventDefault()
        press(e.key)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // a refused guess is a glance, not a banner: it clears itself
  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => useWordyStore.getState().setToast(null), 1400)
    return () => clearTimeout(id)
  }, [toast, toastSeq])

  if (!view) return null
  if (view.phase !== 'round' || !view.round) return <Scoreboard />

  const myGuesses = mine ? mine.guesses.map((g) => ({ word: g.word, marks: g.marks })) : []
  const states = keyStates(myGuesses.slice(0, settled).filter((g): g is { word: string; marks: Mark[] } => g.word !== null))
  const total = seat !== null ? (view.totals[seat]?.points ?? 0) : 0
  const revealed = settled >= guessCount

  return (
    <main className="screen round-screen">
      <header className="topbar">
        <span className="round" data-testid="round-label">Round {view.round.index + 1} <span>/ {view.rounds}</span></span>
        <span className="brand" aria-hidden="true">Wordy</span>
        <span className="status">
          <Countdown until={view.round.endsAt} />
          <span className="total" data-testid="my-total">You · {total}</span>
        </span>
      </header>
      <Opponents />
      <div className="stage">
        <Board guesses={myGuesses} draft={draft} marksOnly={false} shake={shake} />
        {status === 'reconnecting' && <div className="banner" role="status">Reconnecting to the match.</div>}
        {done && revealed && (
          <p className="small done-note" data-testid="done-note">
            {mine!.solved ? `Solved in ${mine!.guesses.length}. Waiting for the others.` : 'Out of guesses. The word shows when the round ends.'}
          </p>
        )}
      </div>
      <div className="visually-hidden" role="status" aria-live="polite" data-testid="guess-announcement">
        {revealed ? announceGuess(myGuesses[guessCount - 1]) : ''}
      </div>
      {toast && <div className="toast" role="status" aria-live="polite" data-testid="toast">{toast}</div>}
      <Keyboard states={states} onKey={press} />
    </main>
  )
}
