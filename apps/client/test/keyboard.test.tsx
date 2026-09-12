// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'
import { Keyboard } from '../src/ui/Keyboard'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

describe('Keyboard', () => {
  it('colours keys by state and reports presses', () => {
    const onKey = vi.fn()
    const host = document.createElement('div')
    document.body.appendChild(host)
    act(() => createRoot(host).render(<Keyboard states={{ t: 'ok', s: 'miss', p: 'near' }} onKey={onKey} />))
    expect(host.querySelector('[data-key="t"]')!.getAttribute('data-state')).toBe('ok')
    expect(host.querySelector('[data-key="q"]')!.getAttribute('data-state')).toBe('unused')
    act(() => (host.querySelector('[data-key="Enter"]') as HTMLButtonElement).click())
    act(() => (host.querySelector('[data-key="a"]') as HTMLButtonElement).click())
    expect(onKey.mock.calls.map((c) => c[0])).toEqual(['Enter', 'a'])
    host.remove()
  })
})
