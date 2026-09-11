import { THREE, threeVisual } from '../lib/visual-kit.js'

export const meta = {
  id: '037-ribbon-wand',
  title: 'Waving Ribbon Wand',
  interaction: 'Hold and wave the wand · your exact gesture becomes silk',
  palettes: [
    { name: 'Rhythmic Red', a: '#ff3b5c', b: '#ffb1c1', bg: '#100608' },
    { name: 'Sky Silk', a: '#4aa8ff', b: '#c8e8ff', bg: '#060a12' },
    { name: 'Gold Festival', a: '#ffc93c', b: '#fff2c8', bg: '#0f0c04' },
  ],
}

export function mount(container, opts = {}) {
  const v = threeVisual(container, opts, meta, { position: [0, 0, 7.5], lookAt: [0, 0, 0], fov: 50 })
  const { scene } = v

  scene.add(new THREE.AmbientLight(0xffffff, 0.8))
  const key = new THREE.DirectionalLight(0xffffff, 1.6)
  key.position.set(2, 4, 5)
  scene.add(key)

  // Ribbon: triangle-strip mesh rebuilt each frame from the wand-tip path.
  const SEGS = 140
  const WIDTH = 0.22
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

  // Gradient texture along the ribbon length
  const gc = document.createElement('canvas')
  gc.width = 256
  gc.height = 8
  const g = gc.getContext('2d')
  const ribbonTex = new THREE.CanvasTexture(gc)
  function paintRibbon(a, b) {
    const grad = g.createLinearGradient(0, 0, 256, 0)
    grad.addColorStop(0, b)
    grad.addColorStop(0.5, a)
    grad.addColorStop(1, b)
    g.fillStyle = grad
    g.fillRect(0, 0, 256, 8)
    ribbonTex.needsUpdate = true
  }

  const mat = new THREE.MeshStandardMaterial({
    map: ribbonTex, side: THREE.DoubleSide, roughness: 0.35, metalness: 0.15,
    transparent: true, opacity: 0.95,
  })
  const ribbon = new THREE.Mesh(geo, mat)
  ribbon.frustumCulled = false
  scene.add(ribbon)

  const wandMat = new THREE.MeshStandardMaterial({ color: 0xe8edf5, roughness: 0.25, metalness: 0.7 })
  const wand = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.075, 1.35, 12), wandMat)
  wand.rotation.z = Math.PI / 2
  scene.add(wand)
  const wandTip = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), wandMat)
  scene.add(wandTip)

  // Wand tip path history
  const history = []
  const tmpA = new THREE.Vector3()
  const tmpB = new THREE.Vector3()
  const side = new THREE.Vector3()
  const up = new THREE.Vector3(0, 0, 1)

  v.onPalette((p) => {
    scene.background = new THREE.Color(p.bg)
    paintRibbon(p.a, p.b)
  })

  let handX = 0
  let handY = 0
  let handZ = 0
  let userUntil = -20
  v.onPointer((event) => {
    if (event.type === 'down' || event.type === 'drag') {
      handX = event.nx * 3.9
      handY = event.ny * 2.35
      handZ = THREE.MathUtils.clamp(event.speed / 900, 0, 1.1)
      userUntil = performance.now() / 1000 + 2.5
    }
    if (event.type === 'doubletap') history.length = 0
  })

  v.onFrame((dt, t, state) => {
    const beingWaved = v.pointer.down || performance.now() / 1000 < userUntil
    const T = t * 1.4
    const x = beingWaved ? handX : Math.sin(T) * 3.2
    const y = beingWaved ? handY : Math.sin(T * 2) * 1.5 + Math.sin(T * 5.0) * 0.45
    const z = beingWaved ? handZ : Math.cos(T * 3.0) * 0.6
    history.unshift([x, y, z])
    const maxLen = Math.floor(60 + state.intensity * 80)
    while (history.length > Math.min(SEGS + 1, maxLen)) history.pop()

    for (let i = 0; i <= SEGS; i++) {
      const h = history[Math.min(i, history.length - 1)]
      const hn = history[Math.min(i + 1, history.length - 1)]
      tmpA.set(h[0], h[1], h[2])
      tmpB.set(hn[0], hn[1], hn[2])
      side.subVectors(tmpB, tmpA).cross(up)
      if (side.lengthSq() < 1e-6) side.set(0, 1, 0)
      side.normalize()
      // Taper: wide near the wand, narrow at the tail; flutter widens midway.
      const f = i / SEGS
      const flutter = 1 + Math.sin(f * 14 - t * 8) * 0.25 * f
      const wHalf = WIDTH * (1 - f * 0.7) * flutter
      positions[i * 6] = tmpA.x + side.x * wHalf
      positions[i * 6 + 1] = tmpA.y + side.y * wHalf
      positions[i * 6 + 2] = tmpA.z + side.z * wHalf
      positions[i * 6 + 3] = tmpA.x - side.x * wHalf
      positions[i * 6 + 4] = tmpA.y - side.y * wHalf
      positions[i * 6 + 5] = tmpA.z - side.z * wHalf
    }
    geo.attributes.position.needsUpdate = true
    geo.computeVertexNormals()
    wandTip.position.set(x, y, z)
    wand.position.set(x + 0.55, y - 0.28, z)
    wand.rotation.z = Math.PI / 2 + Math.atan2(v.pointer.vy, v.pointer.vx || 1) * 0.15
  })

  return v.start()
}
