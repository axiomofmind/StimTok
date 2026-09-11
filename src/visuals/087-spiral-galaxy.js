import { THREE, threeVisual, radialTexture } from '../lib/visual-kit.js'

export const meta = {
  id: '087-spiral-galaxy',
  title: 'Spiral Galaxy Rotation',
  interaction: 'Drag around the galaxy · tap its luminous core',
  palettes: [
    { name: 'Milky Way', core: '#fff2c8', arm: '#a8c8ff', hot: '#7db8f0', dust: '#3a2a4a', bg: '#02030a' },
    { name: 'Rose Spiral', core: '#ffe8d8', arm: '#ff8ad0', hot: '#ffd0e8', dust: '#4a2a3a', bg: '#06030a' },
    { name: 'Emerald Spiral', core: '#e8ffd8', arm: '#5fe8b8', hot: '#a0ffd8', dust: '#1a3a3a', bg: '#02080a' },
  ],
}

export function mount(container, opts = {}) {
  const v = threeVisual(container, opts, meta, { position: [0, 6.5, 9], lookAt: [0, 0, 0], fov: 45 })
  const { scene } = v

  const COUNT = 14000
  const ARMS = 2
  const pos = new Float32Array(COUNT * 3)
  const col = new Float32Array(COUNT * 3)
  const sizes = new Float32Array(COUNT)
  const stars = []

  for (let i = 0; i < COUNT; i++) {
    // Distribute radius with a bias toward the core.
    const rNorm = Math.pow(Math.random(), 0.62)
    const radius = 0.35 + rNorm * 7.5

    // Logarithmic spiral: angle grows with log(radius). Scatter around the
    // arm centerline decreases the tighter/brighter the arm.
    const arm = Math.floor(Math.random() * ARMS)
    const armOffset = (arm / ARMS) * Math.PI * 2
    const spiralTightness = 2.4
    const baseAngle = Math.log(radius + 0.6) * spiralTightness + armOffset

    // Scatter: wider further out, plus a fraction of pure halo stars.
    const isHalo = Math.random() < 0.16
    const scatter = isHalo ? Math.random() * Math.PI * 2 : (Math.random() - 0.5) * (0.55 + rNorm * 0.5)
    const angle = baseAngle + scatter

    // Disc thickness shrinks with radius; core is a fat bulge.
    const bulge = Math.exp(-radius * 0.85)
    const thickness = (0.06 + bulge * 0.9) * (isHalo ? 3.5 : 1)
    const y = (Math.random() - 0.5) * thickness * (Math.random() ** 2 + 0.2)

    stars.push({ radius, angle, y, isHalo, twinkle: Math.random() * 6.28, hot: !isHalo && Math.random() < 0.12 })
    sizes[i] = 0
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3))
  const mat = new THREE.PointsMaterial({
    map: radialTexture([
      [0, 'rgba(255,255,255,1)'],
      [0.4, 'rgba(255,255,255,0.45)'],
      [1, 'rgba(255,255,255,0)'],
    ]),
    size: 0.075, vertexColors: true, transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false,
  })
  scene.add(new THREE.Points(geo, mat))

  // Bright core glow sprite.
  const coreMat = new THREE.SpriteMaterial({
    map: radialTexture([
      [0, 'rgba(255,255,255,0.95)'],
      [0.18, 'rgba(255,255,255,0.45)'],
      [0.55, 'rgba(255,255,255,0.12)'],
      [1, 'rgba(255,255,255,0)'],
    ], 128),
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  })
  const core = new THREE.Sprite(coreMat)
  core.scale.set(4.5, 4.5, 1)
  scene.add(core)

  const coreC = new THREE.Color()
  const armC = new THREE.Color()
  const hotC = new THREE.Color()

  v.onPalette((p) => {
    scene.background = new THREE.Color(p.bg)
    coreC.set(p.core)
    armC.set(p.arm)
    hotC.set(p.hot)
    coreMat.color.set(p.core)
  })

  const tmp = new THREE.Color()
  v.onFrame((dt, t, state) => {
    const posAttr = geo.attributes.position
    for (let i = 0; i < COUNT; i++) {
      const s = stars[i]
      // Differential rotation: inner stars orbit faster, so the arms wind
      // slowly over time exactly like a real disc galaxy.
      const omega = 0.55 / Math.pow(s.radius + 0.7, 0.72)
      const a = s.angle + t * omega * 0.5
      posAttr.setXYZ(i, Math.cos(a) * s.radius, s.y, Math.sin(a) * s.radius)

      // Color by population: yellow core, blue arms, hot blue-white knots.
      const coreness = Math.exp(-s.radius * 0.42)
      tmp.copy(armC).lerp(coreC, coreness)
      if (s.hot) tmp.lerp(hotC, 0.75)
      const tw = s.isHalo ? 0.5 : 0.75 + 0.25 * Math.sin(t * 1.5 + s.twinkle)
      const b = tw * (0.45 + state.intensity * 0.75) * (s.isHalo ? 0.5 : 1)
      col[i * 3] = tmp.r * b
      col[i * 3 + 1] = tmp.g * b
      col[i * 3 + 2] = tmp.b * b
    }
    posAttr.needsUpdate = true
    geo.attributes.color.needsUpdate = true
    coreMat.opacity = (0.5 + 0.08 * Math.sin(t * 0.6)) * (0.5 + state.intensity * 0.6)
    mat.size = 0.06 + state.intensity * 0.035
  })

  return v.start()
}
