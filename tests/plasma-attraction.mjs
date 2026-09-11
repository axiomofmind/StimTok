import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1100, height: 800 } })
const errors = []
page.on('pageerror', e => errors.push(e.message))
// Observe the nine rendered filament endpoint glows, without production hooks.
await page.addInitScript(() => {
  const arc = CanvasRenderingContext2D.prototype.arc
  CanvasRenderingContext2D.prototype.arc = function(x, y, radius, ...rest) {
    if (radius === 16 && this.canvas.closest('#stage')) {
      window.plasmaEnds ||= []
      window.plasmaEnds.push({ x, y })
      if (window.plasmaEnds.length > 9) window.plasmaEnds.shift()
    }
    return arc.call(this, x, y, radius, ...rest)
  }
})
try {
  await page.goto('http://127.0.0.1:4174/StimTok/#/065-plasma-ball')
  await page.locator('#stage canvas').waitFor()
  await page.waitForTimeout(300)
  const rect = await page.locator('#stage canvas').boundingBox()
  const cx = rect.width / 2, cy = rect.height / 2
  const radius = Math.min(rect.width, rect.height) * 0.4 * 0.96
  for (const angle of [-0.7, 2.8]) {
    const x = cx + Math.cos(angle) * radius, y = cy + Math.sin(angle) * radius
    await page.mouse.move(rect.x + x, rect.y + y)
    if (angle === -0.7) await page.mouse.down()
    await page.waitForTimeout(1500)
    const ends = await page.evaluate(() => window.plasmaEnds)
    assert.equal(ends.length, 9)
    ends.forEach((end, i) => assert.ok(Math.hypot(end.x - x, end.y - y) < 4,
      `Filament ${i + 1} must follow the touch point`))
  }
  await page.mouse.up()
  assert.deepEqual(errors, [])
  console.log('PASS: all nine plasma branches converge on the held and dragged touch point')
} finally { await browser.close() }
