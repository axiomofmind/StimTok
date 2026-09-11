import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1000, height: 800 } })
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
const base = 'http://127.0.0.1:4174/StimTok/'
const out = process.env.TEMP + '/stimtok-bead-review'
await mkdir(out, { recursive: true })
try {
  await page.goto(base + '#/045-slime-stretch')
  await page.locator('#stage canvas').waitFor()
  await page.waitForTimeout(700)
  await page.screenshot({ path: out + '/gecko.png' })
  await page.getByRole('button', { name: 'Scatter', exact: true }).click()
  await page.waitForTimeout(350)
  await page.screenshot({ path: out + '/scattered.png' })
  await page.waitForTimeout(4000)
  await page.getByRole('button', { name: 'Gecko ↻', exact: true }).click()
  await page.waitForTimeout(3000)
  await page.screenshot({ path: out + '/octopus.png' })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.waitForTimeout(500)
  await page.screenshot({ path: out + '/mobile.png' })
  const box = await page.locator('#stage canvas').boundingBox()
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.4)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.55, {
    steps: 15,
  })
  await page.mouse.up()
  await page.getByRole('button', { name: 'Gather', exact: true }).click()
  assert.deepEqual(errors, [])
  console.log(
    'PASS bead toy rendering, shape switching, scatter, drag, and mobile controls',
  )
} finally {
  await browser.close()
}
