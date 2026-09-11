// Run against a local Vite development or preview server: npm run test:smoke
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { chromium } from 'playwright'
import { manifest } from '../src/manifest.js'

const base = process.env.STIMTOK_TEST_URL || 'http://127.0.0.1:4173/StimTok/'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1100, height: 800 } })
const failures = []
page.on('pageerror', (error) => failures.push(error.message))
page.on('console', (message) => {
  if (message.type() === 'error') failures.push(message.text())
})

async function open(id) {
  await page.goto(`${base}#/${id}`)
  await page.locator('#stage canvas').waitFor()
  await page.waitForTimeout(150)
}

try {
  await page.goto(base)
  await page.evaluate(() => {
    localStorage.clear()
    localStorage.setItem('stimtok:sidebar-collapsed', 'true')
  })
  await page.reload()
  for (const item of manifest) {
    await open(item.id)
    assert.equal(await page.locator('#stage canvas').count(), 1, item.id)
    const rect = await page.locator('#stage canvas').boundingBox()
    await page.mouse.move(
      rect.x + rect.width * 0.5,
      rect.y + rect.height * 0.45,
    )
    await page.mouse.down()
    await page.mouse.move(
      rect.x + rect.width * 0.6,
      rect.y + rect.height * 0.5,
      { steps: 5 },
    )
    await page.mouse.up()
    await page.locator('[data-action="pause"]').click()
    await page.locator('[data-action="reset"]').click()
    await page.waitForTimeout(180)
    assert.equal(
      await page.locator('[data-action="pause"]').textContent(),
      'Play',
      `${item.id}: preserve manual pause on restart`,
    )
    console.log(`PASS ${item.id}`)
  }

  // Popping is user-owned: an unattended sheet must not change.
  await open('049-bubble-wrap-pop')
  const fresh = await page
    .locator('.toy-actions button')
    .filter({ hasText: /^New sheet/ })
    .textContent()
  await page.waitForTimeout(1800)
  assert.equal(
    await page
      .locator('.toy-actions button')
      .filter({ hasText: /^New sheet/ })
      .textContent(),
    fresh,
  )
  const rect = await page.locator('#stage canvas').boundingBox()
  await page.mouse.click(rect.x + rect.width / 2, rect.y + rect.height / 2)
  await page.waitForTimeout(50)
  assert.notEqual(
    await page
      .locator('.toy-actions button')
      .filter({ hasText: /^New sheet/ })
      .textContent(),
    fresh,
  )

  // Bloom document must survive resize, leaving the toy, and returning.
  await open('102-bloom-brush')
  const canvas = await page.locator('#stage canvas').boundingBox()
  await page.mouse.move(canvas.x + 120, canvas.y + 130)
  await page.mouse.down()
  await page.mouse.move(canvas.x + 320, canvas.y + 250, { steps: 12 })
  await page.mouse.up()
  const before = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('stimtok:bloom-document')),
  )
  assert.ok(before.stems.length > 10)
  await page.locator('[data-action="pause"]').click()
  await page.setViewportSize({ width: 390, height: 844 })
  await page.waitForTimeout(100)
  await open('100-sensory-ball-ripple')
  await open('102-bloom-brush')
  await open('100-sensory-ball-ripple')
  const after = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('stimtok:bloom-document')),
  )
  assert.equal(after.stems.length, before.stems.length)
  assert.equal(after.flowers.length, before.flowers.length)

  // Custom controls survive navigation; explicit Restart does not reload old art.
  await open('068-liquid-metal-metaball')
  await page.locator('[data-action="toggle-panel"]').click()
  await page.getByRole('slider', { name: 'Viscosity', exact: true }).fill('4')
  await open('100-sensory-ball-ripple')
  await open('068-liquid-metal-metaball')
  assert.equal(
    await page
      .getByRole('slider', {
        name: 'Viscosity',
        exact: true,
        includeHidden: true,
      })
      .inputValue(),
    '4',
  )

  await open('102-bloom-brush')
  await page.locator('[data-action="reset"]').click()
  await page.waitForTimeout(100)
  await open('100-sensory-ball-ripple')
  const restarted = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('stimtok:bloom-document')),
  )
  assert.ok(
    restarted.stems.length < after.stems.length,
    'Restart should create a new garden',
  )

  // Mobile navigation must be inactive when closed and modal when open.
  assert.equal(await page.locator('#sidebar').evaluate((el) => el.inert), true)
  await page.locator('#sidebar-toggle').click()
  assert.equal(
    await page
      .locator('#search')
      .evaluate((el) => document.activeElement === el),
    false,
    'Opening the mobile sidebar must not focus Search or summon the keyboard',
  )
  assert.equal(
    await page.locator('#workspace').evaluate((el) => el.inert),
    true,
  )
  await page.locator('#search').fill('no-such-toy')
  assert.ok(
    (await page.locator('#menu').textContent()).includes('No toys found'),
  )
  await page.keyboard.press('Escape')
  assert.equal(
    await page.locator('#workspace').evaluate((el) => el.inert),
    false,
  )
  const controls = await page.locator('.visual-controls').boundingBox()
  const hint = await page.locator('.interaction-hint').boundingBox()
  assert.ok(hint.y + hint.height <= controls.y, 'Instructions overlap toolbar')

  await page.goto(`${base}#/missing-toy`)
  await page.locator('.recovery').waitFor()
  assert.equal(await page.locator('#stage canvas').count(), 0)

  // Exercise the shared input layer independently of any one toy or renderer.
  const interactionSource = await readFile(
    new URL('../src/lib/interaction.js', import.meta.url),
    'utf8',
  )
  const inputChecks = await page.evaluate(async (source) => {
    const { createInteraction } = await import(
      'data:text/javascript;charset=utf-8,' + encodeURIComponent(source)
    )
    const container = document.createElement('div'),
      surface = document.createElement('canvas')
    document.body.append(container)
    container.append(surface)
    surface.setPointerCapture = surface.releasePointerCapture = () => {}
    const input = createInteraction(container, surface),
      events = []
    input.on((e) => events.push({ type: e.type, speed: e.speed }))
    const fire = (type, id, x) =>
      surface.dispatchEvent(
        new PointerEvent(type, {
          pointerId: id,
          pointerType: 'touch',
          clientX: x,
          clientY: 30,
          button: 0,
          bubbles: true,
        }),
      )
    fire('pointerdown', 1, 30)
    fire('pointerdown', 2, 80)
    const twoContacts = input.state.contacts.length === 2
    fire('pointermove', 1, 130)
    fire('pointercancel', 1, 130)
    fire('pointerup', 2, 80)
    const cancelled =
      events.some((e) => e.type === 'cancel' && e.speed === 0) &&
      !events.some((e) => e.type === 'fling' || e.type === 'tap') &&
      !input.state.down &&
      input.state.contacts.length === 0
    events.length = 0
    fire('pointerdown', 3, 30)
    fire('pointerup', 3, 30)
    fire('pointerdown', 4, 30)
    fire('pointerup', 4, 30)
    const noDestructiveDoubleTap =
      events.filter((e) => e.type === 'tap').length === 2 &&
      !events.some((e) => e.type === 'doubletap')
    input.dispose()
    container.remove()
    return { twoContacts, cancelled, noDestructiveDoubleTap }
  }, interactionSource)
  assert.deepEqual(inputChecks, {
    twoContacts: true,
    cancelled: true,
    noDestructiveDoubleTap: true,
  })
  assert.deepEqual(failures, [], 'Browser errors')
  console.log(
    `PASS: all ${manifest.length} routes, gestures, paused restart, artwork persistence, phone UI, search, and invalid-route recovery`,
  )
} finally {
  await browser.close()
}
