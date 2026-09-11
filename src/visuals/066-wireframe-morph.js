import { THREE, threeVisual } from '../lib/visual-kit.js'

export const meta = {
  automaticPlay: true,
  id: '066-wireframe-morph',
  title: 'Wireframe Polyhedron Morph',
  interaction:
    'Rotate: drag a continuously morphing shape · Sculpt: pull the mesh into a shape that stays',
  palettes: [
    { name: 'Cyan Frame', wire: '#3fd8e8', glowc: '#a0f4ff', bg: '#04080c' },
    { name: 'Amber Frame', wire: '#e8b43f', glowc: '#ffe8a0', bg: '#0c0804' },
    { name: 'Magenta Frame', wire: '#e83fb8', glowc: '#ffa0e8', bg: '#0c040a' },
  ],
}

export function mount(container, opts = {}) {
  const v = threeVisual(container, opts, meta, {
    position: [0, 0, 5.5],
    lookAt: [0, 0, 0],
    fov: 45,
  })
  const { scene } = v

  const baseGeo = new THREE.IcosahedronGeometry(1.5, 3)
  const wire = new THREE.WireframeGeometry(baseGeo)
  const positions = wire.attributes.position
  const count = positions.count
  const source = new Float32Array(positions.array)
  const shapeA = new THREE.Vector3()
  const shapeB = new THREE.Vector3()
  const direction = new THREE.Vector3()

  function projected(shape, x, y, z, t, out) {
    direction.set(x, y, z).normalize()
    let radius
    switch (shape) {
      case 0:
        radius = 1.5
        break
      case 1: {
        const m = Math.max(
          Math.abs(direction.x),
          Math.abs(direction.y),
          Math.abs(direction.z),
        )
        radius = 1.35 / m
        break
      }
      case 2: {
        const m =
          Math.abs(direction.x) + Math.abs(direction.y) + Math.abs(direction.z)
        radius = 1.8 / m
        break
      }
      case 3:
        radius =
          1.28 +
          0.47 *
            Math.sin(direction.x * 6 + t) *
            Math.sin(direction.y * 6 - t) *
            Math.sin(direction.z * 6)
        break
      default: {
        const cube = Math.max(
          Math.abs(direction.x),
          Math.abs(direction.y),
          Math.abs(direction.z),
        )
        const octa =
          Math.abs(direction.x) + Math.abs(direction.y) + Math.abs(direction.z)
        radius = 1.5 / (cube * 0.5 + octa * 0.28)
      }
    }
    return out.copy(direction).multiplyScalar(radius)
  }

  const lineMat = new THREE.LineBasicMaterial({
    transparent: true,
    opacity: 0.72,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  const mesh = new THREE.LineSegments(wire, lineMat)
  scene.add(mesh)

  // Glowing vertices make each topology legible while it is between solids.
  const pointMat = new THREE.PointsMaterial({
    transparent: true,
    opacity: 0.78,
    size: 0.028,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  const points = new THREE.Points(wire, pointMat)
  scene.add(points)

  const coreMat = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0.12,
    blending: THREE.AdditiveBlending,
    wireframe: true,
  })
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.58, 2), coreMat)
  scene.add(core)

  v.onPalette((p) => {
    scene.background = new THREE.Color(p.bg)
    lineMat.color.set(p.wire)
    pointMat.color.set(p.glowc)
    coreMat.color.set(p.glowc)
  })

  let mode = 'rotate'
  const offsets = new Float32Array(source.length)
  const sculptRay = new THREE.Raycaster()
  sculptRay.params.Line.threshold = 0.12
  const dragPlane = new THREE.Plane()
  const dragPoint = new THREE.Vector3()
  const brushPoint = new THREE.Vector3()
  const delta = new THREE.Vector3()
  let sculptGrip = null
  let sculptTime = 0
  const rotateButton = v.addAction('Rotate', () => setMode('rotate'))
  const sculptButton = v.addAction('Sculpt', () => setMode('sculpt'))
  function setMode(next) {
    if (next === 'sculpt' && mode !== 'sculpt') {
      sculptTime = v.state.t
      targetMorph = morph
      v.state.twistControl = twist
      twistInput.value = String(twist)
      spinX = spinY = pulse = 0
    }
    mode = next
    sculptGrip = null
    rotateButton.setAttribute('aria-pressed', String(mode === 'rotate'))
    sculptButton.setAttribute('aria-pressed', String(mode === 'sculpt'))
  }
  v.addAction('Clear sculpt', () => offsets.fill(0))
  for (const [i, name] of [
    'Sphere',
    'Cube',
    'Octahedron',
    'Organic',
    'Crystal',
  ].entries())
    v.addAction(name, () => {
      offsets.fill(0)
      targetMorph = i
      shapeHoldUntil = v.state.t + 3
      lastInput = v.state.t
    })
  const twistInput = v.addSlider('Twist', 'twistControl', -2, 2, 0.05, 0)
  const shapeCount = 5
  let morph = 0
  let targetMorph = 0
  let twist = 0
  let targetTwist = 0
  let spinX = 0.1
  let spinY = 0.28
  let pulse = 0
  let lastInput = -99
  let shapeHoldUntil = 0
  setMode('rotate')

  v.onReset(() => {
    offsets.fill(0)
    morph = targetMorph = twist = targetTwist = 0
    v.state.twistControl = 0
    twistInput.value = '0'
    mesh.rotation.set(0, 0, 0)
    spinX = 0.1
    spinY = 0.28
    setMode('rotate')
  })

  v.onPointer((event) => {
    if (mode === 'sculpt') {
      sculptRay.setFromCamera(new THREE.Vector2(event.nx, event.ny), v.camera)
      if (event.type === 'down') {
        mesh.updateMatrixWorld(true)
        const hit = sculptRay.intersectObject(mesh)[0]
        if (hit) {
          dragPlane.setFromNormalAndCoplanarPoint(v.camera.getWorldDirection(delta), hit.point)
          sculptGrip = mesh.worldToLocal(hit.point.clone())
        }
      }
      if (event.type === 'drag' && sculptGrip && sculptRay.ray.intersectPlane(dragPlane, dragPoint)) {
        mesh.worldToLocal(dragPoint)
        delta.copy(dragPoint).sub(sculptGrip)
        // Store local displacements, including duplicated wire endpoints,
        // so strokes remain connected and survive release or mode changes.
        for (let i = 0; i < count; i++) {
          brushPoint.fromBufferAttribute(positions, i)
          const weight = Math.exp(-brushPoint.distanceToSquared(sculptGrip) / 0.64)
          brushPoint.fromArray(offsets, i * 3).addScaledVector(delta, weight)
          brushPoint.clampLength(0, 2.5).toArray(offsets, i * 3)
        }
        sculptGrip.copy(dragPoint)
      }
      if (event.type === 'up') sculptGrip = null
      return
    }
    if (event.type === 'down' || event.type === 'drag') {
      lastInput = v.state.t
      if (event.type === 'drag') {
        spinY = (event.vx / Math.max(1, container.clientWidth)) * 1.35
        spinX = (event.vy / Math.max(1, container.clientHeight)) * 0.9
      }
    } else if (event.type === 'tap') {
      // Shape changes use explicit detents, not a second action on pointer-up.
      pulse = 1
      lastInput = v.state.t
    } else if (event.type === 'fling') {
      spinY += (event.vx / Math.max(1, container.clientWidth)) * 0.75
      spinX += (event.vy / Math.max(1, container.clientHeight)) * 0.5
      pulse = Math.min(1, pulse + event.speed / 1600)
      lastInput = v.state.t
    } else if (event.type === 'doubletap') {
      targetMorph = 0
      targetTwist = 0
      spinX = 0.1
      spinY = 0.28
      lastInput = v.state.t
    }
  })

  v.onFrame((dt, t, state) => {
    // Rotation and morphing run together. Sculpt freezes the underlying form.
    if (mode === 'rotate' && t >= shapeHoldUntil) {
      targetMorph = (Math.sin(t * 0.32) * 0.5 + 0.5) * (shapeCount - 1)
      targetTwist = Math.sin(t * 0.21) * 0.38
    }
    if (!(mode === 'rotate' && t >= shapeHoldUntil))
      targetTwist = state.twistControl
    morph += (targetMorph - morph) * (1 - Math.exp(-dt * 7))
    twist += (targetTwist - twist) * (1 - Math.exp(-dt * 6))
    pulse *= Math.exp(-dt * 2.8)

    const lower = Math.floor(morph)
    const upper = Math.min(shapeCount - 1, lower + 1)
    let blend = morph - lower
    blend = blend * blend * (3 - 2 * blend)

    for (let i = 0; i < count; i++) {
      const x = source[i * 3]
      const y = source[i * 3 + 1]
      const z = source[i * 3 + 2]
      projected(lower, x, y, z, mode === 'sculpt' ? sculptTime : t, shapeA)
      projected(upper, x, y, z, mode === 'sculpt' ? sculptTime : t, shapeB)
      shapeA.lerp(shapeB, blend)

      // Vertical dragging torsions the cage layer-by-layer.
      const localTwist = twist * (shapeA.y / 1.7)
      const cs = Math.cos(localTwist)
      const sn = Math.sin(localTwist)
      const tx = shapeA.x * cs - shapeA.z * sn
      const tz = shapeA.x * sn + shapeA.z * cs
      shapeA.x = tx
      shapeA.z = tz

      shapeA.x += offsets[i * 3]
      shapeA.y += offsets[i * 3 + 1]
      shapeA.z += offsets[i * 3 + 2]
      shapeA.multiplyScalar(1 + pulse * 0.08)
      positions.setXYZ(i, shapeA.x, shapeA.y, shapeA.z)
    }
    positions.needsUpdate = true
    wire.computeBoundingSphere()

    if (mode === 'rotate') {
      mesh.rotation.y += spinY * dt
      mesh.rotation.x += spinX * dt
    }
    spinY += ((state.demo ? 0.22 : 0) - spinY) * (1 - Math.exp(-dt * 0.75))
    spinX *= Math.exp(-dt * 0.72)
    points.rotation.copy(mesh.rotation)
    core.rotation.copy(mesh.rotation)
    lineMat.opacity = 0.3 + state.intensity * 0.22 + pulse * 0.12
    pointMat.opacity = 0.48 + state.intensity * 0.2
    pointMat.size = 0.021 + state.intensity * 0.008 + pulse * 0.018
    core.scale.setScalar(1 + Math.sin(t * 1.35) * 0.12 + pulse * 0.45)
  })

  return v.start()
}
