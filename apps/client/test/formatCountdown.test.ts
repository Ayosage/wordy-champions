import { describe, expect, it } from 'vitest'
import { formatCountdown } from '../src/ui/formatCountdown'

describe('formatCountdown', () => {
  it('shows m:ss, floors to the second, never goes negative', () => {
    expect(formatCountdown(102_400)).toBe('1:42')
    expect(formatCountdown(7_999)).toBe('0:07')
    expect(formatCountdown(0)).toBe('0:00')
    expect(formatCountdown(-500)).toBe('0:00')
  })
})
