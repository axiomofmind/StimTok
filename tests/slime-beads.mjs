import assert from 'node:assert/strict'
import { createBeadSlime, beadShapes } from '../src/lib/slime-beads.js'
for (const rate of [30, 60, 120]) {
  const slime = createBeadSlime()
  for (const shape of beadShapes) {
    slime.morph(shape)
    assert.ok(slime.beads.length > 300)
    slime.scatter(0, 0, true)
    for (let i = 0; i < rate * 10; i++) slime.step(1 / rate, 1)
    const scatteredError =
      slime.beads.reduce((s, b) => s + Math.hypot(b.x - b.tx, b.y - b.ty), 0) /
      slime.beads.length
    assert.ok(
      scatteredError > 0.15,
      shape + ' must remain scattered until Gather',
    )
    slime.gather()
    for (let i = 0; i < rate * 10; i++) slime.step(1 / rate, 1)
    const error =
      slime.beads.reduce((s, b) => s + Math.hypot(b.x - b.tx, b.y - b.ty), 0) /
      slime.beads.length
    assert.ok(error < 0.015, shape + ' must gather after scattering: ' + error)
    assert.ok(
      slime.beads.every((b) => Number.isFinite(b.x) && Number.isFinite(b.y)),
    )
  }
}
console.log(
  'PASS: all five bead figures stay scattered and reform only after Gather at 30/60/120 Hz',
)
