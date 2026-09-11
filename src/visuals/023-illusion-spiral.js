import { canvasVisual } from '../lib/visual-kit.js'

export const meta = {
  id: '023-illusion-spiral',
  title: 'Rotating-Snake Illusion Spiral',
  interaction: 'Trace the spiral to leave a kinetic light trail',
  palettes: [
    { name: 'Classic Snakes', colors: ['#16161a', '#4a7cf7', '#f2f2f2', '#ffd23f'], bg: '#8a8a92' },
    { name: 'Coral Reef', colors: ['#12131a', '#ff6b6b', '#f0ede8', '#4ecdc4'], bg: '#7a8a8a' },
    { name: 'Grape Soda', colors: ['#141018', '#8b5cf6', '#f2eaf8', '#f472b6'], bg: '#8a7a92' },
  ],
}

export function mount(container, opts = {}) {
  const v = canvasVisual(container, opts, meta)
  let pal = meta.palettes[0]
  v.onPalette((p) => (pal = p))

  // Rings of 4-phase color segments (the classic "rotating snakes" luminance
  // sequence), plus genuine slow counter-rotation so it shimmers on screen.
  v.onFrame((ctx, dt, t, state, w, h) => {
    ctx.fillStyle = pal.bg
    ctx.fillRect(0, 0, w, h)
    const cx = w / 2
    const cy = h / 2
    const maxR = Math.hypot(w, h) / 2

    const RINGS = 14
    for (let r = 0; r < RINGS; r++) {
      const inner = 18 + (r / RINGS) * maxR * 0.92
      const outer = 18 + ((r + 0.85) / RINGS) * maxR * 0.92
      const segs = 20 + r * 4
      const dir = r % 2 === 0 ? 1 : -1
      const rotation = t * 0.12 * dir * (0.5 + state.intensity * 0.75) + r * 0.35
      for (let s = 0; s < segs; s++) {
        const a0 = (s / segs) * Math.PI * 2 + rotation
        const a1 = ((s + 1.02) / segs) * Math.PI * 2 + rotation
        ctx.fillStyle = pal.colors[s % 4]
        ctx.beginPath()
        ctx.arc(cx, cy, outer, a0, a1)
        ctx.arc(cx, cy, inner, a1, a0, true)
        ctx.closePath()
        ctx.fill()
      }
    }

    // Central calm disc to rest the eyes on
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 26)
    g.addColorStop(0, pal.colors[2])
    g.addColorStop(1, pal.colors[0])
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(cx, cy, 22, 0, Math.PI * 2)
    ctx.fill()
  })

  return v.start()
}
