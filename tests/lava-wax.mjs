import assert from 'node:assert/strict'
import { createLavaWax, lampWidth } from '../src/lib/lava-wax.js'
for (const fps of [30, 60, 120]) {
  const wax = createLavaWax(),
    min = wax.blobs.map((b) => b.y),
    max = [...min]
  for (let frame = 0; frame < fps * 100; frame++) {
    wax.step(1 / fps, frame / fps, 1, 1)
    wax.blobs.forEach((b, i) => {
      min[i] = Math.min(min[i], b.y)
      max[i] = Math.max(max[i], b.y)
      assert.ok(Number.isFinite(b.x) && Number.isFinite(b.y))
      assert.ok(Math.abs(b.y) <= 0.61 - b.r + 1e-6)
      assert.ok(Math.abs(b.x) <= lampWidth(b.y) - b.r * 0.85 + 1e-6)
    })
  }
  assert.ok(
    max.every((y, i) => y - min[i] > 0.5),
    'Each wax blob must visibly circulate',
  )
  const b = wax.blobs[0]
  assert.ok(wax.grab(b.x, b.y))
  wax.drag(10, 10, true)
  assert.ok(b.y < 0.62 && b.x < 0.3, 'Paused dragging stays within glass')
  wax.release()
  assert.equal(wax.grab(5, 5), false, 'Background clicks cannot teleport wax')
}
console.log(
  'PASS: wax circulation, finite simulation, vessel containment, and paused grab at 30/60/120 Hz',
)
