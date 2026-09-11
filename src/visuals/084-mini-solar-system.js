import { THREE, threeVisual, radialTexture } from '../lib/visual-kit.js'

export const meta = {
  id: '084-mini-solar-system',
  title: 'Orbiting Mini Solar System',
  interaction: 'Drag around the solar system · tap an orbiting world',
  palettes: [
    { name: 'Classic Star', sun: '#ffd166', planets: ['#e8845c', '#7db8f0', '#c8a05c', '#8ad0e8', '#a8e05f'], orbit: '#3a4a6a', bg: '#03040a' },
    { name: 'Blue Dwarf', sun: '#a8d8ff', planets: ['#c084fc', '#3fd8c0', '#f472b6', '#fcd34d', '#94a3b8'], orbit: '#2a3a5a', bg: '#02040c' },
    { name: 'Red Giant', sun: '#ff7a5c', planets: ['#ffd8a0', '#e85c8a', '#8a5cff', '#5cd8e8', '#ffb03c'], orbit: '#4a2a2a', bg: '#080304' },
  ],
}

export function mount(container, opts = {}) {
  const v = threeVisual(container, opts, meta, { position: [0, 5.2, 8.5], lookAt: [0, 0, 0], fov: 45 })
  const { scene } = v

  scene.add(new THREE.AmbientLight(0xffffff, 0.12))
  const sunLight = new THREE.PointLight(0xffd166, 90, 0, 2)
  scene.add(sunLight)

  // Sun: emissive core plus additive corona sprite.
  const sunMat = new THREE.MeshBasicMaterial({ color: 0xffd166 })
  const sun = new THREE.Mesh(new THREE.SphereGeometry(0.62, 32, 24), sunMat)
  scene.add(sun)
  const coronaMat = new THREE.SpriteMaterial({
    map: radialTexture([
      [0, 'rgba(255,255,255,0.9)'],
      [0.25, 'rgba(255,255,255,0.35)'],
      [1, 'rgba(255,255,255,0)'],
    ], 128),
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  })
  const corona = new THREE.Sprite(coronaMat)
  corona.scale.set(4.2, 4.2, 1)
  scene.add(corona)

  // Planets on inclined circular orbits, inner ones faster (Kepler-ish).
  const planetDefs = [
    { r: 1.5, size: 0.13, incl: 0.02, moons: 0 },
    { r: 2.3, size: 0.19, incl: 0.06, moons: 1 },
    { r: 3.2, size: 0.16, incl: -0.05, moons: 0 },
    { r: 4.2, size: 0.26, incl: 0.09, moons: 2 },
    { r: 5.3, size: 0.21, incl: -0.03, moons: 1 },
  ]
  const planets = []
  const planetMats = []
  const orbitMats = []

  for (const def of planetDefs) {
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.85 })
    planetMats.push(mat)
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(def.size, 24, 16), mat)
    scene.add(mesh)

    // Orbit ring
    const omat = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.22 })
    orbitMats.push(omat)
    const pts = []
    for (let i = 0; i <= 96; i++) {
      const a = (i / 96) * Math.PI * 2
      pts.push(new THREE.Vector3(Math.cos(a) * def.r, 0, Math.sin(a) * def.r))
    }
    const ogeo = new THREE.BufferGeometry().setFromPoints(pts)
    const oline = new THREE.LineLoop(ogeo, omat)
    oline.rotation.x = def.incl
    scene.add(oline)

    // Moons
    const moons = []
    for (let m = 0; m < def.moons; m++) {
      const mmat = new THREE.MeshStandardMaterial({ color: 0xaab0bc, roughness: 0.9 })
      const mm = new THREE.Mesh(new THREE.SphereGeometry(def.size * 0.3, 12, 8), mmat)
      scene.add(mm)
      moons.push({ mesh: mm, r: def.size * 2.6 + m * 0.14, speed: 2.2 + m * 1.3, phase: Math.random() * 6.28 })
    }

    planets.push({
      mesh, def, moons,
      // Inner planets orbit faster — the classic satisfying pattern.
      speed: 0.55 / Math.pow(def.r, 1.5) * 3.4,
      phase: Math.random() * Math.PI * 2,
    })
  }

  // Background stars
  const starPos = new Float32Array(600 * 3)
  for (let i = 0; i < 600; i++) {
    const a = Math.random() * Math.PI * 2
    const b = Math.acos(2 * Math.random() - 1)
    const R = 60
    starPos[i * 3] = Math.sin(b) * Math.cos(a) * R
    starPos[i * 3 + 1] = Math.cos(b) * R
    starPos[i * 3 + 2] = Math.sin(b) * Math.sin(a) * R
  }
  const sgeo = new THREE.BufferGeometry()
  sgeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3))
  scene.add(new THREE.Points(sgeo, new THREE.PointsMaterial({
    map: radialTexture([[0, 'rgba(255,255,255,1)'], [1, 'rgba(255,255,255,0)']]),
    size: 0.35, transparent: true, opacity: 0.75,
    blending: THREE.AdditiveBlending, depthWrite: false,
  })))

  v.onPalette((p) => {
    scene.background = new THREE.Color(p.bg)
    sunMat.color.set(p.sun)
    sunLight.color.set(p.sun)
    coronaMat.color.set(p.sun)
    planetMats.forEach((m, i) => m.color.set(p.planets[i % p.planets.length]))
    orbitMats.forEach((m) => m.color.set(p.orbit))
  })

  v.onFrame((dt, t, state) => {
    for (const pl of planets) {
      const a = t * pl.speed + pl.phase
      const x = Math.cos(a) * pl.def.r
      const z = Math.sin(a) * pl.def.r
      const y = Math.sin(a) * Math.sin(pl.def.incl) * pl.def.r
      pl.mesh.position.set(x, y, z)
      pl.mesh.rotation.y += dt * 0.8
      for (const mo of pl.moons) {
        const ma = t * mo.speed + mo.phase
        mo.mesh.position.set(
          x + Math.cos(ma) * mo.r,
          y + Math.sin(ma) * mo.r * 0.3,
          z + Math.sin(ma) * mo.r
        )
      }
    }
    const pulse = 0.95 + 0.05 * Math.sin(t * 1.4)
    sun.scale.setScalar(pulse)
    corona.scale.set(4.2 * pulse, 4.2 * pulse, 1)
    coronaMat.opacity = (0.55 + 0.15 * Math.sin(t * 0.9)) * (0.5 + state.intensity * 0.6)
    sunLight.intensity = 60 + state.intensity * 60
    orbitMats.forEach((m) => (m.opacity = 0.1 + state.intensity * 0.18))
  })

  return v.start()
}
