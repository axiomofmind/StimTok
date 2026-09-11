import { THREE, threeVisual } from '../lib/visual-kit.js'

export const meta = {
  id: '008-kinetic-mobile',
  title: 'Hanging Kinetic Mobile',
  interaction: 'Drag around the mobile · tap a hanging piece',
  palettes: [
    { name: 'Calder Classic', shapes: ['#d1342f', '#1c6bb0', '#f2c230', '#1a1a1a', '#e8e4da'], wire: '#2a2a2a', bg: '#f0ece2' },
    { name: 'Deep Sea', shapes: ['#0ea5e9', '#22d3ee', '#818cf8', '#c7d2fe', '#164e63'], wire: '#9fb3c8', bg: '#0b1622' },
    { name: 'Sunset', shapes: ['#f97316', '#fb7185', '#fbbf24', '#a855f7', '#7c2d12'], wire: '#553a2a', bg: '#1c1210' },
  ],
}

export function mount(container, opts = {}) {
  const v = threeVisual(container, opts, meta, { position: [0, -0.4, 7], lookAt: [0, 0.4, 0], fov: 45 })
  const { scene } = v

  scene.add(new THREE.AmbientLight(0xffffff, 0.85))
  const key = new THREE.DirectionalLight(0xffffff, 2)
  key.position.set(3, 5, 4)
  scene.add(key)

  const wireMat = new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.6 })
  const shapeMats = []
  function shapeMat() {
    const m = new THREE.MeshStandardMaterial({ roughness: 0.6, side: THREE.DoubleSide })
    shapeMats.push(m)
    return m
  }

  function flatShape(kind, s) {
    let geo
    if (kind === 'circle') geo = new THREE.CircleGeometry(s, 32)
    else if (kind === 'leaf') {
      const sh = new THREE.Shape()
      sh.moveTo(0, -s)
      sh.quadraticCurveTo(s * 1.1, 0, 0, s)
      sh.quadraticCurveTo(-s * 1.1, 0, 0, -s)
      geo = new THREE.ShapeGeometry(sh)
    } else {
      const sh = new THREE.Shape()
      sh.moveTo(-s, -s * 0.6)
      sh.lineTo(s, -s * 0.2)
      sh.lineTo(0, s)
      sh.closePath()
      geo = new THREE.ShapeGeometry(sh)
    }
    return new THREE.Mesh(geo, shapeMat())
  }

  function wire(len) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, len, 6), wireMat)
    m.position.y = -len / 2
    return m
  }
  function arm(len) {
    // Horizontal rod centered on its hang point.
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, len, 6), wireMat)
    m.rotation.z = Math.PI / 2
    return m
  }

  // Build a recursive Calder-style mobile: each node is a rotating joint
  // with an arm; one end holds a shape, the other a sub-mobile.
  const joints = []
  function buildNode(depth, armLen, shapeSize) {
    const joint = new THREE.Group()
    joints.push({ node: joint, rate: (Math.random() * 0.3 + 0.12) * (Math.random() > 0.5 ? 1 : -1) })
    const drop = wire(0.35)
    joint.add(drop)
    const bar = new THREE.Group()
    bar.position.y = -0.35
    bar.add(arm(armLen))
    joint.add(bar)

    // Shape end
    const shapeDrop = new THREE.Group()
    shapeDrop.position.x = armLen / 2
    shapeDrop.add(wire(0.3))
    const kinds = ['circle', 'leaf', 'tri']
    const s = flatShape(kinds[Math.floor(Math.random() * 3)], shapeSize)
    s.position.y = -0.3 - shapeSize
    s.rotation.y = Math.random()
    shapeDrop.add(s)
    bar.add(shapeDrop)

    // Sub-mobile or terminal shape on the other end
    const other = new THREE.Group()
    other.position.x = -armLen / 2
    if (depth > 0) {
      const child = buildNode(depth - 1, armLen * 0.72, shapeSize * 0.85)
      other.add(child)
    } else {
      other.add(wire(0.3))
      const s2 = flatShape('circle', shapeSize * 0.8)
      s2.position.y = -0.3 - shapeSize * 0.8
      other.add(s2)
    }
    bar.add(other)
    return joint
  }

  const root = buildNode(4, 3.2, 0.42)
  root.position.y = 2.6
  scene.add(root)

  v.onPalette((p) => {
    scene.background = new THREE.Color(p.bg)
    wireMat.color.set(p.wire)
    shapeMats.forEach((m, i) => m.color.set(p.shapes[i % p.shapes.length]))
  })

  v.onFrame((dt, t, state) => {
    for (const j of joints) {
      j.node.rotation.y += dt * j.rate * (0.5 + state.intensity * 0.75)
    }
    // Whole mobile drifts gently as if in a faint draft.
    root.rotation.y += dt * 0.05
    root.position.y = 2.6 + Math.sin(t * 0.4) * 0.03
  })

  return v.start()
}
