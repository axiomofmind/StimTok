import { canvasVisual, makeNoise2D } from '../lib/visual-kit.js'

export const meta = {
  id: '067-equalizer-bars',
  title: 'Idle-Rhythm Equalizer Bars',
  interaction: 'Sweep across the equalizer to scatter rhythmic sparks',
  palettes: [
    { name: 'Spectrum', low: '#3fd8e8', high: '#ff2975', peak: '#ffffff', bg: '#06080f' },
    { name: 'Sunset EQ', low: '#ffc145', high: '#ff5d73', peak: '#fff2c0', bg: '#0f0806' },
    { name: 'Matrix', low: '#2ea043', high: '#a8ff5f', peak: '#e8ffd8', bg: '#040a05' },
  ],
}

export function mount(container, opts = {}) {
  const v = canvasVisual(container, opts, meta)
  const noise = makeNoise2D(17)
  let pal = meta.palettes[0]
  v.onPalette((p) => (pal = p))

  // A synthetic "song": each band is driven by layered noise plus a
  // periodic beat envelope so it reads as music without any audio.
  const BANDS = 44
  const levels = new Float32Array(BANDS)
  const peaks = new Float32Array(BANDS)
  const peakVel = new Float32Array(BANDS)

  v.onFrame((ctx, dt, t, state, w, h) => {
    ctx.fillStyle = pal.bg
    ctx.fillRect(0, 0, w, h)

    // Beat: a 4/4 pulse with a stronger downbeat.
    const bpm = 96
    const beat = (t * bpm) / 60
    const beatPhase = beat - Math.floor(beat)
    const bar = Math.floor(beat) % 4
    const kick = Math.exp(-beatPhase * 9) * (bar === 0 ? 1 : 0.65)
    const hat = Math.exp(-((beat * 2) % 1) * 16) * 0.35

    const margin = w * 0.06
    const usable = w - margin * 2
    const bw = usable / BANDS

    for (let i = 0; i < BANDS; i++) {
      const f = i / (BANDS - 1)
      // Bass bands follow the kick; mids/highs follow noise + hats.
      const bass = Math.exp(-f * 6) * kick
      const mid = noise(i * 0.35, t * 1.6) * 0.5 + 0.5
      const high = Math.exp(-(1 - f) * 4) * hat
      const melody = Math.max(0, Math.sin(t * 1.1 + f * 7)) * 0.35 * (1 - Math.abs(f - 0.45) * 1.4)
      let target = bass * 0.85 + mid * 0.42 * (1 - f * 0.5) + high + melody
      target *= 0.55 + state.intensity * 0.6
      target = Math.max(0.02, Math.min(1, target))

      // Fast attack, slow decay — the classic EQ feel.
      const rate = target > levels[i] ? 22 : 4.5
      levels[i] += (target - levels[i]) * Math.min(1, rate * dt)

      // Peak caps hover then fall under gravity.
      if (levels[i] > peaks[i]) {
        peaks[i] = levels[i]
        peakVel[i] = 0
      } else {
        peakVel[i] += dt * 0.55
        peaks[i] = Math.max(levels[i], peaks[i] - peakVel[i] * dt)
      }

      const x = margin + i * bw
      const barW = bw * 0.68
      const barH = levels[i] * h * 0.72

      // Gradient from low color at the base to high color at the tip.
      const g = ctx.createLinearGradient(0, h * 0.88, 0, h * 0.88 - barH)
      g.addColorStop(0, pal.low)
      g.addColorStop(1, pal.high)
      ctx.fillStyle = g
      ctx.fillRect(x, h * 0.88 - barH, barW, barH)

      // Mirrored reflection below the baseline.
      ctx.globalAlpha = 0.18
      const g2 = ctx.createLinearGradient(0, h * 0.88, 0, h * 0.88 + barH * 0.5)
      g2.addColorStop(0, pal.low)
      g2.addColorStop(1, 'transparent')
      ctx.fillStyle = g2
      ctx.fillRect(x, h * 0.88, barW, barH * 0.5)
      ctx.globalAlpha = 1

      // Peak cap
      ctx.fillStyle = pal.peak
      ctx.fillRect(x, h * 0.88 - peaks[i] * h * 0.72 - 3, barW, 2.5)

      // Glow on tall bars
      if (levels[i] > 0.55) {
        ctx.globalCompositeOperation = 'lighter'
        ctx.globalAlpha = (levels[i] - 0.55) * 0.7
        ctx.fillStyle = pal.high
        ctx.fillRect(x - 3, h * 0.88 - barH - 4, barW + 6, barH + 4)
        ctx.globalAlpha = 1
        ctx.globalCompositeOperation = 'source-over'
      }
    }

    // Baseline
    ctx.fillStyle = pal.peak + '30'
    ctx.fillRect(margin, h * 0.88, usable, 1)
  })

  return v.start()
}
