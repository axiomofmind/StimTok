import { THREE, threeVisual, radialTexture } from '../lib/visual-kit.js'

export const meta = {
  id: '099-pendulum-fidget-swirl',
  title: 'Chain/Pendulum Fidget Swirl',
  interaction:
    'Pull the weight away from center and release it into a real swing',
  palettes: [
    {
      name: 'Steel Chain',
      chain: '#c8ccd4',
      bob: '#8a94a8',
      trail: '#7db8f0',
      bg: '#06080e',
    },
    {
      name: 'Brass Chain',
      chain: '#e8c88a',
      bob: '#a8874a',
      trail: '#ffd166',
      bg: '#0c0906',
    },
    {
      name: 'Neon Chain',
      chain: '#c0a8ff',
      bob: '#8a5cff',
      trail: '#f472b6',
      bg: '#08050e',
    },
  ],
}

export function mount(container, opts = {}) {
  const v = threeVisual(container, opts, meta, {
    position: [0, 1, 9],
    lookAt: [0, 0.7, 0],
    fov: 45,
  })
  const { scene } = v

  scene.add(new THREE.AmbientLight(0xffffff, 0.55))
  const key = new THREE.PointLight(0xffffff, 30, 0, 2)
  key.position.set(3, 4, 4)
  scene.add(key)

  // A conical pendulum: the bob sweeps a circle whose radius and tilt
  // slowly precess, so the traced path never quite repeats.
  const anchor = new THREE.Vector3(0, 2.6, 0)
  const anchorMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 16, 12),
    new THREE.MeshStandardMaterial({
      color: 0x6a707c,
      roughness: 0.3,
      metalness: 0.8,
    }),
  )
  anchorMesh.position.copy(anchor)
  scene.add(anchorMesh)

  // Chain: a series of small links following the taut line to the bob.
  const LINKS = 22
  const linkMat = new THREE.MeshStandardMaterial({
    roughness: 0.28,
    metalness: 0.85,
  })
  const linkGeo = new THREE.TorusGeometry(0.055, 0.021, 8, 14)
  const links = new THREE.InstancedMesh(linkGeo, linkMat, LINKS)
  scene.add(links)
  const dummy = new THREE.Object3D()

  const bobMat = new THREE.MeshStandardMaterial({
    roughness: 0.2,
    metalness: 0.75,
  })
  const bob = new THREE.Mesh(new THREE.SphereGeometry(0.3, 28, 20), bobMat)
  scene.add(bob)

  // Persistent light trail traced by the bob.
  const TRAIL = 300
  const tpos = new Float32Array(TRAIL * 3)
  const tcol = new Float32Array(TRAIL * 3)
  const tgeo = new THREE.BufferGeometry()
  tgeo.setAttribute('position', new THREE.BufferAttribute(tpos, 3))
  tgeo.setAttribute('color', new THREE.BufferAttribute(tcol, 3))
  const tmat = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  scene.add(new THREE.Line(tgeo, tmat))
  const history = []

  // Glow sprite riding the bob.
  const glowMat = new THREE.SpriteMaterial({
    map: radialTexture(
      [
        [0, 'rgba(255,255,255,0.8)'],
        [0.35, 'rgba(255,255,255,0.3)'],
        [1, 'rgba(255,255,255,0)'],
      ],
      128,
    ),
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  const glow = new THREE.Sprite(glowMat)
  glow.scale.set(1.5, 1.5, 1)
  scene.add(glow)

  const trailColor = new THREE.Color()
  v.onPalette((p) => {
    scene.background = new THREE.Color(p.bg)
    linkMat.color.set(p.chain)
    bobMat.color.set(p.bob)
    trailColor.set(p.trail)
    glowMat.color.set(p.trail)
  })

  const bobPos = new THREE.Vector3()
  const dir = new THREE.Vector3()
  const up = new THREE.Vector3(0, 1, 0)
  const quat = new THREE.Quaternion()
  const L = 3.1

  bobPos
    .copy(anchor)
    .add(new THREE.Vector3(1.4, -Math.sqrt(L * L - 1.4 * 1.4), 0.1))
  const velocity = new THREE.Vector3(),
    target = new THREE.Vector3(),
    offset = new THREE.Vector3()
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0),
    raycaster = new THREE.Raycaster()
  let grabbed = false
  v.addSlider('Damping', 'damping', 0.02, 0.8, 0.02, 0.12)
  v.addAction('Release a swing', () => {
    bobPos
      .copy(anchor)
      .add(new THREE.Vector3(1.4, -Math.sqrt(L * L - 1.4 * 1.4), 0))
    velocity.set(0, 0, 0.8)
  })
  function targetFromPointer() {
    raycaster.setFromCamera(
      new THREE.Vector2(v.pointer.nx, v.pointer.ny),
      v.camera,
    )
    return raycaster.ray.intersectPlane(plane, target)
  }
  v.onPointer((event) => {
    if (event.type === 'down' && v.pick()?.object === bob) {
      grabbed = true
      plane.constant = -bobPos.z
      if (targetFromPointer()) offset.copy(bobPos).sub(target)
      velocity.set(0, 0, 0)
    }
    if (event.type === 'up') {
      if (grabbed && !event.cancelled)
        velocity.set(
          (event.vx / container.clientWidth) * 4,
          (-event.vy / container.clientHeight) * 4,
          0,
        )
      grabbed = false
    }
  })
  v.onFrame((dt, t, state) => {
    const steps = Math.max(1, Math.ceil(dt * 120)),
      h = dt / steps
    for (let i = 0; i < steps; i++) {
      if (grabbed && targetFromPointer()) bobPos.copy(target).add(offset)
      else {
        velocity.y -= 4.7 * h
        velocity.multiplyScalar(Math.exp(-h * state.damping))
        bobPos.addScaledVector(velocity, h)
      }
      dir.copy(bobPos).sub(anchor).normalize()
      bobPos.copy(anchor).addScaledVector(dir, L)
      velocity.addScaledVector(dir, -velocity.dot(dir))
    }
    bob.position.copy(bobPos)
    glow.position.copy(bobPos)

    // Lay the chain links along the anchor->bob line.
    dir.subVectors(bobPos, anchor)
    const len = dir.length()
    dir.normalize()
    quat.setFromUnitVectors(up, dir)
    for (let i = 0; i < LINKS; i++) {
      const f = (i + 0.5) / LINKS
      dummy.position.copy(anchor).addScaledVector(dir, len * f)
      dummy.quaternion.copy(quat)
      // Alternate link orientation like a real chain.
      dummy.rotateY(i % 2 === 0 ? 0 : Math.PI / 2)
      dummy.rotateX(Math.PI / 2)
      dummy.updateMatrix()
      links.setMatrixAt(i, dummy.matrix)
    }
    links.instanceMatrix.needsUpdate = true

    // Trail
    history.push([bobPos.x, bobPos.y, bobPos.z])
    if (history.length > TRAIL) history.shift()
    for (let i = 0; i < TRAIL; i++) {
      const h = history[Math.max(0, history.length - TRAIL + i)] ||
        history[0] || [0, 0, 0]
      tpos[i * 3] = h[0]
      tpos[i * 3 + 1] = h[1]
      tpos[i * 3 + 2] = h[2]
      const fade = (i / TRAIL) ** 1.5 * (0.4 + state.intensity * 0.8)
      tcol[i * 3] = trailColor.r * fade
      tcol[i * 3 + 1] = trailColor.g * fade
      tcol[i * 3 + 2] = trailColor.b * fade
    }
    tgeo.attributes.position.needsUpdate = true
    tgeo.attributes.color.needsUpdate = true
    glowMat.opacity = 0.35 + state.intensity * 0.4
  })

  return v.start()
}
