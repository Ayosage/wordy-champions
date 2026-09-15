// Render public/og.png (and the apple touch icon) from the app's own tokens,
// fonts and tile face, so the social card is the real thing rather than a
// mock-up. Run: pnpm --filter client og
import { chromium } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const pub = join(here, '..', 'public')
// inlined: the page is set with setContent, which has no origin to resolve a file path against
const font = (file) => `url(data:font/woff2;base64,${readFileSync(join(pub, 'fonts', file)).toString('base64')}) format('woff2')`

const page = (body, css) => `<!doctype html><meta charset="utf-8"><style>
@font-face { font-family: 'Big Shoulders Display'; font-weight: 900; src: ${font('BigShouldersDisplay-900.woff2')}; }
@font-face { font-family: 'Rubik'; font-weight: 400; src: ${font('Rubik-400.woff2')}; }
@font-face { font-family: 'Libre Franklin'; font-weight: 700; src: ${font('LibreFranklin-700.woff2')}; }
* { box-sizing: border-box; margin: 0; }
body { background: #0B1020; color: #F2F4FA; font-family: 'Rubik', sans-serif; display: grid; place-items: center; }
${css}
</style>${body}`

const CARD = `
.card { width: 1200px; height: 630px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 44px; }
.wordmark { font-family: 'Big Shoulders Display', sans-serif; font-weight: 900; font-size: 132px; line-height: 0.92; letter-spacing: -0.01em; text-align: center; }
.wordmark em { font-style: normal; color: #FF6B4A; }
.row { display: flex; gap: 12px; }
.tile { position: relative; width: 108px; height: 108px; display: grid; place-items: center; border-radius: 16px; background: #2FA95F; color: #07140B; font-family: 'Libre Franklin', sans-serif; font-weight: 700; font-size: 62px; text-transform: uppercase; }
.tile::after { content: ''; position: absolute; top: 12px; left: 12px; width: 13px; height: 13px; border-radius: 50%; background: currentColor; }
.tag { font-size: 27px; color: #9AA3BF; }
`

const ICON = `
.icon { width: 180px; height: 180px; display: grid; place-items: center; border-radius: 40px; background: #FF6B4A; color: #1A0B07; font-family: 'Big Shoulders Display', sans-serif; font-weight: 900; font-size: 132px; line-height: 1; }
`

const browser = await chromium.launch()
const ctx = await browser.newContext({ deviceScaleFactor: 1 })

const card = await ctx.newPage()
await card.setViewportSize({ width: 1200, height: 630 })
await card.setContent(
  page(
    `<div class="card">
       <div class="wordmark">Wordy<br><em>Champions</em></div>
       <div class="row">${[...'wordy'].map((c) => `<div class="tile">${c}</div>`).join('')}</div>
       <p class="tag">Same five-letter word for everyone. Fewest guesses wins.</p>
     </div>`,
    CARD,
  ),
)
await card.evaluate(() => document.fonts.ready)
await card.screenshot({ path: join(pub, 'og.png') })

const icon = await ctx.newPage()
await icon.setViewportSize({ width: 180, height: 180 })
await icon.setContent(page('<div class="icon">W</div>', ICON))
await icon.evaluate(() => document.fonts.ready)
await icon.screenshot({ path: join(pub, 'apple-touch-icon.png'), omitBackground: false })

await browser.close()
console.log('wrote public/og.png (1200x630) and public/apple-touch-icon.png (180x180)')
