import { THREE, threeVisual, radialTexture } from '../lib/visual-kit.js'

export const meta = {
  id: '078-bokeh-light-drift',
  title: 'Soft Bokeh Light Drift',
  interaction: 'Drift around the bokeh field · tap a soft light',
  palettes: [
    { name: 'Warm Cafe', colors: ['#ffd88a', '#ffb36a', '#fff2c8', '#e8a05c'], bg: '#0c0806' },
    { name: 'City Blue', colors: ['#8ac8ff', '#c8e8ff', '#5a9de8', '#e0f0ff'], bg: '#050810' },
    { name: 'Candy Lights', colors: ['#ff8ad0', '#8affd0', '#ffe88a', '#b08aff'], bg: '#0a0610' },
  ],
}

export function mount(container, opts = {}) {
  const v = threeVisual(container, opts, meta, { position: [0, 0, 10], lookAt: [0, 0, 0], fov: 50 })
  const { scene } = v

  // Real camera bokeh: out-of-focus points render as bright-edged discs,
  // not gaussian blobs. Three depth layers get progressively softer.
  const discTex = radialTexture([
    [0, 'rgba(255,255,255,0.42)'],
    [0.62, 'rgba(255,255,255,0.34)'],
    [0.88, 'rgba(255,255,255,0.62)'],
    [0.97, 'rgba(255,255,255,0.18)'],
    [1, 'rgba(255,255,255,0)'],
  ], 128)

  const softTex = radialTexture([
    [0, 'rgba(255,255,255,0.5)'],
    [0.55, 'rgba(255,255,255,0.28)'],
    [1, 'rgba(255,255,255,0)'],
  ], 128)

  const sprites = []
  const layerDefs = [
    { n: 16, z: -12, size: 5.2, tex: softTex, op: 0.30, speed: 0.10 },
    { n: 22, z: -6, size: 3.0, tex: discTex, op: 0.42, speed: 0.16 },
    { n: 26, z: -1, size: 1.5, tex: discTex, op: 0.55, speed: 0.24 },
  ]
  for (const def of layerDefs) {
    for (let i = 0; i < def.n; i++) {
      const mat = new THREE.SpriteMaterial({
        map: def.tex, transparent: true, opacity: def.op,
        blending: THREE.AdditiveBlending, depthWrite: false,
      })
      const sp = new THREE.Sprite(mat)
      const s = def.size * (0.55 + Math.random() * 0.75)
      sp.scale.set(s, s, 1)
      sp.position.set(
        (Math.random() - 0.5) * 26,
        (Math.random() - 0.5) * 16,
        def.z + (Math.random() - 0.5) * 3
      )
      scene.add(sp)
      sprites.push({
        sp, mat, def,
        baseOp: def.op,
        driftX: (Math.random() - 0.5) * def.speed,
        driftY: (0.25 + Math.random() * 0.6) * def.speed,
        phase: Math.random() * Math.PI * 2,
        colorIdx: Math.floor(Math.random() * 4),
      })
    }
  }

  const colors = []
  v.onPalette((p) => {
    scene.background = new THREE.Color(p.bg)
    colors.length = 0
    p.colors.forEach((c) => colors.push(new THREE.Color(c)))
    sprites.forEach((s) => s.mat.color.copy(colors[s.colorIdx]))
  })

  v.onFrame((dt, t, state) => {
    for (const s of sprites) {
      s.sp.position.x += s.driftX * dt
      s.sp.position.y += s.driftY * dt
      // Wrap around the frame so the drift never runs out.
      if (s.sp.position.y > 10) s.sp.position.y = -10
      if (s.sp.position.x > 14) s.sp.position.x = -14
      if (s.sp.position.x < -14) s.sp.position.x = 14
      // Slow individual brightness breathing.
      const pulse = 0.7 + 0.3 * Math.sin(t * 0.4 + s.phase)
      s.mat.opacity = s.baseOp * pulse * (0.5 + state.intensity * 0.7)
    }
  })

  return v.start()
}
