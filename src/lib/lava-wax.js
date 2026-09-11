const clamp = (x, a, b) => Math.max(a, Math.min(b, x))
export function lampWidth(y) {
  const t = clamp((y + 0.62) / 1.24, 0, 1)
  return 0.3 - 0.125 * t * t * (3 - 2 * t)
}
export function createLavaWax() {
  const blobs = Array.from({ length: 7 }, (_, i) => ({
    x: Math.sin(i * 2.4) * 0.095,
    y: -0.46 + i * 0.15,
    r: 0.074 + (i % 3) * 0.012,
    heat: i % 2 ? 0.25 : 0.8,
    vx: 0,
    vy: i % 2 ? -0.015 : 0.015,
    phase: i * 2.4,
  }))
  let grabbed = null,
    target = null,
    accumulator = 0
  function constrain(b) {
    b.y = clamp(b.y, -0.61 + b.r, 0.61 - b.r)
    const limit = lampWidth(b.y) - b.r * 0.85
    b.x = clamp(b.x, -limit, limit)
  }
  return {
    blobs,
    get grabbed() {
      return grabbed
    },
    grab(x, y) {
      const b = blobs.reduce((best, b) =>
        Math.hypot(b.x - x, b.y - y) < Math.hypot(best.x - x, best.y - y)
          ? b
          : best,
      )
      if (Math.hypot(b.x - x, b.y - y) > b.r * 2) return false
      grabbed = b
      target = { x: b.x, y: b.y, dx: b.x - x, dy: b.y - y }
      return true
    },
    drag(x, y, paused = false) {
      if (!grabbed) return
      target.x = x + target.dx
      target.y = y + target.dy
      if (paused) {
        grabbed.x = target.x
        grabbed.y = target.y
        constrain(grabbed)
      }
    },
    release() {
      grabbed = target = null
    },
    warm(delta) {
      blobs.forEach((b) => (b.heat = clamp(b.heat + delta, 0, 1)))
    },
    step(dt, t, heater, viscosity) {
      accumulator = Math.min(accumulator + dt, 0.08)
      const h = 1 / 120
      while (accumulator >= h) {
        accumulator -= h
        for (const b of blobs) {
          const heating = Math.max(0, (-b.y - 0.3) / 0.2) * heater * 0.5
          const cooling = Math.max(0, (b.y - 0.3) / 0.2) * 0.45
          b.heat = clamp(
            b.heat +
              (heating * (1 - b.heat) -
                cooling * b.heat +
                (b === grabbed ? 0.32 : 0)) *
                h,
            0,
            1,
          )
          let fx = Math.sin(t * 0.45 + b.phase) * 0.025 - b.x * 0.025
          let fy = (b.heat - 0.48) * 0.4
          if (b === grabbed) {
            fx += (target.x - b.x) * 85
            fy += (target.y - b.y) * 85
          }
          const damp = Math.exp(-h * (b === grabbed ? 10 : 1.9 * viscosity))
          b.vx = clamp((b.vx + fx * h) * damp, -0.8, 0.8)
          b.vy = clamp((b.vy + fy * h) * damp, -0.8, 0.8)
          b.x += b.vx * h
          b.y += b.vy * h
          constrain(b)
        }
        // Soft volume separation still allows neighboring surfaces to join.
        for (let i = 0; i < blobs.length; i++)
          for (let j = i + 1; j < blobs.length; j++) {
            const a = blobs[i],
              b = blobs[j],
              dx = b.x - a.x,
              dy = b.y - a.y
            const d = Math.hypot(dx, dy),
              min = (a.r + b.r) * 0.8
            if (d > 0.0001 && d < min) {
              const push = ((min - d) / d) * 0.15
              if (a !== grabbed) {
                a.x -= dx * push
                a.y -= dy * push
              }
              if (b !== grabbed) {
                b.x += dx * push
                b.y += dy * push
              }
              constrain(a)
              constrain(b)
            }
          }
      }
    },
  }
}
