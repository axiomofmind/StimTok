import { canvasVisual, makeNoise2D } from '../lib/visual-kit.js'
import { attachToySound } from '../lib/toy-sound.js'

export const meta = {
  automaticPlay: true,
  id: '032-koi-pond-ripples',
  title: 'Koi Pond Ripples',
  interaction:
    'Ripples: touch the water and koi investigate · Move lily pads: drag a leaf',
  palettes: [
    {
      name: 'Classic Koi',
      koi: ['#ff8c42', '#f0ede8', '#2a2a2a', '#ff5d3a'],
      water: '#12403a',
      deep: '#0a2a26',
      pad: '#2d6a4f',
    },
    {
      name: 'Golden Pond',
      koi: ['#ffd166', '#ffb347', '#fff2cc', '#e8a020'],
      water: '#1a3a52',
      deep: '#0d2438',
      pad: '#3a6a5a',
    },
    {
      name: 'Ink Wash',
      koi: ['#e8e8e8', '#8a8a92', '#3a3a44', '#c8c8d0'],
      water: '#1c2228',
      deep: '#10161c',
      pad: '#2a3a34',
    },
  ],
}

export function mount(container, opts = {}) {
  const v = canvasVisual(container, opts, meta)
  const sound = attachToySound(v, container)
  const noise = makeNoise2D(5)
  let pal = meta.palettes[0]
  v.onPalette((p) => (pal = p))

  // Koi with wandering headings; body drawn as tapered ellipse chain.
  const kois = []
  for (let i = 0; i < 4; i++) {
    kois.push({
      x: Math.random() * v.size.w,
      y: Math.random() * v.size.h,
      heading: Math.random() * Math.PI * 2,
      speed: 26 + Math.random() * 18,
      size: 28 + Math.random() * 14,
      wag: Math.random() * Math.PI * 2,
      seed: i * 13.7,
      trail: [], // recent positions for the spine
    })
  }

  let mode = 'feed',
    startle = 0,
    selectedPad = null
  v.addAction('Ripples', () => (mode = 'feed'))
  v.addAction('Move lily pads', () => (mode = 'pads'))
  const ripples = [] // {x, y, r, age}
  let curiosity = null
  let lastRippleX = -1000
  let lastRippleY = -1000
  v.onPointer((event) => {
    if (mode === 'pads') {
      if (event.type === 'down')
        selectedPad = pads.find(
          (p) => Math.hypot(p.x - event.x, p.y - event.y) < p.r,
        )
      if (event.type === 'drag' && selectedPad) {
        selectedPad.x = event.x
        selectedPad.y = event.y
      }
      if (event.type === 'up') selectedPad = null
      return
    }
    if (event.type === 'drag' && event.speed > 600) startle = 1
    if (event.type === 'down' || event.type === 'drag') {
      const distance = Math.hypot(event.x - lastRippleX, event.y - lastRippleY)
      if (event.type !== 'drag' || distance > 24) {
        ripples.push({ x: event.x, y: event.y, r: 2, age: 0, strength: 1 })
        sound.play(
          event.type === 'down' ? 'water' : 'splash',
          event.type === 'down' ? 0.8 : Math.min(0.8, event.speed / 1000 + 0.2),
        )
        lastRippleX = event.x
        lastRippleY = event.y
      }
      curiosity = { x: event.x, y: event.y, age: 0 }
    }
  })
  let rippleTimer = 0
  const pads = []
  let padsFor = null

  v.onFrame((ctx, dt, t, state, w, h) => {
    if (padsFor !== `${w}x${h}`) {
      padsFor = `${w}x${h}`
      pads.length = 0
      for (let i = 0; i < 5; i++) {
        pads.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: 26 + Math.random() * 30,
          a: Math.random() * Math.PI * 2,
        })
      }
    }

    // Water: layered gradient + slow noise mottling
    const g = ctx.createRadialGradient(
      w / 2,
      h / 2,
      0,
      w / 2,
      h / 2,
      Math.max(w, h) * 0.7,
    )
    g.addColorStop(0, pal.water)
    g.addColorStop(1, pal.deep)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
    ctx.globalAlpha = 0.1
    for (let i = 0; i < 14; i++) {
      const nx = (noise(i * 1.7, t * 0.05) * 0.5 + 0.5) * w
      const ny = (noise(t * 0.04, i * 2.3) * 0.5 + 0.5) * h
      const gg = ctx.createRadialGradient(nx, ny, 0, nx, ny, 120)
      gg.addColorStop(0, '#ffffff')
      gg.addColorStop(1, 'transparent')
      ctx.fillStyle = gg
      ctx.fillRect(nx - 120, ny - 120, 240, 240)
    }
    ctx.globalAlpha = 1

    startle *= Math.exp(-dt * 1.4)
    // Koi
    if (curiosity) {
      curiosity.age += dt
      if (curiosity.age > 7) curiosity = null
    }
    for (const k of kois) {
      k.heading += noise(k.seed, t * 0.3) * dt * 1.6
      if (curiosity) {
        const desired =
          Math.atan2(curiosity.y - k.y, curiosity.x - k.x) +
          (startle > 0.2 ? Math.PI : 0)
        const delta = Math.atan2(
          Math.sin(desired - k.heading),
          Math.cos(desired - k.heading),
        )
        k.heading += delta * dt * 0.75
        k.speed += ((startle > 0.2 ? 90 : 42) - k.speed) * dt * 0.4
      } else {
        k.speed += (30 - k.speed) * dt * 0.18
      }
      k.x += Math.cos(k.heading) * k.speed * dt
      k.y += Math.sin(k.heading) * k.speed * dt
      const m = 60
      if (k.x < -m) k.x = w + m
      if (k.x > w + m) k.x = -m
      if (k.y < -m) k.y = h + m
      if (k.y > h + m) k.y = -m

      if (
        !k.trail.length ||
        Math.hypot(k.x - k.trail[0][0], k.y - k.trail[0][1]) > k.size * 0.06
      ) {
        if (
          k.trail.length &&
          Math.hypot(k.x - k.trail[0][0], k.y - k.trail[0][1]) > 100
        )
          k.trail.length = 0
        k.trail.unshift([k.x, k.y, k.heading])
      }
      if (k.trail.length > 9) k.trail.pop()

      // occasional surface ripple from the koi
      if (Math.random() < dt * 0.35)
        ripples.push({ x: k.x, y: k.y, r: 4, age: 0 })

      const color = pal.koi[kois.indexOf(k) % pal.koi.length]
      // Body: chain of ellipses shrinking toward the tail with a wag.
      for (let s = k.trail.length - 1; s >= 0; s--) {
        const [tx, ty, th] = k.trail[s]
        const f = 1 - s / 9
        const wagOff = Math.sin(t * 6 + k.wag + s * 0.7) * (s * 1.1)
        const px = tx + Math.cos(th + Math.PI / 2) * wagOff * 0.35
        const py = ty + Math.sin(th + Math.PI / 2) * wagOff * 0.35
        ctx.save()
        ctx.translate(px, py)
        ctx.rotate(th)
        ctx.fillStyle = color
        ctx.globalAlpha = 0.25 + f * 0.75
        ctx.beginPath()
        ctx.ellipse(
          0,
          0,
          k.size * (0.35 + f * 0.65) * 0.8,
          k.size * (0.25 + f * 0.5) * 0.5,
          0,
          0,
          Math.PI * 2,
        )
        ctx.fill()
        ctx.restore()
      }
      // Tail fin
      const last = k.trail[k.trail.length - 1]
      if (last) {
        ctx.save()
        ctx.translate(last[0], last[1])
        ctx.rotate(last[2] + Math.PI)
        ctx.fillStyle = color
        ctx.globalAlpha = 0.5
        const wag = Math.sin(t * 6 + k.wag) * 0.5
        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.lineTo(k.size * 0.9, k.size * 0.4 + wag * 6)
        ctx.lineTo(k.size * 0.7, wag * 4)
        ctx.lineTo(k.size * 0.9, -k.size * 0.4 + wag * 6)
        ctx.closePath()
        ctx.fill()
        ctx.restore()
      }
      ctx.save()
      ctx.translate(k.x, k.y)
      ctx.rotate(k.heading)
      ctx.fillStyle = '#fff9'
      ctx.beginPath()
      ctx.ellipse(-k.size * 0.1, 0, k.size * 0.2, k.size * 0.28, -0.4, 0, 6.283)
      ctx.fill()
      ctx.fillStyle = '#061611'
      for (const side of [-1, 1]) {
        ctx.beginPath()
        ctx.arc(k.size * 0.42, side * k.size * 0.2, 2, 0, 6.283)
        ctx.fill()
        ctx.fillStyle = color + '88'
        ctx.beginPath()
        ctx.ellipse(
          -k.size * 0.3,
          side * k.size * 0.38,
          k.size * 0.26,
          k.size * 0.1,
          side * 0.6,
          0,
          6.283,
        )
        ctx.fill()
      }
      ctx.restore()
      ctx.globalAlpha = 1
    }

    // Ambient rain-drop style ripples
    rippleTimer -= dt
    if (state.demo && rippleTimer <= 0) {
      rippleTimer = 0.8 + Math.random() * 1.6
      ripples.push({ x: Math.random() * w, y: Math.random() * h, r: 2, age: 0 })
    }
    ctx.strokeStyle = '#ffffff'
    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i]
      r.age += dt
      r.r += dt * 55
      const alpha =
        Math.max(0, (r.strength ? 0.75 : 0.45) - r.age * 0.18) * state.intensity
      if (alpha <= 0.01) {
        ripples.splice(i, 1)
        continue
      }
      ctx.globalAlpha = alpha
      ctx.lineWidth = 1.6
      ctx.beginPath()
      ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(r.x, r.y, r.r * 0.6, 0, Math.PI * 2)
      ctx.stroke()
    }
    ctx.globalAlpha = 1

    // Lily pads on top
    for (const p of pads) {
      ctx.save()
      ctx.translate(
        p.x + Math.sin(t * 0.3 + p.a) * 4,
        p.y + Math.cos(t * 0.25 + p.a) * 3,
      )
      ctx.rotate(p.a)
      ctx.fillStyle = pal.pad
      ctx.globalAlpha = 0.92
      ctx.beginPath()
      ctx.arc(0, 0, p.r, 0.25, Math.PI * 2 - 0.25)
      ctx.lineTo(0, 0)
      ctx.closePath()
      ctx.fill()
      ctx.restore()
    }
    ctx.globalAlpha = 1
  })

  return v.start()
}
