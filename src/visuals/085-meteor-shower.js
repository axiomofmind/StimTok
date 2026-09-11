import { canvasVisual } from '../lib/visual-kit.js'

export const meta = {
  id: '085-meteor-shower',
  title: 'Meteor Shower Streaks',
  interaction: 'Sweep across the sky to cast a trail of sparks',
  palettes: [
    { name: 'Perseid Night', head: '#ffffff', tail: '#8ad0ff', star: '#c8d8ff', sky1: '#050a18', sky2: '#0a1428' },
    { name: 'Amber Fall', head: '#fff2d8', tail: '#ffa85c', star: '#ffd8a8', sky1: '#0a0604', sky2: '#180d06' },
    { name: 'Emerald Rain', head: '#e8fff0', tail: '#5fe8a8', star: '#a8f0c8', sky1: '#030c08', sky2: '#061810' },
  ],
}

export function mount(container, opts = {}) {
  const v = canvasVisual(container, opts, meta)
  let pal = meta.palettes[0]
  let stars = null
  let starsKey = ''
  v.onPalette((p) => (pal = p))

  const meteors = []
  let spawnTimer = 0

  function spawn(w, h) {
    // All meteors radiate from a common point above-left (the radiant),
    // which is what makes a real shower read as a shower.
    const radiantX = w * 0.78
    const radiantY = -h * 0.35
    const spreadA = (Math.random() - 0.5) * 0.5
    const baseA = Math.atan2(h * 1.4 - radiantY, -w * 1.1)
    const a = baseA + spreadA
    // Start somewhere along the radiant's fan, off-screen.
    const startDist = Math.random() * h * 0.5
    meteors.push({
      x: radiantX + Math.cos(a) * startDist,
      y: radiantY + Math.sin(a) * startDist,
      a,
      speed: (420 + Math.random() * 620),
      len: 90 + Math.random() * 240,
      width: 1 + Math.random() * 2.2,
      life: 0,
      maxLife: 1.6 + Math.random() * 1.4,
      bright: 0.5 + Math.random() * 0.5,
      burst: Math.random() < 0.18,   // occasional fireball
    })
  }

  v.onFrame((ctx, dt, t, state, w, h) => {
    const key = `${w}x${h}`
    if (starsKey !== key) {
      starsKey = key
      stars = []
      for (let i = 0; i < 260; i++) {
        stars.push({ x: Math.random() * w, y: Math.random() * h, r: Math.random() * 1.3 + 0.3, p: Math.random() * 6.28 })
      }
    }

    // Night sky gradient
    const sky = ctx.createLinearGradient(0, 0, 0, h)
    sky.addColorStop(0, pal.sky1)
    sky.addColorStop(1, pal.sky2)
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, w, h)

    // Static stars with slow twinkle
    ctx.globalCompositeOperation = 'lighter'
    for (const s of stars) {
      ctx.globalAlpha = 0.35 + 0.4 * Math.sin(t * 0.9 + s.p)
      ctx.fillStyle = pal.star
      ctx.beginPath()
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1

    // Spawn meteors in loose bursts.
    spawnTimer -= dt
    if (spawnTimer <= 0) {
      spawnTimer = (0.35 + Math.random() * 1.1) / (0.4 + state.intensity)
      const n = Math.random() < 0.2 ? 3 : 1
      for (let i = 0; i < n; i++) spawn(w, h)
    }

    for (let i = meteors.length - 1; i >= 0; i--) {
      const m = meteors[i]
      m.life += dt
      m.x += Math.cos(m.a) * m.speed * dt
      m.y += Math.sin(m.a) * m.speed * dt
      if (m.life > m.maxLife || m.x < -400 || m.y > h + 400) {
        meteors.splice(i, 1)
        continue
      }

      // Fade in fast, out slowly.
      const lf = m.life / m.maxLife
      const alpha = Math.min(1, lf * 6) * (1 - lf) ** 0.6 * m.bright * (0.5 + state.intensity * 0.7)
      const tx = m.x - Math.cos(m.a) * m.len
      const ty = m.y - Math.sin(m.a) * m.len

      const g = ctx.createLinearGradient(m.x, m.y, tx, ty)
      g.addColorStop(0, pal.head)
      g.addColorStop(0.25, pal.tail)
      g.addColorStop(1, 'transparent')
      ctx.strokeStyle = g
      ctx.globalAlpha = alpha
      ctx.lineWidth = m.width * (m.burst ? 2.2 : 1)
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(m.x, m.y)
      ctx.lineTo(tx, ty)
      ctx.stroke()

      // Bright head glow
      const hg = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.burst ? 18 : 8)
      hg.addColorStop(0, pal.head)
      hg.addColorStop(0.4, pal.tail + '80')
      hg.addColorStop(1, 'transparent')
      ctx.fillStyle = hg
      ctx.beginPath()
      ctx.arc(m.x, m.y, m.burst ? 18 : 8, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
  })

  return v.start()
}
