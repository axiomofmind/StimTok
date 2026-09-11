import { canvasVisual } from '../lib/visual-kit.js'

export const meta = {
  id: '040-baton-light-trail',
  title: 'Twirling Baton Light Trail',
  interaction: 'Drag alongside the baton to paint kinetic sparks',
  palettes: [
    { name: 'Silver Star', tipA: '#ffffff', tipB: '#a8c8ff', staff: '#8a94a8', bg: '#080a10' },
    { name: 'Fire Twirl', tipA: '#ffd166', tipB: '#ff6b35', staff: '#8a6a4a', bg: '#0e0806' },
    { name: 'Neon Majorette', tipA: '#f72585', tipB: '#4cc9f0', staff: '#7a7a92', bg: '#06060c' },
  ],
}

export function mount(container, opts = {}) {
  const v = canvasVisual(container, opts, meta)
  let pal = meta.palettes[0]
  let cleared = false
  v.onPalette((p) => {
    pal = p
    cleared = false
  })
  v.onResize(() => (cleared = false))

  let prevT1 = null
  let prevT2 = null

  v.onFrame((ctx, dt, t, state, w, h) => {
    if (!cleared) {
      ctx.fillStyle = pal.bg
      ctx.fillRect(0, 0, w, h)
      cleared = true
      prevT1 = prevT2 = null
    }
    ctx.globalAlpha = 0.07
    ctx.fillStyle = pal.bg
    ctx.fillRect(0, 0, w, h)
    ctx.globalAlpha = 1

    // Baton center travels a slow lissajous; the staff spins about it.
    const cx = w / 2 + Math.sin(t * 0.5) * w * 0.18
    const cy = h / 2 + Math.sin(t * 0.73 + 1.2) * h * 0.16
    const spin = t * 5.2
    const len = Math.min(w, h) * 0.17

    const t1x = cx + Math.cos(spin) * len
    const t1y = cy + Math.sin(spin) * len
    const t2x = cx - Math.cos(spin) * len
    const t2y = cy - Math.sin(spin) * len

    ctx.globalCompositeOperation = 'lighter'
    ctx.lineCap = 'round'
    const glow = 8 + state.intensity * 12

    // Tip trails
    if (prevT1) {
      ctx.strokeStyle = pal.tipA
      ctx.shadowColor = pal.tipA
      ctx.shadowBlur = glow
      ctx.lineWidth = 3.5
      ctx.beginPath()
      ctx.moveTo(prevT1[0], prevT1[1])
      ctx.lineTo(t1x, t1y)
      ctx.stroke()
      ctx.strokeStyle = pal.tipB
      ctx.shadowColor = pal.tipB
      ctx.beginPath()
      ctx.moveTo(prevT2[0], prevT2[1])
      ctx.lineTo(t2x, t2y)
      ctx.stroke()
      ctx.shadowBlur = 0
    }

    // The staff itself: a faint spinning line
    ctx.strokeStyle = pal.staff
    ctx.globalAlpha = 0.5
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(t1x, t1y)
    ctx.lineTo(t2x, t2y)
    ctx.stroke()
    ctx.globalAlpha = 1

    // Glowing tips
    for (const [x, y, c] of [[t1x, t1y, pal.tipA], [t2x, t2y, pal.tipB]]) {
      const g = ctx.createRadialGradient(x, y, 0, x, y, 10)
      g.addColorStop(0, '#ffffff')
      g.addColorStop(0.4, c)
      g.addColorStop(1, 'transparent')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(x, y, 10, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalCompositeOperation = 'source-over'

    prevT1 = [t1x, t1y]
    prevT2 = [t2x, t2y]
  })

  return v.start()
}
