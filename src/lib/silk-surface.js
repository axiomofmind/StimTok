// Bounded, single-valued fabric surface. Small smooth in-plane displacement
// preserves vertex ordering; out-of-plane waves cannot fold through the sheet.
export function createSilkSurface(base, columns, rows) {
  const count = base.length / 3,
    positions = new Float32Array(base),
    height = new Float32Array(count),
    velocity = new Float32Array(count)
  const rest = new Float32Array(count)
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x))
  let grip = null,
    centerX = 0,
    centerY = 0,
    shiftX = 0,
    shiftY = 0,
    accumulator = 0,
    flowTime = 0,
    flowStrength = 0,
    flowAmplitude = 0
  for (let i = 0; i < count; i++) {
    const freedom = (1.8 - base[i * 3 + 1]) / 3.6
    rest[i] = Math.sin(base[i * 3] * 3.8) * (0.035 + freedom * 0.025)
  }
  function reset() {
    height.fill(0)
    velocity.fill(0)
    grip = null
    shiftX = shiftY = accumulator = 0
    flowTime = flowStrength = flowAmplitude = 0
    render()
  }
  function grab(index, dx, dy) {
    grip = {
      index,
      dx: clamp(dx * 0.95, -0.8, 0.8),
      dy: clamp(dy * 0.9, -0.65, 0.65),
      lift: Math.min(0.65, 0.08 + Math.hypot(dx, dy) * 0.38),
    }
    centerX = base[index * 3]
    centerY = base[index * 3 + 1]
    const length = Math.hypot(grip.dx, grip.dy)
    if (length > 0.9) {
      grip.dx *= 0.9 / length
      grip.dy *= 0.9 / length
    }
  }
  function influence(i) {
    if (i <= columns) return 0
    const dx = base[i * 3] - centerX,
      dy = base[i * 3 + 1] - centerY
    return (
      (0.45 + 0.55 * Math.exp(-(dx * dx + dy * dy) / (1.8 * 1.8))) *
      Math.min(1, (1.8 - base[i * 3 + 1]) / 1.8)
    )
  }
  function render() {
    for (let i = 0; i < count; i++) {
      const k = i * 3,
        weight = influence(i),
        x = base[k],
        y = base[k + 1],
        freedom = i <= columns ? 0 : clamp((1.8 - y) / 3.6, 0, 1),
        t = flowTime
      // Broad traveling folds and a swaying hem continue between grabs.
      // All ambient motion fades to zero at the pinned top edge.
      const billow = (
        Math.sin(x * 1.8 + t * 1.6) +
        Math.sin(x * 3.6 - t * 2.3 + y * 2.0) * 0.5 +
        Math.sin(y * 2.6 + t * 1.1) * 0.6
      ) * flowAmplitude * freedom
      const sway = (
        Math.sin(t * 0.8 - freedom * 0.65) * 0.32 +
        Math.sin(x * 1.1 + t * 1.15) * 0.06
      ) * flowStrength * freedom
      const flutter = Math.sin(x * 1.4 - t * 1.3) * 0.1 * flowStrength * freedom
      positions[k] = x + shiftX * weight + sway
      positions[k + 1] = y + shiftY * weight + flutter
      positions[k + 2] = rest[i] + height[i] + billow
    }
  }
  function step(dt, t, tension, breeze) {
    flowTime = t
    flowStrength = clamp(breeze / 0.18, 0, 1.6)
    flowAmplitude = 0.4 * flowStrength * (1 - tension * 0.35)
    // Paused manipulation is still visible, without advancing the wave solver.
    if (dt === 0 && grip) {
      shiftX = grip.dx
      shiftY = grip.dy
      for (let i = columns + 1; i < count; i++)
        height[i] = grip.lift * influence(i)
      render()
      return
    }
    // A pull carries the whole hanging hem; release settles gradually.
    const follow = 1 - Math.exp(-dt * (grip ? 28 : 2))
    shiftX += ((grip?.dx || 0) - shiftX) * follow
    shiftY += ((grip?.dy || 0) - shiftY) * follow
    accumulator = Math.min(accumulator + dt, 0.06)
    const stride = columns + 1,
      h = 1 / 120
    while (accumulator >= h) {
      accumulator -= h
      for (let row = 1; row <= rows; row++)
        for (let col = 0; col <= columns; col++) {
          const i = row * stride + col,
            value = height[i]
          const lap =
            height[i - stride] +
            height[row < rows ? i + stride : i] +
            height[col ? i - 1 : i] +
            height[col < columns ? i + 1 : i] -
            4 * value
          const force =
            lap * (45 + tension * 75) - value * 3.5
          velocity[i] = (velocity[i] + force * h) * Math.exp(-h * 1.6)
        }
      for (let i = stride; i < count; i++) {
        height[i] = clamp(height[i] + velocity[i] * h, -0.65, 0.65)
        if (grip) {
          const weight = influence(i) * (1 - Math.exp(-h * 26))
          height[i] += (grip.lift - height[i]) * weight
          velocity[i] *= 1 - weight
        }
      }
    }
    render()
  }
  reset()
  return {
    positions,
    step,
    grab,
    release() {
      grip = null
    },
    reset,
    pluck(index) {
      if (index >= columns + 1) velocity[index] = 1.2
    },
    shake() {
      for (let i = columns + 1; i < count; i++)
        velocity[i] = Math.sin(i * 0.14) * 0.6
    },
  }
}
