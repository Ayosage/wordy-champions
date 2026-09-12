import { defineConfig } from '@playwright/test'

// Spare-port overrides (README "Ports"): PORT picks the Worker's port,
// CLIENT_PORT the Vite dev server's. Defaults are the human dev ports, so an
// E2E run alongside a live `pnpm dev` must override both, e.g.
//   PORT=8798 CLIENT_PORT=5198 pnpm --filter client test:e2e
const serverPort = Number(process.env.PORT ?? 8787)
const clientPort = Number(process.env.CLIENT_PORT ?? 5173)
const clientOrigin = `http://localhost:${clientPort}`

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  use: {
    baseURL: clientOrigin,
    actionTimeout: 15_000,
  },
  // Both servers start fresh. Reuse would hand the suite whatever already
  // listens on the ports, so a busy port fails the run by name instead.
  webServer: [
    {
      command: `pnpm --filter worker exec wrangler dev --port ${serverPort} --persist-to .wrangler/e2e-state --var TEST_KNOBS:1 --var LAUNCH_TOKEN:e2e --var CLIENT_ORIGIN:${clientOrigin}`,
      cwd: '../..',
      url: `http://localhost:${serverPort}/healthz`,
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: 'pnpm dev',
      port: clientPort,
      env: { PORT: String(serverPort), CLIENT_PORT: String(clientPort) },
      reuseExistingServer: false,
      timeout: 30_000,
    },
  ],
})
