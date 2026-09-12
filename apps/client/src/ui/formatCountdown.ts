export function formatCountdown(remainingMs: number): string {
  const s = Math.max(0, Math.floor(remainingMs / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
