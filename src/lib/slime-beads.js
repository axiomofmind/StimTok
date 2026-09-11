const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const circle = (x, y, cx, cy, r) => Math.hypot(x - cx, y - cy) < r
function capsule(x, y, ax, ay, bx, by, r) {
  const t = clamp(
    ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) /
      ((bx - ax) ** 2 + (by - ay) ** 2),
    0,
    1,
  )
  return circle(x, y, ax + t * (bx - ax), ay + t * (by - ay), r)
}
export const beadShapes = ['Gecko', 'Octopus', 'Butterfly', 'Heart', 'Star']
export function beadTargets(shape) {
  const points = []
  for (let row = 0; row < 63; row++)
    for (let col = 0; col < 63; col++) {
      const x = (col - 31 + (row % 2) * 0.5) * 0.03,
        y = (row - 31) * 0.026
      let inside = false,
        eye = false,
        accent = false
      if (shape === 'Gecko') {
        const u = x * 0.86 + y * 0.51,
          v = -x * 0.51 + y * 0.86
        inside =
          (u / 0.23) ** 2 + ((v + 0.08) / 0.47) ** 2 < 1 ||
          (u / 0.2) ** 2 + ((v + 0.57) / 0.23) ** 2 < 1
        for (const side of [-1, 1])
          for (const at of [-0.28, 0.18]) {
            inside ||=
              capsule(u, v, side * 0.13, at, side * 0.39, at - 0.04, 0.07) ||
              circle(u, v, side * 0.43, at - 0.09, 0.105)
            for (let toe = -1; toe <= 1; toe++)
              inside ||= capsule(
                u,
                v,
                side * 0.43,
                at - 0.09,
                side * (0.47 + toe * 0.045),
                at - 0.21 + Math.abs(toe) * 0.03,
                0.027,
              )
          }
        let px = 0,
          py = 0.28
        for (let i = 1; i <= 26; i++) {
          const a = (i / 26) * Math.PI * 1.35,
            nx = 0.23 * (1 - Math.cos(a)),
            ny = 0.3 + 0.43 * Math.sin(a * 0.65)
          inside ||= capsule(u, v, px, py, nx, ny, 0.085 - (i / 26) * 0.056)
          px = nx
          py = ny
        }
        eye =
          circle(u, v, -0.1, -0.61, 0.047) || circle(u, v, 0.1, -0.61, 0.047)
        accent = Math.abs(u) < 0.075 && v > -0.43 && v < 0.3
      } else if (shape === 'Octopus') {
        inside = (x / 0.39) ** 2 + ((y + 0.28) / 0.39) ** 2 < 1
        for (let arm = 0; arm < 7; arm++) {
          let px = (arm - 3) * 0.095,
            py = -0.05
          for (let i = 1; i <= 18; i++) {
            const t = i / 18,
              nx =
                (arm - 3) * (0.095 + t * 0.085) +
                Math.sin(t * 5 + arm) * t * 0.08,
              ny = -0.05 + t * (0.62 - Math.abs(arm - 3) * 0.06)
            inside ||= capsule(x, y, px, py, nx, ny, 0.068 - t * 0.027)
            px = nx
            py = ny
          }
        }
        eye =
          circle(x, y, -0.14, -0.31, 0.055) || circle(x, y, 0.14, -0.31, 0.055)
        accent = circle(x, y, 0, -0.14, 0.09)
      } else if (shape === 'Butterfly') {
        inside =
          ((Math.abs(x) - 0.35) / 0.3) ** 2 + ((y + 0.25) / 0.37) ** 2 < 1 ||
          ((Math.abs(x) - 0.3) / 0.24) ** 2 + ((y - 0.32) / 0.29) ** 2 < 1 ||
          capsule(x, y, 0, -0.42, 0, 0.45, 0.055)
        accent = Math.sin(Math.hypot(x, y) * 20) > 0.5
      } else if (shape === 'Heart') {
        const X = x * 1.5,
          Y = -y * 1.5
        inside = (X * X + Y * Y - 0.6) ** 3 - X * X * Y ** 3 < 0
        accent = x < -0.16 && y < -0.2
      } else {
        const a = Math.atan2(y, x) + Math.PI / 2,
          r = Math.hypot(x, y)
        inside = r < 0.49 + 0.22 * Math.cos(a * 5)
        accent = r < 0.2
      }
      if (inside) points.push({ x, y, tone: eye ? 2 : accent ? 1 : 0 })
    }
  return points
}

