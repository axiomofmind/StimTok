import { canvasVisual } from '../lib/visual-kit.js'

export const meta = {
  id: '079-breathing-pulse-circle',
  title: 'Gentle Breathing Pulse Circle',
  interaction: 'Press the circle to soften the breath · move gently to guide it',
  palettes: [
    { name: 'Calm Teal', ring: '#5eead4', glow: '#a7f3d0', text: '#8ad8c8', bg: '#04100e' },
    { name: 'Soft Lavender', ring: '#c4b5fd', glow: '#e9d5ff', text: '#b8a8e8', bg: '#0a0614' },
    { name: 'Warm Sand', ring: '#fcd34d', glow: '#fde68a', text: '#e8c878', bg: '#120c04' },
  ],
}

// Box breathing: 4 in, 4 hold, 4 out, 4 hold — the pattern most often
// recommended for downregulation, and easy to follow without counting.
const PHASES = [
  { label: 'Breathe in', dur: 4, from: 0, to: 1 },
  { label: 'Hold', dur: 4, from: 1, to: 1 },
  { label: 'Breathe out', dur: 4, from: 1, to: 0 },
  { label: 'Hold', dur: 4, from: 0, to: 0 },
]
const TOTAL = PHASES.reduce((s, p) => s + p.dur, 0)

export function mount(container, opts = {}) {
  const v = canvasVisual(container, opts, meta)
  let pal = meta.palettes[0]
  v.onPalette((p) => (pal = p))

  v.onFrame((ctx, dt, t, state, w, h) => {
    ctx.fillStyle = pal.bg
    ctx.fillRect(0, 0, w, h)

    const follow = state.pointer.active ? (state.pointer.down ? 0.09 : 0.025) : 0
    const cx = w / 2 + state.pointer.nx * w * follow
    const cy = h / 2 - state.pointer.ny * h * follow
    const R = Math.min(w, h) * 0.3

    // Find the current phase and its eased progress.
    let c = t % TOTAL
    let phase = PHASES[0]
    let pf = 0
    for (const p of PHASES) {
      if (c < p.dur) {
        phase = p
        pf = c / p.dur
        break
      }
      c -= p.dur
    }
    const ease = pf * pf * (3 - 2 * pf)
    const amount = phase.from + (phase.to - phase.from) * ease
    const touchCompression = state.pointer.down ? 0.88 + state.pointer.pressure * 0.08 : 1
    const radius = R * (0.45 + amount * 0.55) * touchCompression

    // Outer halo
    const halo = ctx.createRadialGradient(cx, cy, radius * 0.6, cx, cy, radius * 2.1)
    halo.addColorStop(0, pal.glow + '2a')
    halo.addColorStop(1, 'transparent')
    ctx.fillStyle = halo
    ctx.beginPath()
    ctx.arc(cx, cy, radius * 2.1, 0, Math.PI * 2)
    ctx.fill()

    // Filled body with a soft inner gradient
    const body = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius)
    body.addColorStop(0, pal.glow + '38')
    body.addColorStop(0.75, pal.ring + '22')
    body.addColorStop(1, pal.ring + '10')
    ctx.fillStyle = body
    ctx.beginPath()
    ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    ctx.fill()

    // Main ring
    ctx.strokeStyle = pal.ring
    ctx.globalAlpha = 0.55 + state.intensity * 0.35
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    ctx.stroke()
    ctx.globalAlpha = 1

    // Twelve tick petals that open and close with the breath.
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 - Math.PI / 2
      const inner = radius * 1.06
      const outer = radius * (1.06 + 0.1 + amount * 0.12)
      ctx.strokeStyle = pal.glow
      ctx.globalAlpha = 0.15 + amount * 0.35
      ctx.lineWidth = 2
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner)
      ctx.lineTo(cx + Math.cos(a) * outer, cy + Math.sin(a) * outer)
      ctx.stroke()
    }
    ctx.globalAlpha = 1

    // Progress arc around the outside showing time left in this phase.
    ctx.strokeStyle = pal.glow
    ctx.globalAlpha = 0.4
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.arc(cx, cy, R * 1.42, -Math.PI / 2, -Math.PI / 2 + pf * Math.PI * 2)
    ctx.stroke()
    ctx.globalAlpha = 1

    // Phase label
    ctx.fillStyle = pal.text
    ctx.globalAlpha = 0.75
    ctx.font = `300 ${Math.round(Math.min(w, h) * 0.045)}px system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(phase.label, cx, cy)
    ctx.globalAlpha = 1
  })

  return v.start()
}
