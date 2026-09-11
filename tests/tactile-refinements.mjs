import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1000, height: 800 } })
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
const base = process.env.STIMTOK_TEST_URL || 'http://127.0.0.1:4174/StimTok/'
const shots = `${process.env.TEMP}/stimtok-tactile-refinements`
await mkdir(shots, { recursive: true })
await page.addInitScript(() => {
  window.popStarts = 0
  const start = AudioBufferSourceNode.prototype.start
  AudioBufferSourceNode.prototype.start = function (...args) {
    window.popStarts++
    return start.apply(this, args)
  }
})
async function open(id) {
  await page.goto(base + '#/' + id)
  await page.locator('#stage canvas').waitFor()
  await page.waitForTimeout(300)
}
async function tune() {
  await page.locator('[data-action="toggle-panel"]').click()
}
try {
  await page.goto(base)
  await page.evaluate(() => {
    localStorage.clear()
    localStorage.setItem('stimtok:sidebar-collapsed', 'true')
  })
  await open('049-bubble-wrap-pop')
  await tune()
  await page.getByRole('button', { name: 'Sound: off', exact: true }).click()
  await tune()
  const c = await page.locator('#stage canvas').boundingBox()
  await page.mouse.move(c.x + 100, c.y + 180)
  await page.mouse.down()
  await page.mouse.move(c.x + 700, c.y + 180, { steps: 20 })
  await page.mouse.up()
  assert.ok(
    (await page.evaluate(() => window.popStarts)) > 0,
    'Enabled sound must synthesize pops',
  )
  await tune()
  await page.getByRole('button', { name: 'Sound: on', exact: true }).click()
  await tune()
  const starts = await page.evaluate(() => window.popStarts)
  await page.mouse.click(c.x + 180, c.y + 300)
  assert.equal(
    await page.evaluate(() => window.popStarts),
    starts,
    'Muted pops must be silent',
  )
  console.log('PASS sound on/off and synthesized playback')
  await open('047-playdoh-extruder')
  await tune()
  for (let i = 0; i < 4; i++)
    await page.getByRole('button', { name: 'Press', exact: true }).click()
  await tune()
  await page.waitForTimeout(1000)
  await page.screenshot({ path: shots + '/dough-before.png' })
  await page.getByRole('button', { name: '✂ Cut strands', exact: true }).click()
  await page.waitForTimeout(350)
  await page.screenshot({ path: shots + '/dough-falling.png' })
  await page.waitForTimeout(2000)
  await page.screenshot({ path: shots + '/dough-settled.png' })
  assert.ok(
    await page
      .getByRole('button', { name: '✂ Cut strands', exact: true })
      .isDisabled(),
  )
  await tune()
  for (let i = 0; i < 4; i++)
    await page.getByRole('button', { name: 'Press', exact: true }).click()
  await tune()
  await page.waitForTimeout(1000)
  const dough = await page.locator('#stage canvas').boundingBox()
  await page.mouse.move(
    dough.x + dough.width * 0.5,
    dough.y + dough.height * 0.45,
  )
  await page.mouse.down()
  await page.mouse.move(
    dough.x + dough.width * 0.7,
    dough.y + dough.height * 0.45,
    { steps: 12 },
  )
  await page.mouse.up()
  await page.waitForTimeout(100)
  assert.ok(
    await page
      .getByRole('button', { name: '✂ Cut strands', exact: true })
      .isDisabled(),
    'Sideways swipe cuts strands',
  )
  console.log('PASS direct swipe cutting')
  await open('053-stress-ball-squish')
  const ball = await page.locator('#stage canvas').boundingBox()
  await page.screenshot({ path: shots + '/ball-before.png' })
  await page.mouse.move(ball.x + ball.width * 0.5, ball.y + ball.height * 0.5)
  await page.mouse.down()
  await page.waitForTimeout(800)
  await page.screenshot({ path: shots + '/ball-squeezed.png' })
  await page.mouse.up()
  await open('069-spirograph-loop')
  await tune()
  await page.locator('[data-control="speed"]').fill('2')
  await tune()
  await page.waitForTimeout(22000)
  await page.screenshot({ path: shots + '/spirograph.png' })
  await tune()
  assert.equal(
    await page.getByRole('button', { name: 'Motor: on', exact: true }).count(),
    1,
  )
  await page.getByRole('button', { name: 'Motor: on', exact: true }).click()
  await tune()
  await page.mouse.move(700, 380)
  await page.mouse.down()
  await page.mouse.move(500, 550, { steps: 20 })
  await page.mouse.up()
  await open('049-bubble-wrap-pop')
  const doc = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('stimtok:spirograph-document')),
  )
  assert.ok(
    doc.paths.length >= 2,
    'Spirograph must continue into additional layers',
  )
  assert.ok(
    doc.paths.at(-1).points.length > 0,
    'Manual gear still draws after an automatic cycle',
  )
  console.log(
    'PASS continuous Spirograph and manual drawing; captured dough and squeeze states',
  )
  assert.deepEqual(errors, [])
} finally {
  await browser.close()
}
