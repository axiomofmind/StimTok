import { canvasVisual } from '../lib/visual-kit.js'
import { readPreference, savePreference } from '../lib/preferences.js'

export const meta = {
  id: '070-fractal-tree-zoom',
  title: 'Recursive Fractal-Tree Zoom',
  interaction:
    'Drag a branch to spread its descendants · pinch to scale · tune branching angles or grow new levels',
  palettes: [
    {
      name: 'Winter Branch',
      trunk: '#c8d8e8',
      tip: '#7db8f0',
      glow: '#ffffff',
      bg: '#060a12',
    },
    {
      name: 'Autumn Growth',
      trunk: '#d4a276',
      tip: '#e8724a',
      glow: '#ffd9a0',
      bg: '#120a06',
    },
    {
      name: 'Neon Coral',
      trunk: '#a06ae8',
      tip: '#3fd8e8',
      glow: '#ffa0e8',
      bg: '#08040f',
    },
  ],
}

export function mount(container, opts = {}) {
  const v = canvasVisual(container, opts, meta)
  let pal = meta.palettes[0],
    segments = [],
    bends = {},
    grip = null,
    scale = 1,
    pinch = null
  if (!opts.fresh) bends = readPreference('fractal-tree-document', {})
  v.addDispose(() => savePreference('fractal-tree-document', bends))
  v.onPalette((p) => (pal = p))
  v.addSlider('Branch spread', 'spread', 0.22, 0.95, 0.01, 0.52)
  const depthControl = v.addSlider('Generations', 'depth', 5, 11, 1, 9)
  const zoom = v.addSlider('Tree scale', 'zoom', 0.55, 1.5, 0.05, 1)
  v.addAction('Grow a generation', () => {
    depthControl.value = Math.min(11, v.state.depth + 1)
    depthControl.dispatchEvent(new Event('input'))
  })
  v.addAction('Straighten branches', () => (bends = {}))
  v.addAction('Fit tree', () => {
    zoom.value = 1
    zoom.dispatchEvent(new Event('input'))
    bends = {}
  })
  function nearest(e) {
    let best = null,
      d = 35
    for (const s of segments) {
      if (s.depth > 6) continue
      const dx = s.x2 - s.x,
        dy = s.y2 - s.y,
        l = dx * dx + dy * dy,
        f = Math.max(0, Math.min(1, ((e.x - s.x) * dx + (e.y - s.y) * dy) / l)),
        dist = Math.hypot(e.x - s.x - f * dx, e.y - s.y - f * dy)
      if (dist < d) {
        d = dist
        best = s
      }
    }
    return best
  }
  v.onPointer((e) => {
    if (e.type === 'down') {
      const s = nearest(e)
      if (s)
        grip = {
          ...s,
          angle: Math.atan2(e.y - s.y, e.x - s.x),
          bend: bends[s.id] || 0,
        }
    }
    if (e.type === 'drag' && grip) {
      const delta = Math.atan2(e.y - grip.y, e.x - grip.x) - grip.angle
      bends[grip.id] = Math.max(
        -1.1,
        Math.min(1.1, grip.bend + Math.atan2(Math.sin(delta), Math.cos(delta))),
      )
    }
    if (e.type === 'up') grip = null
  })
  v.onFrame((ctx, dt, t, state, w, h) => {
    if (v.pointer.contacts.length === 2) {
      const [a, b] = v.pointer.contacts,
        d = Math.hypot(a.x - b.x, a.y - b.y)
      if (!pinch) pinch = { distance: d, scale: state.zoom }
      zoom.value = Math.max(
        0.55,
        Math.min(1.5, (pinch.scale * d) / Math.max(1, pinch.distance)),
      )
      zoom.dispatchEvent(new Event('input'))
    } else pinch = null
    scale = state.zoom
    ctx.fillStyle = pal.bg
    ctx.fillRect(0, 0, w, h)
    segments = []
    const baseLen = Math.min(w * 0.22, h * 0.17) * scale,
      rootY = h < 400 ? h * 0.7 : Math.min(h * 0.78, h - 175)
    function branch(x, y, len, angle, depth, id) {
      if (depth > state.depth || len < 0.6) return
      const a =
        angle +
        (bends[id] || 0) +
        Math.sin(t * 0.4 + depth * 0.9) * 0.006 * depth
      const x2 = x + Math.cos(a) * len,
        y2 = y + Math.sin(a) * len
      segments.push({ x, y, x2, y2, depth, id })
      ctx.strokeStyle = depth < 3 ? pal.trunk : pal.tip
      ctx.globalAlpha = Math.min(1, len / 6) * (0.55 + state.intensity * 0.3)
      ctx.lineWidth = Math.max(0.5, len * 0.045)
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x2, y2)
      ctx.stroke()
      if (depth === state.depth) {
        ctx.fillStyle = pal.glow
        ctx.beginPath()
        ctx.arc(x2, y2, 1.1, 0, Math.PI * 2)
        ctx.fill()
      }
      branch(x2, y2, len * 0.72, a - state.spread, depth + 1, id * 2)
      branch(x2, y2, len * 0.72, a + state.spread, depth + 1, id * 2 + 1)
    }
    branch(w * 0.5, rootY, baseLen, -Math.PI / 2, 0, 1)
    ctx.globalAlpha = 1
    if (grip) {
      ctx.strokeStyle = pal.glow + 'aa'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(grip.x, grip.y, 7, 0, Math.PI * 2)
      ctx.stroke()
    }
  })
  return v.start()
}
