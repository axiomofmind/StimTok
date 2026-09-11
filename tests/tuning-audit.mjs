import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { manifest } from '../src/manifest.js'
import { toyTuning } from '../src/lib/toy-tuning.js'
import { readFile, mkdir } from 'node:fs/promises'
const base = process.env.STIMTOK_TEST_URL || 'http://127.0.0.1:4174/StimTok/'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text())
})
const out = process.env.TEMP + '/stimtok-tuning-audit'
await mkdir(out, { recursive: true })
try {
  await page.goto(base)
  await page.evaluate(() => localStorage.clear())
  assert.equal(Object.keys(toyTuning).length, manifest.length)
  for (const item of manifest) {
    const preset = toyTuning[item.id]
    assert.ok(preset?.note, item.id + ' has a reviewed preset')
    await page.goto(base + '?tuning-audit=' + item.id + '#/' + item.id)
    await page.locator('#stage canvas').waitFor()
    await page.waitForTimeout(180)
    for (const label of preset.quick || []) {
      assert.ok(
        await page
          .locator('.quick-actions')
          .evaluate(
            (el, label) =>
              [...el.querySelectorAll('button')].some(
                (b) => b.dataset.toyAction === label,
              ),
            label,
          ),
        item.id + ' quick action ' + label,
      )
    }
    if (preset.quick?.length) {
      const box = await page.locator('.quick-actions').boundingBox()
      assert.ok(
        box.x >= 0 && box.x + box.width <= 391,
        'Quick tools fit on phone',
      )
    }
    await page.locator('[data-action="toggle-panel"]').click()
    const original = await page
      .locator('input[data-setting]')
      .evaluateAll((inputs) =>
        Object.fromEntries(
          inputs.map((i) => [i.dataset.setting, Number(i.value)]),
        ),
      )
    for (const [key, value] of Object.entries(preset.custom || {}))
      assert.equal(original[key], value, item.id + ' default ' + key)
    if (preset.intensityControl === false)
      assert.ok(await page.locator('[data-control="intensity"]').isHidden())
    if (preset.speedControl === false)
      assert.ok(await page.locator('[data-control="speed"]').isHidden())
    const source = await readFile(
      new URL('../src/visuals/' + item.id + '.js', import.meta.url),
      'utf8',
    )
    for (const key of Object.keys(original)) {
      assert.ok(
        new RegExp('state\\.' + key + '\\b').test(source),
        item.id + ' must consume setting ' + key,
      )
      const input = page.locator('[data-setting="' + key + '"]')
      assert.equal(
        await input.evaluate((i) => i.validity.stepMismatch),
        false,
        item.id + ' valid slider step ' + key,
      )
      await input.fill(await input.getAttribute('max'))
    }
    await page.locator('[data-action="defaults"]').click()
    const restored = await page
      .locator('input[data-setting]')
      .evaluateAll((inputs) =>
        Object.fromEntries(
          inputs.map((i) => [i.dataset.setting, Number(i.value)]),
        ),
      )
    assert.deepEqual(
      restored,
      original,
      item.id + ' restores reviewed defaults',
    )
    await page.locator('[data-action="toggle-panel"]').click()
    if (
      [
        '025-voronoi-shift',
        '102-bloom-brush',
        '049-bubble-wrap-pop',
        '041-silk-cloth-ripple',
      ].includes(item.id)
    )
      await page.screenshot({ path: out + '/' + item.id + '.png' })
    console.log(
      'PASS ' + item.id + ' defaults, control wiring, restore and phone tools',
    )
  }
  // A user preference survives the preset rollout, remount, and restart.
  await page.evaluate(() =>
    localStorage.setItem(
      'stimtok:toy:100-sensory-ball-ripple',
      JSON.stringify({
        custom: { firmness: 1.4, waveSpeed: 3.1 },
        speed: 1.3,
        intensity: 0.8,
        palette: 1,
      }),
    ),
  )
  await page.goto(base + '?saved=1#/100-sensory-ball-ripple')
  await page.locator('[data-setting="firmness"]').waitFor({ state: 'attached' })
  assert.equal(
    await page.locator('[data-setting="firmness"]').inputValue(),
    '1.4',
  )
  assert.equal(await page.locator('[data-control="speed"]').inputValue(), '1.3')
  await page.locator('[data-action="reset"]').click()
  await page.waitForTimeout(200)
  assert.equal(
    await page.locator('[data-setting="firmness"]').inputValue(),
    '1.4',
  )
  assert.deepEqual(errors, [])
  console.log(
    'PASS saved user preferences survive curated defaults and restart',
  )
} finally {
  await browser.close()
}
