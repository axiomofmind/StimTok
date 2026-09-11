import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1100, height: 800 } })
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
const base = 'http://127.0.0.1:4174/StimTok/'
const out = process.env.TEMP + '/stimtok-ink-silk'
await mkdir(out, { recursive: true })
try {
  await page.goto(base + '#/043-ink-fluid-art')
  await page.locator('#stage canvas').waitFor()
  await page.waitForTimeout(600)
  const pixels = () =>
    page.locator('#stage canvas').evaluate((c) => c.toDataURL())
  const first = await pixels()
  await page.waitForTimeout(2500)
  assert.notEqual(
    await pixels(),
    first,
    'Ink must have a current without pointer input',
  )
  const rect = await page.locator('#stage canvas').boundingBox()
  await page.mouse.move(
    rect.x + rect.width * 0.5 + 50,
    rect.y + rect.height * 0.5,
  )
  await page.mouse.down()
  for (let i = 1; i <= 60; i++) {
    const a = (i / 60) * Math.PI * 4
    await page.mouse.move(
      rect.x + rect.width * 0.5 + Math.cos(a) * 50,
      rect.y + rect.height * 0.5 + Math.sin(a) * 50,
    )
  }
  await page.mouse.up()
  await page.waitForTimeout(2000)
  await page.screenshot({ path: out + '/ink-stirred.png' })
  await page.locator('[data-action="pause"]').click()
  const still = await pixels()
  await page.waitForTimeout(300)
  assert.equal(await pixels(), still, 'Paused ink must stop')
  await page.locator('[data-action="toggle-panel"]').click()
  const metallic = page
    .getByText('Metallic sheen', { exact: false })
    .locator('input')
  await metallic.fill('0')
  await page.waitForTimeout(100)
  assert.notEqual(
    await pixels(),
    still,
    'Metallic slider changes rendered lighting',
  )
  await page.goto(base + '#/041-silk-cloth-ripple')
  await page.waitForTimeout(500)
  const silk = await page.locator('#stage canvas').boundingBox()
  await page.mouse.move(silk.x + silk.width * 0.5, silk.y + silk.height * 0.55)
  await page.mouse.down()
  await page.mouse.move(
    silk.x + silk.width * 0.65,
    silk.y + silk.height * 0.65,
    { steps: 20 },
  )
  await page.waitForTimeout(300)
  await page.screenshot({ path: out + '/silk-pulled.png' })
  await page.mouse.up()
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(base + '#/043-ink-fluid-art')
  await page.waitForTimeout(1500)
  await page.screenshot({ path: out + '/ink-mobile.png' })
  assert.deepEqual(errors, [])
  console.log(
    'PASS: ink current, stir, pause, metallic control, silk grab, and mobile rendering',
  )
} finally {
  await browser.close()
}
