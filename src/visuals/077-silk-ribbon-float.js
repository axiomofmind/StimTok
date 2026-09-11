import { THREE, threeVisual, makeNoise2D } from '../lib/visual-kit.js'

export const meta = {
  id: '077-silk-ribbon-float',
  title: 'Floating Silk Ribbon Drift',
  interaction: 'Orbit the floating ribbon · tap its silk surface',
  palettes: [
    { name: 'Pearl Silk', a: '#ffd8e8', b: '#c8e8ff', c: '#fff2d8', bg: '#0c0a12' },
    { name: 'Ocean Silk', a: '#3fd8c0', b: '#4a9cf7', c: '#a0f0ff', bg: '#040c14' },
    { name: 'Ember Silk', a: '#ff8a5c', b: '#ffd166', c: '#ff5d8f', bg: '#100604' },
  ],
}

function makeRibbon(scene, noise, seed, width, len) {
  const SEGS = len
  const positions = new Float32Array((SEGS + 1) * 2 * 3)
  const uvs = new Float32Array((SEGS + 1) * 2 * 2)
  const indices = []
  for (let i = 0; i < SEGS; i++) {
    const a = i * 2
    indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
  }
  for (let i = 0; i <= SEGS; i++) {
    uvs[i * 4] = i / SEGS
    uvs[i * 4 + 1] = 0
    uvs[i * 4 + 2] = i / SEGS
    uvs[i * 4 + 3] = 1
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
  geo.setIndex(indices)

  const mat = new THREE.MeshStandardMaterial({
    side: THREE.DoubleSide, roughness: 0.28, metalness: 0.3,
    transparent: true, opacity: 0.92,
  })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.frustumCulled = false
  scene.add(mesh)
  return { geo, mat, positions, SEGS, seed, width }
}

export function mount(container, opts = {}) {
  const v = threeVisual(container, opts, meta, { position: [0, 0, 8], lookAt: [0, 0, 0], fov: 50 })
  const { scene } = v
  const noise = makeNoise2D(43)

  scene.add(new THREE.AmbientLight(0xffffff, 0.55))
  const key = new THREE.DirectionalLight(0xffffff, 1.9)
  key.position.set(2, 4, 5)
  scene.add(key)
  const fill = new THREE.PointLight(0xffffff, 18, 0, 2)
  fill.position.set(-4, -2, 3)
  scene.add(fill)

  const ribbons = [
    makeRibbon(scene, noise, 0, 0.34, 90),
    makeRibbon(scene, noise, 11.3, 0.26, 90),
    makeRibbon(scene, noise, 27.7, 0.20, 90),
  ]

  const pA = new THREE.Vector3()
  const pB = new THREE.Vector3()
  const dir = new THREE.Vector3()
  const side = new THREE.Vector3()
  const up = new THREE.Vector3(0, 0, 1)

  v.onPalette((p) => {
    scene.background = new THREE.Color(p.bg)
    ribbons[0].mat.color.set(p.a)
    ribbons[1].mat.color.set(p.b)
    ribbons[2].mat.color.set(p.c)
    fill.color.set(p.b)
  })

  // The ribbon path: a slow 3D curve sampled along its length, so the
  // whole band undulates like fabric caught in a gentle updraft.
  function samplePath(out, f, t, seed) {
    const s = f * 6.0
    out.set(
      Math.sin(s * 0.7 + t * 0.35 + seed) * 3.0 + noise(s * 0.3 + seed, t * 0.18) * 1.2,
      Math.cos(s * 0.55 + t * 0.28 + seed * 0.7) * 2.0 + Math.sin(f * 3.0 - t * 0.5) * 0.6,
      Math.sin(s * 0.9 - t * 0.22 + seed * 1.3) * 1.6
    )
  }

  v.onFrame((dt, t, state) => {
    for (const r of ribbons) {
      const { positions, SEGS, seed, geo } = r
      for (let i = 0; i <= SEGS; i++) {
        const f = i / SEGS
        samplePath(pA, f, t, seed)
        samplePath(pB, Math.min(1, f + 0.01), t, seed)
        dir.subVectors(pB, pA)
        side.copy(dir).cross(up)
        if (side.lengthSq() < 1e-6) side.set(0, 1, 0)
        side.normalize()
        // Twist the band along its length so it catches light differently.
        const twist = Math.sin(f * 8 + t * 0.6 + seed)
        side.multiplyScalar(1).applyAxisAngle(dir.normalize(), twist * 1.2)
        // Taper the ends so the ribbon fades to points.
        const taper = Math.sin(f * Math.PI) ** 0.45
        const hw = r.width * taper
        positions[i * 6] = pA.x + side.x * hw
        positions[i * 6 + 1] = pA.y + side.y * hw
        positions[i * 6 + 2] = pA.z + side.z * hw
        positions[i * 6 + 3] = pA.x - side.x * hw
        positions[i * 6 + 4] = pA.y - side.y * hw
        positions[i * 6 + 5] = pA.z - side.z * hw
      }
      geo.attributes.position.needsUpdate = true
      geo.computeVertexNormals()
      r.mat.opacity = 0.65 + state.intensity * 0.3
    }
    key.intensity = 1.4 + state.intensity * 0.9
  })

  return v.start()
}
