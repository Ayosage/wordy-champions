import { env, runDurableObjectAlarm, SELF } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { createRoom, Seat } from './ws'

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** One caller. The per-IP budget is shared across a test file, so each test brings its own address. */
async function open(ip: string, body: unknown): Promise<Response> {
  return SELF.fetch('https://x/matches/open', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'cf-connecting-ip': ip },
    body: JSON.stringify(body),
  })
}

describe('bots stay out of a room that did not ask for them', () => {
  it('a lone host is refused instead of being given a table of solvers', async () => {
    await createRoom('GRD1', 4, 0)
    const host = await Seat.open('GRD1')
    await host.next('welcome')
    host.send({ t: 'start' })
    const refused = await host.next('error')
    expect(refused.code).toBe('NEED_PLAYERS')
    expect((await env.MATCH.getByName('GRD1').lobby())!.phase).toBe('waiting')
  })

  it('two humans at a four-seat table start a two-player match, not two humans and two bots', async () => {
    await createRoom('GRD2', 4, 0)
    const host = await Seat.open('GRD2')
    await host.next('welcome')
    const guest = await Seat.open('GRD2')
    await guest.next('welcome')
    host.send({ t: 'start' })
    await host.next('snapshot')
    const lobby = (await env.MATCH.getByName('GRD2').lobby())!
    expect(lobby.phase).toBe('playing')
    expect(lobby.botCount).toBe(0)
    expect(lobby.seats).toEqual(['seat-0', 'seat-1'])
  })

  it('the host cannot configure bots in and then start with them', async () => {
    await createRoom('GRD3', 4, 0)
    const host = await Seat.open('GRD3')
    await host.next('welcome')
    const guest = await Seat.open('GRD3')
    await guest.next('welcome')
    host.send({ t: 'configure', players: 4, bots: 2 })
    await host.next('lobby')
    host.send({ t: 'start' })
    await host.next('snapshot')
    const lobby = (await env.MATCH.getByName('GRD3').lobby())!
    expect(lobby.botCount).toBe(0)
    expect(lobby.seats).toEqual(['seat-0', 'seat-1'])
  })
})

describe('abuse guards on the open route', () => {
  it('a body over the cap is refused with 413 and creates nothing', async () => {
    const res = await open('203.0.113.1', { players: 2, bots: 0, knobs: { pad: 'x'.repeat(64 * 1024) } })
    expect(res.status).toBe(413)
    expect(await res.json()).toEqual({ error: 'Request body is too large.' })
  })

  it('a create still works and answers 201 with a code', async () => {
    const res = await open('203.0.113.2', { players: 2, bots: 0 })
    expect(res.status).toBe(201)
    expect((await res.json() as { code: string }).code).toMatch(/^[A-Z]{4}$/)
  })

  it('a burst of creates from one address is cut off with 429', async () => {
    const ip = '203.0.113.4'
    const statuses: number[] = []
    for (let i = 0; i < 7; i++) statuses.push((await open(ip, { players: 2, bots: 0 })).status)
    expect(statuses.filter((s) => s === 201)).toHaveLength(5)
    expect(statuses.slice(5)).toEqual([429, 429])
    const refused = await open(ip, { players: 2, bots: 0 })
    expect(refused.headers.get('retry-after')).toBe('60')
    expect(refused.headers.get('access-control-allow-origin')).toBe('http://localhost:5173')
  })

  it('reading a code is capped too, so the four-letter space cannot be walked', async () => {
    const ip = '203.0.113.5'
    const statuses: number[] = []
    for (let i = 0; i < 62; i++) {
      statuses.push((await SELF.fetch('https://x/matches/ZZZZ', { headers: { 'cf-connecting-ip': ip } })).status)
    }
    expect(statuses.filter((s) => s === 404)).toHaveLength(60)
    expect(statuses.slice(60)).toEqual([429, 429])
  })

  it('a room nobody joins expires instead of living forever', async () => {
    const res = await open('203.0.113.3', { players: 2, bots: 0, knobs: { openExpireMs: 20 } })
    const { code } = (await res.json()) as { code: string }
    expect((await SELF.fetch(`https://x/matches/${code}`)).status).toBe(200)
    await wait(40)
    // the object's own alarm usually beats us to it; run it if it is still pending
    await runDurableObjectAlarm(env.MATCH.getByName(code))
    expect((await SELF.fetch(`https://x/matches/${code}`)).status).toBe(404)
  })
})
