// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { describe, expect, it } from 'vitest'
import { Board } from '../src/ui/Board'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

function mount(el: React.ReactElement): { host: HTMLElement; root: Root } {
  const host = document.createElement('div')
  const root = createRoot(host)
  act(() => root.render(el))
  return { host, root }
}

describe('Board', () => {
  it('draws six rows of five tiles, letters only for marked guesses, the draft in the next row', () => {
    const { host } = mount(<Board guesses={[{ word: 'crane', marks: ['miss', 'near', 'miss', 'ok', 'miss'] }]} draft="bl" marksOnly={false} shake={0} />)
    const tiles = host.querySelectorAll('[data-tile]')
    expect(tiles).toHaveLength(30)
    expect(tiles[0]!.textContent).toBe('C')
    expect(tiles[1]!.getAttribute('data-mark')).toBe('near')
    expect(tiles[1]!.getAttribute('aria-label')).toBe('R, in the word')
    expect(tiles[5]!.textContent).toBe('B')
    expect(tiles[5]!.getAttribute('data-mark')).toBe('cur')
    expect(tiles[6]!.textContent).toBe('L')
    expect(tiles[7]!.textContent).toBe('')
  })
  it('marks-only boards show symbols and no letters', () => {
    const { host } = mount(<Board guesses={[{ word: null, marks: ['ok', 'ok', 'ok', 'ok', 'ok'] }]} draft="" marksOnly shake={0} />)
    expect(host.querySelector('[data-tile]')!.textContent).toBe('●')
  })
  it('flips only rows that land after the board mounted, and a solved row bounces', () => {
    const first = { word: 'crane', marks: ['miss', 'near', 'miss', 'ok', 'miss'] as const }
    const { host, root } = mount(<Board guesses={[{ ...first, marks: [...first.marks] }]} draft="" marksOnly={false} shake={0} />)
    expect(host.querySelectorAll('[data-reveal]')).toHaveLength(0)
    act(() => root.render(<Board guesses={[{ ...first, marks: [...first.marks] }, { word: 'slate', marks: ['ok', 'ok', 'ok', 'ok', 'ok'] }]} draft="" marksOnly={false} shake={0} />))
    const revealed = host.querySelectorAll('[data-reveal]')
    expect(revealed).toHaveLength(5)
    expect(revealed[0]!.textContent).toBe('S')
    expect((revealed[2] as HTMLElement).style.getPropertyValue('--i')).toBe('2')
    expect(host.querySelectorAll('.row.win')).toHaveLength(1)
  })
})
