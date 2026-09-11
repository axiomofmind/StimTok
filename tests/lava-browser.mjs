import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
const browser = await chromium.launch(),
  page = await browser.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text())
})
const out = process.env.TEMP + '/stimtok-lava-polish'
await mkdir(out, { recursive: true })
try {
  for (const [width, height] of [
    [1100, 800],
    [390, 844],
    [844, 390],
  ]) {
    await page.setViewportSize({ width, height })
    await page.goto('http://127.0.0.1:4174/StimTok/#/056-lava-lamp')
    const canvas = page.locator('#stage canvas')
    await canvas.waitFor()
    await page.waitForTimeout(250)
    await page.locator('[data-action="pause"]').click()
    const before = await canvas.evaluate((c) => c.toDataURL()),
      r = await canvas.boundingBox()
    const scale = 2.6 * Math.max(1, 0.55 / (r.width / r.height))
    await page.mouse.move(
      r.x + r.width * 0.5,
      r.y + r.height * (0.5 + 0.34 / scale),
    )
    await page.mouse.down()
    await page.mouse.move(r.x + r.width * 0.5 + 20, r.y + r.height * 0.42, {
      steps: 12,
    })
    await page.mouse.up()
    await page.waitForTimeout(100)
    assert.notEqual(
      await canvas.evaluate((c) => c.toDataURL()),
      before,
      'Direct wax grab works when paused',
    )
    await page.locator('[data-action="reset"]').click()
    await page.waitForTimeout(150)
    assert.equal(
      await page.locator('[data-action="pause"]').textContent(),
      'Play',
    )
    await page.locator('[data-action="pause"]').click()
    await page.waitForTimeout(1200)
    await page.screenshot({ path: out + '/' + width + '.png' })
  }
  assert.deepEqual(errors, [])
  console.log(
    'PASS: desktop, phone and landscape rendering, direct wax drag, paused restart',
  )
} finally {
  await browser.close()
}
