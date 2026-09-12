import { expect, test } from '@playwright/test'

test('two browsers play a one-round match to the final standings', async ({ browser }) => {
  test.setTimeout(90_000)
  const host = await (await browser.newContext()).newPage()
  const guest = await (await browser.newContext()).newPage()

  await host.goto('/?rounds=1&seed=7')
  await host.getByTestId('players-2').click()
  await host.getByTestId('create-button').click()
  await expect(host.getByTestId('join-code')).toBeVisible()
  const code = (await host.getByTestId('join-code').textContent())!.trim()

  await guest.goto('/')
  await guest.getByTestId('join-input').fill(code)
  await guest.getByTestId('join-button').click()
  await expect(host.getByTestId('status')).toHaveText(/\(2\/2\)/)
  await host.getByTestId('start-now').click()

  await expect(host.getByTestId('round-label')).toHaveText(/Round 1 \/ 1/)
  await expect(guest.getByTestId('round-label')).toBeVisible()

  // a junk word is refused, a real word lands as a marked row on both screens
  await host.keyboard.type('zzzzz')
  await host.keyboard.press('Enter')
  await expect(host.getByTestId('toast')).toContainText('not in the word list')
  for (let i = 0; i < 5; i++) await host.keyboard.press('Backspace')
  const words = ['crane', 'slate', 'brick', 'gumbo', 'lymph', 'dwarf']
  const marked = '[data-tile][data-mark]:not([data-mark="empty"]):not([data-mark="cur"])'
  for (const page of [host, guest]) {
    const opp = page === host ? guest : host
    for (let k = 0; k < words.length; k++) {
      await page.keyboard.type(words[k]!)
      await page.keyboard.press('Enter')
      // the guest's last guess finishes both boards, so the round (and the board) is gone before we could count
      if (page === guest && k === words.length - 1) break
      await expect(page.locator(`.board ${marked}`)).toHaveCount((k + 1) * 5, { timeout: 5000 })
      // the opponent sees the same rows as colours only
      await expect(opp.locator('.opp .mini b.miss, .opp .mini b.near, .opp .mini b.ok')).toHaveCount((k + 1) * 5)
      // a solve ends this board early
      if (await page.getByTestId('done-note').isVisible().catch(() => false)) break
    }
  }
  // both boards are done: the only round ends, the match ends
  await expect(host.getByTestId('final-standings')).toBeVisible({ timeout: 15_000 })
  await expect(host.getByTestId('answer')).toHaveText(/^[A-Z]{5}$/)
  await expect(guest.getByTestId('back-to-lobby')).toBeVisible()
  await guest.getByTestId('back-to-lobby').click()
  await expect(guest.getByTestId('create-button')).toBeVisible()
})
