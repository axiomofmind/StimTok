import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'
import { manifest } from '../src/manifest.js'

const base = process.env.STIMTOK_TEST_URL || 'http://127.0.0.1:4174/StimTok/'
const filter = process.env.STIMTOK_TOY_FILTER
const selected = manifest.filter((item) => !filter || item.id === filter)
assert.ok(selected.length, 'Toy filter must match an active visual')
const out = `${process.env.TEMP}/stimtok-mobile-audit${filter ? '-' + filter : ''}`
await mkdir(out, { recursive: true })
const browser = await chromium.launch()
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
})
const page = await context.newPage()
const cdp = await context.newCDPSession(page)
const failures = [],
  report = []
let current = ''
page.on('pageerror', (e) => failures.push(`${current}: ${e.message}`))
page.on('console', (e) => {
  if (e.type() === 'error') failures.push(`${current}: ${e.text()}`)
})
async function touch(type, points) {
  await cdp.send('Input.dispatchTouchEvent', {
    type,
    touchPoints: points.map(([x, y], id) => ({
      x,
      y,
      id,
      radiusX: 8,
      radiusY: 8,
      force: 0.6,
    })),
  })
}
async function drag(two = false, cancel = false) {
  const r = await page.locator('#stage canvas').boundingBox()
  const points = (i) => [
    [r.x + r.width * (0.45 + i * 0.015), r.y + r.height * (0.4 + i * 0.007)],
    ...(two
      ? [[r.x + r.width * (0.65 - i * 0.015), r.y + r.height * 0.55]]
      : []),
  ]
  await touch('touchStart', points(0))
  for (let i = 2; i <= 10; i += 2) {
    await touch('touchMove', points(i))
    await page.waitForTimeout(16)
  }
  await touch(cancel ? 'touchCancel' : 'touchEnd', [])
}
async function layout(label) {
  const issues = await page.evaluate(() => {
    const issues = [],
      w = innerWidth,
      h = innerHeight
    if (document.documentElement.scrollWidth > w + 1)
      issues.push('document horizontal overflow')
    const cut = document.querySelector('.dough-cut')?.getBoundingClientRect()
    const quick = document
      .querySelector('.dough-tools')
      ?.getBoundingClientRect()
    if (
      cut &&
      quick &&
      cut.left < quick.right &&
      cut.right > quick.left &&
      cut.top < quick.bottom &&
      cut.bottom > quick.top
    )
      issues.push('Dough cut button overlaps quick tools')
    for (const el of document.querySelectorAll(
      '.control-bar button, .quick-actions button, #stage > button, #stage > div:not(.visual-controls):not(.interaction-hint) button',
    )) {
      const r = el.getBoundingClientRect()
      if (!r.width || !r.height || el.closest('[hidden]')) continue
      if (r.left < -1 || r.right > w + 1 || r.top < -1 || r.bottom > h + 1)
        issues.push(`${el.textContent}: offscreen`)
      const hit = document.elementFromPoint(
        r.x + r.width / 2,
        r.y + r.height / 2,
      )
      if (hit && !el.contains(hit))
        issues.push(
          `${el.textContent}: obscured by ${hit.className || hit.tagName}`,
        )
    }
    return issues
  })
  failures.push(...issues.map((i) => `${current} ${label}: ${i}`))
}
try {
  await page.goto(base)
  await page.evaluate(() => {
    localStorage.clear()
    localStorage.setItem('stimtok:sidebar-collapsed', 'true')
  })
  for (const item of selected) {
    current = item.id
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(base + '#/' + item.id)
    await page.locator('#stage canvas').waitFor()
    await page.waitForTimeout(250)
    await layout('portrait')
    await page.screenshot({ path: `${out}/${item.id}.png` })
    for (const button of await page.locator('.quick-actions button').all()) {
      await button.scrollIntoViewIfNeeded()
      await button.tap()
    }
    await page.evaluate(() => {
      window.touchAudit = []
      for (const type of [
        'pointerdown',
        'pointermove',
        'pointerup',
        'pointercancel',
      ])
        document
          .querySelector('#stage canvas')
          .addEventListener(type, (e) =>
            window.touchAudit.push([type, e.pointerType]),
          )
    })
    await drag()
    await drag(true)
    await drag(false, true)
    await page.touchscreen.tap(195, 320)
    const events = await page.evaluate(() => window.touchAudit)
    for (const type of [
      'pointerdown',
      'pointermove',
      'pointerup',
      'pointercancel',
    ])
      if (!events.some((e) => e[0] === type && e[1] === 'touch'))
        failures.push(`${current}: missing ${type}`)
    await page.locator('[data-action="pause"]').tap()
    await page.locator('[data-action="reset"]').tap()
    assert.equal(
      await page.locator('[data-action="pause"]').textContent(),
      'Play',
    )
    await page.locator('[data-action="pause"]').tap()
    await page.locator('[data-action="toggle-panel"]').tap()
    for (const input of await page.locator('input[data-setting]').all()) {
      await input.scrollIntoViewIfNeeded()
      const box = await input.boundingBox()
      await page.touchscreen.tap(
        box.x + box.width * 0.6,
        box.y + box.height / 2,
      )
    }
    await page.locator('[data-action="toggle-panel"]').tap()
    for (const [width, height] of [
      [320, 568],
      [844, 390],
    ]) {
      await page.setViewportSize({ width, height })
      await page.waitForTimeout(160)
      await layout(`${width}x${height}`)
      await drag()
      await page.screenshot({ path: `${out}/${item.id}-${width}.png` })
    }
    report.push({ id: item.id, touchEvents: events.length })
    await writeFile(
      `${out}/report.json`,
      JSON.stringify({ report, failures }, null, 2),
    )
    console.log('CHECKED ' + item.id)
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await page.locator('#sidebar-toggle').tap()
  assert.equal(
    await page
      .locator('#search')
      .evaluate((el) => document.activeElement === el),
    false,
  )
  assert.equal(
    await page.locator('#workspace').evaluate((el) => el.inert),
    true,
  )
  await page.locator('#sidebar-toggle').tap()
  assert.equal(
    await page.locator('#workspace').evaluate((el) => el.inert),
    false,
  )
  await writeFile(
    `${out}/report.json`,
    JSON.stringify({ report, failures }, null, 2),
  )
  assert.deepEqual(failures, [])
  console.log(`PASS all ${selected.length} mobile visuals; screenshots: ${out}`)
} finally {
  await browser.close()
}
