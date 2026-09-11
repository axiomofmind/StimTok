import { THREE, threeVisual } from '../lib/visual-kit.js'

export const meta = {
  id: '003-spinning-top',
  title: 'Spinning Top / Gyroscope',
  interaction:
    'Flick sideways to add spin · tap to brake · use Launch for a fresh spin',
  palettes: [
    {
      name: 'Aurora',
      body: '#2dd4bf',
      stripe: '#f472b6',
      trail: '#7dd3fc',
      bg: '#080c14',
      floor: '#101826',
    },
    {
      name: 'Ember',
      body: '#f59e0b',
      stripe: '#ef4444',
      trail: '#fbbf24',
      bg: '#120a06',
      floor: '#241209',
    },
    {
      name: 'Violet',
      body: '#a78bfa',
      stripe: '#22d3ee',
      trail: '#e879f9',
      bg: '#0b0714',
      floor: '#191030',
    },
  ],
}

export function mount(container, opts = {}) {
  const v = threeVisual(container, opts, meta, {
    position: [0, 1.6, 4.6],
    lookAt: [0, 0.6, 0],
    fov: 45,
  })
  const { scene } = v

  scene.add(new THREE.AmbientLight(0xffffff, 0.5))
  const key = new THREE.PointLight(0xffffff, 40, 0, 2)
  key.position.set(2.5, 4, 2.5)
  scene.add(key)
  const rim = new THREE.PointLight(0x88aaff, 15, 0, 2)
  rim.position.set(-3, 2, -2)
  scene.add(rim)

  const floorMat = new THREE.MeshStandardMaterial({
    roughness: 0.72,
    metalness: 0.15,
  })
  const floor = new THREE.Mesh(new THREE.CircleGeometry(6, 48), floorMat)
  floor.rotation.x = -Math.PI / 2
  scene.add(floor)

  // Precession pivot at the contact point; the top hangs off it tilted.
  const pivot = new THREE.Group()
  scene.add(pivot)
  const tilt = new THREE.Group()
  tilt.rotation.z = 0.28
  pivot.add(tilt)

  const bodyMat = new THREE.MeshStandardMaterial({
    roughness: 0.25,
    metalness: 0.55,
  })
  const stripeMat = new THREE.MeshStandardMaterial({
    roughness: 0.25,
    metalness: 0.55,
  })

  const spinner = new THREE.Group()
  tilt.add(spinner)
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.5, 24), bodyMat)
  tip.rotation.x = Math.PI
  tip.position.y = 0.25
  spinner.add(tip)
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.55, 32, 20), bodyMat)
  belly.scale.y = 0.62
  belly.position.y = 0.72
  spinner.add(belly)
  const band = new THREE.Mesh(
    new THREE.TorusGeometry(0.55, 0.07, 12, 40),
    stripeMat,
  )
  band.rotation.x = Math.PI / 2
  band.position.y = 0.72
  spinner.add(band)
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.09, 0.6, 12),
    stripeMat,
  )
  stem.position.y = 1.25
  spinner.add(stem)
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), bodyMat)
  knob.position.y = 1.58
  spinner.add(knob)

  // Light trail traced by the stem knob during precession.
  const TRAIL = 180
  const trailPos = new Float32Array(TRAIL * 3)
  const trailCol = new Float32Array(TRAIL * 3)
  const trailGeo = new THREE.BufferGeometry()
  trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3))
  trailGeo.setAttribute('color', new THREE.BufferAttribute(trailCol, 3))
  const trailMat = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  const trail = new THREE.Line(trailGeo, trailMat)
  scene.add(trail)
  const history = []
  const trailColor = new THREE.Color()
  const tmp = new THREE.Vector3()

  v.onPalette((p) => {
    scene.background = new THREE.Color(p.bg)
    floorMat.color.set(p.floor)
    bodyMat.color.set(p.body)
    stripeMat.color.set(p.stripe)
    trailColor.set(p.trail)
  })

  v.addSlider('Surface friction', 'friction', 0.05, 0.8, 0.05, 0.18)
  v.addAction('Launch', () => {
    spinVelocity = 28
    fallen = 0
  })
  let fallen = 0
  let spinVelocity = 22
  let precessionVelocity = 1.6
  let wobbleKick = 0
  v.onPointer((event) => {
    if (event.type === 'drag') {
      const width = Math.max(1, container.clientWidth)
      const height = Math.max(1, container.clientHeight)
      spinVelocity += (event.vx / width - (event.vy / height) * 0.35) * 7
      spinVelocity = THREE.MathUtils.clamp(spinVelocity, -45, 45)
      precessionVelocity = THREE.MathUtils.clamp(
        1.2 + (event.vx / width) * 8,
        -6,
        6,
      )
      wobbleKick = THREE.MathUtils.clamp(
        wobbleKick + (event.dy / height) * 0.7,
        -0.3,
        0.3,
      )
    }
    if (event.type === 'tap') {
      spinVelocity *= 0.45
      wobbleKick += 0.12
    }
    if (event.type === 'doubletap') {
      spinVelocity = 22
      precessionVelocity = 1.6
      wobbleKick = 0
    }
  })

  v.onFrame((dt, t, state) => {
    if (!v.pointer.down) {
      spinVelocity *= Math.exp(-dt * state.friction)
      precessionVelocity +=
        ((Math.abs(spinVelocity) > 2
          ? 5 / Math.sqrt(Math.abs(spinVelocity))
          : 0) -
          precessionVelocity) *
        dt *
        0.8
    }
    spinner.rotation.y += dt * spinVelocity
    pivot.rotation.y += dt * precessionVelocity
    // Slow nutation wobble layered on the tilt.
    const slowWobble = THREE.MathUtils.clamp(
      (10 - Math.abs(spinVelocity)) * 0.012,
      0,
      0.16,
    )
    fallen +=
      ((Math.abs(spinVelocity) < 3 ? 1.2 : 0) - fallen) *
      (1 - Math.exp(-dt * 2))
    tilt.rotation.z =
      0.18 +
      fallen +
      Math.sin(t * 3.1) * (0.025 + slowWobble) * (1 - fallen * 0.6) +
      wobbleKick
    wobbleKick *= Math.exp(-dt * 2.8)

    knob.getWorldPosition(tmp)
    history.push([tmp.x, tmp.y, tmp.z])
    if (history.length > TRAIL) history.shift()
    for (let i = 0; i < TRAIL; i++) {
      const h = history[Math.max(0, history.length - TRAIL + i)] ||
        history[0] || [0, 0, 0]
      trailPos[i * 3] = h[0]
      trailPos[i * 3 + 1] = h[1]
      trailPos[i * 3 + 2] = h[2]
      const fade = (i / TRAIL) * state.intensity
      trailCol[i * 3] = trailColor.r * fade
      trailCol[i * 3 + 1] = trailColor.g * fade
      trailCol[i * 3 + 2] = trailColor.b * fade
    }
    trailGeo.attributes.position.needsUpdate = true
    trailGeo.attributes.color.needsUpdate = true
    key.intensity = 25 + state.intensity * 25
  })

  return v.start()
}
