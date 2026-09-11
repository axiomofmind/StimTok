import { canvasVisual } from '../lib/visual-kit.js'
import { attachToySound } from '../lib/toy-sound.js'
import { createBeadSlime, beadShapes } from '../lib/slime-beads.js'

export const meta = {
  id: '045-slime-stretch',
  title: 'Slime Bead Buddies',
  intensityControl: false,
  interaction:
    'Tap to scatter · drag the loose beads · press Gather when you want your buddy back',
  palettes: [
    {
      name: 'Lime Boba',
      body: '#4ee484',
      accent: '#ffe38a',
      eye: '#203c37',
      bg: '#e1e9e3',
      edge: '#25805d',
    },
    {
      name: 'Berry Boba',
      body: '#e482d7',
      accent: '#b8dfff',
      eye: '#392349',
      bg: '#eee3ee',
      edge: '#97549f',
    },
    {
      name: 'Night Pearls',
      body: '#54d9df',
      accent: '#f5ba78',
      eye: '#253746',
      bg: '#10212a',
      edge: '#267d96',
    },
  ],
}

export function mount(container, opts = {}) {
  const v = canvasVisual(container, opts, meta)
  const sound = attachToySound(v, container)
  const slime = createBeadSlime()
  let pal = meta.palettes[0],
    sprites = [],
    shape = 0,
    lastX = 0,
    lastY = 0
  const status = document.createElement('div')
  status.style.cssText =
    'position:absolute;left:50%;top:20px;transform:translateX(-50%);display:flex;gap:8px;z-index:3'
  container.append(status)
  function button(label, callback) {
    const b = document.createElement('button')
    b.textContent = label
    b.style.cssText =
      'border:1px solid #71897e55;border-radius:22px;padding:9px 14px;color:#203c37;background:#ffffffdf;font:600 13px system-ui;cursor:pointer;touch-action:manipulation;white-space:nowrap'
    b.onclick = () => {
      callback()
      v.state.dirty = true
    }
    status.append(b)
    return b
  }
  const next = button('Gecko ↻', () => select((shape + 1) % beadShapes.length))
  button('Scatter', () => slime.scatter(0, 0, true))
  button('Gather', () => {
    slime.gather()
    sound.play('gather')
  })
  function select(index) {
    shape = index
    slime.morph(beadShapes[index])
    next.textContent = beadShapes[index] + ' ↻'
  }
  for (const [i, name] of beadShapes.entries())
    v.addAction(name, () => select(i))
  v.addSlider('Stickiness', 'cohesion', 0.3, 2, 0.1, 1)
  v.addDispose(() => status.remove())
  v.onPalette((p) => {
    pal = p
    sprites = [p.body, p.accent, p.eye].map((color) => {
      const c = document.createElement('canvas')
      c.width = c.height = 48
      const ctx = c.getContext('2d')
      ctx.shadowColor = '#14342644'
      ctx.shadowBlur = 3
      ctx.shadowOffsetY = 2
      const g = ctx.createRadialGradient(17, 14, 1, 24, 24, 20)
      g.addColorStop(0, color)
      g.addColorStop(0.65, color)
      g.addColorStop(1, p.edge)
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(24, 23, 19, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowColor = 'transparent'
      ctx.strokeStyle = p.edge
      ctx.lineWidth = 1.2
      ctx.stroke()
      ctx.fillStyle = '#ffffff65'
      ctx.beginPath()
      ctx.ellipse(18, 15, 5, 3, -0.5, 0, 7)
      ctx.fill()
      return c
    })
  })
  function layout() {
    const scale = Math.min(
      v.size.w * 0.43,
      Math.max(100, v.size.h - 190) * 0.47,
    )
    return { scale, cx: v.size.w / 2, cy: v.size.h * 0.47 }
  }
  v.onPointer((e) => {
    const { scale, cx, cy } = layout()
    const x = (e.x - cx) / scale,
      y = (e.y - cy) / scale
    if (e.type === 'down') {
      lastX = x
      lastY = y
    }
    if (e.type === 'tap') slime.scatter(x, y)
    if (e.type === 'drag' && v.state.paused) {
      for (const b of slime.beads) {
        const d = Math.hypot(b.x - lastX, b.y - lastY)
        if (d < 0.25) {
          b.x += (x - lastX) * (1 - d / 0.25)
          b.y += (y - lastY) * (1 - d / 0.25)
        }
      }
    }
    lastX = x
    lastY = y
  })
  v.onFrame((ctx, dt, t, state, w, h) => {
    const { scale, cx, cy } = layout()
    const contacts = v.pointer.contacts.map((p) => ({
      x: (p.x - cx) / scale,
      y: (p.y - cy) / scale,
      vx: v.pointer.vx / scale,
      vy: v.pointer.vy / scale,
    }))
    const collision = slime.step(dt, state.cohesion, contacts)
    if (collision > 0.04)
      sound.play('bead', Math.min(1, collision), 0.8 + Math.min(0.6, collision))
    ctx.fillStyle = pal.bg
    ctx.fillRect(0, 0, w, h)
    ctx.strokeStyle = pal.edge + '12'
    ctx.lineWidth = 1
    const grid = Math.max(28, scale * 0.18)
    ctx.beginPath()
    for (let x = cx % grid; x < w; x += grid) {
      ctx.moveTo(x, 0)
      ctx.lineTo(x, h)
    }
    for (let y = cy % grid; y < h; y += grid) {
      ctx.moveTo(0, y)
      ctx.lineTo(w, y)
    }
    ctx.stroke()
    ctx.strokeStyle = pal.edge + '33'
    ctx.setLineDash([2, 4])
    ctx.beginPath()
    ctx.arc(cx, cy, scale * 0.94, 0, Math.PI * 2)
    ctx.stroke()
    ctx.setLineDash([])
    const size = scale * 0.036
    for (const b of slime.beads)
      ctx.drawImage(
        sprites[b.tone],
        cx + b.x * scale - size / 2,
        cy + b.y * scale - size / 2,
        size,
        size,
      )
  })
  return v.start()
}
