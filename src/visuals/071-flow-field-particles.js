import { canvasVisual, makeNoise2D } from '../lib/visual-kit.js'

export const meta = {
  id: '071-flow-field-particles',
  title: 'Flow-Field Particle Streams',
  interaction:
    'Carve persistent vortices through the stream · tap to send a distortion wave',
  palettes: [
    {
      name: 'Aurora Flow',
      colors: ['#3fd8e8', '#7df9c0', '#a0b8ff', '#e0f8ff'],
      bg: '#04080e',
    },
    {
      name: 'Ember Flow',
      colors: ['#ff6b35', '#ffc145', '#ff2975', '#fff2c0'],
      bg: '#0c0604',
    },
    {
      name: 'Violet Flow',
      colors: ['#c084fc', '#f472b6', '#818cf8', '#e0d0ff'],
      bg: '#08040e',
    },
  ],
}

export function mount(container, opts = {}) {
  const v = canvasVisual(container, opts, meta)
  const noise = makeNoise2D(31)
  let pal = meta.palettes[0]
  let cleared = false

  v.onPalette((p) => {
    pal = p
    cleared = false
  })
  v.onResize(() => (cleared = false))

  const COUNT = 1400
  const parts = []
  const vortices = []
  let lastVortexX = -999
  let lastVortexY = -999
  let sized = false
  let priorDx = 0,
    priorDy = 0,
    gestureSpin = 1
  v.addSlider('Vortex lifetime', 'persistence', 1, 8, 0.5, 3.4)
  v.addSlider('Field scale', 'fieldScale', 0.001, 0.006, 0.0002, 0.0022)
  v.addAction('Clear currents', () => (vortices.length = 0))

  function reset(p, w, h) {
    p.x = Math.random() * w
    p.y = Math.random() * h
    p.life = 0
    p.maxLife = 3 + Math.random() * 6
    p.colorIdx = Math.floor(Math.random() * 4)
  }

  function addVortex(event, burst = false) {
    vortices.push({
      x: event.x,
      y: event.y,
      vx: event.vx * 0.035,
      vy: event.vy * 0.035,
      age: 0,
      life: burst ? v.state.persistence * 0.7 : v.state.persistence,
      radius: burst ? 330 : 245,
      strength: burst ? 2.25 : 0.85 + Math.min(1.1, event.speed / 850),
      spin: gestureSpin,
      burst,
    })
    if (vortices.length > 22) vortices.shift()
  }

  v.onPointer((event) => {
    if (event.type === 'down') {
      lastVortexX = event.x
      lastVortexY = event.y
      addVortex(event)
    } else if (event.type === 'drag') {
      const cross = priorDx * event.dy - priorDy * event.dx
      if (Math.abs(cross) > 0.1) gestureSpin = Math.sign(cross)
      priorDx = event.dx
      priorDy = event.dy
      if (Math.hypot(event.x - lastVortexX, event.y - lastVortexY) > 28) {
        addVortex(event)
        lastVortexX = event.x
        lastVortexY = event.y
      }
    } else if (event.type === 'fling') {
      addVortex(event, true)
    } else if (event.type === 'tap') {
      addVortex(event, true)
    }
  })

  v.onReset(() => {
    vortices.length = 0
    cleared = false
  })

  v.onFrame((ctx, dt, t, state, w, h) => {
    if (!cleared) {
      ctx.fillStyle = pal.bg
      ctx.fillRect(0, 0, w, h)
      cleared = true
      sized = false
    }
    if (!sized) {
      parts.length = 0
      for (let i = 0; i < COUNT; i++) {
        const p = {}
        reset(p, w, h)
        p.life = Math.random() * p.maxLife
        parts.push(p)
      }
      sized = true
    }

    // Long persistence so the streams paint silky ribbons.
    ctx.globalAlpha = 1 - Math.exp(-dt * 2.76)
    ctx.fillStyle = pal.bg
    ctx.fillRect(0, 0, w, h)
    ctx.globalAlpha = 1

    const scale = state.fieldScale
    const speed = 55 * (0.4 + state.intensity * 0.9)
    ctx.globalCompositeOperation = 'lighter'
    ctx.lineCap = 'round'
    ctx.lineWidth = 1.3

    for (const p of parts) {
      // Curl-ish field: noise angle that itself rotates slowly over time.
      const n = noise(p.x * scale, p.y * scale + t * 0.05)
      const n2 = noise(p.x * scale * 2.1 + 40, p.y * scale * 2.1 - t * 0.03)
      const angle = (n * 2 + n2) * Math.PI * 1.6 + t * 0.08

      const px = p.x
      const py = p.y
      p.x += Math.cos(angle) * speed * dt
      p.y += Math.sin(angle) * speed * dt

      if (state.pointer.active) {
        const dx = p.x - state.pointer.x
        const dy = p.y - state.pointer.y
        const dist = Math.max(8, Math.hypot(dx, dy))
        const influence = Math.max(0, 1 - dist / 275)
        if (influence > 0) {
          const press = state.pointer.down ? 1 : state.pointer.energy
          const curved = influence * influence
          p.x +=
            (-dy / dist) * curved * press * 310 * dt +
            state.pointer.vx * curved * dt * 0.14
          p.y +=
            (dx / dist) * curved * press * 310 * dt +
            state.pointer.vy * curved * dt * 0.14
          if (!state.pointer.down) {
            p.x += (dx / dist) * curved * state.pointer.energy * 145 * dt
            p.y += (dy / dist) * curved * state.pointer.energy * 145 * dt
          }
        }
      }

      // Gesture-created vortices linger in the field, leaving visible folds
      // and wakes instead of vanishing the moment the pointer is released.
      for (const vortex of vortices) {
        const dx = p.x - vortex.x
        const dy = p.y - vortex.y
        const dist = Math.max(5, Math.hypot(dx, dy))
        const influence = Math.max(0, 1 - dist / vortex.radius)
        if (influence <= 0) continue
        const fade = 1 - vortex.age / vortex.life
        const force = influence * influence * fade * vortex.strength
        p.x += (-dy / dist) * force * vortex.spin * 255 * dt
        p.y += (dx / dist) * force * vortex.spin * 255 * dt
        const radial = vortex.burst ? 220 : -48
        p.x += (dx / dist) * force * radial * dt
        p.y += (dy / dist) * force * radial * dt
      }
      p.life += dt

      if (
        p.life > p.maxLife ||
        p.x < -20 ||
        p.x > w + 20 ||
        p.y < -20 ||
        p.y > h + 20
      ) {
        reset(p, w, h)
        continue
      }

      // Fade in and out over the particle's life so trails never pop.
      const lf = p.life / p.maxLife
      const alpha = Math.sin(lf * Math.PI) * 0.5 * (0.4 + state.intensity * 0.7)
      ctx.strokeStyle = pal.colors[p.colorIdx]
      ctx.globalAlpha = alpha
      ctx.beginPath()
      ctx.moveTo(px, py)
      ctx.lineTo(p.x, p.y)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'

    for (let i = vortices.length - 1; i >= 0; i--) {
      const vortex = vortices[i]
      vortex.age += dt
      vortex.x += vortex.vx * dt
      vortex.y += vortex.vy * dt
      vortex.vx *= Math.exp(-dt * 2.4)
      vortex.vy *= Math.exp(-dt * 2.4)
      if (vortex.age >= vortex.life) vortices.splice(i, 1)
    }
  })

  return v.start()
}
