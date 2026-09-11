import { canvasVisual } from '../lib/visual-kit.js'
import { readPreference, savePreference } from '../lib/preferences.js'

export const meta = {
  intensityControl: false,
  id: '069-spirograph-loop',
  title: 'Spirograph Line-Drawing Loop',
  interaction:
    'Drag around the ring to turn the gear · drag the glowing pen to change reach · Tune adjusts layers and ink',
  palettes: [
    {
      name: 'Ink Wheels',
      colors: ['#3fd8e8', '#ff2975', '#ffc145', '#a8ff5f'],
      paper: '#0a0c12',
    },
    {
      name: 'Pastel Gears',
      colors: ['#ffb3c6', '#a2d2ff', '#b9fbc0', '#e0aaff'],
      paper: '#151220',
    },
    {
      name: 'Gold Leaf',
      colors: ['#ffd873', '#e8a838', '#fff2c0', '#c28a2e'],
      paper: '#0e0a06',
    },
  ],
}

export function mount(container, opts = {}) {
  const v = canvasVisual(container, opts, meta)
  let pal = meta.palettes[0],
    ratio = 3 / 8,
    turns = 3,
    reach = 0.75,
    theta = 0,
    color = 0,
    running = true,
    paths = [],
    current = null,
    dragging = false,
    dragPen = false,
    lastAngle = 0,
    rotation = 0,
    continuous = true
  const undo = []
  v.onPalette((p) => (pal = p))
  function start() {
    current = { color: color++ % pal.colors.length, points: [] }
    paths.push(current)
    theta = 0
  }
  start()
  const saved = readPreference('spirograph-document', null)
  if (saved && !opts.fresh) {
    ;({ paths, ratio, turns, reach, theta, color } = saved)
    rotation = saved.rotation || 0
    current = paths.at(-1) || null
    running = false
  }
  v.addDispose(() =>
    savePreference('spirograph-document', {
      paths,
      ratio,
      turns,
      reach,
      theta,
      color,
      rotation,
    }),
  )
  function snapshot() {
    undo.push(JSON.stringify(paths))
    if (undo.length > 15) undo.shift()
  }
  for (const [label, k, n] of [
    ['7 petals', 2 / 7, 2],
    ['8 petals', 3 / 8, 3],
    ['12 petals', 5 / 12, 5],
  ])
    v.addAction(label, () => {
      ratio = k
      turns = n
      snapshot()
      start()
      running = true
    })
  const reachInput = v.addSlider('Pen reach', 'reach', 0.1, 1.1, 0.01, reach)
  v.addSlider('Ink width', 'inkWidth', 0.5, 3, 0.1, 1.2)
  v.addSlider('Layer rotation', 'layerRotation', 0, 30, 1, 7)
  function setReach(value) {
    reachInput.value = Math.max(0.1, Math.min(1.1, value)).toFixed(2)
    reachInput.dispatchEvent(new Event('input'))
    reach = v.state.reach
  }
  v.addAction('New ink layer', () => {
    snapshot()
    start()
    running = true
  })
  const motor = v.addAction('Motor: on', () => {
    running = !running
    if (running && theta >= Math.PI * 2 * turns) start()
  })
  const layers = v.addAction('Continuous layers: on', () => {
    continuous = !continuous
    layers.textContent = `Continuous layers: ${continuous ? 'on' : 'off'}`
    layers.setAttribute('aria-pressed', String(continuous))
  })
  layers.setAttribute('aria-pressed', 'true')
  v.addAction('Undo', () => {
    if (undo.length) {
      paths = JSON.parse(undo.pop())
      current = paths.at(-1) || null
      running = false
    }
  })
  v.addAction('Clear page', () => {
    snapshot()
    paths = []
    current = null
    running = false
  })
  v.onPointer((e) => {
    if (e.type === 'down') {
      dragging = true
      const R = Math.min(v.size.w, v.size.h) * 0.34
      const x = (e.x - v.size.w * 0.5) / R,
        y = (e.y - v.size.h * 0.47) / R
      const p = point(theta)
      dragPen = Math.hypot(x - p.x, y - p.y) * R < 28
      lastAngle = Math.atan2(y, x)
      if (!current) {
        snapshot()
        start()
      }
    }
    if (e.type === 'drag' && dragging) {
      const R = Math.min(v.size.w, v.size.h) * 0.34
      const x = (e.x - v.size.w * 0.5) / R,
        y = (e.y - v.size.h * 0.47) / R
      if (dragPen) {
        const gx = (1 - ratio) * Math.cos(theta + rotation),
          gy = (1 - ratio) * Math.sin(theta + rotation)
        setReach(Math.hypot(x - gx, y - gy) / ratio)
      } else {
        const angle = Math.atan2(y, x)
        const delta = Math.atan2(
          Math.sin(angle - lastAngle),
          Math.cos(angle - lastAngle),
        )
        const steps = Math.max(1, Math.ceil(Math.abs(delta) / 0.015))
        for (let i = 0; i < steps; i++) {
          theta += delta / steps
          current.points.push(point(theta))
        }
        lastAngle = angle
      }
      v.state.dirty = true
    }
    if (e.type === 'up') dragging = false
  })
  function point(a) {
    const p = {
      x:
        (1 - ratio) * Math.cos(a) +
        reach * ratio * Math.cos(((1 - ratio) / ratio) * a),
      y:
        (1 - ratio) * Math.sin(a) -
        reach * ratio * Math.sin(((1 - ratio) / ratio) * a),
    }
    return {
      x: p.x * Math.cos(rotation) - p.y * Math.sin(rotation),
      y: p.x * Math.sin(rotation) + p.y * Math.cos(rotation),
    }
  }
  v.onFrame((ctx, dt, t, state, w, h) => {
    reach = state.reach
    const R = Math.min(w, h) * 0.34,
      cx = w * 0.5,
      cy = h * 0.47
    motor.textContent = `Motor: ${running ? 'on' : 'off'}`
    motor.setAttribute('aria-pressed', String(running))
    if ((running && dt > 0) || dragging) {
      if (!current) start()
      for (let i = 0; i < (running && !dragging ? 12 : 1); i++) {
        theta += running && !dragging ? dt * 0.1 : 0
        const next = point(theta),
          last = current.points.at(-1)
        if (!last || Math.hypot(last.x - next.x, last.y - next.y) > 0.0015)
          current.points.push(next)
      }
      if (!dragging && theta >= Math.PI * 2 * turns) {
        if (continuous) {
          rotation += (state.layerRotation * Math.PI) / 180
          start()
        } else running = false
      }
    }
    ctx.fillStyle = pal.paper
    ctx.fillRect(0, 0, w, h)
    ctx.lineWidth = state.inkWidth
    ctx.lineJoin = 'round'
    for (const path of paths) {
      ctx.strokeStyle = pal.colors[path.color]
      ctx.beginPath()
      path.points.forEach((p, i) =>
        ctx[i ? 'lineTo' : 'moveTo'](cx + p.x * R, cy + p.y * R),
      )
      ctx.stroke()
    }
    const gx = cx + (1 - ratio) * R * Math.cos(theta + rotation),
      gy = cy + (1 - ratio) * R * Math.sin(theta + rotation),
      p = point(theta)
    ctx.strokeStyle = '#adc9c755'
    ctx.lineWidth = 1
    ctx.setLineDash([4, 5])
    ctx.beginPath()
    ctx.arc(cx, cy, R, 0, Math.PI * 2)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.strokeStyle = '#d3eae488'
    ctx.beginPath()
    ctx.arc(gx, gy, R * ratio, 0, Math.PI * 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(gx, gy)
    ctx.lineTo(cx + p.x * R, cy + p.y * R)
    ctx.stroke()
    ctx.fillStyle = pal.colors[color % pal.colors.length]
    ctx.beginPath()
    ctx.arc(cx + p.x * R, cy + p.y * R, 5, 0, Math.PI * 2)
    ctx.fill()
  })
  return v.start()
}