export function createBeadSlime(shape = 'Gecko') {
  let beads = [],
    gathering = true,
    accumulator = 0
  function morph(name) {
    const targets = beadTargets(name),
      pool = [...beads]
    beads = targets.map((target) => {
      let best = -1,
        distance = Infinity
      for (let i = 0; i < pool.length; i++) {
        const d = (pool[i].x - target.x) ** 2 + (pool[i].y - target.y) ** 2
        if (d < distance) {
          best = i
          distance = d
        }
      }
      const old = best < 0 ? null : pool.splice(best, 1)[0]
      return {
        x: old?.x ?? target.x,
        y: old?.y ?? target.y,
        vx: old?.vx ?? 0,
        vy: old?.vy ?? 0,
        tx: target.x,
        ty: target.y,
        tone: target.tone,
      }
    })
  }
  morph(shape)
  return {
    get beads() {
      return beads
    },
    morph,
    scatter(x = 0, y = 0, all = false) {
      gathering = false
      beads.forEach((b, i) => {
        const dx = b.x - x,
          dy = b.y - y,
          d = Math.hypot(dx, dy)
        if (!all && d > 0.4) return
        const a = d < 0.01 ? i * 2.4 : Math.atan2(dy, dx),
          force = all ? 1.1 + Math.random() : 1.8 * (1 - d / 0.45)
        b.vx += Math.cos(a) * force
        b.vy += Math.sin(a) * force
      })
    },
    gather() {
      gathering = true
    },
    step(dt, cohesion, contacts = []) {
      let collisionEnergy = 0
      accumulator = Math.min(accumulator + dt, 0.06)
      const h = 1 / 120,
        diameter = 0.029
      while (accumulator >= h) {
        accumulator -= h
        // Scattering is a persistent free-play mode, not a timed explosion.
        // Changing the target figure also leaves loose beads loose until Gather.
        const spring = gathering ? cohesion * 22 : 0
        for (const b of beads) {
          let fx = (b.tx - b.x) * spring,
            fy = (b.ty - b.y) * spring
          for (const p of contacts) {
            const dx = p.x - b.x,
              dy = p.y - b.y,
              d = Math.hypot(dx, dy)
            if (d < 0.23) {
              const grip = (1 - d / 0.23) * 150
              fx += dx * grip + p.vx * 5
              fy += dy * grip + p.vy * 5
            }
          }
          const damping = Math.exp(-h * (gathering ? 4.8 : 1.6))
          b.vx = clamp((b.vx + fx * h) * damping, -4, 4)
          b.vy = clamp((b.vy + fy * h) * damping, -4, 4)
          b.x += b.vx * h
          b.y += b.vy * h
          for (const axis of ['x', 'y'])
            if (Math.abs(b[axis]) > 1.02) {
              collisionEnergy = Math.max(
                collisionEnergy,
                Math.abs(b['v' + axis]),
              )
              b[axis] = clamp(b[axis], -1.02, 1.02)
              b['v' + axis] *= -0.7
            }
        }
        const grid = new Map()
        for (const b of beads) {
          const gx = Math.floor(b.x / diameter),
            gy = Math.floor(b.y / diameter)
          for (let x = gx - 1; x <= gx + 1; x++)
            for (let y = gy - 1; y <= gy + 1; y++)
              for (const other of grid.get(x + ',' + y) || []) {
                const dx = b.x - other.x,
                  dy = b.y - other.y,
                  d = Math.hypot(dx, dy)
                if (d > 0.00001 && d < diameter) {
                  collisionEnergy = Math.max(
                    collisionEnergy,
                    -((b.vx - other.vx) * dx + (b.vy - other.vy) * dy) / d,
                  )
                  const k = ((diameter - d) / d) * 0.45
                  b.x += dx * k
                  b.y += dy * k
                  other.x -= dx * k
                  other.y -= dy * k
                }
              }
          const key = gx + ',' + gy
          if (!grid.has(key)) grid.set(key, [])
          grid.get(key).push(b)
        }
      }
      return collisionEnergy
    },
  }
}
