import { canvasVisual } from '../lib/visual-kit.js'

export const meta = {
  id: '021-mandala-bloom',
  title: 'Symmetrical Mandala Bloom',
  interaction: 'Trace around the mandala to scatter luminous petals',
  palettes: [
    { name: 'Lotus', colors: ['#ff8fa3', '#ffb3c6', '#ffd6a5', '#caffbf'], bg: '#140a10' },
    { name: 'Peacock', colors: ['#0ea5e9', '#22d3ee', '#a78bfa', '#34d399'], bg: '#060a14' },
    { name: 'Marigold', colors: ['#f59e0b', '#ef4444', '#fbbf24', '#fb923c'], bg: '#120806' },
  ],
}

export function mount(container, opts = {}) {
  const v = canvasVisual(container, opts, meta)
  let pal = meta.palettes[0]
  let needClear = true

  v.onPalette((p) => {
    pal = p
    needClear = true
  })
  v.onResize(() => (needClear = true))

  const SYM = 12

  v.onFrame((ctx, dt, t, state, w, h) => {
    const cx = w / 2
    const cy = h / 2
    if (needClear) {
      ctx.fillStyle = pal.bg
      ctx.fillRect(0, 0, w, h)
      needClear = false
    }
    // Gentle persistent fade so old petals dissolve as new ones bloom.
    ctx.globalCompositeOperation = 'source-over'
    ctx.fillStyle = pal.bg + '08'
    ctx.fillRect(0, 0, w, h)

    // The "pen" traces a slow rose curve; drawn with N-fold symmetry + mirror.
    const maxR = Math.min(w, h) * 0.42
    const k = 2 + Math.sin(t * 0.05) * 1.5 // petal count morphs slowly
    const theta = t * 0.5
    const r = maxR * (0.25 + 0.75 * Math.abs(Math.sin(theta * k))) * (0.5 + 0.5 * Math.sin(t * 0.11))
    const px = Math.cos(theta) * r
    const py = Math.sin(theta) * r

    const n = pal.colors.length
    const hueIdx = ((Math.floor(t * 0.15) % n) + n) % n
    const color = pal.colors[hueIdx]
    const size = (1.5 + 2.5 * Math.abs(Math.sin(t * 0.23))) * (0.5 + state.intensity * 0.75)

    ctx.globalCompositeOperation = 'lighter'
    for (let s = 0; s < SYM; s++) {
      const a = (s * Math.PI * 2) / SYM
      const cos = Math.cos(a)
      const sin = Math.sin(a)
      for (const m of [1, -1]) {
        const x = cx + (px * cos - py * sin * m)
        const y = cy + (px * sin * m + py * cos)
        const g = ctx.createRadialGradient(x, y, 0, x, y, size * 4)
        g.addColorStop(0, color + 'cc')
        g.addColorStop(0.4, color + '44')
        g.addColorStop(1, color + '00')
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(x, y, size * 4, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // Center jewel
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 26)
    g.addColorStop(0, '#ffffff30')
    g.addColorStop(1, '#ffffff00')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(cx, cy, 26, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalCompositeOperation = 'source-over'
  })

  return v.start()
}
