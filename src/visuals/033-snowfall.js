import { THREE, threeVisual, radialTexture, makeNoise2D } from '../lib/visual-kit.js'

export const meta = {
  id: '033-snowfall',
  title: 'Snowfall Drifting',
  interaction: 'Drag through the snowfall · tap a flake cluster',
  palettes: [
    { name: 'Silent Night', flake: '#ffffff', tint: '#a8c8e8', bg: '#0a1220' },
    { name: 'Streetlamp', flake: '#fff2d8', tint: '#e8b46a', bg: '#141008' },
    { name: 'Aurora Snow', flake: '#e8fff8', tint: '#7fe8c8', bg: '#06141a' },
  ],
}

export function mount(container, opts = {}) {
  const v = threeVisual(container, opts, meta, { position: [0, 0, 9], lookAt: [0, 0, 0], fov: 50 })
  const { scene } = v
  const noise = makeNoise2D(21)

  const flakeTex = radialTexture([
    [0, 'rgba(255,255,255,1)'],
    [0.5, 'rgba(255,255,255,0.6)'],
    [1, 'rgba(255,255,255,0)'],
  ])

  // Three depth layers: far small slow, near big fast.
  const layers = []
  const layerDefs = [
    { n: 500, z: -6, size: 0.08, fall: 0.35, drift: 0.4, op: 0.5 },
    { n: 300, z: -3, size: 0.14, fall: 0.55, drift: 0.6, op: 0.7 },
    { n: 150, z: 0, size: 0.24, fall: 0.85, drift: 0.9, op: 0.95 },
  ]
  for (const def of layerDefs) {
    const pos = new Float32Array(def.n * 3)
    const seed = new Float32Array(def.n)
    for (let i = 0; i < def.n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 20
      pos[i * 3 + 1] = (Math.random() - 0.5) * 14
      pos[i * 3 + 2] = def.z + (Math.random() - 0.5) * 1.5
      seed[i] = Math.random() * 100
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    const mat = new THREE.PointsMaterial({
      map: flakeTex, size: def.size, transparent: true, opacity: def.op,
      depthWrite: false,
    })
    scene.add(new THREE.Points(geo, mat))
    layers.push({ geo, mat, def, seed })
  }

  // Soft ambient glow at the bottom (snow-covered ground light)
  const glowMat = new THREE.SpriteMaterial({
    map: radialTexture([[0, 'rgba(255,255,255,0.20)'], [1, 'rgba(255,255,255,0)']], 128),
    transparent: true, depthWrite: false,
  })
  const glow = new THREE.Sprite(glowMat)
  glow.scale.set(24, 8, 1)
  glow.position.set(0, -6.5, -2)
  scene.add(glow)

  v.onPalette((p) => {
    scene.background = new THREE.Color(p.bg)
    layers.forEach((l) => l.mat.color.set(p.flake))
    glowMat.color.set(p.tint)
  })

  v.onFrame((dt, t, state) => {
    const gust = noise(t * 0.1, 0) * (0.5 + state.intensity)
    for (const l of layers) {
      const pos = l.geo.attributes.position
      for (let i = 0; i < l.def.n; i++) {
        let x = pos.getX(i)
        let y = pos.getY(i)
        y -= dt * l.def.fall * (0.8 + (l.seed[i] % 1) * 0.5)
        x += dt * (Math.sin(t * 0.7 + l.seed[i]) * 0.3 + gust) * l.def.drift
        if (y < -7.5) {
          y = 7.5
          x = (Math.random() - 0.5) * 20
        }
        if (x > 10) x = -10
        if (x < -10) x = 10
        pos.setXY(i, x, y)
      }
      pos.needsUpdate = true
      l.mat.opacity = l.def.op * (0.5 + state.intensity * 0.5)
    }
  })

  return v.start()
}
