// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useWordyStore } from '../src/store'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const net = vi.hoisted(() => ({ configureLobby: vi.fn(), startMatch: vi.fn(), leaveMatch: vi.fn() }))
vi.mock('../src/net/wordy', () => net)

import { WaitingRoom } from '../src/ui/WaitingRoom'

function render(el: React.ReactElement): string {
  const host = document.createElement('div')
  const root = createRoot(host)
  act(() => root.render(el))
  const html = host.innerHTML
  act(() => root.unmount())
  return html
}
function mount(el: React.ReactElement): { host: HTMLElement; root: Root; click(testid: string): void } {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  act(() => root.render(el))
  return {
    host,
    root,
    click(testid) {
      const b = host.querySelector<HTMLButtonElement>(`[data-testid="${testid}"]`)
      if (!b) throw new Error(`no ${testid}`)
      act(() => b.click())
    },
  }
}
function seed(opts: { seats: number; target: number; bots: number; seat: number; names?: string[] }) {
  const s = useWordyStore.getState()
  s.reset()
  s.setJoined('QRTZ')
  s.setSeat(opts.seat)
  s.setLobby(Array.from({ length: opts.seats }, (_, i) => `seat-${i}`), Array.from({ length: opts.seats }, () => true), opts.target, opts.bots, opts.names)
}

describe('WaitingRoom', () => {
  beforeEach(() => {
    useWordyStore.getState().reset()
    net.configureLobby.mockReset()
    net.startMatch.mockReset()
  })
  it('shows the code, the invite controls, the seats by name, and a way out', () => {
    seed({ seats: 2, target: 4, bots: 0, seat: 0, names: ['Brandon', ''] })
    const html = render(<WaitingRoom />)
    expect(html).toContain('QRTZ')
    expect(html).toContain('data-testid="copy-code"')
    expect(html).toContain('data-testid="copy-link"')
    expect(html).toContain('Brandon (you)')
    expect(html).toContain('Player 2')
    expect(html).toContain('data-testid="leave-match"')
    expect(html).toContain('Waiting for players (2/4)')
  })
  it('the host sees the table control and a Start that names the seated count', () => {
    seed({ seats: 2, target: 4, bots: 0, seat: 0 })
    const html = render(<WaitingRoom />)
    expect(html).toContain('data-testid="players-4"')
    expect(html).toContain('Start with 2 players')
    expect(html).toContain('The match starts when you press Start')
    expect(html).not.toContain('data-testid="table-summary"')
  })
  it('changing the table sends configure; Start sends start', () => {
    seed({ seats: 2, target: 4, bots: 0, seat: 0 })
    const m = mount(<WaitingRoom />)
    m.click('players-6')
    expect(net.configureLobby).toHaveBeenLastCalledWith(6, 0)
    m.click('start-now')
    expect(net.startMatch).toHaveBeenCalledTimes(1)
    act(() => m.root.unmount())
    m.host.remove()
  })
  it('a joiner sees the table as text and no controls', () => {
    seed({ seats: 2, target: 4, bots: 0, seat: 1 })
    const html = render(<WaitingRoom />)
    expect(html).toContain('data-testid="table-summary"')
    expect(html).toContain('4 players')
    expect(html).not.toContain('data-testid="players-4"')
    expect(html).not.toContain('data-testid="start-now"')
    expect(html).toContain('when the host presses Start')
  })
})
