import { THREE, threeVisual, radialTexture } from '../lib/visual-kit.js'

export const meta = {
  automaticPlay: true,
  id: '098-glitter-wand-tumble',
  title: 'Glitter Wand Slow Tumble',
  interaction:
    'Drag the wand tip around center · it follows your hand and glitter falls downhill',
  palettes: [
    {
      name: 'Unicorn',
      glitter: ['#ff8ad0', '#8ad0ff', '#ffe88a', '#c8a0ff'],
      liquid: '#2a1a3a',
      bg: '#0a0612',
    },
    {
      name: 'Gold Wand',
      glitter: ['#ffd873', '#fff2c0', '#e8a838', '#ffe8a0'],
      liquid: '#2a2010',
      bg: '#0c0906',
    },
    {
      name: 'Ocean Wand',
      glitter: ['#7df9ff', '#a0ffd8', '#c8e8ff', '#5fd8e8'],
      liquid: '#0a2a3a',
      bg: '#040c12',
    },
  ],
}

export function mount(container, opts = {}) {
  const v = threeVisual(container, opts, meta, {
    position: [0, 0, 7],
    lookAt: [0, 0, 0],
    fov: 44,
  })
  const { scene } = v

  scene.add(new THREE.AmbientLight(0xffffff, 0.5))
  const key = new THREE.PointLight(0xffffff, 26, 0, 2)
  key.position.set(2.5, 3, 4)
  scene.add(key)

  // The wand: a sealed glass tube that slowly tumbles end over end.
  const wand = new THREE.Group()
  wand.rotation.z = 0.5
  scene.add(wand)

  const LEN = 4.6
  const R = 0.42

  const liquidMat = new THREE.MeshPhysicalMaterial({
    transparent: true,
    opacity: 0.17,
    roughness: 0.06,
    transmission: 0.5,
    depthWrite: false,
  })
  const liquid = new THREE.Mesh(
    new THREE.CylinderGeometry(R * 0.93, R * 0.93, LEN, 28, 1, true),
    liquidMat,
  )
  wand.add(liquid)

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.12,
    roughness: 0.02,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
  wand.add(
    new THREE.Mesh(
      new THREE.CylinderGeometry(R, R, LEN, 28, 1, true),
      glassMat,
    ),
  )

  const capMat = new THREE.MeshStandardMaterial({
    color: 0xc8ccd4,
    roughness: 0.25,
    metalness: 0.85,
  })
  for (const s of [-1, 1]) {
    const capMesh = new THREE.Mesh(
      new THREE.SphereGeometry(
        R * 1.04,
        20,
        12,
        0,
        Math.PI * 2,
        0,
        Math.PI / 2,
      ),
      capMat,
    )
    capMesh.position.y = (s * LEN) / 2
    capMesh.rotation.x = s > 0 ? 0 : Math.PI
    wand.add(capMesh)
  }

  // Glitter flakes suspended in viscous liquid, settling toward whichever
  // end is currently "down" in the wand's own frame.
  const COUNT = 900
  const pos = new Float32Array(COUNT * 3)
  const col = new Float32Array(COUNT * 3)
  const flakes = []
  for (let i = 0; i < COUNT; i++) {
    const a = Math.random() * Math.PI * 2
    const r = Math.sqrt(Math.random()) * R * 0.85
    flakes.push({
      x: Math.cos(a) * r,
      z: Math.sin(a) * r,
      y: (Math.random() - 0.5) * LEN * 0.9,
      vy: 0,
      vx: 0,
      vz: 0,
      settle: 0.12 + Math.random() * 0.3,
      spin: 3 + Math.random() * 10,
      phase: Math.random() * 6.28,
      colorIdx: Math.floor(Math.random() * 4),
      swirl: (Math.random() - 0.5) * 0.6,
    })
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3))
  const mat = new THREE.PointsMaterial({
    map: radialTexture([
      [0, 'rgba(255,255,255,1)'],
      [0.35, 'rgba(255,255,255,0.5)'],
      [1, 'rgba(255,255,255,0)'],
    ]),
    size: 0.075,
    vertexColors: true,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  const points = new THREE.Points(geo, mat)
  wand.add(points)

  const colors = []
  v.onPalette((p) => {
    scene.background = new THREE.Color(p.bg)
    liquidMat.color.set(p.liquid)
    colors.length = 0
    p.glitter.forEach((c) => colors.push(new THREE.Color(c)))
  })

  let targetZ = wand.rotation.z
  let targetX = 0
  let angularZ = 0.22
  let angularX = 0.04
  let grabbed = false
  let touchedAt = -20
  let grabAngleOffset = 0
  const gravity = new THREE.Vector3(),
    inverse = new THREE.Quaternion()
  v.addSlider('Viscosity', 'viscosity', 0.3, 3, 0.1, 1.1)
  v.addAction('Shake', () => {
    for (const f of flakes) {
      f.vx += (Math.random() - 0.5) * 2
      f.vy += (Math.random() - 0.5) * 3
      f.vz += (Math.random() - 0.5) * 2
    }
  })
  let previousTargetZ = targetZ
  let previousEventTime = performance.now()
  v.onPointer((event) => {
    if (event.type === 'down') {
      grabbed = true
      targetZ = wand.rotation.z
      grabAngleOffset =
        wand.rotation.z +
        Math.atan2(
          event.x - container.clientWidth * 0.5,
          container.clientHeight * 0.5 - event.y,
        )
      previousTargetZ = targetZ
      previousEventTime = event.originalEvent.timeStamp
    }
    if (event.type === 'down' || event.type === 'drag') {
      const sx = event.x - container.clientWidth * 0.5
      const sy = container.clientHeight * 0.5 - event.y
      if (Math.hypot(sx, sy) > 12) {
        let desired = -Math.atan2(sx, sy) + grabAngleOffset
        while (desired - targetZ > Math.PI) desired -= Math.PI * 2
        while (desired - targetZ < -Math.PI) desired += Math.PI * 2
        const eventDt = Math.max(
          (event.originalEvent.timeStamp - previousEventTime) / 1000,
          1 / 120,
        )
        angularZ = THREE.MathUtils.clamp(
          ((desired - previousTargetZ) / eventDt) * 0.35,
          -5,
          5,
        )
        previousTargetZ = desired
        targetZ = desired
        previousEventTime = event.originalEvent.timeStamp
      }
      targetX = THREE.MathUtils.clamp(event.ny * 0.42, -0.42, 0.42)
      touchedAt = v.state.t
    }
    if (event.type === 'fling' || event.type === 'up') {
      grabbed = false
      for (const f of flakes)
        f.vy += (Math.random() - 0.5) * Math.min(2, event.speed / 700)
    }
    if (event.type === 'doubletap') {
      angularZ += 3.5
      for (const f of flakes) f.vy += (Math.random() - 0.5) * 2.4
    }
  })

  v.onFrame((dt, t, state) => {
    if (grabbed) {
      wand.rotation.z += (targetZ - wand.rotation.z) * Math.min(1, dt * 12)
      wand.rotation.x += (targetX - wand.rotation.x) * Math.min(1, dt * 12)
    } else {
      const idle = state.demo && t - touchedAt > 5
      if (idle) {
        angularZ += (0.22 - angularZ) * dt * 0.5
        angularX += (0.04 - angularX) * dt * 0.5
      }
      wand.rotation.z += dt * angularZ
      wand.rotation.x += dt * angularX
      angularZ *= Math.exp(-dt * (idle ? 0.02 : 0.55))
      angularX *= Math.exp(-dt * (idle ? 0.02 : 0.55))
    }

    // Gravity direction expressed in the wand's local frame: as the wand
    // rotates, the flakes cascade from one end to the other.
    wand.updateMatrixWorld()
    inverse.copy(wand.quaternion).invert()
    gravity.set(0, -1.2, 0).applyQuaternion(inverse)
    const posAttr = geo.attributes.position

    for (let i = 0; i < COUNT; i++) {
      const f = flakes[i]
      // Viscous settling: terminal velocity reached almost immediately.
      f.vx += gravity.x * f.settle * dt * 2.4
      f.vy += gravity.y * f.settle * dt * 2.4
      f.vz += gravity.z * f.settle * dt * 2.4
      const drag = Math.exp(-dt * state.viscosity * 2)
      f.vx *= drag
      f.vy *= drag
      f.vz *= drag
      f.x += f.vx * dt
      f.y += f.vy * dt
      f.z += f.vz * dt
      const radial = Math.hypot(f.x, f.z)
      if (radial > R * 0.86) {
        f.x *= (R * 0.86) / radial
        f.z *= (R * 0.86) / radial
        f.vx *= -0.1
        f.vz *= -0.1
      }

      // Gentle swirl so the cascade isn't a straight fall.
      const a = Math.atan2(f.z, f.x) + f.swirl * dt * 0.5
      const r = Math.hypot(f.x, f.z)
      f.x = Math.cos(a) * r
      f.z = Math.sin(a) * r

      const limit = LEN / 2 - 0.12
      if (f.y > limit) {
        f.y = limit
        f.vy *= -0.15
      }
      if (f.y < -limit) {
        f.y = -limit
        f.vy *= -0.15
      }
      posAttr.setXYZ(i, f.x, f.y, f.z)

      // Sharp specular flash as each flat flake catches the light.
      const flash = Math.pow(Math.max(0, Math.sin(t * f.spin + f.phase)), 20)
      const b = (0.3 + flash * 0.6) * (0.5 + state.intensity * 0.8)
      const c = colors[f.colorIdx] || colors[0]
      if (c) {
        col[i * 3] = c.r * b
        col[i * 3 + 1] = c.g * b
        col[i * 3 + 2] = c.b * b
      }
    }
    posAttr.needsUpdate = true
    geo.attributes.color.needsUpdate = true
    mat.size = 0.055 + state.intensity * 0.045
  })

  return v.start()
}
