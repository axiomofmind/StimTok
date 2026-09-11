import { readPreference, savePreference } from '../lib/preferences.js'
import { canvasVisual } from '../lib/visual-kit.js'

export const meta = {
  intensityLabel: 'Stem weight',
  id: '102-bloom-brush',
  title: 'Bloom Brush',
  interaction:
    'Choose Vine, Fern, or Meadow · drag to grow · tap to plant a flower · Undo removes your last stroke',
  palettes: [
    {
      name: 'Moon Garden',
      bg: '#07130f',
      glow: '#173d2a',
      stem: '#58a86f',
      leaves: ['#2d7a4f', '#4fa86a', '#86bc65'],
      flowers: ['#ff7aa8', '#ffc857', '#b892ff', '#f4eee3'],
      pollen: '#ffe89b',
    },
    {
      name: 'Pressed Botanica',
      bg: '#e9e1cb',
      glow: '#d2c7a8',
      stem: '#596b3d',
      leaves: ['#4d6a3c', '#75854c', '#9a7c46'],
      flowers: ['#a83f4d', '#d27b3d', '#6b668f', '#f1d59b'],
      pollen: '#80642d',
    },
    {
      name: 'Neon Conservatory',
      bg: '#090916',
      glow: '#18245b',
      stem: '#36d399',
      leaves: ['#16a87d', '#4ee6b0', '#7cc8ff'],
      flowers: ['#ff4fa3', '#ffc94a', '#8f7cff', '#5ff4e8'],
      pollen: '#fff59d',
    },
  ],
}

const clamp01 = (value) => Math.max(0, Math.min(1, value))
const easeOut = (value) => 1 - (1 - clamp01(value)) ** 3

