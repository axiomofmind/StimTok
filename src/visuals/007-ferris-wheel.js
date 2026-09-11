import { THREE, threeVisual, radialTexture } from '../lib/visual-kit.js'

export const meta = {
  id: '007-ferris-wheel',
  title: 'Ferris Wheel',
  interaction: 'Drag to view the wheel from another angle · tap a gondola',
  palettes: [
    { name: 'County Fair', frame: '#e8524a', gondolas: ['#ffd166', '#06d6a0', '#118ab2', '#ef476f', '#f78c6b', '#9b5de5'], lights: '#ffd88a', bg: '#101426', sky: '#1a2140' },
    { name: 'Dusk Pastel', frame: '#c98bb9', gondolas: ['#fbc4ab', '#b8f2e6', '#aed9e0', '#ffa69e', '#cdeac0', '#e4c1f9'], lights: '#ffe9d6', bg: '#241a2e', sky: '#3a2a4a' },
    { name: 'Midnight Neon', frame: '#2dd4bf', gondolas: ['#f43f5e', '#8b5cf6', '#22d3ee', '#facc15', '#4ade80', '#fb923c'], lights: '#7df9ff', bg: '#050810', sky: '#0a0f1e' },
  ],
}

export function mount(container, opts = {}) {
  const v = threeVisual(container, opts, meta, { position: [0, 0.6, 9.5], lookAt: [0, 0.6, 0], fov: 45 })
  const { scene } = v

  scene.add(new THREE.AmbientLight(0xffffff, 0.5))
  const moon = new THREE.DirectionalLight(0xbfd4ff, 1.4)
  moon.position.set(-4, 6, 3)
  scene.add(moon)

  const R = 3
  const frameMat = new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.4 })

  const wheel = new THREE.Group()
  wheel.position.y = 0.8
  scene.add(wheel)

  // Rim (two rings) + spokes
  for (const z of [-0.25, 0.25]) {
    const rim = new THREE.Mesh(new THREE.TorusGeometry(R, 0.05, 10, 72), frameMat)
    rim.position.z = z
    wheel.add(rim)
  }
  const SPOKES = 12
  for (let i = 0; i < SPOKES; i++) {
    const a = (i * Math.PI * 2) / SPOKES
    for (const z of [-0.25, 0.25]) {
      const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, R, 6), frameMat)
      spoke.position.set(Math.cos(a) * R * 0.5, Math.sin(a) * R * 0.5, z)
      spoke.rotation.z = a + Math.PI / 2
      wheel.add(spoke)
    }
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.7, 24), frameMat)
  hub.rotation.x = Math.PI / 2
  wheel.add(hub)

  // Gondolas hang from the rim and stay level (with a soft swing).
  const gondolaMats = []
  const gondolas = []
  for (let i = 0; i < SPOKES; i++) {
    const a = (i * Math.PI * 2) / SPOKES
    const pivotG = new THREE.Group()
    pivotG.position.set(Math.cos(a) * R, Math.sin(a) * R, 0)
    wheel.add(pivotG)
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.55 })
    gondolaMats.push(mat)
    const cab = new THREE.Group()
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 12), mat)
    body.scale.set(1, 0.8, 0.85)
    body.position.y = -0.34
    cab.add(body)
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.28, 6), frameMat)
    arm.position.y = -0.12
    cab.add(arm)
    pivotG.add(cab)
    gondolas.push({ pivot: pivotG, cab, angle: a, phase: Math.random() * Math.PI * 2 })
  }

  // Support A-frame + ground
  const legMat = new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0.3, color: 0x555b63 })
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 4.4, 10), legMat)
    leg.position.set(s * 1.5, -1.2, 0)
    leg.rotation.z = s * -0.35
    scene.add(leg)
  }
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 12),
    new THREE.MeshStandardMaterial({ color: 0x0d1117, roughness: 1 })
  )
  ground.rotation.x = -Math.PI / 2
  ground.position.y = -3.3
  scene.add(ground)

  // Twinkling rim lights
  const lightTex = radialTexture([
    [0, 'rgba(255,255,255,1)'],
    [0.3, 'rgba(255,255,255,0.6)'],
    [1, 'rgba(255,255,255,0)'],
  ])
  const NLIGHTS = 48
  const lp = new Float32Array(NLIGHTS * 3)
  for (let i = 0; i < NLIGHTS; i++) {
    const a = (i / NLIGHTS) * Math.PI * 2
    lp[i * 3] = Math.cos(a) * R
    lp[i * 3 + 1] = Math.sin(a) * R
    lp[i * 3 + 2] = 0.3
  }
  const lightGeo = new THREE.BufferGeometry()
  lightGeo.setAttribute('position', new THREE.BufferAttribute(lp, 3))
  const lightMat = new THREE.PointsMaterial({
    map: lightTex, size: 0.3, transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false,
  })
  wheel.add(new THREE.Points(lightGeo, lightMat))

  // Stars
  const starPos = new Float32Array(200 * 3)
  for (let i = 0; i < 200; i++) {
    starPos[i * 3] = (Math.random() - 0.5) * 40
    starPos[i * 3 + 1] = Math.random() * 14 - 2
    starPos[i * 3 + 2] = -8 - Math.random() * 6
  }
  const starGeo = new THREE.BufferGeometry()
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3))
  scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xbcc8e8, size: 0.06, transparent: true, opacity: 0.8 })))

  v.onPalette((p) => {
    scene.background = new THREE.Color(p.bg)
    frameMat.color.set(p.frame)
    lightMat.color.set(p.lights)
    gondolaMats.forEach((m, i) => m.color.set(p.gondolas[i % p.gondolas.length]))
  })

  v.onFrame((dt, t, state) => {
    wheel.rotation.z += dt * 0.22
    for (const g of gondolas) {
      // Cancel wheel rotation so cabs hang level, plus a soft pendulum swing.
      g.cab.rotation.z = -wheel.rotation.z + Math.sin(t * 1.3 + g.phase) * 0.07
    }
    lightMat.size = 0.22 + state.intensity * 0.16 + Math.sin(t * 5) * 0.02
    lightMat.opacity = 0.6 + 0.4 * Math.abs(Math.sin(t * 2.2))
  })

  return v.start()
}
