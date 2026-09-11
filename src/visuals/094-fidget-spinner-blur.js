import { THREE, threeVisual, radialTexture } from '../lib/visual-kit.js'

export const meta = {
  automaticPlay: true,
  id: '094-fidget-spinner-blur',
  title: 'Light-Up Fidget Spinner Blur',
  interaction: 'Flick around the hub to spin · tap the bearing to brake',
  palettes: [
    {
      name: 'RGB Spinner',
      lights: ['#ff2975', '#00f0ff', '#a8ff5f'],
      body: '#606a74',
      bg: '#06070c',
    },
    {
      name: 'Sunset Spin',
      lights: ['#ffc145', '#ff5d3a', '#ff8ad0'],
      body: '#2e2622',
      bg: '#0c0705',
    },
    {
      name: 'Ice Spin',
      lights: ['#d8ecff', '#7db8f0', '#c0d8ff'],
      body: '#242a32',
      bg: '#04060c',
    },
  ],
}

export function mount(container, opts = {}) {
  const v = threeVisual(container, opts, meta, {
    position: [0, 0, 5.5],
    lookAt: [0, 0, 0],
    fov: 42,
    cameraInteraction: false,
  })
  const { scene } = v

  scene.add(new THREE.AmbientLight(0xffffff, 0.55))
  const key = new THREE.DirectionalLight(0xffffff, 1.6)
  key.position.set(2, 3, 4)
  scene.add(key)

  const spinner = new THREE.Group()
  scene.add(spinner)

  const bodyMat = new THREE.MeshStandardMaterial({
    roughness: 0.35,
    metalness: 0.6,
  })
  // Center hub + bearing
  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.42, 0.22, 32),
    bodyMat,
  )
  hub.rotation.x = Math.PI / 2
  spinner.add(hub)
  const bearing = new THREE.Mesh(
    new THREE.TorusGeometry(0.26, 0.08, 12, 32),
    new THREE.MeshStandardMaterial({
      color: 0xc8ccd4,
      roughness: 0.2,
      metalness: 0.9,
    }),
  )
  spinner.add(bearing)

  // Three arms with LED pods at the tips.
  const ARMS = 3
  const ledMats = []
  const leds = []
  for (let i = 0; i < ARMS; i++) {
    const a = (i / ARMS) * Math.PI * 2
    const arm = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.34, 0.62, 6, 16),
      bodyMat,
    )
    arm.position.set(Math.cos(a) * 0.72, Math.sin(a) * 0.72, 0)
    arm.rotation.z = a + Math.PI / 2
    arm.scale.z = 0.4
    spinner.add(arm)

    const ledMat = new THREE.MeshStandardMaterial({
      emissiveIntensity: 2.5,
      roughness: 0.3,
    })
    ledMats.push(ledMat)
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), ledMat)
    led.position.set(Math.cos(a) * 1.06, Math.sin(a) * 1.06, 0.09)
    spinner.add(led)
    leds.push({ mesh: led, angle: a })
  }

  // Persistence-of-vision trails: rings of sprites that show where each LED
  // has recently been, which is what makes a spinning LED read as an arc.
  const TRAIL = 26
  const trailSprites = []
  const trailTex = radialTexture([
    [0, 'rgba(255,255,255,0.9)'],
    [0.4, 'rgba(255,255,255,0.4)'],
    [1, 'rgba(255,255,255,0)'],
  ])
  for (let i = 0; i < ARMS; i++) {
    const arr = []
    for (let j = 0; j < TRAIL; j++) {
      const mat = new THREE.SpriteMaterial({
        map: trailTex,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
      const sp = new THREE.Sprite(mat)
      sp.scale.set(0.3, 0.3, 1)
      scene.add(sp)
      arr.push({ sp, mat })
    }
    trailSprites.push(arr)
  }

  const ledColors = []
  v.onPalette((p) => {
    scene.background = new THREE.Color(p.bg)
    bodyMat.color.set(p.body)
    ledColors.length = 0
    p.lights.forEach((c) => ledColors.push(new THREE.Color(c)))
    ledMats.forEach((m, i) => {
      m.color.copy(ledColors[i % ledColors.length])
      m.emissive.copy(ledColors[i % ledColors.length])
    })
    trailSprites.forEach((arr, i) =>
      arr.forEach((s) => s.mat.color.copy(ledColors[i % ledColors.length])),
    )
  })

  v.addSlider('Bearing drag', 'friction', 0.04, 1, 0.02, 0.12)
  v.addAction('Brake', () => (spinSpeed = 0))
  let angle = 0
  let spinSpeed = 14
  let lastUserSpin = -20

  v.onPointer((event) => {
    if (event.type === 'drag') {
      const cx = container.clientWidth / 2
      const cy = container.clientHeight / 2
      const a0 = Math.atan2(event.y - event.dy - cy, event.x - event.dx - cx)
      const a1 = Math.atan2(event.y - cy, event.x - cx)
      let da = a1 - a0
      if (da > Math.PI) da -= Math.PI * 2
      if (da < -Math.PI) da += Math.PI * 2
      spinSpeed = THREE.MathUtils.clamp(spinSpeed + da * 22, -35, 35)
      lastUserSpin = v.state.t
    } else if (event.type === 'tap' && Math.hypot(event.nx, event.ny) < 0.25) {
      spinSpeed *= 0.28
      lastUserSpin = v.state.t
    } else if (event.type === 'doubletap') {
      spinSpeed = 14
      lastUserSpin = v.state.t
    }
  })

  v.onFrame((dt, t, state) => {
    // A flick every ~7s, then a long friction-decay coast — the real
    // rhythm of a fidget spinner.
    const cyc = t % 7
    if (state.demo && t - lastUserSpin > 9 && cyc < dt * 2)
      spinSpeed = 16 + state.intensity * 12
    spinSpeed *= Math.exp(-dt * state.friction)
    if (state.demo && t - lastUserSpin > 9) spinSpeed = Math.max(1.4, spinSpeed)
    else if (Math.abs(spinSpeed) < 0.04) spinSpeed = 0

    angle += dt * spinSpeed
    spinner.rotation.z = angle

    // Update POV trails behind each LED.
    for (let i = 0; i < ARMS; i++) {
      const base = leds[i].angle
      for (let j = 0; j < TRAIL; j++) {
        const lag =
          (j / TRAIL) *
          Math.sign(spinSpeed) *
          Math.min(1.6, Math.abs(spinSpeed) * 0.09)
        const a = angle - lag + base
        const s = trailSprites[i][j]
        s.sp.position.set(Math.cos(a) * 1.06, Math.sin(a) * 1.06, 0.09)
        // Faster spin => longer, brighter arc.
        const fade = (1 - j / TRAIL) ** 1.6
        s.mat.opacity =
          fade *
          Math.min(1, Math.abs(spinSpeed) / 12) *
          (0.35 + state.intensity * 0.5)
        s.sp.scale.setScalar(0.3 * (0.6 + fade * 0.6))
      }
      ledMats[i].emissiveIntensity = 2 + Math.sin(t * 6 + i) * 0.5
    }
  })

  return v.start()
}
