import { createMatchObject, type CreateOptions, type CreateResult } from '@ayosage/match-core'
import { wordyAdapter } from './adapter'

/** Fewest humans a real match needs. Bots make up the difference only in a room that asked for them. */
const MIN_HUMANS = wordyAdapter.players.min

/**
 * How long a room that has not started may sit there. match-core gives a
 * launched invite the same half hour; starting the match clears the timer, and
 * the last player leaving replaces it with a shorter one.
 */
const UNSTARTED_EXPIRE_MS = 30 * 60 * 1000

/**
 * The Wordy match object, with two house rules on top of match-core.
 *
 * 1. Bots are a local test aid, not a product feature. match-core gates room
 *    *creation* with `botsRequireTestKnobs`, but its Start seats a bot on
 *    every empty chair regardless, and its `configure` can raise the bot count
 *    at any time, so a solo host in production would get a table of solvers.
 *    A room records at creation whether bots were asked for (which the create
 *    route only allows under TEST_KNOBS); in every other room Start shrinks
 *    the table to the people present, and a lone host is refused.
 * 2. `POST /matches/open` costs a Durable Object, and match-core only arms an
 *    expiry for launched rooms or for a room whose last player left. A room
 *    nobody ever joins had no expiry at all, so one is armed at creation.
 */
export class WordyMatch extends createMatchObject(wordyAdapter) {
  override async create(opts: CreateOptions): Promise<CreateResult> {
    const result = await super.create(opts)
    if (result.status !== 'created') return result
    // `bots > 0` got past the create route, so the test knobs are on for this room.
    this.ctx.storage.sql.exec("INSERT INTO meta (k, v) VALUES ('botsAllowed', ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v", opts.bots > 0 ? '1' : '')
    // A launched room already carries its invite's expiry; this covers the open route.
    if (!opts.launched) this.expireWhenUnstarted(opts.knobs)
    return result
  }

  override async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    if (this.botsAllowed() || !isStart(raw) || seatOf(ws) !== 0) return super.webSocketMessage(ws, raw)
    const lobby = this.lobby()
    if (!lobby || lobby.phase !== 'waiting') return super.webSocketMessage(ws, raw)
    const seated = lobby.seats.length
    if (seated < MIN_HUMANS) {
      const message = `Wordy needs ${MIN_HUMANS} players. Send the code to someone and start when they are in.`
      ws.send(JSON.stringify({ t: 'error', code: 'NEED_PLAYERS', message }))
      return
    }
    // Shrink the table to the people present first: match-core's Start seats a
    // bot on every chair still empty, and this way there are none left to fill.
    if (seated < lobby.targetPlayers || lobby.botCount > 0) {
      await super.webSocketMessage(ws, JSON.stringify({ t: 'configure', players: seated, bots: 0 }))
    }
    return super.webSocketMessage(ws, raw)
  }

  /** Recorded at creation. A room from before this rule, or one created without bots, says no. */
  private botsAllowed(): boolean {
    const row = this.ctx.storage.sql.exec("SELECT v FROM meta WHERE k = 'botsAllowed'").toArray()[0] as { v?: string } | undefined
    return row?.v === '1'
  }

  /**
   * Arm match-core's own expiry timer (`openExpireMs` shortens it for tests).
   * Writing the timer row reaches into the object's storage, but match-core
   * reads the whole table on every alarm, so the two stay in step and its
   * `fireExpiry` does the cleanup. Nothing else is armed on a freshly created
   * open room, so this alarm is the earliest.
   */
  private expireWhenUnstarted(knobs: CreateOptions['knobs']): void {
    const knob = this.env.TEST_KNOBS === '1' ? knobs?.openExpireMs : undefined
    const at = Date.now() + (typeof knob === 'number' ? knob : UNSTARTED_EXPIRE_MS)
    this.ctx.storage.sql.exec("INSERT INTO timers (k, at) VALUES ('expiry', ?) ON CONFLICT(k) DO UPDATE SET at = excluded.at", at)
    void this.ctx.storage.setAlarm(at)
  }
}

function isStart(raw: string | ArrayBuffer): boolean {
  try {
    const text = typeof raw === 'string' ? raw : new TextDecoder().decode(raw)
    return (JSON.parse(text) as { t?: unknown }).t === 'start'
  } catch {
    return false
  }
}

/** The seat this socket is bound to, or null before its hello landed. */
function seatOf(ws: WebSocket): number | null {
  const att = ws.deserializeAttachment() as { seat?: unknown } | null
  return typeof att?.seat === 'number' ? att.seat : null
}
