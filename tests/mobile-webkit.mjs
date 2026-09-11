import assert from 'node:assert/strict'
import { webkit } from 'playwright'
import { manifest } from '../src/manifest.js'
const browser = await webkit.launch()
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 2,
})
const base = process.env.STIMTOK_TEST_URL || 'http://127.0.0.1:4174/StimTok/'
const errors = []
let current = ''
page.on('pageerror', (e) => errors.push(`${current}: ${e.message}`))
page.on('console', (e) => {
  if (e.type() === 'error') errors.push(`${current}: ${e.text()}`)
})
try {
  await page.goto(base)
  await page.evaluate(() => {
    localStorage.clear()
    localStorage.setItem('stimtok:sidebar-collapsed', 'true')
  })
  for (const item of manifest) {
    current = item.id
    await page.goto(base + '#/' + item.id)
    await page.locator('#stage canvas').waitFor()
    await page.waitForTimeout(200)
    await page.touchscreen.tap(195, 370)
    await page.locator('[data-action="toggle-panel"]').tap()
    await page.locator('[data-action="toggle-panel"]').tap()
    await page.locator('[data-action="pause"]').tap()
    await page.locator('[data-action="reset"]').tap()
    assert.equal(
      await page.locator('[data-action="pause"]').textContent(),
      'Play',
    )
    console.log('PASS WebKit ' + item.id)
  }
  assert.deepEqual(errors, [])
} finally {
  await browser.close()
}
