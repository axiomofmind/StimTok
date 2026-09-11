import { canvasVisual } from '../lib/visual-kit.js'
import { attachToySound } from '../lib/toy-sound.js'

export const meta = {
  automaticPlay: true,
  intensityControl: false,
  id: '049-bubble-wrap-pop',
  title: 'Bubble-Wrap Popping Cascade',
  interaction:
    'Tap bubbles or sweep across them to pop · use New sheet to refill',
  palettes: [
    {
      name: 'Clear Wrap',
      sheet: '#2a3038',
      bubble: '#4a5866',
      shine: '#c8d8e8',
      pop: '#ffffff',
    },
    {
      name: 'Pink Wrap',
      sheet: '#38222e',
      bubble: '#66424e',
      shine: '#f0c8d8',
      pop: '#ffd8e8',
    },
    {
      name: 'Mint Wrap',
      sheet: '#22342c',
      bubble: '#42665a',
      shine: '#c8f0dc',
      pop: '#d8ffe8',
    },
  ],
}

export function mount(container, opts = {}) {
  const v = canvasVisual(container, opts, meta)
  const sound = attachToySound(v, container)
  let pal = meta.palettes[0],
    cells = [],
    cols = 0,
    rows = 0,
    spacing = 54
  function fresh(size = spacing) {
    spacing = size
    cols = Math.max(4, Math.floor(v.size.w / size))
    rows = Math.max(5, Math.floor(v.size.h / size))
    cells = Array.from({ length: cols * rows }, (_, i) => ({
      col: i % cols,
      row: Math.floor(i / cols),
      popped: false,
      compression: 0,
      age: 9,
      phase: Math.random() * 6.28,
    }))
  }
  fresh()
  v.onPalette((p) => (pal = p))
  const history = []
  function snapshot() {
    history.push(cells.map((c) => c.popped))
    if (history.length > 30) history.shift()
  }
  const count = v.addAction('New sheet', () => {
    snapshot()
    cells.forEach((c) => {
      c.popped = false
      c.age = 9
    })
  })
  v.addAction('Undo', () => {
    const last = history.pop()
    if (last && last.length === cells.length)
      cells.forEach((c, i) => {
        c.popped = last[i]
        c.age = 9
      })
  })
  v.addAction('Jumbo bubbles', () => fresh(85))
  v.addAction('Classic bubbles', () => fresh(54))
  function position(c) {
    const sx = v.size.w / (cols + 0.5),
      sy = v.size.h / (rows + 0.7)
    return {
      x: (c.col + 0.5 + (c.row % 2) * 0.35) * sx,
      y: (c.row + 0.5) * sy,
      r: Math.min(sx, sy) * 0.4,
    }
  }
  function pop(x, y) {
    for (const c of cells) {
      const p = position(c)
      if (!c.popped && Math.hypot(p.x - x, p.y - y) < p.r + 5) {
        c.popped = true
        c.age = 0
        c.compression = 1
        sound.play('pop', 1, spacing === 85 ? 0.7 : 1)
      }
    }
  }
  v.onPointer((e) => {
    if (e.type === 'down') {
      snapshot()
      pop(e.x, e.y)
    }
    if (e.type === 'drag') {
      const n = Math.ceil(Math.hypot(e.dx, e.dy) / 9)
      for (let i = 1; i <= n; i++)
        pop(e.x - e.dx + (e.dx * i) / n, e.y - e.dy + (e.dy * i) / n)
    }
  })
  let demoClock = 0
  v.onFrame((ctx, dt, t, state, w, h) => {
    ctx.fillStyle = pal.sheet
    ctx.fillRect(0, 0, w, h)
    if (state.demo) {
      demoClock += dt
      if (demoClock > 0.12) {
        demoClock = 0
        const cell = cells.find((c) => !c.popped)
        if (cell) {
          cell.popped = true
          cell.age = 0
        } else fresh()
      }
    }
    for (const p of v.pointer.contacts) pop(p.x, p.y)
    let remaining = 0
    const recentlyPopped = cells.filter((c) => c.age < 0.12)
    for (const c of cells) {
      c.age += dt
      c.compression *= Math.exp(-dt * 14)
      const { x, y, r } = position(c)
      const wobble = recentlyPopped.some(
        (n) => Math.abs(n.col - c.col) + Math.abs(n.row - c.row) < 2,
      )
        ? Math.sin(t * 45) * 0.7
        : 0
      ctx.save()
      ctx.translate(x + wobble, y)
      ctx.scale(1 + c.compression * 0.08, 1 - c.compression * 0.15)
      if (!c.popped) {
        remaining++
        const g = ctx.createRadialGradient(-r * 0.3, -r * 0.4, 0, 0, 0, r)
        g.addColorStop(0, pal.shine + 'cc')
        g.addColorStop(0.25, pal.bubble)
        g.addColorStop(0.75, pal.bubble)
        g.addColorStop(1, pal.sheet)
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(0, 0, r, 0, 6.283)
        ctx.fill()
        ctx.strokeStyle = pal.shine + '55'
        ctx.lineWidth = 1
        ctx.stroke()
        ctx.fillStyle = pal.shine + 'bb'
        ctx.beginPath()
        ctx.ellipse(-r * 0.25, -r * 0.4, r * 0.2, r * 0.07, -0.5, 0, 6.283)
        ctx.fill()
      } else {
        ctx.fillStyle = pal.bubble + '44'
        ctx.beginPath()
        ctx.ellipse(0, 0, r * 0.93, r * 0.8, 0, 0, 6.283)
        ctx.fill()
        ctx.strokeStyle = pal.shine + '35'
        ctx.lineWidth = 1
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * 6.283 + c.phase
          ctx.beginPath()
          ctx.moveTo(Math.cos(a) * r * 0.3, Math.sin(a) * r * 0.3)
          ctx.quadraticCurveTo(
            Math.cos(a + 0.2) * r * 0.7,
            Math.sin(a + 0.2) * r * 0.5,
            Math.cos(a) * r * 0.87,
            Math.sin(a) * r * 0.73,
          )
          ctx.stroke()
        }
      }
      ctx.restore()
    }
    count.textContent = remaining
      ? 'New sheet · ' + remaining + ' left'
      : 'New sheet · all popped'
  })
  return v.start()
}
