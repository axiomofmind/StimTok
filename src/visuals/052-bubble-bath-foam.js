import { canvasVisual } from '../lib/visual-kit.js'

export const meta = {
  id: '052-bubble-bath-foam',
  title: 'Foam/Soap Bubble-Bath Swirl',
  interaction: 'Sweep through the foam to scatter luminous droplets',
  palettes: [
    { name: 'Clean Suds', water: '#3a7ca5', foam: '#f0f4f8', tint: '#d0e8f0', iri: '#ffd8ec' },
    { name: 'Rose Bath', water: '#a54a6a', foam: '#f8f0f2', tint: '#f0d8e0', iri: '#c8e8ff' },
    { name: 'Lavender Soak', water: '#6a5aa5', foam: '#f4f0f8', tint: '#e0d8f0', iri: '#d8ffe8' },
  ],
}

export function mount(container, opts = {}) {
  const v = canvasVisual(container, opts, meta)
  let pal = meta.palettes[0]
  v.onPalette((p) => (pal = p))

  const bubbles = []
  const pops = []

  function spawn(w, h, edge = false) {
    const cluster = bubbles.length > 0 && Math.random() < 0.7 && !edge
      ? bubbles[Math.floor(Math.random() * bubbles.length)]
      : null
    const r = 6 + Math.random() * Math.random() * 34
    let x, y
    if (cluster) {
      const a = Math.random() * Math.PI * 2
      x = cluster.x + Math.cos(a) * (cluster.r + r) * 0.85
      y = cluster.y + Math.sin(a) * (cluster.r + r) * 0.85
    } else {
      x = Math.random() * w
      y = edge ? (Math.random() > 0.5 ? -r : h + r) : Math.random() * h
    }
    bubbles.push({ x, y, r, phase: Math.random() * Math.PI * 2, age: 0, life: 14 + Math.random() * 20 })
  }

  let seeded = false

  v.onFrame((ctx, dt, t, state, w, h) => {
    if (!seeded) {
      for (let i = 0; i < 90; i++) spawn(w, h)
      seeded = true
    }
    // Water background with soft swirl shading
    const g = ctx.createLinearGradient(0, 0, 0, h)
    g.addColorStop(0, pal.water)
    g.addColorStop(1, pal.tint + '40')
    ctx.fillStyle = pal.water
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)

    const cx = w / 2
    const cy = h / 2

    // Population maintenance
    if (bubbles.length < 110 && Math.random() < dt * 8) spawn(w, h, true)

    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i]
      b.age += dt
      // Slow swirl current around the center + neighbor cohesion drift
      const dx = b.x - cx
      const dy = b.y - cy
      const dist = Math.hypot(dx, dy) + 1
      const swirlV = 12 / (1 + dist * 0.01)
      b.x += (-dy / dist) * swirlV * dt + Math.sin(t * 0.6 + b.phase) * dt * 4
      b.y += (dx / dist) * swirlV * dt * 0.6 + Math.cos(t * 0.5 + b.phase) * dt * 3
      // gentle pull inward keeps the raft together
      b.x -= dx * dt * 0.008
      b.y -= dy * dt * 0.008

      if (b.age > b.life || Math.random() < dt * 0.008) {
        pops.push({ x: b.x, y: b.y, r: b.r, age: 0 })
        bubbles.splice(i, 1)
        continue
      }

      // Draw: translucent sphere with rim + moving iridescent highlight
      const grow = Math.max(0, Math.min(1, b.age * 2))
      const r = b.r * grow
      const bg = ctx.createRadialGradient(b.x - r * 0.3, b.y - r * 0.35, r * 0.05, b.x, b.y, r)
      bg.addColorStop(0, pal.foam + 'e8')
      bg.addColorStop(0.55, pal.foam + '70')
      bg.addColorStop(0.92, pal.tint + '50')
      bg.addColorStop(1, pal.foam + 'a8')
      ctx.fillStyle = bg
      ctx.beginPath()
      ctx.arc(b.x, b.y, r, 0, Math.PI * 2)
      ctx.fill()
      // iridescent arc sliding around the rim
      const ia = t * 0.7 + b.phase
      ctx.strokeStyle = pal.iri
      ctx.globalAlpha = 0.35 * state.intensity
      ctx.lineWidth = Math.max(1, r * 0.12)
      ctx.beginPath()
      ctx.arc(b.x, b.y, r * 0.82, ia, ia + 1.1)
      ctx.stroke()
      ctx.globalAlpha = 1
    }

    // Pop rings
    for (let i = pops.length - 1; i >= 0; i--) {
      const p = pops[i]
      p.age += dt
      const ph = p.age / 0.4
      if (ph >= 1) {
        pops.splice(i, 1)
        continue
      }
      ctx.strokeStyle = pal.foam
      ctx.globalAlpha = (1 - ph) * 0.6
      ctx.lineWidth = 2 * (1 - ph)
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.r * (1 + ph * 0.5), 0, Math.PI * 2)
      ctx.stroke()
      // droplets
      for (let d = 0; d < 5; d++) {
        const a = (d / 5) * Math.PI * 2 + p.r
        ctx.fillStyle = pal.foam
        ctx.beginPath()
        ctx.arc(p.x + Math.cos(a) * p.r * (1 + ph), p.y + Math.sin(a) * p.r * (1 + ph), 1.5 * (1 - ph), 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
    }
  })

  return v.start()
}
