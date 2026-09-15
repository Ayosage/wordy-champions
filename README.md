# Wordy Champions

PvP Wordle. Everyone gets the same five-letter word each round and races to
solve it in up to six guesses; fewest guesses wins the round, fastest breaks
the tie. Six rounds, points add up. Launch it from Discord with `/wordy`
(Steward) or share a four-letter code from the web.

## Live

- Client: https://wordy-client.vercel.app
- Worker: https://wordy.aexbrandon.workers.dev/healthz
- Source: https://github.com/Ayosage/wordy-champions

Pushes to `main` run the tests and redeploy the Worker (`.github/workflows`);
Vercel rebuilds the client from the same push.

## Monorepo

- `packages/rules`: pure TypeScript: word lists, tile marking, scoring, the
  round state machine, and a solver used only by test bots.
- `apps/worker`: the Cloudflare Worker: one Durable Object per match on
  [`@ayosage/match-core`](https://github.com/Ayosage/match-core), launcher
  routes, sockets.
- `apps/client`: Vite + React. Lobby, waiting room, the round, the scoreboard.

## Development

Requirements: Node 22+, pnpm 10.

    pnpm install
    pnpm test                    # every package; the worker's run inside the Workers runtime
    pnpm --filter worker dev     # http://localhost:8787 (copy apps/worker/.dev.vars.example to .dev.vars first)
    pnpm --filter client dev     # http://localhost:5173

`TEST_KNOBS=1` in `.dev.vars` enables `?rounds=`, `?seed=` and bots on the
Create screen (`?bots=`) so one person can play a whole match locally. Bots
never exist in production: a room records at creation whether it asked for
them, the create route only allows that under the knob, and every other room
starts with the people present. A host on their own is refused.

`POST /matches/open` and `GET /matches/:code` are rate limited per IP, the
create body is capped, and a room that has not started within half an hour is
dropped. See `apps/worker/src/guards.ts`.
