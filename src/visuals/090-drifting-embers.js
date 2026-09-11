import { THREE, threeVisual, radialTexture, makeNoise2D } from '../lib/visual-kit.js'

export const meta = {
  id: '090-drifting-embers',
  title: 'Drifting Embers',
  interaction: 'Drag through the embers · tap the glowing cloud',
  palettes: [
    { name: 'Ember Orange', hot: '#fff2c8', warm: '#ff8a2e', cool: '#8a2010', bg: '#080402' },
    { name: 'Blue Cinder', hot: '#e8f8ff', warm: '#4aa8ff', cool: '#1a3a8a', bg: '#02040a' },
    { name: 'Emerald Spark', hot: '#f0ffe0', warm: '#7fe85f', cool: '#1a6a2a', bg: '#030802' },
  ],
}

export function mount(container, opts = {}) {
  const v = threeVisual(container, opts, meta, { position: [0, 0, 9], lookAt: [0, 0, 0], fov: 52 })
  const { scene } = v
  const noise = makeNoise2D(67)

  const COUNT = 550
  const pos = new Float32Array(COUNT * 3)
  const col = new Float32Array(COUNT * 3)
  const embers = []
  for (let i = 0; i < COUNT; i++) {
    embers.push({
      x: (Math.random() - 0.5) * 16,
      y: -7 + Math.random() * 16,
      z: -5 + Math.random() * 8,
      rise: 0.35 + Math.random() * 0.9,
      seed: Math.random() * 100,
      // Each ember cools over its life, going white -> orange -> deep red.
      life: Math.random(),
      lifeSpan: 5 + Math.random() * 8,
      flicker: 3 + Math.random() * 9,
      phase: Math.random() * 6.28,
    })
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3))
  const mat = new THREE.PointsMaterial({
    map: radialTexture([
      [0, 'rgba(255,255,255,1)'],
      [0.3, 'rgba(255,255,255,0.55)'],
      [1, 'rgba(255,255,255,0)'],
    ]),
    size: 0.12, vertexColors: true, transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false,
  })
  scene.add(new THREE.Points(geo, mat))

  // Warm glow at the bottom implying the fire below frame.
  const glowMat = new THREE.SpriteMaterial({
    map: radialTexture([[0, 'rgba(255,255,255,0.22)'], [1, 'rgba(255,255,255,0)']], 128),
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  })
  const glow = new THREE.Sprite(glowMat)
  glow.scale.set(20, 9, 1)
  glow.position.set(0, -7.5, -3)
  scene.add(glow)

  const hotC = new THREE.Color()
  const warmC = new THREE.Color()
  const coolC = new THREE.Color()
  const tmp = new THREE.Color()

  v.onPalette((p) => {
    scene.background = new THREE.Color(p.bg)
    hotC.set(p.hot)
    warmC.set(p.warm)
    coolC.set(p.cool)
    glowMat.color.set(p.warm)
  })

  v.onFrame((dt, t, state) => {
    const posAttr = geo.attributes.position
    const wind = noise(t * 0.14, 0) * (0.5 + state.intensity)
    for (let i = 0; i < COUNT; i++) {
      const e = embers[i]
      e.life += dt / e.lifeSpan
      // Buoyant rise that slows as the ember cools.
      const buoyancy = Math.max(0.15, 1 - e.life)
      e.y += dt * e.rise * buoyancy * (0.6 + state.intensity * 0.6)
      // Thermal turbulence + prevailing drift.
      e.x += (noise(e.seed, t * 0.5) * 0.55 + wind * 0.8) * dt
      e.z += noise(e.seed + 30, t * 0.4) * 0.3 * dt

      if (e.life >= 1 || e.y > 8.5) {
        e.life = 0
        e.y = -8
        e.x = (Math.random() - 0.5) * 12
        e.z = -5 + Math.random() * 8
      }
      posAttr.setXYZ(i, e.x, e.y, e.z)

      // Cooling color ramp plus rapid flicker as it tumbles.
      const cool = e.life
      tmp.copy(hotC).lerp(warmC, Math.min(1, cool * 2))
      if (cool > 0.5) tmp.lerp(coolC, (cool - 0.5) * 2)
      const flick = 0.55 + 0.45 * Math.sin(t * e.flicker + e.phase)
      const fade = Math.sin(Math.min(1, e.life) * Math.PI) ** 0.5
      const b = flick * fade * (0.5 + state.intensity * 0.8)
      col[i * 3] = tmp.r * b
      col[i * 3 + 1] = tmp.g * b
      col[i * 3 + 2] = tmp.b * b
    }
    posAttr.needsUpdate = true
    geo.attributes.color.needsUpdate = true
    mat.size = 0.09 + state.intensity * 0.06
    glowMat.opacity = (0.5 + 0.15 * Math.sin(t * 1.3)) * (0.4 + state.intensity * 0.7)
  })

  return v.start()
}
