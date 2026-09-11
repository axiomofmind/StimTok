import { THREE, threeVisual, makeNoise2D } from '../lib/visual-kit.js'

export const meta = {
  id: '029-falling-leaves',
  title: 'Falling Leaves',
  interaction: 'Drag through the air to orbit · tap a falling leaf',
  palettes: [
    { name: 'October', leaves: ['#d4772e', '#b8451f', '#e8a838', '#8a5a2a', '#c2603a'], sky: '#2e2418', bg: '#241c12' },
    { name: 'Cherry Spring', leaves: ['#ffb7c5', '#ffc9d4', '#ffd9e0', '#f0a0b4', '#ffe4ea'], sky: '#28202e', bg: '#1e1826' },
    { name: 'Golden Ginkgo', leaves: ['#f5c518', '#e8b410', '#ffd94a', '#d4a20a', '#fce27a'], sky: '#1c2028', bg: '#14181f' },
  ],
}

export function mount(container, opts = {}) {
  const v = threeVisual(container, opts, meta, { position: [0, 0, 9], lookAt: [0, 0, 0], fov: 50 })
  const { scene } = v
  const noise = makeNoise2D(11)

  scene.add(new THREE.AmbientLight(0xffffff, 0.8))
  const sun = new THREE.DirectionalLight(0xfff0d8, 1.6)
  sun.position.set(4, 6, 3)
  scene.add(sun)

  // Leaf shape
  const leafShape = new THREE.Shape()
  leafShape.moveTo(0, -0.5)
  leafShape.quadraticCurveTo(0.42, -0.1, 0.12, 0.35)
  leafShape.quadraticCurveTo(0.04, 0.48, 0, 0.5)
  leafShape.quadraticCurveTo(-0.04, 0.48, -0.12, 0.35)
  leafShape.quadraticCurveTo(-0.42, -0.1, 0, -0.5)
  const leafGeo = new THREE.ShapeGeometry(leafShape)

  const N = 55
  const leaves = []
  const mats = []
  for (let i = 0; i < N; i++) {
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.8, side: THREE.DoubleSide })
    mats.push(mat)
    const m = new THREE.Mesh(leafGeo, mat)
    const scale = 0.25 + Math.random() * 0.3
    m.scale.setScalar(scale)
    scene.add(m)
    leaves.push({
      m,
      x: (Math.random() - 0.5) * 14,
      y: Math.random() * 12 - 5,
      z: -3 + Math.random() * 5,
      fall: 0.5 + Math.random() * 0.5,
      swayPhase: Math.random() * Math.PI * 2,
      swayAmp: 0.7 + Math.random() * 0.9,
      tumbleX: Math.random() * 2,
      tumbleZ: Math.random() * 2,
      seed: Math.random() * 100,
    })
  }

  v.onPalette((p) => {
    scene.background = new THREE.Color(p.bg)
    scene.fog = new THREE.Fog(new THREE.Color(p.sky).getHex(), 8, 18)
    mats.forEach((m, i) => m.color.set(p.leaves[i % p.leaves.length]))
  })

  v.onFrame((dt, t, state) => {
    const wind = noise(t * 0.15, 0) * (0.4 + state.intensity * 0.8)
    for (const l of leaves) {
      // Fluttering fall: gravity + pendulum sway + wind drift.
      l.y -= dt * l.fall * (0.8 + Math.abs(Math.sin(t + l.swayPhase)) * 0.4)
      l.x += (Math.sin(t * 1.2 + l.swayPhase) * l.swayAmp * 0.5 + wind * 1.4) * dt
      const sway = Math.sin(t * 1.2 + l.swayPhase)
      l.m.position.set(l.x, l.y, l.z)
      l.m.rotation.set(
        sway * 0.9 + t * l.tumbleX * 0.3,
        noise(l.seed, t * 0.2) * 2,
        Math.cos(t * 1.2 + l.swayPhase) * 0.7 + t * l.tumbleZ * 0.2
      )
      if (l.y < -6) {
        l.y = 6 + Math.random() * 2
        l.x = (Math.random() - 0.5) * 14
      }
      if (l.x > 8) l.x = -8
    }
  })

  return v.start()
}
