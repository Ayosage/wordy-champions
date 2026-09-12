import { useEffect, useState } from 'react'
import { formatCountdown } from './formatCountdown'

/** Counts down to an absolute server time; urgent styling under 15 s. */
export function Countdown({ until, calm = false, label }: { until: number; calm?: boolean; label?: string }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [])
  const remaining = until - now
  const urgent = !calm && remaining < 15_000
  return (
    <span className={`timer${calm ? ' calm' : ''}${urgent ? ' urgent' : ''}`} data-testid="countdown">
      {label ? `${label} ` : ''}{formatCountdown(remaining)}
    </span>
  )
}
