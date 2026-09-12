// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { REVEAL_DONE_MS, useSettled } from '../src/ui/reveal'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let seen: number[] = []
function Probe({ count }: { count: number }) {
  seen.push(useSettled(count))
  return null
}

describe('useSettled', () => {
  let root: Root
  let host: HTMLElement
  beforeEach(() => {
    vi.useFakeTimers()
    seen = []
    host = document.createElement('div')
    root = createRoot(host)
  })
  afterEach(() => {
    act(() => root.unmount())
    vi.useRealTimers()
  })

  it('starts settled, lags a new guess by one reveal, and snaps down for a new round', () => {
    act(() => root.render(<Probe count={1} />))
    expect(seen.at(-1)).toBe(1)

    act(() => root.render(<Probe count={2} />))
    expect(seen.at(-1)).toBe(1)
    act(() => { vi.advanceTimersByTime(REVEAL_DONE_MS - 1) })
    expect(seen.at(-1)).toBe(1)
    act(() => { vi.advanceTimersByTime(1) })
    expect(seen.at(-1)).toBe(2)

    act(() => root.render(<Probe count={0} />))
    expect(seen.at(-1)).toBe(0)
  })

  it('settles at once under reduced motion', () => {
    const mm = vi.spyOn(window, 'matchMedia').mockImplementation((q: string) => ({ matches: q.includes('reduce') } as MediaQueryList))
    act(() => root.render(<Probe count={0} />))
    act(() => root.render(<Probe count={1} />))
    expect(seen.at(-1)).toBe(1)
    mm.mockRestore()
  })
})
