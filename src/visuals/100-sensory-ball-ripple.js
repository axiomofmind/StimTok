import { THREE, threeVisual } from '../lib/visual-kit.js'

export const meta = {
  automaticPlay: true,
  id: '100-sensory-ball-ripple',
  title: 'Squishy Sensory Ball Ripple',
  interaction: 'Poke or drag across the jelly ball to dent its surface',
  palettes: [
    {
      name: 'Jelly Teal',
      ball: '#2dd4bf',
      deep: '#0f766e',
      rim: '#99f6e4',
      bg: '#04120f',
    },
    {
      name: 'Jelly Rose',
      ball: '#f472b6',
      deep: '#9d174d',
      rim: '#fbcfe8',
      bg: '#14060e',
    },
    {
      name: 'Jelly Amber',
      ball: '#fbbf24',
      deep: '#b45309',
      rim: '#fde68a',
      bg: '#120c04',
    },
  ],
}

export function mount(container, opts = {}) {
  const v = threeVisual(container, opts, meta, {
    position: [0, 1.4, 5.2],
    lookAt: [0, 0, 0],
    fov: 42,
    shadows: true,
    cameraInteraction: false,
  })
  const { scene } = v

  scene.add(new THREE.AmbientLight(0xffffff, 0.5))
  const key = new THREE.DirectionalLight(0xffffff, 2.4)
  key.position.set(2.5, 5, 3)
  key.castShadow = true
  scene.add(key)
  const rim = new THREE.PointLight(0xffffff, 16, 0, 2)
  rim.position.set(-3, 1.5, -2.5)
  scene.add(rim)

  const table = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 14),
    new THREE.MeshStandardMaterial({ color: 0x16161c, roughness: 0.95 }),
  )
  table.rotation.x = -Math.PI / 2
  table.position.y = -1.25
  table.receiveShadow = true
  scene.add(table)

  const geo = new THREE.SphereGeometry(1.15, 96, 64)
  const base = geo.attributes.position.array.slice()
  const mat = new THREE.MeshPhysicalMaterial({
    roughness: 0.22,
    clearcoat: 0.9,
    clearcoatRoughness: 0.25,
    transmission: 0.25,
    thickness: 1.2,
    ior: 1.35,
  })
  const ball = new THREE.Mesh(geo, mat)
  ball.castShadow = true
  scene.add(ball)

  // Each "touch" launches a ripple that expands over the surface as a
  // travelling wave, decaying with distance and time — like poking jelly.
  const ripples = []
  let nextTouch = 0.8

  const vtx = new THREE.Vector3()
  const dir = new THREE.Vector3()
  const touchDir = new THREE.Vector3()
  let lastPoke = -1
  let heldDent = null
  v.addSlider('Firmness', 'firmness', 0.4, 1.8, 0.05, 1)
  v.addSlider('Ripple travel', 'waveSpeed', 1, 4, 0.1, 2.6)

  function poke(strength = 0.3) {
    const hit = v.pick()
    if (!hit || hit.object !== ball) return
    const local = ball.worldToLocal(hit.point.clone()).normalize()
    ripples.push({ dir: local, age: 0, strength })
    if (ripples.length > 9) ripples.shift()
    nextTouch = 4
  }

  v.onPointer((event) => {
    if (event.type === 'down') {
      const hit = v.pick()
      heldDent =
        hit?.object === ball
          ? ball.worldToLocal(hit.point.clone()).normalize()
          : null
      poke(0.18 + event.pressure * 0.12)
      lastPoke = v.state.t
    } else if (event.type === 'drag' && v.state.t - lastPoke > 0.08) {
      const hit = v.pick()
      heldDent =
        hit?.object === ball
          ? ball.worldToLocal(hit.point.clone()).normalize()
          : null
      poke(0.1 + Math.min(0.1, event.speed / 4000))
      lastPoke = v.state.t
    }
    if (event.type === 'up') {
      if (heldDent && !event.cancelled)
        ripples.push({ dir: heldDent.clone(), age: 0, strength: 0.22 })
      heldDent = null
    }
  })

  v.onPalette((p) => {
    scene.background = new THREE.Color(p.bg)
    mat.color.set(p.ball)
    mat.attenuationColor?.set?.(p.deep)
    rim.color.set(p.rim)
  })

  v.onFrame((dt, t, state) => {
    // Spawn a new touch somewhere on the visible surface periodically.
    nextTouch -= dt
    if (state.demo && nextTouch <= 0) {
      nextTouch = 1.6 + Math.random() * 1.8
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      ripples.push({
        dir: new THREE.Vector3(
          Math.sin(phi) * Math.cos(theta),
          Math.cos(phi) * 0.7,
          Math.sin(phi) * Math.sin(theta),
        ).normalize(),
        age: 0,
        strength: 0.16 + Math.random() * 0.12,
      })
      if (ripples.length > 5) ripples.shift()
    }
    for (let i = ripples.length - 1; i >= 0; i--) {
      ripples[i].age += dt
      if (ripples[i].age > 3.2) ripples.splice(i, 1)
    }

    const pos = geo.attributes.position
    for (let i = 0; i < pos.count; i++) {
      vtx.set(base[i * 3], base[i * 3 + 1], base[i * 3 + 2])
      dir.copy(vtx).normalize()

      // Base jiggle: a soft breathing wobble so it always feels alive.
      let disp = Math.sin(dir.y * 3 + t * 1.6) * 0.008
      if (heldDent)
        disp -=
          (Math.exp(
            -Math.pow(
              Math.acos(THREE.MathUtils.clamp(dir.dot(heldDent), -1, 1)),
              2,
            ) * 14,
          ) *
            0.16) /
          state.firmness

      // Ripple contributions.
      for (const rp of ripples) {
        touchDir.copy(rp.dir)
        // Angular distance from the touch point (0 at the poke, PI opposite).
        const cosA = Math.min(1, Math.max(-1, dir.dot(touchDir)))
        const ang = Math.acos(cosA)
        // Wavefront travels outward from the touch point.
        const speed = state.waveSpeed
        const front = rp.age * speed
        const d = ang - front
        // Damped sine packet centered on the wavefront.
        const envelope = Math.exp(-d * d * 7) * Math.exp(-rp.age * 1.3)
        disp += Math.sin(d * 9) * envelope * rp.strength
        // The initial dent right at the touch point.
        const dent = Math.exp(-ang * ang * 12) * Math.exp(-rp.age * 4.5)
        disp -= dent * rp.strength * 1.5
      }

      const s = 1 + Math.tanh((disp / state.firmness) * 3) * 0.23
      pos.setXYZ(i, vtx.x * s, vtx.y * s, vtx.z * s)
    }
    pos.needsUpdate = true
    geo.computeVertexNormals()

    if (!v.pointer.down && state.demo) ball.rotation.y += dt * 0.08
    ball.position.y = 0.05 + Math.sin(t * 0.9) * 0.03
    key.intensity = 1.3 + state.intensity * 0.7
  })

  return v.start()
}
