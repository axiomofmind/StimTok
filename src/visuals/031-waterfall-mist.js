import { THREE, threeVisual, radialTexture } from '../lib/visual-kit.js'

export const meta = {
  id: '031-waterfall-mist',
  title: 'Waterfall with Cascading Mist',
  interaction: 'Drag through the mist · tap the falling water',
  palettes: [
    { name: 'Forest Falls', water: '#d8f0ff', mist: '#c8e0e8', rock: '#2a3a30', bg: '#101c16 ' },
    { name: 'Blue Gorge', water: '#c8e8ff', mist: '#a8c8e8', rock: '#1e2a3a', bg: '#0a1420' },
    { name: 'Golden Hour', water: '#ffe8c8', mist: '#e8d0b0', rock: '#3a2e20', bg: '#1c140c' },
  ],
}

export function mount(container, opts = {}) {
  const v = threeVisual(container, opts, meta, { position: [0, 0, 8], lookAt: [0, 0, 0], fov: 48 })
  const { scene } = v

  scene.add(new THREE.AmbientLight(0xffffff, 0.7))
  const sky = new THREE.DirectionalLight(0xe8f4ff, 1.6)
  sky.position.set(3, 8, 5)
  scene.add(sky)

  // Rock walls
  const rockMat = new THREE.MeshStandardMaterial({ roughness: 1 })
  const cliffL = new THREE.Mesh(new THREE.BoxGeometry(3, 10, 2), rockMat)
  cliffL.position.set(-3.4, 0.5, -1)
  cliffL.rotation.y = 0.2
  scene.add(cliffL)
  const cliffR = new THREE.Mesh(new THREE.BoxGeometry(3, 10, 2), rockMat)
  cliffR.position.set(3.4, 0.5, -1)
  cliffR.rotation.y = -0.2
  scene.add(cliffR)
  const ledge = new THREE.Mesh(new THREE.BoxGeometry(4.5, 1.4, 2), rockMat)
  ledge.position.set(0, 4.6, -1.2)
  scene.add(ledge)
  const pool = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 6),
    new THREE.MeshStandardMaterial({ color: 0x1a3a4a, roughness: 0.15, metalness: 0.5 })
  )
  pool.rotation.x = -Math.PI / 2
  pool.position.y = -3.4
  scene.add(pool)

  const dropTex = radialTexture([
    [0, 'rgba(255,255,255,0.9)'],
    [1, 'rgba(255,255,255,0)'],
  ])

  // Falling water: streaks rendered as stretched points.
  const FALL = 1600
  const fpos = new Float32Array(FALL * 3)
  const fvel = new Float32Array(FALL)
  for (let i = 0; i < FALL; i++) {
    fpos[i * 3] = (Math.random() - 0.5) * 3.4
    fpos[i * 3 + 1] = -3 + Math.random() * 7
    fpos[i * 3 + 2] = -1 + Math.random() * 0.6
    fvel[i] = 2.5 + Math.random() * 2
  }
  const fgeo = new THREE.BufferGeometry()
  fgeo.setAttribute('position', new THREE.BufferAttribute(fpos, 3))
  const fmat = new THREE.PointsMaterial({
    map: dropTex, size: 0.14, transparent: true, opacity: 0.55,
    blending: THREE.AdditiveBlending, depthWrite: false,
  })
  scene.add(new THREE.Points(fgeo, fmat))

  // Mist billowing at the base
  const MIST = 34
  const mistTex = radialTexture([
    [0, 'rgba(255,255,255,0.16)'],
    [0.6, 'rgba(255,255,255,0.08)'],
    [1, 'rgba(255,255,255,0)'],
  ], 128)
  const mists = []
  const mistMat = new THREE.SpriteMaterial({ map: mistTex, transparent: true, depthWrite: false })
  for (let i = 0; i < MIST; i++) {
    const sp = new THREE.Sprite(mistMat.clone())
    const s = 2 + Math.random() * 2.5
    sp.scale.set(s, s, 1)
    sp.position.set((Math.random() - 0.5) * 5, -3 + Math.random() * 1.5, -0.5 + Math.random())
    scene.add(sp)
    mists.push({ sp, rise: 0.15 + Math.random() * 0.3, phase: Math.random() * Math.PI * 2, life: Math.random() })
  }

  v.onPalette((p) => {
    scene.background = new THREE.Color(p.bg.trim())
    rockMat.color.set(p.rock)
    fmat.color.set(p.water)
    mists.forEach((m) => m.sp.material.color.set(p.mist))
  })

  v.onFrame((dt, t, state) => {
    const pos = fgeo.attributes.position
    for (let i = 0; i < FALL; i++) {
      let y = pos.getY(i) - fvel[i] * dt * 1.6
      let x = pos.getX(i)
      // Slight outward spread as it falls
      x += (x > 0 ? 1 : -1) * dt * 0.05 * (4 - Math.min(4, y + 3))
      if (y < -3.3) {
        y = 4 + Math.random() * 0.5
        x = (Math.random() - 0.5) * 3.2
      }
      pos.setXY(i, x, y)
    }
    pos.needsUpdate = true
    fmat.opacity = 0.35 + state.intensity * 0.3

    for (const m of mists) {
      m.life += dt * 0.12
      if (m.life > 1) {
        m.life = 0
        m.sp.position.set((Math.random() - 0.5) * 5, -3.2, -0.5 + Math.random())
      }
      m.sp.position.y += m.rise * dt
      m.sp.position.x += Math.sin(t * 0.5 + m.phase) * dt * 0.2
      m.sp.material.opacity = Math.sin(m.life * Math.PI) * (0.5 + state.intensity * 0.5)
      const s = 2 + m.life * 3
      m.sp.scale.set(s, s, 1)
    }
    // Pool shimmer
    pool.material.roughness = 0.12 + Math.sin(t * 2) * 0.04
  })

  return v.start()
}
