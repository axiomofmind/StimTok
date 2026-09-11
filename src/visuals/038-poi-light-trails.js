import { canvasVisual } from '../lib/visual-kit.js'

export const meta = {
  id: '038-poi-light-trails',
  title: 'Hand-Spun Poi Light Trails',
  interaction: 'Sweep through the poi trails to throw off sparks',
  palettes: [
    { name: 'Fire & Ice', a: '#ff6b35', b: '#4cc9f0', bg: '#06060a' },
    { name: 'UV Rave', a: '#f72585', b: '#b5179e', bg: '#08040c' },
    { name: 'Emerald Gold', a: '#ffd166', b: '#06d6a0', bg: '#060806' },
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

  let prevA = null
  let prevB = null

  v.onFrame((ctx, dt, t, state, w, h) => {
    if (!cleared) {
      ctx.fillStyle = pal.bg
      ctx.fillRect(0, 0, w, h)
      cleared = true
      prevA = prevB = null
    }
    // Persistent trails: fade slowly toward the background.
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = 0.045
    ctx.fillStyle = pal.bg
    ctx.fillRect(0, 0, w, h)
    ctx.globalAlpha = 1

    const cx = w / 2
    const cy = h / 2
    const R = Math.min(w, h)

    // Poi patterns: hands orbit slowly; poi heads orbit hands faster.
    // The ratio drifts through classic flower patterns (3-petal, 4-petal...).
    const ratio = 3 + Math.floor((t * 0.04) % 3) // 3,4,5 petals slowly
    const handR = R * 0.14
    const poiR = R * 0.2

    const hx = Math.cos(t * 0.9) * handR
    const hy = Math.sin(t * 0.9) * handR

    const aA = t * 0.9 * ratio
    const ax = cx + hx + Math.cos(aA) * poiR
    const ay = cy + hy + Math.sin(aA) * poiR

    const aB = t * 0.9 * ratio + Math.PI
    const bx = cx - hx + Math.cos(aB) * poiR
    const by = cy - hy + Math.sin(aB) * poiR

    ctx.globalCompositeOperation = 'lighter'
    ctx.lineCap = 'round'
    const glow = 8 + state.intensity * 14

    if (prevA) {
      ctx.strokeStyle = pal.a
      ctx.shadowColor = pal.a
      ctx.shadowBlur = glow
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.moveTo(prevA[0], prevA[1])
      ctx.lineTo(ax, ay)
      ctx.stroke()
      ctx.strokeStyle = pal.b
      ctx.shadowColor = pal.b
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.moveTo(prevB[0], prevB[1])
      ctx.lineTo(bx, by)
      ctx.stroke()
    }
    ctx.shadowBlur = 0

    // Bright poi heads
    for (const [x, y, c] of [[ax, ay, pal.a], [bx, by, pal.b]]) {
      const g = ctx.createRadialGradient(x, y, 0, x, y, 14)
      g.addColorStop(0, '#ffffff')
      g.addColorStop(0.3, c)
      g.addColorStop(1, 'transparent')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(x, y, 14, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalCompositeOperation = 'source-over'

    prevA = [ax, ay]
    prevB = [bx, by]
  })

  return v.start()
}
