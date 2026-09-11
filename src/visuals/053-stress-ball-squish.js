import { THREE, threeVisual } from '../lib/visual-kit.js'

export const meta = {
  automaticPlay: true,
  id: '053-stress-ball-squish',
  title: 'Squishy Stress-Ball Compression',
  interaction: 'Press anywhere on the ball to dent it · drag harder to squeeze',
  palettes: [
    { name: 'Coral Foam', ball: '#ff7a6a', deep: '#c24a3e', bg: '#141018' },
    { name: 'Sky Foam', ball: '#6ab8ff', deep: '#3e7ac2', bg: '#0e1218' },
    { name: 'Lime Foam', ball: '#a8e05f', deep: '#6aa02e', bg: '#101408' },
  ],
}

export function mount(container, opts = {}) {
  const v = threeVisual(container, opts, meta, {
    position: [0, 0.6, 5],
    lookAt: [0, 0, 0],
    fov: 42,
    shadows: true,
  })
  const { scene } = v

  scene.add(new THREE.AmbientLight(0xffffff, 0.55))
  const key = new THREE.DirectionalLight(0xffffff, 2.2)
  key.position.set(2, 4, 3)
  key.castShadow = true
  scene.add(key)
  const rim = new THREE.PointLight(0xffffff, 12, 0, 2)
  rim.position.set(-3, 1, -2)
  scene.add(rim)

  const table = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 12),
    new THREE.MeshStandardMaterial({ color: 0x1c1a22, roughness: 0.9 }),
  )
  table.rotation.x = -Math.PI / 2
  table.position.y = -1.35
  table.receiveShadow = true
  table.userData.noInteraction = true
  scene.add(table)

  const geo = new THREE.SphereGeometry(1.1, 64, 48)
  const base = geo.attributes.position.array.slice()
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.92 })
  const ball = new THREE.Mesh(geo, mat)
  ball.castShadow = true
  scene.add(ball)

  // Finger dent positions (top grip pattern)
  const fingers = [
    new THREE.Vector3(0.35, 0.85, 0.45),
    new THREE.Vector3(-0.25, 0.9, 0.5),
    new THREE.Vector3(0.7, 0.6, -0.1),
    new THREE.Vector3(-0.65, 0.65, -0.15),
    new THREE.Vector3(0.05, 0.55, -0.85), // thumb
  ].map((p) => p.normalize())

  const vtx = new THREE.Vector3()
  const dynamicDent = new THREE.Vector3(0, 0.8, 0.55).normalize()
  v.addSlider('Firmness', 'firmness', 0.5, 2, 0.05, 1)
  v.addSlider('Recovery', 'recovery', 0.4, 4, 0.1, 1.2)
  let grip = 0
  let gripTarget = 0
  v.onPointer((event) => {
    if (event.type === 'down' || event.type === 'drag') {
      const hit = v.pick()
      if (hit?.object !== ball) return
      dynamicDent.copy(ball.worldToLocal(hit.point.clone())).normalize()
      gripTarget = THREE.MathUtils.clamp(
        0.72 + (event.pressure || 0.5) * 0.4 + event.speed / 1400,
        0,
        1,
      )
    }
    if (event.type === 'fling' || event.type === 'up') gripTarget = 0
    if (event.type === 'doubletap') grip = gripTarget = 0
  })

  v.onPalette((p) => {
    scene.background = new THREE.Color(p.bg)
    mat.color.set(p.ball)
  })

  v.onFrame((dt, t, state) => {
    grip +=
      (gripTarget - grip) *
      Math.min(1, dt * (gripTarget > grip ? 9 : state.recovery))

    const squeeze = Math.min(1, grip / Math.sqrt(state.firmness))
    const pos = geo.attributes.position
    let bottom = Infinity
    for (let i = 0; i < pos.count; i++) {
      vtx.set(base[i * 3], base[i * 3 + 1], base[i * 3 + 2])
      const dir = vtx.clone().normalize()
      // Opposing fingers pinch the waist inward; displaced foam rises and
      // bulges toward the viewer instead of simply flattening onto the table.
      const waist = Math.exp(-Math.pow(dir.y * 1.55, 2))
      const x = vtx.x * (1 - squeeze * (0.22 + waist * 0.46))
      const y = vtx.y * (1 + squeeze * 0.18)
      const z = vtx.z * (1 + squeeze * 0.28)
      // Finger dents: gaussian depressions along each finger direction
      let dent = 0
      const angular = Math.acos(
        THREE.MathUtils.clamp(dir.dot(dynamicDent), -1, 1),
      )
      dent = Math.exp(-angular * angular * 5.0) * squeeze * 0.7
      const dentScale = 1 - Math.min(0.65, dent)
      pos.setXYZ(i, x * dentScale, y * dentScale, z * dentScale)
      bottom = Math.min(bottom, y * dentScale)
    }
    pos.needsUpdate = true
    geo.computeVertexNormals()

    ball.position.y = -1.35 - bottom
    geo.computeBoundingSphere()
    if (state.demo && !v.pointer.down) ball.rotation.y = Math.sin(t * 0.3) * 0.2
    key.intensity = 1.6 + state.intensity * 1.2
  })

  return v.start()
}
