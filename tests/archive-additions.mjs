import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

const base = process.env.STIMTOK_TEST_URL || 'http://127.0.0.1:4173/StimTok/'
const dir = path.join(tmpdir(), 'stimtok-archive-additions')
await mkdir(dir, { recursive: true })
const browser = await chromium.launch(),
  page = await browser.newPage({ viewport: { width: 1100, height: 820 } }),
  errors = []
page.on('pageerror', (e) => errors.push(e.message))
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text())
})
const ids = [
  '025-voronoi-shift',
  '086-blackhole-accretion',
  '041-silk-cloth-ripple',
  '070-fractal-tree-zoom',
]
async function open(id) {
  await page.goto(`${base}#/${id}`)
  await page.locator('#stage canvas').waitFor()
  await page.waitForTimeout(250)
}
async function action(name) {
  await page.locator('[data-action="toggle-panel"]').click()
  await page.getByRole('button', { name }).click()
  await page.locator('[data-action="toggle-panel"]').click()
  await page.waitForTimeout(70)
}
async function drag(a, b, release = true) {
  await page.mouse.move(a.x, a.y)
  await page.mouse.down()
  await page.mouse.move(b.x, b.y, { steps: 12 })
  await page.waitForTimeout(100)
  if (release) await page.mouse.up()
}
async function pixels() {
  return page.locator('#stage canvas').evaluate((c) => c.toDataURL())
}
try {
  await page.goto(base)
  await page.evaluate(() => {
    localStorage.clear()
    localStorage.setItem('stimtok:sidebar-collapsed', 'true')
  })
  for (const id of ids) {
    await open(id)
    const b = await page.locator('#stage canvas').boundingBox()
    await page.locator('[data-action="pause"]').click()
    const before = await pixels()
    await drag(
      { x: b.x + b.width * 0.5, y: b.y + b.height * 0.46 },
      { x: b.x + b.width * 0.63, y: b.y + b.height * 0.55 },
      false,
    )
    // Cloth and shader toys must redraw while held, including when paused.
    if (['041-silk-cloth-ripple', '025-voronoi-shift'].includes(id))
      assert.notEqual(
        await pixels(),
        before,
        `${id}: pointer must change the actual visual`,
      )
    await page.screenshot({ path: path.join(dir, `${id}-contact.png`) })
    await page.mouse.up()
    await page.locator('[data-action="reset"]').click()
    await page.waitForTimeout(100)
    assert.equal(
      await page.locator('[data-action="pause"]').textContent(),
      'Play',
    )
    await page.locator('[data-action="pause"]').click()
    await page.screenshot({ path: path.join(dir, `${id}-idle.png`) })
  }
  await open('025-voronoi-shift')
  await action('Split cells')
  const box = await page.locator('#stage canvas').boundingBox()
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.45)
  await page.waitForTimeout(80)
  assert.ok(
    (await page.locator('.toy-actions button').first().textContent()).includes(
      '21',
    ),
  )
  await action('Merge cells')
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.45)
  await page.waitForTimeout(80)
  assert.ok(
    (await page.locator('.toy-actions button').first().textContent()).includes(
      '20',
    ),
  )
  await action('Undo')
  assert.ok(
    (await page.locator('.toy-actions button').first().textContent()).includes(
      '21',
    ),
  )
  await open('086-blackhole-accretion')
  await action('Seed orbits')
  assert.ok(
    (await page.locator('.toy-actions').textContent()).includes(
      'Clear orbits · 8',
    ),
  )
  await action(/Clear orbits/)
  assert.ok(
    (await page.locator('.toy-actions').textContent()).includes(
      'Clear orbits · 0',
    ),
  )
  await open('070-fractal-tree-zoom')
  await action('Grow a generation')
  assert.equal(
    await page
      .getByRole('slider', { name: 'Generations', includeHidden: true })
      .inputValue(),
    '10',
  )

  for (const width of [390, 844]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 390 })
    for (const id of ids) {
      await open(id)
      await page.screenshot({ path: path.join(dir, `${id}-${width}.png`) })
      await page.locator('[data-action="toggle-panel"]').click()
      const buttons = page.locator('.toy-actions button')
      for (let i = 0; i < (await buttons.count()); i++)
        await buttons.nth(i).click()
      await page.locator('[data-action="toggle-panel"]').click()
      const hint = await page.locator('.interaction-hint').boundingBox(),
        bar = await page.locator('.visual-controls').boundingBox()
      assert.ok(hint.y + hint.height <= bar.y)
    }
  }
  assert.deepEqual(errors, [])
  console.log(
    `PASS: four archive additions, visible contact response, cell split/merge/undo, orbits, tree controls, and portrait/landscape actions. Captures: ${dir}`,
  )
} finally {
  await browser.close()
}
