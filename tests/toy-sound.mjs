import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1000, height: 800 } })
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
const base = process.env.STIMTOK_TEST_URL || 'http://127.0.0.1:4174/StimTok/'
await page.addInitScript(() => {
  window.soundStarts = 0
  window.soundContexts = []
  const Original = window.AudioContext
  window.AudioContext = class extends Original {
    constructor(...args) {
      super(...args)
      window.soundContexts.push(this)
    }
  }
  const start = AudioBufferSourceNode.prototype.start
  AudioBufferSourceNode.prototype.start = function (...args) {
    window.soundStarts++
    return start.apply(this, args)
  }
})
const count = () => page.evaluate(() => window.soundStarts)
async function open(id) {
  await page.goto(base + '#/' + id)
  await page.reload()
  await page.locator('#stage canvas').waitFor()
  await page.waitForTimeout(400)
}
async function action(name) {
  const button = page.getByRole('button', { name, exact: true })
  if (!(await button.isVisible()))
    await page.locator('[data-action="toggle-panel"]').click()
  await button.click()
}
try {
  await page.goto(base)
  await page.evaluate(() => {
    localStorage.clear()
    localStorage.setItem('stimtok:sidebar-collapsed', 'true')
  })
  await open('049-bubble-wrap-pop')
  assert.equal(await page.evaluate(() => window.soundContexts.length), 0)
  await action('Sound: off')
  const cases = [
    [
      '049-bubble-wrap-pop',
      async () => {
        await page.mouse.move(100, 200)
        await page.mouse.down()
        await page.mouse.move(800, 200, { steps: 30 })
        await page.mouse.up()
      },
    ],
    [
      '045-slime-stretch',
      async () => {
        await action('Scatter')
        await page.waitForTimeout(300)
        await action('Gather')
      },
    ],
    ['101-jelly-pal', () => action('Hop')],
    ['044-soap-cutting', () => action('Shave a strip')],
    [
      '047-playdoh-extruder',
      async () => {
        await action('Press')
        await page.waitForTimeout(500)
        await action('✂ Cut strands')
      },
    ],
    ['032-koi-pond-ripples', () => page.mouse.click(450, 300)],
  ]
  for (const [id, interact] of cases) {
    await open(id)
    assert.equal(await count(), 0, id + ' silent on mount')
    assert.equal(await page.evaluate(() => window.soundContexts.length), 0)
    await interact()
    await page.waitForTimeout(700)
    assert.ok((await count()) > 0, id + ' produces interaction audio')
    await action('Sound: on')
    const muted = await count()
    await interact()
    await page.waitForTimeout(500)
    assert.equal(await count(), muted, id + ' mute')
    await action('Sound: off')
    console.log('PASS ' + id)
  }
  await page.locator('[data-action="toggle-panel"]').click()
  await page.getByRole('slider', { name: 'Master volume' }).fill('0')
  const silent = await count()
  await page.mouse.click(650, 300)
  assert.equal(await count(), silent)
  await page.evaluate(() => {
    location.hash = '#/101-jelly-pal'
  })
  await page.waitForTimeout(700)
  assert.equal(
    await page.evaluate(() => window.soundContexts[0].state),
    'closed',
  )
  assert.equal(
    await page.locator('input[aria-label="Master volume"]').inputValue(),
    '0',
  )
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 })
    const bounds = await page.locator('[data-action="sound"]').boundingBox()
    assert.ok(
      bounds.x >= 0 && bounds.x + bounds.width <= width,
      'mobile sound control fits',
    )
  }
  assert.deepEqual(errors, [])
  const unsupported = await browser.newPage()
  await unsupported.addInitScript(() => {
    window.AudioContext = undefined
    window.webkitAudioContext = undefined
  })
  await unsupported.goto(base + '#/049-bubble-wrap-pop')
  assert.ok(
    await unsupported
      .getByRole('button', { name: 'Sound unavailable' })
      .isDisabled(),
  )
  await unsupported.close()
  console.log(
    'PASS volume persistence, route cleanup, mobile layout, no runtime errors',
  )
} finally {
  await browser.close()
}
