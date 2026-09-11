import { canvasVisual } from '../lib/visual-kit.js'

export const meta = {
  id: '081-warp-speed-tunnel',
  title: 'Warp-Speed Star-Streak Tunnel',
  interaction:
    'Hold and steer the vanishing point · flick for a hyperspace burst',
  palettes: [
    {
      name: 'Hyperspace',
      core: '#ffffff',
      streak: '#a8d0ff',
      accent: '#7df9ff',
      bg: '#02030a',
    },
    {
      name: 'Warp Amber',
      core: '#fff2d8',
      streak: '#ffb36a',
      accent: '#ff7a3c',
      bg: '#0a0503',
    },
    {
      name: 'Void Violet',
      core: '#f0e0ff',
      streak: '#c084fc',
      accent: '#f472b6',
      bg: '#06030c',
    },
  ],
}

export function mount(container, opts = {}) {
  const v = canvasVisual(container, opts, meta)
  let pal = meta.palettes[0]
  v.onPalette((p) => (pal = p))

  const stars = Array.from({ length: 760 }, () => ({
    a: Math.random() * Math.PI * 2,
    r: Math.random(),
    z: Math.random(),
    speed: 0.35 + Math.random() * 0.9,
    accent: Math.random() < 0.14,
    len: 0.6 + Math.random() * 0.9,
    lastX: null,
    lastY: null,
  }))
  const shockwaves = []
  let focusX = 0.5
  let focusY = 0.5
  let targetX = 0.5
  let targetY = 0.5
  let focusVX = 0
  let focusVY = 0
  let boost = 0
  let charge = 0
  v.addSlider('Cruise', 'cruise', 0.2, 1.5, 0.1, 0.65)
  v.addSlider('Steering response', 'steering', 0.5, 2, 0.1, 1)
  let roll = 0

  v.onPointer((event) => {
    if (event.type === 'down') charge = 0
    if (event.type === 'up' && !event.cancelled) {
      boost = Math.max(boost, charge * 2)
      charge = 0
    }
    if (event.type === 'down' || event.type === 'drag') {
      targetX = event.u
      targetY = 1 - event.v
      if (event.type === 'drag')
        boost = Math.max(boost, Math.min(0.7, event.speed / 1200))
    } else if (event.type === 'tap') {
      boost = Math.max(boost, 1.25)
      shockwaves.push({ x: event.x, y: event.y, age: 0 })
    } else if (event.type === 'fling') {
      boost = Math.min(2.5, boost + 0.65 + event.speed / 900)
      focusVX += (event.vx / Math.max(1, container.clientWidth)) * 0.55
      focusVY += (event.vy / Math.max(1, container.clientHeight)) * 0.55
      roll += (event.vx / Math.max(1, container.clientWidth)) * 0.12
      shockwaves.push({ x: event.x, y: event.y, age: 0 })
    } else if (event.type === 'doubletap') {
      targetX = focusX = 0.5
      targetY = focusY = 0.5
      focusVX = focusVY = boost = roll = 0
    }
  })

  v.onFrame((ctx, dt, t, state, w, h) => {
    ctx.fillStyle = pal.bg
    ctx.fillRect(0, 0, w, h)

    if (!v.pointer.down) {
      targetX += (0.5 - targetX) * (1 - Math.exp(-dt * 0.52))
      targetY += (0.5 - targetY) * (1 - Math.exp(-dt * 0.52))
    }
    if (v.pointer.down) charge = Math.min(1, charge + dt * 0.5)
    focusVX += (targetX - focusX) * dt * 11 * state.steering
    focusVY += (targetY - focusY) * dt * 11 * state.steering
    focusVX *= Math.exp(-dt * 5.4)
    focusVY *= Math.exp(-dt * 5.4)
    focusX += focusVX * dt
    focusY += focusVY * dt
    boost *= Math.exp(-dt * 1.12)
    roll *= Math.exp(-dt * 0.42)

    const cx = focusX * w
    const cy = focusY * h
    const maxR = Math.hypot(w, h) / 2
    const warp =
      (state.cruise + state.intensity * 0.35) *
      (1 + boost * 1.35 + (v.pointer.down ? 0.35 : 0))

    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    ctx.lineCap = 'round'

    for (const star of stars) {
      star.z += dt * star.speed * warp * 0.58
      if (star.z >= 1) {
        star.z = 0
        star.a = Math.random() * Math.PI * 2
        star.r = Math.random() * 0.34
        star.accent = Math.random() < 0.14
        star.lastX = null
        star.lastY = null
      }

      const perspective = (0.055 + star.r) / (1.025 - star.z)
      const radius = perspective * maxR
      if (radius > maxR * 1.55) {
        star.lastX = star.lastY = null
        continue
      }

      const depth = star.z * star.z
      const angle = star.a + (state.reducedMotion ? 0 : roll) * (0.2 + depth)
      const bendX = focusVX * w * depth * 0.15
      const bendY = focusVY * h * depth * 0.15
      const x = cx + Math.cos(angle) * radius * star.len + bendX
      const y = cy + Math.sin(angle) * radius * star.len + bendY
      // Keep the trajectory responsive to steering, but exaggerate its radial
      // motion so the stars read as speed streaks even on high-refresh screens.
      const radialStretch = Math.min(0.24, 0.018 + depth * 0.075 * warp)
      const radialTailX = cx + (x - cx) * (1 - radialStretch)
      const radialTailY = cy + (y - cy) * (1 - radialStretch)
      const motionTailX =
        star.lastX === null ? radialTailX : x - (x - star.lastX) * 3.4
      const motionTailY =
        star.lastY === null ? radialTailY : y - (y - star.lastY) * 3.4
      const tailX = radialTailX * 0.7 + motionTailX * 0.3
      const tailY = radialTailY * 0.7 + motionTailY * 0.3

      ctx.strokeStyle = star.accent ? pal.accent : pal.streak
      ctx.globalAlpha = Math.min(1, 0.12 + depth * 0.9)
      ctx.lineWidth = 0.55 + depth * (2.6 + boost * 0.9)
      ctx.beginPath()
      ctx.moveTo(tailX, tailY)
      ctx.quadraticCurveTo(
        (tailX + x) * 0.5 - focusVY * 12,
        (tailY + y) * 0.5 + focusVX * 12,
        x,
        y,
      )
      ctx.stroke()

      // Bright, slightly split heads add a controlled chromatic warp flare.
      if (depth > 0.42) {
        ctx.fillStyle = star.accent ? pal.core : pal.streak
        ctx.globalAlpha = (depth - 0.42) * 1.45
        ctx.beginPath()
        ctx.arc(x, y, 0.8 + depth * 2 + boost * 0.25, 0, Math.PI * 2)
        ctx.fill()
      }
      star.lastX = x
      star.lastY = y
    }

    if (charge > 0) {
      ctx.strokeStyle = pal.accent
      ctx.lineWidth = 2
      ctx.globalAlpha = 0.8
      ctx.beginPath()
      ctx.arc(
        cx,
        cy,
        24 + charge * 8,
        -Math.PI / 2,
        -Math.PI / 2 + charge * Math.PI * 2,
      )
      ctx.stroke()
    }
    for (let i = shockwaves.length - 1; i >= 0; i--) {
      const wave = shockwaves[i]
      wave.age += dt
      const progress = wave.age / 0.9
      ctx.globalAlpha = Math.max(0, 1 - progress) * 0.7
      ctx.strokeStyle = i % 2 ? pal.accent : pal.core
      ctx.lineWidth = 2 + (1 - progress) * 4
      ctx.beginPath()
      ctx.arc(wave.x, wave.y, progress * Math.min(w, h) * 0.32, 0, Math.PI * 2)
      ctx.stroke()
      if (progress >= 1) shockwaves.splice(i, 1)
    }

    const glow = ctx.createRadialGradient(
      cx,
      cy,
      0,
      cx,
      cy,
      maxR * (0.16 + boost * 0.015),
    )
    glow.addColorStop(0, pal.core + 'ee')
    glow.addColorStop(0.18, pal.accent + '77')
    glow.addColorStop(1, 'transparent')
    ctx.globalAlpha = 1
    ctx.fillStyle = glow
    ctx.beginPath()
    ctx.arc(cx, cy, maxR * 0.2, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    const vignette = ctx.createRadialGradient(cx, cy, maxR * 0.38, cx, cy, maxR)
    vignette.addColorStop(0, 'transparent')
    vignette.addColorStop(1, pal.bg)
    ctx.fillStyle = vignette
    ctx.fillRect(0, 0, w, h)
  })

  return v.start()
}
