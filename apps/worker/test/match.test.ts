import { env, runDurableObjectAlarm, SELF } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { createRoom, openHost, Seat } from './ws'
import type { WordyView } from '@wordy/rules'

const view = (m: { view?: unknown }) => m.view as WordyView
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

describe('a Wordy match on the engine', () => {
  it('two humans play a one-round match: guesses are marked, the answer stays hidden', async () => {
    await createRoom('WRD1', 2, 0)
    const a = await Seat.open('WRD1')
    await a.next('welcome')
    const b = await Seat.open('WRD1')
    await b.next('welcome')
    a.send({ t: 'start' })
    const first = view(await a.next('snapshot'))
    await b.next('snapshot')
    expect(first.phase).toBe('round')
    expect(JSON.stringify(first)).not.toMatch(/"answer"/)
    a.send({ t: 'intent', intent: { type: 'guess', word: 'zzzzz' } })
    expect((await a.next('error')).code).toBe('NOT_A_WORD')
    a.send({ t: 'intent', intent: { type: 'guess', word: 'crane' } })
    const afterA = view(await a.next('snapshot'))
    expect(afterA.round!.boards[0]!.guesses[0]!.word).toBe('crane')
    const seenByB = view(await b.next('snapshot'))
    expect(seenByB.round!.boards[0]!.guesses[0]!.word).toBeNull()
    expect(seenByB.round!.boards[0]!.guesses[0]!.marks).toHaveLength(5)
    // the other seat's board is untouched by someone else's guess
    expect(afterA.round!.boards[1]!.guesses).toHaveLength(0)
    expect(seenByB.round!.boards[1]!.guesses).toHaveLength(0)
  })

  it('the round cap fails unfinished boards and, on the last round, ends the match', async () => {
    await createRoom('WRD2', 2, 0, { roundMs: 30 })
    const stub = env.MATCH.getByName('WRD2')
    const a = await Seat.open('WRD2')
    await a.next('welcome')
    const b = await Seat.open('WRD2')
    await b.next('welcome')
    a.send({ t: 'start' })
    await a.next('snapshot')
    expect((await stub.deadlinesForTest())!.game).not.toBeNull()
    await wait(40)
    await runDurableObjectAlarm(stub)
    const ended = await a.next('ended')
    expect(ended.reason).toBe('win')
    const last = view(a.latestSnapshot()!)
    expect(last.phase).toBe('ended')
    expect(last.lastRound!.scores[0]).toMatchObject({ guesses: null, guessPoints: 0, placementPoints: 0 })
  })

  it('a finished round opens the interlude, and the interlude expiring starts the next round', async () => {
    await createRoom('WRD3', 2, 0, { rounds: 2, interludeMs: 20 })
    const stub = env.MATCH.getByName('WRD3')
    const a = await Seat.open('WRD3')
    await a.next('welcome')
    const b = await Seat.open('WRD3')
    await b.next('welcome')
    a.send({ t: 'start' })
    await a.next('snapshot')
    const words = ['crane', 'slate', 'brick', 'gumbo', 'lymph', 'dwarf']
    for (const w of words) {
      a.send({ t: 'intent', intent: { type: 'guess', word: w } })
      await a.next('snapshot')
      b.send({ t: 'intent', intent: { type: 'guess', word: w } })
      await b.next('snapshot')
    }
    // snapshots arrive on their own schedule: read until the round is over
    let latest = view(a.latestSnapshot() ?? (await a.next('snapshot')))
    while (latest.phase === 'round') latest = view(await a.next('snapshot'))
    expect(latest.phase).toBe('interlude')
    expect(latest.lastRound!.answer).toMatch(/^[a-z]{5}$/)
    await wait(30)
    await runDurableObjectAlarm(stub)
    const next = view(await a.next('snapshot'))
    expect(next.phase).toBe('round')
    expect(next.round!.index).toBe(1)
  })

  it('a test bot plays when the knob is on', async () => {
    await createRoom('WRD4', 2, 1, { botDelayMs: 5 })
    const stub = env.MATCH.getByName('WRD4')
    const me = await openHost('WRD4')
    await me.next('snapshot')
    let botGuessed = false
    for (let i = 0; i < 10 && !botGuessed; i++) {
      await wait(10)
      await runDurableObjectAlarm(stub)
      const v = me.latestSnapshot()
      if (v && view(v).round?.boards[1]!.guesses.length) botGuessed = true
    }
    expect(botGuessed).toBe(true)
  })

  it('the open route refuses bots without the knob and healthz answers', async () => {
    const { matchFetch } = await import('@ayosage/match-core/worker')
    const res = await matchFetch(
      new Request('https://x/matches/open', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ players: 2, bots: 1 }) }),
      { ...env, TEST_KNOBS: undefined },
      { botsRequireTestKnobs: true },
    )
    expect(res.status).toBe(422)
    expect((await SELF.fetch('https://x/healthz')).status).toBe(200)
  })
})
