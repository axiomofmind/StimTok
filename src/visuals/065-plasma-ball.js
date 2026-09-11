import { canvasVisual } from '../lib/visual-kit.js'

export const meta = {
  id: '065-plasma-ball',
  title: 'Plasma-Ball Electric Tendrils',
  interaction:
    'Press the glass and hold · every plasma filament crowds your fingertip',
  palettes: [
    {
      name: 'Classic Purple',
      bolt: '#c8a0ff',
      core: '#ff8ad0',
      glass: '#4a3a6a',
      bg: '#0a0612',
    },
    {
      name: 'Tesla Blue',
      bolt: '#a0d8ff',
      core: '#e0f0ff',
      glass: '#2a4a6a',
      bg: '#040a12',
    },
    {
      name: 'Emerald Arc',
      bolt: '#a0ffd0',
      core: '#e0ffe8',
      glass: '#2a6a4a',
      bg: '#04120a',
    },
  ],
}

export function mount(container, opts = {}) {
  const v = canvasVisual(container, opts, meta)
  let pal = meta.palettes[0]
  v.onPalette((p) => (pal = p))

  // Tendrils: each has a slowly-drifting target direction; its jitter points
  // ease toward fresh midpoint-displaced targets so it writhes smoothly.
  v.addSlider('Branchiness', 'branchiness', 0.4, 1.5, 0.1, 1)
  const TENDRILS = 9
  const SEGS = 24
  const tendrils = []
  const touch = { x: 0, y: 0, energy: 0 }
  v.onPointer((event) => {
    if (event.type === 'down' || event.type === 'drag') {
      touch.x = event.x
      touch.y = event.y
      touch.energy = 1
    }
    if (event.type === 'up') touch.energy = 0.65
  })
  for (let i = 0; i < TENDRILS; i++) {
    tendrils.push({
      baseA: (i / TENDRILS) * Math.PI * 2,
      drift: (Math.random() - 0.5) * 0.4,
      pts: new Array(SEGS + 1).fill(0).map(() => [0, 0]),
      targets: new Array(SEGS + 1).fill(0).map(() => [0, 0]),
      retarget: 0,
      wanderPhase: Math.random() * Math.PI * 2,
    })
  }

  function retarget(td, cx, cy, R, t) {
    // End point wanders around the rim
    const endA =
      td.baseA + Math.sin(t * 0.3 + td.wanderPhase) * 0.8 + td.drift * t * 0.2
    let ex = cx + Math.cos(endA) * R * 0.95
    let ey = cy + Math.sin(endA) * R * 0.95
    if (touch.energy > 0.06) {
      const contact =
        v.pointer.contacts[
          tendrils.indexOf(td) % Math.max(1, v.pointer.contacts.length)
        ]
      const tx = (contact?.x ?? touch.x) - cx
      const ty = (contact?.y ?? touch.y) - cy
      const distance = Math.hypot(tx, ty) || 1
      const scale = (R * 0.96) / distance
      ex += (cx + tx * scale - ex) * touch.energy
      ey += (cy + ty * scale - ey) * touch.energy
    }
    // Midpoint displacement along the chord
    for (let s = 0; s <= SEGS; s++) {
      const f = s / SEGS
      const mx = cx + (ex - cx) * f
      const my = cy + (ey - cy) * f
      const amp = Math.sin(f * Math.PI) * R * 0.12 * v.state.branchiness
      const na = endA + Math.PI / 2
      const off = (Math.random() - 0.5) * 2 * amp
      td.targets[s][0] += (mx + Math.cos(na) * off - td.targets[s][0]) * 0.65
      td.targets[s][1] += (my + Math.sin(na) * off - td.targets[s][1]) * 0.65
    }
  }

  v.onFrame((ctx, dt, t, state, w, h) => {
    if (!v.pointer.down) touch.energy *= Math.exp(-dt * 2.2)
    ctx.fillStyle = pal.bg
    ctx.fillRect(0, 0, w, h)
    const cx = w / 2
    const cy = h / 2
    const R = Math.min(w, h) * 0.4

    // Glass sphere
    const glassGrad = ctx.createRadialGradient(
      cx - R * 0.3,
      cy - R * 0.3,
      R * 0.1,
      cx,
      cy,
      R,
    )
    glassGrad.addColorStop(0, pal.glass + '30')
    glassGrad.addColorStop(0.85, pal.glass + '18')
    glassGrad.addColorStop(1, pal.glass + '60')
    ctx.fillStyle = glassGrad
    ctx.beginPath()
    ctx.arc(cx, cy, R, 0, Math.PI * 2)
    ctx.fill()

    ctx.globalCompositeOperation = 'lighter'

    // Tendrils
    for (const td of tendrils) {
      td.retarget -= dt
      if (td.retarget <= 0) {
        td.retarget = touch.energy > 0.1 ? 0.025 : 0.06 + Math.random() * 0.08
        retarget(td, cx, cy, R, t)
      }
      // Ease points toward targets (smooth writhing rather than flicker)
      for (let s = 0; s <= SEGS; s++) {
        const k = 1 - Math.pow(0.0001, dt) // frame-rate independent ease
        td.pts[s][0] += (td.targets[s][0] - td.pts[s][0]) * k
        td.pts[s][1] += (td.targets[s][1] - td.pts[s][1]) * k
      }
      // Wide soft glow pass + thin bright core pass
      for (const [width, alpha, color] of [
        [7, 0.12, pal.bolt],
        [2.6, 0.5, pal.bolt],
        [1.1, 0.9, '#ffffff'],
      ]) {
        ctx.strokeStyle = color
        ctx.globalAlpha = alpha * (0.5 + state.intensity * 0.7)
        ctx.lineWidth = width
        ctx.lineJoin = 'round'
        ctx.beginPath()
        ctx.moveTo(cx, cy)
        for (let s = 1; s <= SEGS; s++) ctx.lineTo(td.pts[s][0], td.pts[s][1])
        ctx.stroke()
      }
      // Rim contact glow
      const end = td.pts[SEGS]
      const eg = ctx.createRadialGradient(end[0], end[1], 0, end[0], end[1], 16)
      eg.addColorStop(0, pal.bolt)
      eg.addColorStop(1, 'transparent')
      ctx.globalAlpha = 0.6
      ctx.fillStyle = eg
      ctx.beginPath()
      ctx.arc(end[0], end[1], 16, 0, Math.PI * 2)
      ctx.fill()
    }

    // Central electrode
    const coreR = R * 0.13 * (1 + Math.sin(t * 8) * 0.04)
    const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * 2.4)
    cg.addColorStop(0, '#ffffff')
    cg.addColorStop(0.3, pal.core)
    cg.addColorStop(1, 'transparent')
    ctx.globalAlpha = 1
    ctx.fillStyle = cg
    ctx.beginPath()
    ctx.arc(cx, cy, coreR * 2.4, 0, Math.PI * 2)
    ctx.fill()

    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = 1

    // Glass rim highlight
    ctx.strokeStyle = pal.glass + '80'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(cx, cy, R, 0, Math.PI * 2)
    ctx.stroke()
    // Stand
    ctx.fillStyle = pal.glass
    ctx.beginPath()
    ctx.moveTo(cx - R * 0.35, h)
    ctx.lineTo(cx - R * 0.18, cy + R * 0.92)
    ctx.lineTo(cx + R * 0.18, cy + R * 0.92)
    ctx.lineTo(cx + R * 0.35, h)
    ctx.closePath()
    ctx.fill()
  })

  return v.start()
}