export function mount(container, opts = {}) {
  const v = canvasVisual(container, opts, meta)
  const gardenLayer = document.createElement('canvas')
  let gardenDirty = true,
    lastIntensity = -1
  let palette = meta.palettes[0]
  v.onPalette((next) => {
    palette = next
    gardenDirty = true
  })

  const stems = []
  const leaves = []
  const flowers = []
  const insects = []
  const pollen = []
  const paperSpecks = []
  let brush = 'vine'
  const undo = [],
    redo = []
  let current = null
  let node = 0
  let stroke = 0
  let side = 1
  let seeded = false
  let touched = false

  function addFlower(x, y, angle, size, delay = 0) {
    gardenDirty = true
    flowers.push({
      x,
      y,
      angle,
      size,
      age: -delay,
      petals: brush === 'meadow' ? 12 : 5 + Math.floor(Math.random() * 4),
      color: Math.floor(Math.random() * palette.flowers.length),
      phase: Math.random() * Math.PI * 2,
    })
  }

  function beginStroke(x, y) {
    current = { x, y, angle: -Math.PI / 2 }
    node = 0
    side = Math.random() > 0.5 ? 1 : -1
    stroke++
  }

  function extendStroke(x, y, pointerSpeed = 100, preAge = 0) {
    gardenDirty = true
    if (!current) beginStroke(x, y)
    const dx = x - current.x
    const dy = y - current.y
    const distance = Math.hypot(dx, dy)
    if (distance < 7) return
    const steps = Math.max(1, Math.ceil(distance / 11))
    const startX = current.x
    const startY = current.y
    let priorX = startX
    let priorY = startY
    for (let step = 1; step <= steps; step++) {
      const f = step / steps
      const nextX = startX + dx * f
      const nextY = startY + dy * f
      const angle = Math.atan2(nextY - priorY, nextX - priorX)
      const turn = Math.atan2(
        Math.sin(angle - current.angle),
        Math.cos(angle - current.angle),
      )
      stems.push({
        x1: priorX,
        y1: priorY,
        x2: nextX,
        y2: nextY,
        angle,
        turn,
        age: preAge - step * 0.012,
        width: 1.15 + Math.min(2.2, pointerSpeed / 700),
        phase: Math.random() * Math.PI * 2,
        stroke,
      })
      node++

      if (node % (brush === 'fern' ? 1 : 2) === 0) {
        side *= -1
        const slow = 1 - Math.min(0.55, pointerSpeed / 2200)
        leaves.push({
          x: nextX,
          y: nextY,
          angle: angle + side * (0.72 + Math.random() * 0.42),
          size: (brush === 'fern' ? 27 : 9 + Math.random() * 12) * slow,
          age: preAge - 0.08 - step * 0.012,
          color: Math.floor(Math.random() * palette.leaves.length),
          phase: Math.random() * Math.PI * 2,
          side,
          stroke,
        })
      }

      const bloomEvery = pointerSpeed < 450 ? 7 : 12
      if (
        brush !== 'fern' &&
        node % (brush === 'meadow' ? 3 : bloomEvery) === 0
      ) {
        const normal = angle + (side * Math.PI) / 2
        const reach = 8 + Math.random() * 13
        addFlower(
          nextX + Math.cos(normal) * reach,
          nextY + Math.sin(normal) * reach,
          angle,
          7 + Math.random() * 8,
          0.15 + step * 0.015 - preAge,
        )
      }

      if (node % 43 === 0 && insects.length < 24) {
        insects.push({
          x: nextX,
          y: nextY,
          age: preAge - 0.4,
          phase: Math.random() * Math.PI * 2,
          size: 5 + Math.random() * 4,
          color: Math.floor(Math.random() * palette.flowers.length),
          stroke,
        })
      }

      priorX = nextX
      priorY = nextY
      current.angle = angle
    }
    current.x = x
    current.y = y
  }

  function plantRosette(x, y) {
    addFlower(x, y, -Math.PI / 2, 14 + Math.random() * 7)
    for (let i = 0; i < 7; i++) {
      leaves.push({
        x,
        y,
        angle: (i / 7) * Math.PI * 2,
        size: 14 + Math.random() * 9,
        age: -i * 0.035,
        color: i % palette.leaves.length,
        phase: Math.random() * 6.28,
        side: i % 2 ? 1 : -1,
        stroke,
      })
    }
  }

  function clearGarden() {
    gardenDirty = true
    stems.length =
      leaves.length =
      flowers.length =
      insects.length =
      pollen.length =
        0
    current = null
    seeded = true
  }

  v.onPointer((event) => {
    if (event.type === 'down') {
      remember()
      touched = true
      beginStroke(event.x, event.y)
    }
    if (event.type === 'drag') extendStroke(event.x, event.y, event.speed)
    if (event.type === 'tap') {
      current = null
      plantRosette(event.x, event.y)
    }
    if (event.type === 'up' || event.type === 'fling') {
      current = null
      persist()
    }
  })

  function seedSprig(width, height) {
    if (seeded || touched) return
    seeded = true
    beginStroke(width * 0.34, height * 0.64)
    for (let i = 1; i <= 34; i++) {
      const f = i / 34
      const x = width * (0.34 + f * 0.32)
      const y =
        height * (0.64 - f * 0.22) +
        Math.sin(f * Math.PI * 2.2) * height * 0.055
      extendStroke(x, y, 120, 0.35 - f * 0.4)
    }
    current = null
  }

  function rebuildSpecks(width, height) {
    paperSpecks.length = 0
    for (let i = 0; i < 130; i++) {
      paperSpecks.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 1.2,
        a: 0.015 + Math.random() * 0.025,
      })
    }
  }
  rebuildSpecks(v.size.w, v.size.h)

  function documentState() {
    return JSON.parse(
      JSON.stringify({
        stems,
        leaves,
        flowers,
        insects,
        width: v.size.w,
        height: v.size.h,
      }),
    )
  }
  function persist() {
    savePreference('bloom-document', documentState())
  }
  function restore(doc) {
    gardenDirty = true
    const sx = v.size.w / doc.width,
      sy = v.size.h / doc.height
    for (const [dest, source] of [
      [stems, doc.stems],
      [leaves, doc.leaves],
      [flowers, doc.flowers],
      [insects, doc.insects],
    ]) {
      dest.length = 0
      for (const original of source) {
        const item = { ...original }
        for (const key of ['x', 'x1', 'x2']) if (key in item) item[key] *= sx
        for (const key of ['y', 'y1', 'y2']) if (key in item) item[key] *= sy
        dest.push(item)
      }
    }
    seeded = touched = true
  }
  function remember() {
    undo.push(documentState())
    if (undo.length > 20) undo.shift()
    redo.length = 0
  }
  const saved = readPreference('bloom-document', null)
  if (saved && !opts.fresh) restore(saved)
  v.addAction('Vine', () => {
    brush = 'vine'
  })
  v.addAction('Fern', () => {
    brush = 'fern'
  })
  v.addAction('Meadow', () => {
    brush = 'meadow'
  })
  v.addAction('Undo', () => {
    if (undo.length) {
      redo.push(documentState())
      restore(undo.pop())
      persist()
    }
  })
  v.addAction('Redo', () => {
    if (redo.length) {
      undo.push(documentState())
      restore(redo.pop())
      persist()
    }
  })
  v.addAction('Clear garden', () => {
    remember()
    clearGarden()
    persist()
  })
  v.onResize((width, height, oldW, oldH) => {
    rebuildSpecks(width, height)
    const doc = documentState()
    doc.width = oldW
    doc.height = oldH
    restore(doc)
  })
  v.addDispose(persist)
  v.onReset(() => {
    remember()
    clearGarden()
  })

  function drawLeaf(ctx, leaf, t) {
    const grow = easeOut(leaf.age / 0.42)
    if (grow <= 0) return
    const sway = Math.sin(t * 0.72 + leaf.phase) * 0.055 * grow
    const length = leaf.size * grow
    const width = leaf.size * 0.42 * grow
    ctx.save()
    ctx.translate(leaf.x, leaf.y)
    ctx.rotate(leaf.angle + sway)
    ctx.fillStyle = palette.leaves[leaf.color % palette.leaves.length]
    ctx.globalAlpha = 0.72 + grow * 0.25
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.bezierCurveTo(
      length * 0.28,
      -width,
      length * 0.78,
      -width * 0.7,
      length,
      0,
    )
    ctx.bezierCurveTo(length * 0.7, width * 0.72, length * 0.24, width, 0, 0)
    ctx.fill()
    ctx.strokeStyle = palette.stem
    ctx.globalAlpha = 0.48
    ctx.lineWidth = 0.65
    ctx.beginPath()
    ctx.moveTo(1, 0)
    ctx.lineTo(length * 0.88, 0)
    ctx.stroke()
    ctx.restore()
  }

  function drawFlower(ctx, flower, t) {
    const raw = clamp01(flower.age / 0.55)
    if (raw <= 0) return
    const grow = easeOut(raw) + Math.sin(raw * Math.PI) * 0.12
    const sway = Math.sin(t * 0.8 + flower.phase) * 0.06
    ctx.save()
    ctx.translate(flower.x, flower.y)
    ctx.rotate(flower.angle + sway)
    ctx.scale(grow, grow)
    ctx.globalCompositeOperation = 'source-over'
    for (let i = 0; i < flower.petals; i++) {
      ctx.save()
      ctx.rotate((i / flower.petals) * Math.PI * 2)
      ctx.fillStyle = palette.flowers[flower.color % palette.flowers.length]
      ctx.globalAlpha = 0.82
      ctx.beginPath()
      ctx.ellipse(
        flower.size * 0.62,
        0,
        flower.size * 0.72,
        flower.size * 0.28,
        0,
        0,
        Math.PI * 2,
      )
      ctx.fill()
      ctx.restore()
    }
    ctx.fillStyle = palette.pollen
    ctx.globalAlpha = 0.98
    ctx.beginPath()
    ctx.arc(0, 0, flower.size * 0.28, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  function drawInsect(ctx, insect, t) {
    const grow = easeOut(insect.age / 0.65)
    if (grow <= 0) return
    const hoverX = Math.sin(t * 1.7 + insect.phase) * 8
    const hoverY = Math.cos(t * 1.3 + insect.phase) * 5
    const flap = 0.3 + Math.abs(Math.sin(t * 8 + insect.phase)) * 0.9
    ctx.save()
    ctx.translate(insect.x + hoverX, insect.y + hoverY)
    ctx.scale(grow, grow)
    ctx.fillStyle = palette.flowers[insect.color % palette.flowers.length]
    ctx.globalAlpha = 0.82
    ctx.beginPath()
    ctx.ellipse(
      -insect.size * 0.55,
      0,
      insect.size * flap,
      insect.size * 0.48,
      -0.35,
      0,
      Math.PI * 2,
    )
    ctx.ellipse(
      insect.size * 0.55,
      0,
      insect.size * flap,
      insect.size * 0.48,
      0.35,
      0,
      Math.PI * 2,
    )
    ctx.fill()
    ctx.fillStyle = palette.stem
    ctx.beginPath()
    ctx.ellipse(0, 0, insect.size * 0.18, insect.size * 0.65, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  function drawGarden(ctx, dt, t, state) {
    for (const stem of stems) {
      stem.age += dt
      const grow = easeOut(stem.age / 0.24)
      if (grow <= 0) continue
      const endX = stem.x1 + (stem.x2 - stem.x1) * grow
      const endY = stem.y1 + (stem.y2 - stem.y1) * grow
      const length = Math.hypot(stem.x2 - stem.x1, stem.y2 - stem.y1)
      const normalX = -Math.sin(stem.angle)
      const normalY = Math.cos(stem.angle)
      const breeze =
        Math.sin(t * 0.65 + stem.phase) * Math.min(1.8, length * 0.08)
      ctx.strokeStyle = palette.stem
      ctx.globalAlpha = 0.84
      ctx.lineWidth = stem.width * (0.5 + state.intensity * 0.45)
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(stem.x1, stem.y1)
      ctx.quadraticCurveTo(
        (stem.x1 + endX) * 0.5 + normalX * (stem.turn * 10 + breeze),
        (stem.y1 + endY) * 0.5 + normalY * (stem.turn * 10 + breeze),
        endX,
        endY,
      )
      ctx.stroke()
    }
    ctx.globalAlpha = 1

    for (const leaf of leaves) {
      leaf.age += dt
      drawLeaf(ctx, leaf, t)
    }
    for (const flower of flowers) {
      flower.age += dt
      drawFlower(ctx, flower, t)
    }
  }

  v.onFrame((ctx, dt, t, state, width, height) => {
    seedSprig(width, height)

    const background = ctx.createRadialGradient(
      width * 0.5,
      height * 0.45,
      0,
      width * 0.5,
      height * 0.5,
      Math.max(width, height) * 0.7,
    )
    background.addColorStop(0, palette.glow)
    background.addColorStop(1, palette.bg)
    ctx.fillStyle = background
    ctx.fillRect(0, 0, width, height)
    ctx.fillStyle = palette.stem
    for (const speck of paperSpecks) {
      ctx.globalAlpha = speck.a
      ctx.fillRect(speck.x, speck.y, speck.r, speck.r)
    }
    ctx.globalAlpha = 1

    // Mature artwork stays in a cached layer; only new growth rerasterizes it.
    // This preserves every stroke without redrawing thousands of petals per frame.
    const growing =
      stems.some((item) => item.age < 1) ||
      leaves.some((item) => item.age < 1) ||
      flowers.some((item) => item.age < 1)
    if (
      gardenDirty ||
      growing ||
      lastIntensity !== state.intensity ||
      gardenLayer.width !== width ||
      gardenLayer.height !== height
    ) {
      if (gardenLayer.width !== width || gardenLayer.height !== height) {
        gardenLayer.width = width
        gardenLayer.height = height
      }
      const art = gardenLayer.getContext('2d')
      art.clearRect(0, 0, width, height)
      drawGarden(art, dt, 0, state)
      gardenDirty = false
      lastIntensity = state.intensity
    }
    ctx.drawImage(gardenLayer, 0, 0)
    for (const insect of insects) {
      insect.age += dt
      drawInsect(ctx, insect, t)
    }

    if (
      flowers.length &&
      pollen.length < 230 &&
      Math.random() < dt * Math.min(8, flowers.length * 0.045)
    ) {
      const flower = flowers[Math.floor(Math.random() * flowers.length)]
      if (flower.age > 0.7) {
        pollen.push({
          x: flower.x,
          y: flower.y,
          vx: (Math.random() - 0.5) * 8,
          vy: -5 - Math.random() * 9,
          age: 0,
          life: 2.5 + Math.random() * 2,
          phase: Math.random() * 6.28,
        })
      }
    }
    ctx.fillStyle = palette.pollen
    ctx.globalCompositeOperation = 'lighter'
    for (let i = pollen.length - 1; i >= 0; i--) {
      const mote = pollen[i]
      mote.age += dt
      mote.vx += Math.sin(t * 1.4 + mote.phase) * dt * 3
      mote.x += mote.vx * dt
      mote.y += mote.vy * dt
      const fade = 1 - mote.age / mote.life
      if (fade <= 0) {
        pollen.splice(i, 1)
        continue
      }
      ctx.globalAlpha = fade * 0.7
      ctx.beginPath()
      ctx.arc(mote.x, mote.y, 1.1 + fade, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = 1
  })

  return v.start()
}
