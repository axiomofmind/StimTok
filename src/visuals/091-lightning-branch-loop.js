import { canvasVisual } from '../lib/visual-kit.js'

export const meta = {
  automaticPlay: true,
  id: '091-lightning-branch-loop',
  title: 'Branching Lightning Flicker',
  interaction:
    'Drag charge nodes to shape the path · hold empty space, then release a strike',
  palettes: [
    {
      name: 'Storm White',
      bolt: '#e8f0ff',
      glow: '#7db8ff',
      flash: '#2a3a6a',
      bg: '#04060e',
    },
    {
      name: 'Violet Storm',
      bolt: '#f0e0ff',
      glow: '#c084fc',
      flash: '#3a2a5a',
      bg: '#06040c',
    },
    {
      name: 'Emerald Storm',
      bolt: '#e0fff0',
      glow: '#5fe8b8',
      flash: '#1a4a3a',
      bg: '#030806',
    },
  ],
}

export function mount(container, opts = {}) {
  const v = canvasVisual(container, opts, meta)
  let pal = meta.palettes[0]
  v.onPalette((p) => (pal = p))

  const nodes = [
    { u: 0.2, v: 0.25, charge: 0 },
    { u: 0.72, v: 0.38, charge: 0 },
    { u: 0.36, v: 0.65, charge: 0 },
    { u: 0.8, v: 0.76, charge: 0 },
  ]
  let selected = null,
    charging = 0
  v.addAction('Discharge', () => {
    requestedStrike = {
      x: container.clientWidth * 0.5,
      y: container.clientHeight * 0.85,
    }
    charging = 1
  })
  v.addAction('Arrange nodes', () => {
    nodes.forEach((n) => {
      n.u = 0.15 + Math.random() * 0.7
      n.v = 0.2 + Math.random() * 0.6
    })
  })
  let bolt = null
  let timer = 0.8
  let flashEnergy = 0
  let requestedStrike = null
  let lastRequestAt = -1000

  v.onPointer((event) => {
    if (event.type === 'down') {
      selected =
        nodes.find(
          (n) =>
            Math.hypot(
              n.u * container.clientWidth - event.x,
              n.v * container.clientHeight - event.y,
            ) < 28,
        ) || null
      charging = 0
    }
    if (event.type === 'drag' && selected) {
      selected.u = event.u
      selected.v = 1 - event.v
    }
    if (event.type === 'up' && !selected && !event.cancelled)
      requestedStrike = { x: event.x, y: event.y }
    if (event.type === 'up') selected = null
  })

  // Recursive midpoint-displacement bolt with branches — the standard
  // technique for lightning that actually looks like lightning.
  function buildBolt(x1, y1, x2, y2, displace, depth, segs) {
    if (displace < 2 || depth > 6) {
      segs.push([
        [x1, y1],
        [x2, y2],
      ])
      return
    }
    const midX = (x1 + x2) / 2 + (Math.random() - 0.5) * displace
    const midY = (y1 + y2) / 2 + (Math.random() - 0.5) * displace * 0.4
    buildBolt(x1, y1, midX, midY, displace / 2, depth + 1, segs)
    buildBolt(midX, midY, x2, y2, displace / 2, depth + 1, segs)
    // Occasional forks that die out quickly.
    if (depth < 4 && Math.random() < 0.42) {
      const angle =
        Math.atan2(midY - y1, midX - x1) + (Math.random() - 0.5) * 1.1
      const len = Math.hypot(x2 - x1, y2 - y1) * (0.28 + Math.random() * 0.3)
      buildBolt(
        midX,
        midY,
        midX + Math.cos(angle) * len,
        midY + Math.sin(angle) * len,
        displace / 2,
        depth + 2,
        segs,
      )
    }
  }

  function newBolt(w, h, target = null) {
    const segs = []
    const startX = w * (0.2 + Math.random() * 0.6)
    const endX = target?.x ?? startX + (Math.random() - 0.5) * w * 0.35
    const endY = target?.y ?? h * (0.75 + Math.random() * 0.25)
    let prior = { x: startX, y: 0 }
    const route = [...nodes].sort((a, b) => a.v - b.v)
    for (const node of route) {
      buildBolt(prior.x, prior.y, node.u * w, node.v * h, w * 0.06, 0, segs)
      prior = { x: node.u * w, y: node.v * h }
      node.charge = 1
    }
    buildBolt(prior.x, prior.y, endX, endY, w * 0.06, 0, segs)
    return {
      segs,
      age: 0,
      // Real strikes flicker several times in quick succession.
      strokes: 2 + Math.floor(Math.random() * 3),
      dur: 0.55 + Math.random() * 0.4,
    }
  }

  v.onFrame((ctx, dt, t, state, w, h) => {
    if (v.pointer.down && !selected) charging = Math.min(1, charging + dt * 0.8)
    // Storm-cloud backdrop
    const g = ctx.createLinearGradient(0, 0, 0, h)
    g.addColorStop(0, pal.flash)
    g.addColorStop(0.45, pal.bg)
    g.addColorStop(1, pal.bg)
    ctx.fillStyle = pal.bg
    ctx.fillRect(0, 0, w, h)
    ctx.globalAlpha = 0.35 + flashEnergy * 0.5
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
    ctx.globalAlpha = 1

    // Ambient sky flash decays after each strike.
    flashEnergy = Math.max(0, flashEnergy - dt * 2.2)
    if (flashEnergy > 0.01) {
      ctx.fillStyle = pal.glow
      ctx.globalAlpha = flashEnergy * (state.reducedFlash ? 0.025 : 0.16)
      ctx.fillRect(0, 0, w, h)
      ctx.globalAlpha = 1
    }

    for (const node of nodes) {
      node.charge *= Math.exp(-dt * 1.8)
      const x = node.u * w,
        y = node.v * h
      ctx.fillStyle = pal.glow
      ctx.shadowColor = pal.glow
      ctx.shadowBlur = 8 + node.charge * 18
      ctx.beginPath()
      ctx.arc(x, y, 8 + node.charge * 4, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0
      ctx.strokeStyle = pal.bolt + '77'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(x, y, 20, 0, Math.PI * 2)
      ctx.stroke()
    }
    if (v.pointer.down && !selected) {
      ctx.strokeStyle = pal.glow
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(
        v.pointer.x,
        v.pointer.y,
        24,
        -Math.PI / 2,
        -Math.PI / 2 + charging * Math.PI * 2,
      )
      ctx.stroke()
    }
    timer -= dt
    if (requestedStrike) {
      bolt = newBolt(w, h, requestedStrike)
      requestedStrike = null
      flashEnergy = 1
      timer = 1.2
    }
    if (state.demo && !bolt && timer <= 0) {
      bolt = newBolt(w, h)
      timer = 1.4 + Math.random() * 2.6
    }

    if (bolt) {
      bolt.age += dt
      const ph = bolt.age / bolt.dur
      if (ph >= 1) {
        bolt = null
      } else {
        // Multi-stroke flicker: brightness gates on and off a few times.
        const strokePhase = Math.sin(ph * Math.PI * bolt.strokes * 2)
        const visible = state.reducedFlash || strokePhase > -0.1
        const envelope = Math.sin(ph * Math.PI) ** 0.5
        const bright = state.reducedFlash
          ? envelope * 0.55
          : visible
            ? Math.max(0.25, Math.abs(strokePhase)) * envelope
            : 0

        if (bright > 0.02) {
          flashEnergy = Math.max(flashEnergy, bright * 0.9)
          ctx.globalCompositeOperation = 'lighter'
          ctx.lineCap = 'round'
          ctx.lineJoin = 'round'
          // Three passes: wide glow, mid, hot white core.
          for (const [width, alpha, color] of [
            [16, 0.1, pal.glow],
            [5, 0.35, pal.glow],
            [1.8, 0.95, pal.bolt],
          ]) {
            ctx.strokeStyle = color
            ctx.globalAlpha = alpha * bright * (0.5 + state.intensity * 0.7)
            ctx.lineWidth = width
            ctx.beginPath()
            for (const [a, b] of bolt.segs) {
              ctx.moveTo(a[0], a[1])
              ctx.lineTo(b[0], b[1])
            }
            ctx.stroke()
          }
          ctx.globalAlpha = 1
          ctx.globalCompositeOperation = 'source-over'
        }
      }
    }
  })

  return v.start()
}
