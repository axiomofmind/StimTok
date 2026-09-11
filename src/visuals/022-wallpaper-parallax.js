import { canvasVisual } from '../lib/visual-kit.js'

export const meta = {
  id: '022-wallpaper-parallax',
  title: 'Wallpaper Pattern Parallax',
  interaction: 'Drag across the wallpaper to paint parallax sparks',
  palettes: [
    { name: 'Victorian Teal', ink: '#3fb8af', ink2: '#1a6a64', bg: '#0d2422' },
    { name: 'Damask Plum', ink: '#c98bb9', ink2: '#7a4a70', bg: '#241626' },
    { name: 'Gilded Night', ink: '#d4af37', ink2: '#7a6a2a', bg: '#14100a' },
  ],
}

// Draws one damask-ish motif tile to an offscreen canvas.
function makeTile(color, size) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const g = c.getContext('2d')
  const s = size
  g.strokeStyle = color
  g.fillStyle = color
  g.lineWidth = s * 0.02

  // Central medallion
  g.beginPath()
  g.ellipse(s / 2, s / 2, s * 0.13, s * 0.2, 0, 0, Math.PI * 2)
  g.stroke()
  g.beginPath()
  g.ellipse(s / 2, s / 2, s * 0.06, s * 0.1, 0, 0, Math.PI * 2)
  g.fill()
  // Four curls around it
  for (let i = 0; i < 4; i++) {
    g.save()
    g.translate(s / 2, s / 2)
    g.rotate((i * Math.PI) / 2)
    g.beginPath()
    g.moveTo(0, -s * 0.22)
    g.quadraticCurveTo(s * 0.14, -s * 0.34, s * 0.05, -s * 0.42)
    g.quadraticCurveTo(0.0, -s * 0.46, -s * 0.03, -s * 0.4)
    g.stroke()
    g.beginPath()
    g.arc(s * 0.04, -s * 0.41, s * 0.025, 0, Math.PI * 2)
    g.fill()
    g.restore()
  }
  // Corner petals (quarter flowers at each corner)
  for (const [cx, cy] of [[0, 0], [s, 0], [0, s], [s, s]]) {
    for (let i = 0; i < 3; i++) {
      g.save()
      g.translate(cx, cy)
      g.rotate((i - 1) * 0.5 + Math.atan2(s / 2 - cy, s / 2 - cx))
      g.beginPath()
      g.ellipse(s * 0.12, 0, s * 0.09, s * 0.035, 0, 0, Math.PI * 2)
      g.stroke()
      g.restore()
    }
  }
  return c
}

export function mount(container, opts = {}) {
  const v = canvasVisual(container, opts, meta)
  let tiles = null
  let pal = meta.palettes[0]

  function rebuild() {
    tiles = [
      { img: makeTile(pal.ink2 + '55', 340), size: 340, vx: 4, vy: 2.4, alpha: 1 },
      { img: makeTile(pal.ink2 + '99', 240), size: 240, vx: 7, vy: 4.5, alpha: 1 },
      { img: makeTile(pal.ink, 170), size: 170, vx: 12, vy: 8, alpha: 1 },
    ]
  }
  v.onPalette((p) => {
    pal = p
    rebuild()
  })

  v.onFrame((ctx, dt, t, state, w, h) => {
    ctx.fillStyle = pal.bg
    ctx.fillRect(0, 0, w, h)
    if (!tiles) rebuild()

    // Three depth layers drifting diagonally at different speeds.
    for (const layer of tiles) {
      const ox = (t * layer.vx) % layer.size
      const oy = (t * layer.vy * 0.6) % layer.size
      ctx.save()
      ctx.globalAlpha = 0.35 + state.intensity * 0.35
      for (let x = -layer.size; x < w + layer.size; x += layer.size) {
        for (let y = -layer.size; y < h + layer.size; y += layer.size) {
          ctx.drawImage(layer.img, x - ox, y - oy)
        }
      }
      ctx.restore()
    }

    // Soft candlelight vignette that breathes
    const breathe = 0.55 + 0.08 * Math.sin(t * 0.5)
    const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.2, w / 2, h / 2, Math.max(w, h) * breathe)
    g.addColorStop(0, 'rgba(0,0,0,0)')
    g.addColorStop(1, 'rgba(0,0,0,0.55)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
  })

  return v.start()
}
