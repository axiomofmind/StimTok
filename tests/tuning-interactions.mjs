import assert from 'node:assert/strict'
import { chromium } from 'playwright'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
const base = 'http://127.0.0.1:4174/StimTok/'
async function open(id) {
  await page.goto(base + '?id=' + id + '#/' + id)
  await page.locator('#stage canvas').waitFor()
  await page.waitForTimeout(250)
}
try {
  await open('015-prism-refraction')
  const before = await page.locator('[data-setting="dispersion"]').inputValue()
  const r = await page.locator('#stage canvas').boundingBox()
  await page.mouse.move(r.x + r.width * 0.25, r.y + r.height * 0.45)
  await page.mouse.down()
  await page.mouse.move(r.x + r.width * 0.8, r.y + r.height * 0.45, {
    steps: 12,
  })
  await page.mouse.up()
  await page.waitForTimeout(200)
  const after = await page.locator('[data-setting="dispersion"]').inputValue()
  assert.notEqual(before, after, 'Prism dragging updates the spectrum control')
  await page.waitForTimeout(400)
  assert.equal(
    await page.locator('[data-setting="dispersion"]').inputValue(),
    after,
    'Spectrum width is not overwritten after release',
  )
  await open('066-wireframe-morph')
  await page.getByRole('button', { name: 'Sculpt', exact: true }).click()
  await page.locator('[data-action="pause"]').click()
  const wirePixels = () => page.locator('#stage canvas').evaluate(c => c.toDataURL())
  const initialWire = await wirePixels()
  await page.mouse.move(r.x + r.width * 0.5, r.y + r.height * 0.5)
  await page.mouse.down()
  await page.mouse.move(r.x + r.width * 0.5, r.y + r.height * 0.35, {
    steps: 12,
  })
  await page.mouse.up()
  await page.waitForTimeout(200)
  const sculptedWire = await wirePixels()
  assert.notEqual(sculptedWire, initialWire, 'Sculpt must deform the cage')
  await page.waitForTimeout(400)
  assert.equal(await wirePixels(), sculptedWire, 'Released sculpt must persist')
  await open('043-ink-fluid-art')
  await page.locator('[data-action="toggle-panel"]').click()
  await page.getByRole('button', { name: 'Deep ink', exact: true }).click()
  assert.equal(
    await page
      .getByRole('button', { name: 'Drop ink', exact: true })
      .getAttribute('aria-pressed'),
    'true',
  )
  await page.getByRole('button', { name: 'Stir', exact: true }).click()
  assert.equal(
    await page
      .getByRole('button', { name: 'Drop ink', exact: true })
      .getAttribute('aria-pressed'),
    'false',
  )
  await open('001-ceiling-fan')
  await page.getByRole('button', { name: 'Motor: on', exact: true }).click()
  assert.equal(
    await page
      .getByRole('button', { name: 'Motor: off', exact: true })
      .getAttribute('aria-pressed'),
    'false',
  )
  await open('032-koi-pond-ripples')
  await page
    .getByRole('button', { name: 'Move lily pads', exact: true })
    .click()
  await page.getByRole('button', { name: 'Ripples', exact: true }).click()
  assert.equal(
    await page
      .getByRole('button', { name: 'Ripples', exact: true })
      .getAttribute('aria-pressed'),
    'true',
  )
  console.log(
    'PASS: direct Prism/Wireframe controls, ink mode feedback, fan switches, and pond tools',
  )
} finally {
  await browser.close()
}
