import assert from 'node:assert/strict'
import { createSilkSurface } from '../src/lib/silk-surface.js'
const W = 56,
  H = 36,
  base = new Float32Array((W + 1) * (H + 1) * 3)
for (let row = 0; row <= H; row++)
  for (let col = 0; col <= W; col++) {
    const k = (row * (W + 1) + col) * 3
    base[k] = -2.7 + (5.4 * col) / W
    base[k + 1] = 1.8 - (3.6 * row) / H
  }
const silk = createSilkSurface(base, W, H)
// A normal half-unit drag should visibly follow the hand, not get damped away.
const grabbedIndex = 20 * (W + 1) + 20
silk.grab(grabbedIndex, 0.5, 0)
silk.step(0, 0, 0.75, 0)
assert.ok(
  silk.positions[grabbedIndex * 3] - base[grabbedIndex * 3] > 0.45,
  'The grabbed area must follow an ordinary drag closely',
)
for (const corner of [H * (W + 1), H * (W + 1) + W])
  assert.ok(
    silk.positions[corner * 3] - base[corner * 3] > 0.2,
    'Both bottom corners must travel with a central pull',
  )
silk.reset()
function verify() {
  const p = silk.positions
  for (let i = 0; i < p.length; i++) assert.ok(Number.isFinite(p[i]))
  for (let i = 0; i < p.length / 3; i++) {
    assert.ok(Math.abs(p[i * 3] - base[i * 3]) <= 1.41)
    assert.ok(Math.abs(p[i * 3 + 1] - base[i * 3 + 1]) <= 0.811)
    assert.ok(Math.abs(p[i * 3 + 2]) < 2)
  }
  function area(a, b, c) {
    return (
      (p[b * 3] - p[a * 3]) * (p[c * 3 + 1] - p[a * 3 + 1]) -
      (p[b * 3 + 1] - p[a * 3 + 1]) * (p[c * 3] - p[a * 3])
    )
  }
  for (let row = 0; row < H; row++)
    for (let col = 0; col < W; col++) {
      const a = row * (W + 1) + col,
        b = a + 1,
        c = a + W + 1,
        d = c + 1
      assert.ok(area(a, b, c) < -0.001, 'Triangle folded over in projection')
      assert.ok(area(b, d, c) < -0.001, 'Triangle folded over in projection')
    }
  for (let i = 0; i <= W; i++) {
    assert.equal(p[i * 3], base[i * 3])
    assert.equal(p[i * 3 + 1], base[i * 3 + 1])
  }
}
for (const rate of [30, 60, 120]) {
  silk.reset()
  for (let frame = 0; frame < rate * 4; frame++) {
    if (frame % 20 === 0)
      silk.grab(
        (1 + (frame % H)) * (W + 1) + (frame % (W + 1)),
        Math.sin(frame) * 100,
        Math.cos(frame) * 100,
      )
    if (frame % 20 === 15) silk.release()
    if (frame % 45 === 0) silk.shake()
    silk.step(1 / rate, frame / rate, 0.35, 0.5)
    verify()
  }
}
silk.grab(600, 100, -100)
silk.step(0, 0, 0.95, 0.5)
verify()
silk.release()
for (let i = 0; i < 1200; i++) silk.step(1 / 120, i / 120, 0.75, 0)
verify()
for (let i = 0; i < base.length; i++)
  if (i % 3 !== 2)
    assert.ok(
      Math.abs(silk.positions[i] - base[i]) < 0.00001,
      'Cloth must return to its resting outline',
    )
console.log(
  'PASS: bounded silk deformation, pinned edge, no inverted triangles during extreme drags/shakes at 30/60/120 Hz or paused manipulation',
)

silk.reset()
const hem = (H * (W + 1) + Math.floor(W / 2)) * 3
const xs = [], zs = []
for (let frame = 0; frame < 600; frame++) {
  silk.step(1 / 60, frame / 60, 0.65, 0.18)
  xs.push(silk.positions[hem])
  zs.push(silk.positions[hem + 2])
  verify()
}
assert.ok(Math.max(...xs) - Math.min(...xs) > 0.5, 'Idle hem must visibly sway sideways')
assert.ok(Math.max(...zs) - Math.min(...zs) > 0.6, 'Idle fabric must billow without touch')
const paused = silk.positions.slice()
silk.step(0, 599 / 60, 0.65, 0.18)
assert.deepEqual(silk.positions, paused, 'Paused billowing must stay still')
silk.step(0, 599 / 60, 0.65, 0)
assert.equal(silk.positions[hem], base[hem], 'Breeze zero stops the ambient sway')
console.log('PASS: continuous idle sway and folds, stable pause, and breeze control')
