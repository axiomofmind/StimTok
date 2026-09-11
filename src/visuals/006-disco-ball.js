import { THREE, threeVisual, radialTexture } from '../lib/visual-kit.js'

export const meta = {
  id: '006-disco-ball',
  title: 'Rotating Disco Ball',
  interaction: 'Drag to orbit the reflections · tap the mirror ball',
  palettes: [
    { name: 'Silver Night', spot: '#ffffff', accent: '#7dd3fc', bg: '#07070c' },
    { name: 'Gold Hour', spot: '#ffd873', accent: '#ff9d5c', bg: '#0c0806' },
    { name: 'Ultraviolet', spot: '#c4b5fd', accent: '#f0abfc', bg: '#08050f' },
  ],
}

export function mount(container, opts = {}) {
  const v = threeVisual(container, opts, meta, { position: [0, 0, 6], lookAt: [0, 0.4, 0], fov: 45 })
  const { scene } = v

  scene.add(new THREE.AmbientLight(0xffffff, 0.25))
  const l1 = new THREE.PointLight(0xffffff, 30, 0, 2)
  l1.position.set(3, 2, 3)
  scene.add(l1)
  const l2 = new THREE.PointLight(0x88bbff, 20, 0, 2)
  l2.position.set(-3, -1, 2)
  scene.add(l2)

  // Mirror facets on a sphere lattice.
  const facetGeo = new THREE.PlaneGeometry(0.13, 0.13)
  const facetMat = new THREE.MeshStandardMaterial({ color: 0xd8dde2, roughness: 0.12, metalness: 0.95, side: THREE.DoubleSide })
  const ROWS = 22
  const positions = []
  for (let r = 1; r < ROWS; r++) {
    const phi = (r / ROWS) * Math.PI
    const count = Math.max(3, Math.round(Math.sin(phi) * 40))
    for (let c = 0; c < count; c++) {
      const theta = (c / count) * Math.PI * 2
      positions.push([phi, theta])
    }
  }
  const facets = new THREE.InstancedMesh(facetGeo, facetMat, positions.length)
  const dummy = new THREE.Object3D()
  const RAD = 1.05
  positions.forEach(([phi, theta], i) => {
    const x = Math.sin(phi) * Math.cos(theta) * RAD
    const y = Math.cos(phi) * RAD
    const z = Math.sin(phi) * Math.sin(theta) * RAD
    dummy.position.set(x, y, z)
    dummy.lookAt(x * 2, y * 2, z * 2)
    dummy.updateMatrix()
    facets.setMatrixAt(i, dummy.matrix)
  })

  const ball = new THREE.Group()
  ball.position.y = 0.4
  ball.add(facets)
  scene.add(ball)

  const chain = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.02, 2.4, 8),
    new THREE.MeshStandardMaterial({ color: 0x666a70, metalness: 0.8, roughness: 0.4 })
  )
  chain.position.y = 2.8
  scene.add(chain)

  // Scattered light spots sweeping around the room: sprites on a big dome
  // that rotates with the ball.
  const spotTex = radialTexture([
    [0, 'rgba(255,255,255,0.9)'],
    [0.4, 'rgba(255,255,255,0.5)'],
    [1, 'rgba(255,255,255,0)'],
  ])
  const SPOTS = 260
  const spotGeo = new THREE.BufferGeometry()
  const spotPos = new Float32Array(SPOTS * 3)
  const spotPhase = new Float32Array(SPOTS)
  for (let i = 0; i < SPOTS; i++) {
    const phi = Math.acos(2 * Math.random() - 1)
    const theta = Math.random() * Math.PI * 2
    const R = 11
    spotPos[i * 3] = Math.sin(phi) * Math.cos(theta) * R
    spotPos[i * 3 + 1] = Math.cos(phi) * R * 0.8
    spotPos[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * R
    spotPhase[i] = Math.random() * Math.PI * 2
  }
  spotGeo.setAttribute('position', new THREE.BufferAttribute(spotPos, 3))
  const spotMat = new THREE.PointsMaterial({
    map: spotTex,
    size: 0.85,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  const spots = new THREE.Points(spotGeo, spotMat)
  scene.add(spots)

  // A few colored accent spots
  const accentMat = spotMat.clone()
  accentMat.size = 1.3
  const accGeo = new THREE.BufferGeometry()
  const accPos = new Float32Array(60 * 3)
  for (let i = 0; i < 60; i++) {
    const phi = Math.acos(2 * Math.random() - 1)
    const theta = Math.random() * Math.PI * 2
    accPos[i * 3] = Math.sin(phi) * Math.cos(theta) * 10.5
    accPos[i * 3 + 1] = Math.cos(phi) * 8.5
    accPos[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * 10.5
  }
  accGeo.setAttribute('position', new THREE.BufferAttribute(accPos, 3))
  const accents = new THREE.Points(accGeo, accentMat)
  scene.add(accents)

  v.onPalette((p) => {
    scene.background = new THREE.Color(p.bg)
    spotMat.color.set(p.spot)
    accentMat.color.set(p.accent)
    l2.color.set(p.accent)
  })

  v.onFrame((dt, t, state) => {
    ball.rotation.y += dt * 0.5
    // Spots sweep with the ball but slightly faster (lever-arm effect).
    spots.rotation.y += dt * 0.5
    accents.rotation.y -= dt * 0.32
    spotMat.opacity = (0.45 + 0.35 * Math.sin(t * 0.8)) * Math.min(1, 0.4 + state.intensity * 0.6)
    accentMat.opacity = 0.4 + state.intensity * 0.3
    l1.intensity = 18 + state.intensity * 22
  })

  return v.start()
}
