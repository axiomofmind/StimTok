import { THREE, threeVisual, makeNoise2D } from '../lib/visual-kit.js'

export const meta = {
  automaticPlay: true,
  id: '002-pinwheel',
  title: 'Toy Pinwheel / Wind Spinner',
  interaction:
    'Swipe across the vanes to blow · faster swipes make stronger gusts',
  palettes: [
    {
      name: 'Carnival',
      vanes: ['#ff5d73', '#ffc145', '#43d9ad', '#4a7cf7'],
      stick: '#c98d5a',
      bg: '#8fc7e8',
      ground: '#a8d8a0',
    },
    {
      name: 'Candy Pastel',
      vanes: ['#ffb3c6', '#cdb4f6', '#a0e7e5', '#fbf8cc'],
      stick: '#e8d5c4',
      bg: '#f6e7f0',
      ground: '#d8ecd4',
    },
    {
      name: 'Night Neon',
      vanes: ['#ff2975', '#00f0ff', '#ffe600', '#8a2be2'],
      stick: '#556',
      bg: '#0a0a1a',
      ground: '#141428',
    },
  ],
}

export function mount(container, opts = {}) {
  const v = threeVisual(container, opts, meta, {
    position: [0, 0.3, 6.5],
    lookAt: [0, 0.3, 0],
    fov: 45,
  })
  const { scene } = v
  const noise = makeNoise2D(7)

  scene.add(new THREE.AmbientLight(0xffffff, 0.9))
  const sun = new THREE.DirectionalLight(0xfff4dd, 2.2)
  sun.position.set(3, 5, 4)
  scene.add(sun)

  // Ground hill
  const groundMat = new THREE.MeshStandardMaterial({ roughness: 1 })
  const ground = new THREE.Mesh(new THREE.SphereGeometry(20, 32, 16), groundMat)
  ground.position.y = -21.6
  scene.add(ground)

  // Stick
  const stickMat = new THREE.MeshStandardMaterial({ roughness: 0.7 })
  const stick = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.055, 3.6, 12),
    stickMat,
  )
  stick.position.y = -1.3
  stick.rotation.z = 0.06
  scene.add(stick)

  // Curved pinwheel vane: triangle with a curled outer fold.
  const vaneShape = new THREE.Shape()
  vaneShape.moveTo(0, 0)
  vaneShape.lineTo(1.35, 0.12)
  vaneShape.quadraticCurveTo(1.15, 0.75, 0.55, 1.0)
  vaneShape.quadraticCurveTo(0.2, 0.6, 0, 0)
  const vaneGeo = new THREE.ExtrudeGeometry(vaneShape, {
    depth: 0.02,
    bevelEnabled: false,
  })

  const head = new THREE.Group()
  head.position.y = 0.45
  scene.add(head)

  const vaneMats = []
  const VANES = 6
  for (let i = 0; i < VANES; i++) {
    const mat = new THREE.MeshStandardMaterial({
      roughness: 0.45,
      metalness: 0.1,
      side: THREE.DoubleSide,
    })
    vaneMats.push(mat)
    const vane = new THREE.Mesh(vaneGeo, mat)
    // Curl each vane out of the plane so light plays across it as it spins.
    vane.rotation.y = 0.9
    vane.rotation.x = 0.25
    vane.scale.set(1, 0.84, 1)
    const arm = new THREE.Group()
    arm.add(vane)
    arm.rotation.z = (i * Math.PI * 2) / VANES
    head.add(arm)
  }
  const pinMat = new THREE.MeshStandardMaterial({
    color: 0xf3d34a,
    roughness: 0.3,
    metalness: 0.6,
  })
  const pin = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), pinMat)
  head.add(pin)

  // Drifting pollen/breeze motes to sell the wind.
  const MOTES = 90
  const motePos = new Float32Array(MOTES * 3)
  for (let i = 0; i < MOTES; i++) {
    motePos[i * 3] = (Math.random() - 0.5) * 14
    motePos[i * 3 + 1] = (Math.random() - 0.5) * 8
    motePos[i * 3 + 2] = (Math.random() - 0.5) * 6 - 1
  }
  const moteGeo = new THREE.BufferGeometry()
  moteGeo.setAttribute('position', new THREE.BufferAttribute(motePos, 3))
  const moteMat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.045,
    transparent: true,
    opacity: 0.55,
  })
  scene.add(new THREE.Points(moteGeo, moteMat))

  v.onPalette((p) => {
    scene.background = new THREE.Color(p.bg)
    groundMat.color.set(p.ground)
    stickMat.color.set(p.stick)
    vaneMats.forEach((m, i) => m.color.set(p.vanes[i % p.vanes.length]))
  })

  let angularVelocity = 0
  let gustKick = 0
  v.addAction('Send a breeze', () => {
    angularVelocity -= 9
    gustKick = 1
  })
  v.addSlider('Air resistance', 'airDrag', 0.05, 1, 0.05, 0.2)
  let touchedAt = -20
  v.onPointer((event) => {
    const now = v.state.t
    if (event.type === 'down') touchedAt = now
    if (event.type === 'drag') {
      const width = Math.max(1, container.clientWidth)
      const height = Math.max(1, container.clientHeight)
      angularVelocity += (-event.dx / width + (event.dy / height) * 0.35) * 65
      angularVelocity = THREE.MathUtils.clamp(angularVelocity, -28, 28)
      touchedAt = now
    }
    if (event.type === 'tap') {
      angularVelocity -= 4.5
      touchedAt = now
    }
    if (event.type === 'doubletap') angularVelocity = -4.2
  })

  v.onFrame((dt, t, state) => {
    // Gusty breeze: base spin + noise-driven gusts.
    const gust = 0.5 + 0.5 * noise(t * 0.25, 3.7)
    const naturalWind = state.demo ? -(2.2 + gust * 4.5) : 0
    const recovery = t - touchedAt > 3 ? 0.8 : 0.16
    if (!v.pointer.down)
      angularVelocity += (naturalWind - angularVelocity) * dt * recovery
    angularVelocity *= Math.exp(-dt * state.airDrag)
    gustKick *= Math.exp(-dt * 2)
    head.rotation.z += dt * angularVelocity
    head.rotation.x = Math.sin(t * 0.8) * 0.06
    stick.rotation.z =
      0.06 + Math.sin(t * 4) * Math.min(0.09, Math.abs(angularVelocity) * 0.003)
    sun.intensity = 1.6 + state.intensity * 0.8

    const pos = moteGeo.attributes.position
    for (let i = 0; i < MOTES; i++) {
      let x = pos.getX(i) + dt * (0.2 + Math.abs(angularVelocity) * 0.1)
      let y = pos.getY(i) + Math.sin(t + i) * dt * 0.15
      if (x > 7) x = -7
      pos.setXY(i, x, y)
    }
    pos.needsUpdate = true
    moteMat.opacity = 0.25 + state.intensity * 0.25
  })

  return v.start()
}
