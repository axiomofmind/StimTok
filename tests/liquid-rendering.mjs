import assert from 'node:assert/strict'
import { chromium, webkit } from 'playwright'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const base = process.env.STIMTOK_TEST_URL || 'http://127.0.0.1:4174/StimTok/'
for (const engine of [chromium, webkit]) {
  const browser = await engine.launch()
  try {
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 3, isMobile: true, hasTouch: true,
    })
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text())
    })
    await page.addInitScript(() => {
      const original = CanvasRenderingContext2D.prototype.drawImage
      CanvasRenderingContext2D.prototype.drawImage = function (source, ...args) {
        if (this.canvas.closest('#stage') && source instanceof HTMLCanvasElement)
          window.inkSource = { w: source.width, h: source.height }
        return original.call(this, source, ...args)
      }
    })
    for (const id of ['048-paint-pour-marble', '073-holographic-shimmer', '043-ink-fluid-art']) {
      await page.goto(base + '#/' + id)
      await page.locator('#stage canvas').waitFor()
      await page.waitForTimeout(400)
      await page.touchscreen.tap(195, 350)
      await page.locator('[data-action="pause"]').click()
      await page.locator('#stage').screenshot({ path: join(tmpdir(), `${engine.name()}-${id}-fixed.png`) })
      if (id === '043-ink-fluid-art') {
        const inspect = () => page.evaluate(() => {
          const canvas = document.querySelector('#stage canvas')
          return { ...window.inkSource, aspect: canvas.clientWidth / canvas.clientHeight }
        })
        const balanced = await inspect()
        assert.ok(Math.abs(balanced.w / balanced.h - balanced.aspect) < 0.005)
        assert.ok(balanced.h > 480, 'Portrait ink should exceed the old height cap')
        await page.locator('#quality').selectOption('high', { force: true })
        await page.waitForTimeout(200)
        const high = await inspect()
        assert.ok(high.w * high.h > balanced.w * balanced.h, 'Quality must increase source resolution')
        await page.setViewportSize({ width: 844, height: 390 })
        await page.waitForTimeout(200)
        const landscape = await inspect()
        assert.ok(Math.abs(landscape.w / landscape.h - landscape.aspect) < 0.005)
        const pixels = () => page.locator('#stage canvas').evaluate((canvas) => canvas.toDataURL())
        const still = await pixels()
        await page.waitForTimeout(200)
        assert.equal(await pixels(), still, 'Resized paused pigment must remain stable')
        console.log(engine.name(), { balanced, high, landscape })
      }
    }
    assert.deepEqual(errors, [])
    console.log(`PASS ${engine.name()}: liquid shaders, ink quality, aspect ratio, resize and pause`)
  } finally {
    await browser.close()
  }
}
