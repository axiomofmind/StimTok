import { canvasVisual, makeNoise2D } from '../lib/visual-kit.js'

export const meta = {
  id: '054-chalk-pastel-blend',
  title: 'Chalk/Pastel Blending Swirl',
  interaction: 'Drag through the pigment to leave blending sparks',
  palettes: [
    { name: 'Sunset Pastels', colors: ['#ff9aa2', '#ffb7b2', '#ffdac1', '#e2f0cb', '#b5ead7', '#c7ceea'], paper: '#2a2530' },
    { name: 'Sea Glass', colors: ['#a0e7e5', '#b4f8c8', '#8ac6d1', '#c8b6ff', '#bde0fe', '#a2d2ff'], paper: '#232a30' },
    { name: 'Desert Chalk', colors: ['#f4a261', '#e9c46a', '#e76f51', '#f4d6a0', '#d4a373', '#faedcd'], paper: '#2e2620' },
  ],
}

export function mount(container, opts = {}) {
  const v = canvasVisual(container, opts, meta)
  const noise = makeNoise2D(9)
  let pal = meta.palettes[0]
  let cleared = false
  let colorIdx = 0
  let colorMix = 0

  v.onPalette((p) => {
    pal = p
    cleared = false
  })
  v.onResize(() => (cleared = false))

  function hexToRgb(hex) {
    return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]
  }
  function lerpColor(a, b, f) {
    const ca = hexToRgb(a)
    const cb = hexToRgb(b)
    return `rgb(${Math.round(ca[0] + (cb[0] - ca[0]) * f)},${Math.round(ca[1] + (cb[1] - ca[1]) * f)},${Math.round(ca[2] + (cb[2] - ca[2]) * f)})`
  }

  v.onFrame((ctx, dt, t, state, w, h) => {
    if (!cleared) {
      ctx.fillStyle = pal.paper
      ctx.fillRect(0, 0, w, h)
      // paper tooth
      for (let i = 0; i < w * h * 0.008; i++) {
        ctx.fillStyle = 'rgba(255,255,255,0.03)'
        ctx.fillRect(Math.random() * w, Math.random() * h, 1, 1)
      }
      cleared = true
    }
    // Extremely slow fade keeps the surface from saturating forever.
    ctx.globalAlpha = 0.0035
    ctx.fillStyle = pal.paper
    ctx.fillRect(0, 0, w, h)
    ctx.globalAlpha = 1

    // The smudging fingertip wanders via noise, blending colors as it goes.
    colorMix += dt * 0.08
    if (colorMix >= 1) {
      colorMix = 0
      colorIdx = (colorIdx + 1) % pal.colors.length
    }
    const cNow = pal.colors[colorIdx]
    const cNext = pal.colors[(colorIdx + 1) % pal.colors.length]
    const color = lerpColor(cNow, cNext, colorMix)

    const px = w * (0.5 + noise(t * 0.09, 0.3) * 0.42)
    const py = h * (0.5 + noise(0.7, t * 0.11) * 0.42)
    const radius = (40 + noise(t * 0.2, 5) * 25) * (0.6 + state.intensity * 0.6)

    // Soft pastel stamp: layered translucent grains
    for (let layer = 0; layer < 3; layer++) {
      const r = radius * (1 - layer * 0.28)
      const g = ctx.createRadialGradient(px, py, 0, px, py, r)
      g.addColorStop(0, color.replace('rgb', 'rgba').replace(')', ',0.028)'))
      g.addColorStop(0.7, color.replace('rgb', 'rgba').replace(')', ',0.012)'))
      g.addColorStop(1, color.replace('rgb', 'rgba').replace(')', ',0)'))
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(px, py, r, 0, Math.PI * 2)
      ctx.fill()
    }
    // Chalk grain speckle inside the stamp
    for (let i = 0; i < 24; i++) {
      const a = Math.random() * Math.PI * 2
      const rr = Math.random() * radius * 0.9
      ctx.fillStyle = color.replace('rgb', 'rgba').replace(')', ',0.05)')
      ctx.fillRect(px + Math.cos(a) * rr, py + Math.sin(a) * rr, 1.6, 1.6)
    }

    // A second, smaller smudge trails behind blending the previous color
    const qx = w * (0.5 + noise(t * 0.09 - 0.6, 0.3) * 0.42)
    const qy = h * (0.5 + noise(0.7, t * 0.11 - 0.6) * 0.42)
    const g2 = ctx.createRadialGradient(qx, qy, 0, qx, qy, radius * 0.6)
    const prevColor = pal.colors[(colorIdx + pal.colors.length - 1) % pal.colors.length]
    g2.addColorStop(0, prevColor + '06')
    g2.addColorStop(1, prevColor + '00')
    ctx.fillStyle = g2
    ctx.beginPath()
    ctx.arc(qx, qy, radius * 0.6, 0, Math.PI * 2)
    ctx.fill()
  })

  return v.start()
}
