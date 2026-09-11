import { THREE, threeVisual, radialTexture } from '../lib/visual-kit.js'

export const meta = {
  id: '060-glitter-snowglobe',
  title: 'Glitter Snow-Globe Swirl',
  interaction:
    'Shake to wake the blizzard · tap the glass for a sparkling gust',
  palettes: [
    {
      name: 'Silver Winter',
      glitter: '#ffffff',
      accent: '#a8d0ff',
      base: '#5c3a24',
      bg: '#0c0e16',
    },
    {
      name: 'Gold Dust',
      glitter: '#ffd873',
      accent: '#ffedc0',
      base: '#3a2418',
      bg: '#12100a',
    },
    {
      name: 'Rose Sparkle',
      glitter: '#ffb8d8',
      accent: '#ffe0ec',
      base: '#442838',
      bg: '#140a10',
    },
  ],
}

export function mount(container, opts = {}) {
  const v = threeVisual(container, opts, meta, {
    position: [0, 0.6, 6],
    lookAt: [0, 0.3, 0],
    fov: 42,
  })
  const { scene } = v

  scene.add(new THREE.AmbientLight(0xffffff, 0.6))
  scene.add(new THREE.HemisphereLight(0xcde6ff, 0x241912, 0.9))
  const key = new THREE.PointLight(0xffffff, 30, 0, 2)
  key.position.set(2.5, 4, 3)
  scene.add(key)
  const villageLight = new THREE.PointLight(0xffc66d, 9, 4, 2)
  villageLight.position.set(-0.25, 0.05, 0.7)
  scene.add(villageLight)

  const R = 1.6

  // Glass sphere
  const glass = new THREE.Mesh(
    new THREE.SphereGeometry(R, 48, 32),
    new THREE.MeshPhysicalMaterial({
      color: 0xeaf7ff,
      transparent: true,
      opacity: 0.16,
      roughness: 0.015,
      transmission: 0.86,
      thickness: 0.18,
      ior: 1.46,
      clearcoat: 1,
      clearcoatRoughness: 0.02,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  )
  glass.position.y = 0.5
  glass.userData.noInteraction = true
  scene.add(glass)

  // A hand-built reflection arc gives the glass a readable curved surface,
  // even against the darkest palette.
  const reflectionPoints = []
  for (let i = 0; i <= 18; i++) {
    const localY = -1.03 + (i / 18) * 2.12
    const ringRadius = Math.sqrt(Math.max(0, R * R - localY * localY)) * 0.985
    reflectionPoints.push(
      new THREE.Vector3(-ringRadius * 0.72, localY + 0.5, ringRadius * 0.69),
    )
  }
  const reflection = new THREE.Mesh(
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(reflectionPoints),
      48,
      0.016,
      6,
      false,
    ),
    new THREE.MeshBasicMaterial({
      color: 0xeaf8ff,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  )
  reflection.userData.noInteraction = true
  scene.add(reflection)

  // Base
  const baseMat = new THREE.MeshStandardMaterial({ roughness: 0.55 })
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(1.15, 1.35, 0.8, 32),
    baseMat,
  )
  base.position.y = -1.1
  scene.add(base)
  const trimMat = new THREE.MeshStandardMaterial({
    color: 0xd2a95c,
    roughness: 0.26,
    metalness: 0.72,
  })
  const collar = new THREE.Mesh(
    new THREE.TorusGeometry(1.18, 0.075, 10, 48),
    trimMat,
  )
  collar.rotation.x = Math.PI / 2
  collar.position.y = -0.72
  scene.add(collar)
  const foot = new THREE.Mesh(
    new THREE.CylinderGeometry(1.47, 1.55, 0.18, 40),
    baseMat,
  )
  foot.position.y = -1.55
  scene.add(foot)
  const footTrim = new THREE.Mesh(
    new THREE.TorusGeometry(1.49, 0.055, 8, 48),
    trimMat,
  )
  footTrim.rotation.x = Math.PI / 2
  footTrim.position.y = -1.48
  scene.add(footTrim)
  const plaque = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.24, 0.06),
    new THREE.MeshStandardMaterial({
      color: 0x5a321d,
      roughness: 0.4,
      metalness: 0.15,
    }),
  )
  plaque.position.set(0, -1.12, 1.31)
  scene.add(plaque)

  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(7, 64),
    new THREE.MeshStandardMaterial({ color: 0x07090f, roughness: 0.94 }),
  )
  ground.rotation.x = -Math.PI / 2
  ground.position.y = -1.65
  scene.add(ground)

  // Little scene inside: snowy mound, house, tree
  const mound = new THREE.Mesh(
    new THREE.SphereGeometry(1.05, 24, 12),
    new THREE.MeshStandardMaterial({ color: 0xf0f4f8, roughness: 0.9 }),
  )
  mound.scale.y = 0.35
  mound.position.y = -0.55
  scene.add(mound)
  const house = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.32, 0.35),
    new THREE.MeshStandardMaterial({ color: 0x8a4a3a, roughness: 0.8 }),
  )
  house.position.set(-0.3, -0.15, 0)
  scene.add(house)
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(0.34, 0.25, 4),
    new THREE.MeshStandardMaterial({ color: 0xe8e8f0, roughness: 0.8 }),
  )
  roof.position.set(-0.3, 0.13, 0)
  roof.rotation.y = Math.PI / 4
  scene.add(roof)
  const chimney = new THREE.Mesh(
    new THREE.BoxGeometry(0.085, 0.24, 0.085),
    new THREE.MeshStandardMaterial({ color: 0x64362d, roughness: 0.9 }),
  )
  chimney.position.set(-0.42, 0.19, -0.04)
  scene.add(chimney)
  const windowMat = new THREE.MeshBasicMaterial({ color: 0xffc866 })
  for (const x of [-0.39, -0.21]) {
    const window = new THREE.Mesh(
      new THREE.PlaneGeometry(0.075, 0.09),
      windowMat,
    )
    window.position.set(x, -0.12, 0.181)
    scene.add(window)
  }
  const door = new THREE.Mesh(
    new THREE.PlaneGeometry(0.09, 0.15),
    new THREE.MeshStandardMaterial({ color: 0x3b251e, roughness: 0.85 }),
  )
  door.position.set(-0.3, -0.225, 0.183)
  scene.add(door)

  const treeMat = new THREE.MeshStandardMaterial({
    color: 0x245b45,
    roughness: 0.86,
  })
  const snowMat = new THREE.MeshStandardMaterial({
    color: 0xf4f8ff,
    roughness: 0.92,
  })
  const treeData = [
    [0.47, -0.02, 0.16, 1],
    [0.76, -0.2, -0.25, 0.72],
    [-0.72, -0.24, -0.18, 0.64],
  ]
  for (const [x, y, z, scale] of treeData) {
    const tree = new THREE.Group()
    for (let tier = 0; tier < 3; tier++) {
      const crown = new THREE.Mesh(
        new THREE.ConeGeometry(0.24 * scale, 0.42 * scale, 9),
        treeMat,
      )
      crown.position.y = tier * 0.18 * scale
      tree.add(crown)
      const cap = new THREE.Mesh(
        new THREE.ConeGeometry(0.18 * scale, 0.07 * scale, 9),
        snowMat,
      )
      cap.position.y = tier * 0.18 * scale + 0.13 * scale
      tree.add(cap)
    }
    tree.position.set(x, y, z)
    scene.add(tree)
  }

  const snowman = new THREE.Group()
  const snowBody = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 18, 12),
    snowMat,
  )
  snowBody.scale.y = 0.9
  const snowHead = new THREE.Mesh(
    new THREE.SphereGeometry(0.095, 18, 12),
    snowMat,
  )
  snowHead.position.y = 0.19
  const hat = new THREE.Mesh(
    new THREE.CylinderGeometry(0.075, 0.09, 0.11, 16),
    new THREE.MeshStandardMaterial({ color: 0x18212c, roughness: 0.6 }),
  )
  hat.position.y = 0.31
  snowman.add(snowBody, snowHead, hat)
  snowman.position.set(0.12, -0.25, 0.48)
  scene.add(snowman)

  const moonGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: radialTexture([
        [0, 'rgba(255,255,235,1)'],
        [0.25, 'rgba(180,215,255,.55)'],
        [1, 'rgba(120,180,255,0)'],
      ]),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  )
  moonGlow.scale.set(0.8, 0.8, 1)
  moonGlow.position.set(0.72, 1.35, -0.65)
  scene.add(moonGlow)

  // Glitter particles inside the globe
  const COUNT = 2600
  const pos = new Float32Array(COUNT * 3)
  const col = new Float32Array(COUNT * 3)
  const parts = []
  for (let i = 0; i < COUNT; i++) {
    const a = Math.random() * Math.PI * 2
    const rr = Math.random() * R * 0.9
    const y = (Math.random() - 0.2) * R * 0.9
    parts.push({
      x: Math.cos(a) * rr * 0.8,
      y: y + 0.5,
      z: Math.sin(a) * rr * 0.8,
      vx: 0,
      vy: 0,
      vz: 0,
      phase: Math.random() * Math.PI * 2,
      settle: 0.05 + Math.random() * 0.12,
    })
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3))
  const mat = new THREE.PointsMaterial({
    map: radialTexture([
      [0, 'rgba(255,255,255,1)'],
      [1, 'rgba(255,255,255,0)'],
    ]),
    size: 0.045,
    vertexColors: true,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  scene.add(new THREE.Points(geo, mat))

  const gc = new THREE.Color()
  const ac = new THREE.Color()
  v.onPalette((p) => {
    scene.background = new THREE.Color(p.bg)
    baseMat.color.set(p.base)
    trimMat.color.set(p.accent)
    windowMat.color.set(p.accent)
    gc.set(p.glitter)
    ac.set(p.accent)
  })

  v.addAction('Shake', () => (shakeEnergy = 4))
  v.addSlider('Snowfall', 'snowfall', 0.4, 1.8, 0.1, 1)
  v.addAction('Warm windows', () =>
    windowMat.color.set(
      windowMat.color.getHex() === 0xffc866 ? 0xff7744 : 0xffc866,
    ),
  )
  let shakeEnergy = 0
  let shakeDirection = 0
  v.onPointer((event) => {
    if (event.type === 'drag' || event.type === 'fling') {
      const gesture =
        Math.abs(event.dx) / Math.max(1, container.clientWidth) +
        Math.abs(event.dy) / Math.max(1, container.clientHeight)
      shakeEnergy = Math.min(
        4,
        shakeEnergy +
          gesture * 7 +
          (event.type === 'fling' ? event.speed / 900 : 0),
      )
      shakeDirection = Math.sign(event.vx) || shakeDirection
      for (const p of parts) {
        p.vx +=
          (event.vx / Math.max(1, container.clientWidth)) *
          (0.18 + Math.random() * 0.2)
        p.vy += Math.random() * Math.min(1.5, event.speed / 650)
      }
    }
    if (event.type === 'tap') {
      shakeEnergy = Math.min(4, shakeEnergy + 1.4)
      const pointerX = event.nx * R * 0.82
      const pointerY = 0.5 + event.ny * R * 0.82
      for (const p of parts) {
        const dx = p.x - pointerX
        const dy = p.y - pointerY
        const distance = Math.max(0.12, Math.hypot(dx, dy))
        const gust = Math.max(0, 1 - distance / 1.35)
        p.vx += (-dy / distance) * gust * 1.8
        p.vy += (0.45 + dx / distance) * gust * 1.35
        p.vz += (Math.random() - 0.5) * gust
      }
    }
    if (event.type === 'doubletap') shakeEnergy = 4
  })

  v.onFrame((dt, t, state) => {
    shakeEnergy *= Math.exp(-dt * 0.85)
    const agitation = shakeEnergy * (0.65 + state.intensity * 0.55)
    const posAttr = geo.attributes.position

    for (let i = 0; i < COUNT; i++) {
      const p = parts[i]
      // Vortex around the y axis + turbulence during agitation
      const lx = p.x
      const lz = p.z
      const rr = Math.hypot(lx, lz) + 0.001
      p.vx +=
        ((-lz / rr) * agitation * 1.2 +
          Math.sin(t * 3 + p.phase) * agitation * 0.3) *
        dt
      p.vz +=
        ((lx / rr) * agitation * 1.2 +
          Math.cos(t * 2.7 + p.phase) * agitation * 0.3) *
        dt
      p.vy +=
        (agitation * 1.15 * Math.abs(Math.sin(p.phase * 3 + t)) -
          state.snowfall * (1.15 + p.settle * 1.5)) *
        dt
      // Frame-rate-independent drag: lively during a shake, decisive while settling.
      const drag = Math.exp(-dt * (agitation > 0.15 ? 0.8 : 0.65))
      p.vx *= drag
      p.vy *= drag
      p.vz *= drag
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.z += p.vz * dt

      // Contain inside the sphere (centered y=0.5)
      const cy = p.y - 0.5
      const d = Math.sqrt(p.x * p.x + cy * cy + p.z * p.z)
      const maxR = R * 0.92
      if (d > maxR) {
        const s = maxR / d
        p.x *= s
        p.z *= s
        p.y = cy * s + 0.5
        p.vx *= -0.2
        p.vy *= -0.2
        p.vz *= -0.2
      }
      // Rest across the curved mound instead of hovering in the liquid.
      const radial = Math.hypot(p.x, p.z)
      let moundFloor =
        radial < 1.02
          ? -0.52 + Math.sqrt(Math.max(0, 1 - (radial / 1.02) ** 2)) * 0.34
          : 0.5 - Math.sqrt(Math.max(0, maxR * maxR - radial * radial))
      // Coarse village surfaces catch snow without expensive mesh raycasts.
      if (Math.abs(p.x + 0.3) < 0.23 && Math.abs(p.z) < 0.2 && p.y > 0.05)
        moundFloor = Math.max(moundFloor, 0.23 - Math.abs(p.x + 0.3) * 0.35)
      for (const [tx, ty, tz, scale] of treeData) {
        const radius = Math.hypot(p.x - tx, p.z - tz)
        if (radius < 0.24 * scale && p.y > ty)
          moundFloor = Math.max(moundFloor, ty + 0.65 * scale - radius * 2)
      }
      if (p.y < moundFloor) {
        p.y = moundFloor
        p.vy = Math.max(0, p.vy * -0.08)
      }

      posAttr.setXYZ(i, p.x, p.y, p.z)
      // Twinkle: flash between glitter color and accent
      const tw =
        0.4 + 0.6 * Math.pow(0.5 + 0.5 * Math.sin(t * 6 + p.phase * 11), 3)
      const c = i % 5 === 0 ? ac : gc
      col[i * 3] = c.r * tw
      col[i * 3 + 1] = c.g * tw
      col[i * 3 + 2] = c.b * tw
    }
    posAttr.needsUpdate = true
    geo.attributes.color.needsUpdate = true
    mat.size = 0.032 + state.intensity * 0.025

    villageLight.intensity = 2 + state.intensity * 2 + Math.sin(t * 2.1) * 0.25
    moonGlow.material.opacity = 0.72 + Math.sin(t * 0.7) * 0.1

    // Keep the ground and village coordinate frame stable while shaking.
  })

  return v.start()
}
