import { THREE, threeVisual } from '../lib/visual-kit.js'

export const meta = {
  id: '093-liquid-motion-timer',
  title: 'Liquid Motion Timer',
  interaction: 'Flick vertically to flip the timer · tap a bead to dislodge it',
  palettes: [
    {
      name: 'Blue Drop',
      drop: '#2e8aff',
      fluid: '#d8ecff',
      glass: '#a8c8e8',
      bg: '#0a0e16',
    },
    {
      name: 'Pink Drop',
      drop: '#ff4d9d',
      fluid: '#ffe0ee',
      glass: '#e8b8d0',
      bg: '#160a10',
    },
    {
      name: 'Amber Drop',
      drop: '#ff9d2e',
      fluid: '#fff0d8',
      glass: '#e8d0a8',
      bg: '#140e06',
    },
  ],
}

export function mount(container, opts = {}) {
  const v = threeVisual(container, opts, meta, {
    position: [0, 0, 7],
    lookAt: [0, 0, 0],
    fov: 45,
  })
  const { scene } = v

  scene.add(new THREE.AmbientLight(0xffffff, 0.7))
  const key = new THREE.DirectionalLight(0xffffff, 2.2)
  key.position.set(2, 4, 5)
  scene.add(key)
  const back = new THREE.PointLight(0xffffff, 14, 0, 2)
  back.position.set(-3, 0, -3)
  scene.add(back)

  const timer = new THREE.Group()
  scene.add(timer)

  // The timer housing: a flat glass cell with a stepped cascade inside.
  const glassMat = new THREE.MeshPhysicalMaterial({
    transparent: true,
    opacity: 0.08,
    roughness: 0.05,
    transmission: 0.6,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
  const shell = new THREE.Mesh(new THREE.BoxGeometry(2.6, 4.6, 0.7), glassMat)
  shell.userData.noInteraction = true
  timer.add(shell)

  const fluidMat = new THREE.MeshPhysicalMaterial({
    transparent: true,
    opacity: 0.07,
    roughness: 0.1,
    depthWrite: false,
  })
  const fluid = new THREE.Mesh(new THREE.BoxGeometry(2.5, 4.5, 0.62), fluidMat)
  fluid.userData.noInteraction = true
  timer.add(fluid)

  // Cascade shelves the drops fall onto, alternating sides.
  const shelfMat = new THREE.MeshStandardMaterial({
    roughness: 0.35,
    metalness: 0.2,
    transparent: true,
    opacity: 0.55,
  })
  const SHELVES = 5
  const shelves = []
  for (let i = 0; i < SHELVES; i++) {
    const y = 1.55 - i * 0.75
    const side = i % 2 === 0 ? 1 : -1
    const shelf = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.07, 0.55),
      shelfMat,
    )
    shelf.position.set(side * 0.42, y, 0)
    shelf.rotation.z = -side * 0.12
    shelf.userData.noInteraction = true
    timer.add(shelf)
    shelves.push({ y, side, edgeX: side * (0.42 - side * 0.75) })
  }

  // Drops: squashed spheres that fall, splat on a shelf, roll off the edge,
  // and fall again — the signature liquid-timer cascade.
  const DROPS = 14
  const dropMat = new THREE.MeshPhysicalMaterial({
    roughness: 0.12,
    metalness: 0.05,
    clearcoat: 1,
  })
  const drops = []
  for (let i = 0; i < DROPS; i++) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.15, 20, 14), dropMat)
    timer.add(mesh)
    drops.push({
      mesh,
      x: (Math.random() - 0.5) * 0.6,
      y: 2.1 - Math.random() * 0.6,
      vy: 0,
      vx: 0,
      shelfIdx: -1,
      rolling: 0,
      size: 0.7 + Math.random() * 0.65,
      delay: Math.random() * 6,
    })
  }

  v.onPalette((p) => {
    scene.background = new THREE.Color(p.bg)
    dropMat.color.set(p.drop)
    fluidMat.color.set(p.fluid)
    glassMat.color.set(p.glass)
    shelfMat.color.set(p.glass)
  })

  const GRAV = -1.15 // slow because of the viscous fluid
  const DRAG = 0.985
  let targetRotation = 0

  function flipTimer() {
    targetRotation += Math.PI
    for (const d of drops) {
      d.rolling = 0
      d.shelfIdx = -1
      d.vy *= 0.25
      d.vx += (Math.random() - 0.5) * 0.7
    }
  }

  function resetTimer() {
    targetRotation = Math.PI
    timer.rotation.z = Math.PI
    drops.forEach((d, index) => {
      d.x = (Math.random() - 0.5) * 0.6
      d.y = -2.08 + Math.random() * 0.48
      d.vx = d.vy = 0
      d.shelfIdx = -1
      d.rolling = 0
      d.delay = index * 0.13 + Math.random() * 0.3
      d.mesh.visible = false
    })
  }

  v.addAction('Flip timer', flipTimer)
  v.addSlider('Fluid drag', 'fluidDrag', 0.4, 3, 0.1, 1.2)
  v.onReset(resetTimer)
  resetTimer()

  v.onPointer((event) => {
    if (
      event.type === 'fling' &&
      Math.abs(event.vy) > 250 &&
      Math.abs(event.vy) > Math.abs(event.vx) * 0.7
    )
      flipTimer()
    if (event.type === 'doubletap') flipTimer()
    if (event.type === 'down' || event.type === 'drag') {
      const hit = v.pick()
      const d = hit && drops.find((item) => item.mesh === hit.object)
      if (d) {
        d.rolling = 0
        d.shelfIdx = -1
        if (event.type === 'down') {
          d.vx += (d.x > 0 ? -1 : 1) * 0.5
          d.vy += 0.35
        }
        const worldX = (event.vx / Math.max(1, container.clientWidth)) * 1.6
        const worldY = (-event.vy / Math.max(1, container.clientHeight)) * 1.6
        const cs = Math.cos(timer.rotation.z)
        const sn = Math.sin(timer.rotation.z)
        d.vx += worldX * cs + worldY * sn
        d.vy += -worldX * sn + worldY * cs
      }
    }
  })

  v.onFrame((dt, t, state) => {
    const steps = Math.max(1, Math.ceil(dt * 120)),
      h = dt / steps
    for (let step = 0; step < steps; step++) {
      timer.rotation.z +=
        (targetRotation - timer.rotation.z) * (1 - Math.exp(-h * 7))
      const gy = GRAV * Math.cos(timer.rotation.z),
        gx = GRAV * Math.sin(timer.rotation.z)
      for (const d of drops) {
        if (d.delay > 0) {
          d.delay -= h
          d.mesh.visible = false
          continue
        }
        d.mesh.visible = true
        const radius = 0.15 * d.size,
          oldX = d.x,
          oldY = d.y
        d.vx += gx * h
        d.vy += gy * h
        const damp = Math.exp(-h * state.fluidDrag)
        d.vx *= damp
        d.vy *= damp
        d.x += d.vx * h
        d.y += d.vy * h
        d.rolling = 0
        for (const shelf of shelves) {
          const slope = Math.tan(-shelf.side * 0.12),
            cx = shelf.side * 0.42
          const oldDist = oldY - (shelf.y + (oldX - cx) * slope)
          const dist = d.y - (shelf.y + (d.x - cx) * slope)
          if (Math.abs(d.x - cx) < 0.75 + radius * 0.25) {
            const face = oldDist >= 0 ? 1 : -1
            if (Math.abs(dist) < radius + 0.04 || oldDist * dist < 0) {
              d.y = shelf.y + (d.x - cx) * slope + face * (radius + 0.04)
              // Project velocity and gravity onto the actual tilted shelf.
              const tangent = (d.vx + d.vy * slope) / (1 + slope * slope)
              d.vx = tangent + ((gx + gy * slope) / (1 + slope * slope)) * h
              d.vy = d.vx * slope
              d.rolling = 1
            }
          }
        }
        const wall = 1.23 - radius
        if (Math.abs(d.x) > wall) {
          d.x = Math.sign(d.x) * wall
          d.vx *= -0.15
        }
        const floor = 2.21 - radius
        if (Math.abs(d.y) > floor) {
          d.y = Math.sign(d.y) * floor
          d.vy *= -0.08
          d.vx *= Math.exp(-h * 5)
        }
      }
      for (let i = 0; i < drops.length; i++)
        for (let j = i + 1; j < drops.length; j++) {
          const a = drops[i],
            b = drops[j]
          if (a.delay > 0 || b.delay > 0) continue
          const dx = b.x - a.x,
            dy = b.y - a.y,
            dist = Math.hypot(dx, dy),
            minimum = 0.14 * (a.size + b.size)
          if (dist < minimum && dist > 0.0001) {
            const correction = (minimum - dist) * 0.5
            a.x -= (dx / dist) * correction
            a.y -= (dy / dist) * correction
            b.x += (dx / dist) * correction
            b.y += (dy / dist) * correction
          }
        }
    }
    for (const d of drops) {
      d.mesh.position.set(d.x, d.y, 0)
      const stretch = 1 + Math.min(0.25, Math.abs(d.vy) * 0.18)
      d.mesh.scale.set(
        d.size / Math.sqrt(stretch),
        d.size * stretch,
        d.size / Math.sqrt(stretch),
      )
    }
    back.intensity = 5 + state.intensity * 6
  })
  return v.start()
}
