import { canvasVisual } from '../lib/visual-kit.js'
import { readPreference, savePreference } from '../lib/preferences.js'

export const meta = {
  speedControl: false,
  intensityControl: false,
  id: '046-sand-mandala-rake',
  title: 'Sand Mandala Raking Pattern',
  interaction:
    'Drag to comb the sand · choose Smooth to erase or Move stones to rearrange the garden',
  palettes: [
    {
      name: 'Zen Garden',
      sand: '#d8cdb4',
      groove: '#b8a888',
      ridge: '#eee4cc',
      stone: '#4a4640',
    },
    {
      name: 'White Gravel',
      sand: '#dcdcd8',
      groove: '#b8b8b0',
      ridge: '#f4f4f0',
      stone: '#3a3e44',
    },
    {
      name: 'Red Earth',
      sand: '#c89478',
      groove: '#a87458',
      ridge: '#e0b498',
      stone: '#3e2c24',
    },
  ],
}

export function mount(container, opts = {}) {
  const v = canvasVisual(container, opts, meta)
  let pal = meta.palettes[0],
    tool = 'rake',
    drawing = null,
    selected = null,
    dirty = true
  let strokes = [],
    stones = [
      { u: 0.3, v: 0.37, r: 0.037 },
      { u: 0.65, v: 0.6, r: 0.055 },
      { u: 0.42, v: 0.72, r: 0.025 },
    ]
  const saved = readPreference('sand-document', null)
  if (saved && !opts.fresh) {
    strokes = saved.strokes
    stones = saved.stones
  }
  const persist = () => savePreference('sand-document', { strokes, stones })
  v.addDispose(persist)
  const undo = [],
    redo = []
  const layer = document.createElement('canvas')
  function remember() {
    undo.push(JSON.stringify({ strokes, stones }))
    if (undo.length > 25) undo.shift()
    redo.length = 0
  }
  function restore(s) {
    ;({ strokes, stones } = JSON.parse(s))
    dirty = true
  }
  v.onPalette((p) => {
    pal = p
    dirty = true
  })
  v.onResize(() => (dirty = true))
  v.addAction('Comb', () => (tool = 'rake'))
  v.addAction('Single tine', () => (tool = 'single'))
  v.addAction('Move stones', () => (tool = 'stones'))
  v.addAction('Smooth', () => (tool = 'smooth'))
  v.addAction('Undo', () => {
    if (undo.length) {
      redo.push(JSON.stringify({ strokes, stones }))
      restore(undo.pop())
    }
  })
  v.addAction('Redo', () => {
    if (redo.length) {
      undo.push(JSON.stringify({ strokes, stones }))
      restore(redo.pop())
    }
  })
  v.addAction('Fresh sand', () => {
    remember()
    strokes = []
    dirty = true
  })
  let rakeAngle = 0
  v.onPointer((e) => {
    const point = { u: e.u, v: 1 - e.v }
    if (e.type === 'down') {
      remember()
      if (tool === 'stones')
        selected = stones.find(
          (st) =>
            Math.hypot(
              (st.u - point.u) * v.size.w,
              (st.v - point.v) * v.size.h,
            ) <
            st.r * Math.min(v.size.w, v.size.h) + 12,
        )
      else {
        drawing = { tool, points: [point] }
        strokes.push(drawing)
      }
    }
    if (e.type === 'drag') {
      if (selected) {
        selected.u = point.u
        selected.v = point.v
      }
      if (drawing) drawing.points.push(point)
      if (Math.hypot(e.dx, e.dy) > 1) rakeAngle = Math.atan2(e.dy, e.dx)
      dirty = true
    }
    if (e.type === 'up') {
      drawing = null
      selected = null
      persist()
    }
  })
  function drawGround(w, h) {
    layer.width = w
    layer.height = h
    const ctx = layer.getContext('2d')
    ctx.fillStyle = pal.sand
    ctx.fillRect(0, 0, w, h)
    for (let i = 0; i < w * h * 0.014; i++) {
      const x = ((((Math.sin(i * 127.1) * 43758.5453) % 1) + 1) % 1) * w,
        y = ((((Math.sin(i * 311.7) * 23421.631) % 1) + 1) % 1) * h
      ctx.fillStyle = i % 2 ? pal.ridge + '35' : pal.groove + '35'
      ctx.fillRect(x, y, 1.2, 1.2)
    }
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    for (const stroke of strokes) {
      if (stroke.points.length < 2) continue
      if (stroke.tool === 'smooth') {
        ctx.strokeStyle = pal.sand
        ctx.lineWidth = 38
        ctx.beginPath()
        stroke.points.forEach((p, i) =>
          ctx[i ? 'lineTo' : 'moveTo'](p.u * w, p.v * h),
        )
        ctx.stroke()
        continue
      }
      for (
        let tine = stroke.tool === 'single' ? 0 : -2;
        tine <= (stroke.tool === 'single' ? 0 : 2);
        tine++
      ) {
        for (const [offset, width, color] of [
          [0, 2.6, pal.groove],
          [1.7, 1.1, pal.ridge],
        ]) {
          ctx.strokeStyle = color
          ctx.lineWidth = width
          ctx.beginPath()
          stroke.points.forEach((p, i) => {
            const prev = stroke.points[Math.max(0, i - 1)],
              next = stroke.points[Math.min(stroke.points.length - 1, i + 1)]
            const angle = Math.atan2(
                (next.v - prev.v) * h,
                (next.u - prev.u) * w,
              ),
              space = tine * 6 + offset
            ctx[i ? 'lineTo' : 'moveTo'](
              p.u * w - Math.sin(angle) * space,
              p.v * h + Math.cos(angle) * space,
            )
          })
          ctx.stroke()
        }
      }
    }
    dirty = false
  }
  v.onFrame((ctx, dt, t, state, w, h) => {
    if (dirty) drawGround(w, h)
    ctx.drawImage(layer, 0, 0, w, h)
    for (const stone of stones) {
      const x = stone.u * w,
        y = stone.v * h,
        r = stone.r * Math.min(w, h)
      ctx.save()
      ctx.shadowColor = '#0006'
      ctx.shadowBlur = 14
      ctx.shadowOffsetY = 5
      const g = ctx.createRadialGradient(x - r * 0.4, y - r * 0.5, 0, x, y, r)
      g.addColorStop(0, '#848078')
      g.addColorStop(0.65, pal.stone)
      g.addColorStop(1, '#202421')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.ellipse(x, y, r, r * 0.8, 0.3, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
      ctx.strokeStyle = '#fff2'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.ellipse(x - r * 0.15, y - r * 0.18, r * 0.6, r * 0.3, -0.2, 0.2, 2.8)
      ctx.stroke()
    }
    if (v.pointer.down && tool !== 'stones') {
      ctx.save()
      ctx.translate(v.pointer.x, v.pointer.y)
      ctx.rotate(rakeAngle)
      ctx.strokeStyle = pal.stone
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(-25, 0)
      ctx.lineTo(-6, 0)
      ctx.moveTo(-6, -15)
      ctx.lineTo(-6, 15)
      for (let i = -2; i <= 2; i++) {
        ctx.moveTo(-6, i * 6)
        ctx.lineTo(4, i * 6)
      }
      ctx.stroke()
      ctx.restore()
    }
  })
  return v.start()
}
