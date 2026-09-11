import assert from 'node:assert/strict'
import { chromium } from 'playwright'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1000, height: 800 } })
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
page.on('console', (m) => {
  if (m.type() === 'error' && !m.text().includes('404')) errors.push(m.text())
})
const base = 'http://127.0.0.1:4174/StimTok/'
async function pixels() {
  return page.locator('#stage canvas').evaluate((c) => c.toDataURL())
}
async function drag() {
  const r = await page.locator('#stage canvas').boundingBox()
  await page.mouse.move(r.x + r.width * 0.4, r.y + r.height * 0.4)
  await page.mouse.down()
  await page.mouse.move(r.x + r.width * 0.65, r.y + r.height * 0.6, {
    steps: 12,
  })
  await page.mouse.up()
  await page.waitForTimeout(100)
}
try {
  for (const id of ['073-holographic-shimmer', '048-paint-pour-marble']) {
    await page.goto(base + '#/' + id)
    await page.locator('#stage canvas').waitFor()
    await page.waitForTimeout(700)
    await page.locator('[data-action="pause"]').click()
    const before = await pixels()
    await drag()
    assert.notEqual(await pixels(), before, id + ' reacts while paused')
    if (id.startsWith('048'))
      for (const mode of ['Comb', 'Tilt']) {
        await page.getByRole('button', { name: mode, exact: true }).click()
        const before = await pixels()
        await drag()
        assert.notEqual(
          await pixels(),
          before,
          mode + ' directly changes the paint',
        )
        assert.equal(
          await page
            .getByRole('button', { name: mode, exact: true })
            .getAttribute('aria-pressed'),
          'true',
        )
      }
    await page.locator('[data-action="reset"]').click()
    await page.waitForTimeout(200)
    assert.equal(
      await page.locator('[data-action="pause"]').textContent(),
      'Play',
    )
    await page.setViewportSize({ width: 390, height: 844 })
    await drag()
    await page.setViewportSize({ width: 1000, height: 800 })
    console.log(
      'PASS ' +
        id +
        ' interactions, paused manipulation, restart, phone layout',
    )
  }
  assert.deepEqual(errors, [])
} finally {
  await browser.close()
}
