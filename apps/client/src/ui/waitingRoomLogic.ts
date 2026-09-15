/**
 * Pure model for the waiting room (no React, no store): what the host can do,
 * what the room is waiting for, and the invite link. Unit-tested directly.
 */

/** The `?join=CODE` deep link App.tsx already understands. */
export function inviteLink(origin: string, code: string): string {
  return `${origin}/?join=${code}`
}

/** Humans the room needs before it starts by itself. */
export function humanTarget(targetPlayers: number | null, botCount: number): number {
  return Math.max(0, (targetPlayers ?? 0) - botCount)
}

/** Fewest humans a match needs. Matches the object's own floor (`players.min`). */
export const MIN_HUMANS = 2

export type StartPlan =
  /** Not the host, or the table is not known yet: nothing to show. */
  | { kind: 'hidden' }
  /** The host is alone; `need` more people have to arrive before Start does anything. */
  | { kind: 'wait'; need: number }
  /** The host may start now; `fill` empty seats would be taken by bots. */
  | { kind: 'ready'; fill: number }

/**
 * Mirrors the match object. A room created with bots (local testing only, and
 * the object refuses them in production) still lets the host start alone and
 * lets bots take the empty seats. Every other room waits for real people: the
 * object drops the open seats at Start rather than filling them.
 */
export function startPlan(input: {
  isHost: boolean
  seated: number
  targetPlayers: number | null
  botCount: number
}): StartPlan {
  const { isHost, seated, targetPlayers, botCount } = input
  if (!isHost || targetPlayers === null) return { kind: 'hidden' }
  if (botCount > 0) return { kind: 'ready', fill: Math.max(0, targetPlayers - seated) }
  if (seated < MIN_HUMANS) return { kind: 'wait', need: MIN_HUMANS - seated }
  return { kind: 'ready', fill: 0 }
}

/** Most bots a table can hold: one seat stays for the host and one for each person already here. */
export function maxBots(targetPlayers: number, seated: number): number {
  return Math.max(0, targetPlayers - Math.max(1, seated))
}

/** "4 players, 1 bot": the table as a joiner reads it. */
export function tableSummary(targetPlayers: number, botCount: number): string {
  const bots = botCount === 0 ? 'no bots' : botCount === 1 ? '1 bot' : `${botCount} bots`
  return `${targetPlayers} players, ${bots}`
}

/** A seat's name, or Player N when it has none. */
export function seatLabel(names: readonly string[], seat: number): string {
  return names[seat] || `Player ${seat + 1}`
}
