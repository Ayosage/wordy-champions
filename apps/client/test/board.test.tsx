// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it } from 'vitest'
import { Board } from '../src/ui/Board'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

function render(el: React.ReactElement): HTMLElement {
  const host = document.createElement('div')
  const root = createRoot(host)
  act(() => root.render(el))
  return host
}

describe('Board', () => {
  it('draws six rows of five tiles, letters and symbols for marked guesses, the draft in the next row', () => {
    const host = render(<Board guesses={[{ word: 'crane', marks: ['miss', 'near', 'miss', 'ok', 'miss'] }]} draft="bl" marksOnly={false} shake={0} />)
    const tiles = host.querySelectorAll('[data-tile]')
    expect(tiles).toHaveLength(30)
    expect(tiles[0]!.textContent).toContain('C')
    expect(tiles[1]!.getAttribute('data-mark')).toBe('near')
    expect(tiles[1]!.textContent).toContain('◐')
    expect(tiles[5]!.textContent).toContain('B')
    expect(tiles[6]!.textContent).toContain('L')
    expect(tiles[7]!.textContent).toBe('')
  })
  it('marks-only boards show symbols and no letters', () => {
    const host = render(<Board guesses={[{ word: null, marks: ['ok', 'ok', 'ok', 'ok', 'ok'] }]} draft="" marksOnly shake={0} />)
    expect(host.querySelector('[data-tile]')!.textContent).toBe('●')
  })
})
