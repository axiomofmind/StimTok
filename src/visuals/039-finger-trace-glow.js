import { canvasVisual } from '../lib/visual-kit.js'

export const meta = {
  id: '039-finger-trace-glow',
  title: 'Finger Tracing Glowing Line',
  interaction: 'Hold and draw your own light painting · double-tap to clear',
  palettes: [
    { name: 'Moon White', line: '#e8ecff', bg: '#080a10' },
    { name: 'Ember Trace', line: '#ffb36a', bg: '#100a06' },
    { name: 'Aqua Glow', line: '#7ff0e0', bg: '#04100e' },
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

  let prev = null

  v.onPointer((event) => {
    if (event.type === 'down') prev = [event.x, event.y]
    if (event.type === 'doubletap') cleared = false
  })

  v.onFrame((ctx, dt, t, state, w, h) => {
    if (!cleared) {
      ctx.fillStyle = pal.bg
      ctx.fillRect(0, 0, w, h)
      cleared = true
      prev = null
    }
    // Very slow fade: the traced line lingers like a light painting.
    ctx.globalAlpha = 0.012
    ctx.fillStyle = pal.bg
    ctx.fillRect(0, 0, w, h)
    ctx.globalAlpha = 1

    const cx = w / 2
    const cy = h / 2
    const R = Math.min(w, h) * 0.38

    // Rose curve r = R sin(kθ) with k drifting between integers, so the
    // "finger" endlessly traces evolving petal patterns.
    const k = 2 + 1.5 * (0.5 + 0.5 * Math.sin(t * 0.02))
    const theta = t * 0.55
    const r = R * Math.abs(Math.sin(theta * k)) * (0.55 + 0.45 * Math.sin(t * 0.07))
    const x = state.pointer.down ? state.pointer.x : cx + Math.cos(theta) * r
    const y = state.pointer.down ? state.pointer.y : cy + Math.sin(theta) * r

    if (prev) {
      ctx.globalCompositeOperation = 'lighter'
      ctx.strokeStyle = pal.line
      ctx.shadowColor = pal.line
      ctx.shadowBlur = 6 + state.intensity * 10
      ctx.lineWidth = 2.4
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(prev[0], prev[1])
      ctx.lineTo(x, y)
      ctx.stroke()
      ctx.shadowBlur = 0
      ctx.globalCompositeOperation = 'source-over'
    }

    // Fingertip glow
    ctx.globalCompositeOperation = 'lighter'
    const g = ctx.createRadialGradient(x, y, 0, x, y, 18)
    g.addColorStop(0, '#ffffff')
    g.addColorStop(0.25, pal.line)
    g.addColorStop(1, 'transparent')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x, y, 18, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalCompositeOperation = 'source-over'

    prev = [x, y]
  })

  return v.start()
}
