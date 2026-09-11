import assert from 'node:assert/strict'
import { chromium, webkit } from 'playwright'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

for (const engine of [chromium, webkit]) {
  const browser = await engine.launch()
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
    const errors = []
    page.on('pageerror', e => errors.push(e.message))
    page.on('console', e => { if (e.type() === 'error') errors.push(e.text()) })
    async function open(id) {
      await page.goto('http://127.0.0.1:4174/StimTok/')
      await page.evaluate(async () => {
        const { THREE } = await import('/StimTok/src/lib/visual-kit.js')
        const add = THREE.Scene.prototype.add
        THREE.Scene.prototype.add = function (...objects) {
          window.testScene = this
          return add.apply(this, objects)
        }
      })
      await page.evaluate(id => { location.hash = '#/' + id }, id)
      await page.locator('#stage canvas').waitFor()
      await page.waitForFunction(() => window.testScene)
      await page.waitForTimeout(100)
    }
    await open('093-liquid-motion-timer')
    const timer = await page.evaluate(() => {
      const group = window.testScene.children.find(o => o.type === 'Group')
      return { angle: group.rotation.z, drops: group.children.filter(o => o.geometry?.type === 'SphereGeometry').map(o => o.position.y) }
    })
    assert.equal(timer.angle, Math.PI)
    assert.ok(timer.drops.every(y => y < -1.4), 'Drops start at the world-space top of the inverted timer')
    await page.getByRole('button', { name: 'Flip timer', exact: true }).click()
    await page.waitForTimeout(500)
    assert.ok(await page.evaluate(() => window.testScene.children.find(o => o.type === 'Group').rotation.z > Math.PI + 1))

    await open('053-stress-ball-squish')
    const bounds = () => page.evaluate(() => {
      const ball = window.testScene.children.find(o => o.geometry?.type === 'SphereGeometry')
      ball.geometry.computeBoundingBox()
      const { min, max } = ball.geometry.boundingBox
      return { width: max.x - min.x, height: max.y - min.y, bottom: min.y + ball.position.y }
    })
    const before = await bounds()
    const rect = await page.locator('#stage canvas').boundingBox()
    await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2)
    await page.mouse.down()
    await page.waitForTimeout(650)
    const squeezed = await bounds()
    assert.ok(squeezed.width < before.width * 0.8, 'Squeeze must narrow the silhouette')
    assert.ok(squeezed.height > before.height * 0.9, 'Squeeze must not merely flatten the ball')
    assert.ok(Math.abs(squeezed.bottom + 1.35) < 0.001, 'Deformed ball must rest on the table')
    await page.screenshot({ path: join(tmpdir(), `${engine.name()}-inward-squeeze.png`) })
    await page.mouse.up()
    await page.waitForTimeout(700)
    assert.ok((await bounds()).width > squeezed.width, 'Ball recovers after release')

    await open('066-wireframe-morph')
    const cage = () => page.evaluate(() => Array.from(window.testScene.children.find(o => o.type === 'LineSegments').geometry.attributes.position.array))
    const first = await cage()
    await page.waitForTimeout(400)
    assert.notDeepEqual(await cage(), first, 'Rotate mode must morph without automatic-play enabled')
    await page.getByRole('button', { name: 'Sculpt', exact: true }).click()
    await page.waitForTimeout(100)
    const original = await cage()
    await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2)
    await page.mouse.down()
    await page.mouse.move(rect.x + rect.width * 0.65, rect.y + rect.height * 0.43, { steps: 12 })
    await page.mouse.up()
    await page.waitForTimeout(100)
    const sculpted = await cage()
    assert.notDeepEqual(sculpted, original, 'Dragging must sculpt actual vertices')
    await page.waitForTimeout(500)
    assert.deepEqual(await cage(), sculpted, 'Sculpt must stay fixed after release while animation is running')
    await page.screenshot({ path: join(tmpdir(), `${engine.name()}-persistent-sculpt.png`) })
    await page.locator('[data-action="toggle-panel"]').click()
    await page.getByRole('button', { name: 'Clear sculpt', exact: true }).click()
    await page.waitForTimeout(100)
    assert.deepEqual(await cage(), original, 'Clear sculpt restores the frozen base')
    assert.deepEqual(errors, [])
    console.log(`PASS ${engine.name()}: inverted timer, inward squeeze/recovery, automatic morph and persistent sculpt`)
  } finally {
    await browser.close()
  }
}
