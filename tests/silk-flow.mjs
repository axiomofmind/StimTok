import assert from 'node:assert/strict'
import { chromium, webkit } from 'playwright'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const base = process.env.STIMTOK_TEST_URL || 'http://127.0.0.1:4174/StimTok/'
for (const engine of [chromium, webkit]) {
  const browser = await engine.launch()
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })
    const errors = []
    page.on('pageerror', e => errors.push(e.message))
    page.on('console', e => { if (e.type() === 'error') errors.push(e.text()) })
    await page.goto(base + '#/041-silk-cloth-ripple')
    const canvas = page.locator('#stage canvas')
    await canvas.waitFor()
    const pixels = () => canvas.evaluate(c => c.toDataURL())
    const first = await pixels()
    await page.waitForTimeout(1000)
    assert.notEqual(await pixels(), first, 'Untouched silk must keep flowing')
    await page.locator('[data-action="pause"]').click()
    await page.waitForTimeout(100)
    const paused = await pixels()
    await page.waitForTimeout(200)
    assert.equal(await pixels(), paused, 'Pause freezes the flowing fabric')
    const rect = await canvas.boundingBox()
    await page.mouse.move(rect.x + rect.width * 0.5, rect.y + rect.height * 0.5)
    await page.mouse.down()
    await page.mouse.move(rect.x + rect.width * 0.68, rect.y + rect.height * 0.56, { steps: 12 })
    await page.waitForTimeout(100)
    assert.notEqual(await pixels(), paused, 'Paused fabric must still follow a grab')
    await page.screenshot({ path: join(tmpdir(), `${engine.name()}-flowing-silk.png`) })
    await page.mouse.up()
    await page.locator('[data-action="pause"]').click()
    await page.waitForTimeout(300)
    await page.setViewportSize({ width: 844, height: 390 })
    await page.waitForTimeout(200)
    assert.deepEqual(errors, [])
    console.log(`PASS ${engine.name()}: mobile silk flow, pause, grab, release and rotation`)
  } finally {
    await browser.close()
  }
}
