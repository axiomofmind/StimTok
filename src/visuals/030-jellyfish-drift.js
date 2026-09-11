import { THREE, threeVisual, radialTexture } from '../lib/visual-kit.js'

export const meta = {
  id: '030-jellyfish-drift',
  title: 'Jellyfish Pulsing & Drifting',
  interaction:
    'Grab a jellyfish to swim · flick the current · tap for bioluminescence',
  palettes: [
    {
      name: 'Deep Ocean',
      bell: '#7db8f0',
      glow: '#a8d8ff',
      bg: '#030a18',
      fog: '#061224',
    },
    {
      name: 'Bioluminescent',
      bell: '#4fe8c0',
      glow: '#8affe0',
      bg: '#02100c',
      fog: '#04201a',
    },
    {
      name: 'Moon Jelly Pink',
      bell: '#f0a8d0',
      glow: '#ffd0e8',
      bg: '#12040e',
      fog: '#22081a',
    },
  ],
}

function makeJelly(scene, scale, x, y, z, bellTemplate, glowTexture) {
  const root = new THREE.Group()
  root.position.set(x, y, z)
  root.scale.setScalar(scale)
  scene.add(root)

  const bellGeo = new THREE.SphereGeometry(
    1,
    32,
    22,
    0,
    Math.PI * 2,
    0,
    Math.PI * 0.57,
  )
  const bellMat = bellTemplate.clone()
  const bell = new THREE.Mesh(bellGeo, bellMat)
  root.add(bell)
  const base = bellGeo.attributes.position.array.slice()

  const skirtMat = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0.5,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  const skirt = new THREE.Mesh(
    new THREE.TorusGeometry(0.84, 0.045, 8, 48),
    skirtMat,
  )
  skirt.rotation.x = Math.PI / 2
  skirt.position.y = -0.12
  root.add(skirt)

  const innerMat = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0.24,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  const inner = new THREE.Mesh(new THREE.SphereGeometry(0.43, 20, 14), innerMat)
  inner.scale.set(1, 0.58, 1)
  inner.position.y = 0.15
  root.add(inner)

  // Four visible radial organs make the transparent bell feel anatomical.
  const organs = []
  for (let i = 0; i < 4; i++) {
    const organ = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 16, 10),
      innerMat.clone(),
    )
    const angle = (i / 4) * Math.PI * 2
    organ.position.set(Math.cos(angle) * 0.28, 0.12, Math.sin(angle) * 0.28)
    organ.scale.set(1.25, 0.42, 0.72)
    organ.rotation.y = -angle
    root.add(organ)
    organs.push(organ)
  }

  const halo = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture,
      transparent: true,
      opacity: 0.24,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  )
  halo.scale.set(2.65, 2.65, 1)
  halo.position.y = 0.1
  root.add(halo)

  const tentacles = []
  const tentacleCount = 12
  const segments = 18
  for (let i = 0; i < tentacleCount; i++) {
    const angle = (i / tentacleCount) * Math.PI * 2
    const positions = new Float32Array((segments + 1) * 3)
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const material = new THREE.LineBasicMaterial({
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    const line = new THREE.Line(geometry, material)
    root.add(line)
    tentacles.push({
      geometry,
      positions,
      angle,
      material,
      radius: 0.48 + (i % 4) * 0.09,
      segments,
    })
  }

  return {
    root,
    bell,
    bellGeo,
    bellMat,
    base,
    skirt,
    skirtMat,
    inner,
    innerMat,
    organs,
    halo,
    tentacles,
    phase: Math.random() * Math.PI * 2,
    drift: Math.random() * Math.PI * 2,
    velocity: new THREE.Vector3(),
    pulseBoost: 0,
  }
}

export function mount(container, opts = {}) {
  const v = threeVisual(container, opts, meta, {
    position: [0, 0, 8],
    lookAt: [0, 0, 0],
    fov: 46,
  })
  const { scene, camera } = v

  scene.add(new THREE.HemisphereLight(0x7397bb, 0x020611, 0.75))
  const oceanGlow = new THREE.PointLight(0xa8d8ff, 18, 12, 2)
  oceanGlow.position.set(0, 2.3, 3)
  scene.add(oceanGlow)

  const bellTemplate = new THREE.MeshPhysicalMaterial({
    transparent: true,
    opacity: 0.5,
    roughness: 0.12,
    transmission: 0.48,
    thickness: 0.65,
    ior: 1.34,
    clearcoat: 0.7,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
  const glowTexture = radialTexture([
    [0, 'rgba(255,255,255,.9)'],
    [0.24, 'rgba(160,220,255,.32)'],
    [1, 'rgba(100,180,255,0)'],
  ])

  const jellies = [
    makeJelly(scene, 1.02, 0, 0.65, 0, bellTemplate, glowTexture),
    makeJelly(scene, 0.62, -3.0, -1.15, -2.4, bellTemplate, glowTexture),
    makeJelly(scene, 0.48, 2.75, 1.55, -3.8, bellTemplate, glowTexture),
    makeJelly(scene, 0.34, -1.65, 2.7, -5.1, bellTemplate, glowTexture),
    makeJelly(scene, 0.41, 3.2, -2.15, -4.3, bellTemplate, glowTexture),
  ]

  // Dense layered plankton makes currents and depth changes visible.
  const moteCount = 310
  const motePositions = new Float32Array(moteCount * 3)
  const motePhases = new Float32Array(moteCount)
  for (let i = 0; i < moteCount; i++) {
    motePositions[i * 3] = (Math.random() - 0.5) * 16
    motePositions[i * 3 + 1] = (Math.random() - 0.5) * 10
    motePositions[i * 3 + 2] = -6 + Math.random() * 8
    motePhases[i] = Math.random() * Math.PI * 2
  }
  const moteGeo = new THREE.BufferGeometry()
  moteGeo.setAttribute('position', new THREE.BufferAttribute(motePositions, 3))
  const moteMat = new THREE.PointsMaterial({
    color: 0xa8c8e8,
    size: 0.055,
    transparent: true,
    opacity: 0.56,
    map: glowTexture,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  scene.add(new THREE.Points(moteGeo, moteMat))

  const raycaster = new THREE.Raycaster()
  const dragPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
  const dragTarget = new THREE.Vector3()
  const cameraDirection = new THREE.Vector3()
  const pulseRings = []
  let selected = null
  const grabOffset = new THREE.Vector3()
  v.addSlider('Current strength', 'currentStrength', 0.2, 2, 0.1, 1)
  v.addSlider('Bell rhythm', 'bellRhythm', 0.4, 1.8, 0.1, 1)
  let currentX = 0
  let currentY = 0
  let currentPalette = meta.palettes[0]

  function updateDragTarget() {
    raycaster.setFromCamera(
      new THREE.Vector2(v.pointer.nx, v.pointer.ny),
      camera,
    )
    const hit = Boolean(raycaster.ray.intersectPlane(dragPlane, dragTarget))
    return hit
  }

  function emitPulse(jelly, strength = 1) {
    jelly.pulseBoost = Math.max(jelly.pulseBoost, strength)
    jelly.velocity.y += strength * 0.15
  }

  v.onPointer((event) => {
    if (event.type === 'down') {
      const hit = v.pick()
      selected =
        jellies.find(
          (jelly) =>
            hit &&
            (hit.object === jelly.bell || hit.object.parent === jelly.root),
        ) ?? null
      if (!selected) return
      camera.getWorldDirection(cameraDirection)
      dragPlane.setFromNormalAndCoplanarPoint(
        cameraDirection,
        selected.root.position,
      )
      updateDragTarget()
      grabOffset.copy(selected.root.position).sub(dragTarget)
    } else if (event.type === 'drag') {
      if (selected) updateDragTarget()
      currentX += (event.vx / Math.max(1, container.clientWidth)) * 0.035
      currentY += (-event.vy / Math.max(1, container.clientHeight)) * 0.025
    } else if (event.type === 'tap') {
      const target = selected ?? jellies[0]
      emitPulse(target, 1.25)
      jellies.forEach((jelly) => {
        if (jelly !== target)
          jelly.pulseBoost = Math.max(jelly.pulseBoost, 0.38)
      })
    } else if (event.type === 'fling') {
      currentX += (event.vx / Math.max(1, container.clientWidth)) * 0.65
      currentY += (-event.vy / Math.max(1, container.clientHeight)) * 0.5
      if (selected) {
        selected.velocity.x +=
          (event.vx / Math.max(1, container.clientWidth)) * 2.7
        selected.velocity.y +=
          (-event.vy / Math.max(1, container.clientHeight)) * 2.7
        emitPulse(selected, 0.9)
      }
      selected = null
    } else if (event.type === 'up') {
      selected = null
    } else if (event.type === 'doubletap') {
      jellies.forEach((jelly, index) =>
        emitPulse(jelly, index === 0 ? 1.25 : 0.7),
      )
    }
  })

  v.onPalette((palette) => {
    currentPalette = palette
    scene.background = new THREE.Color(palette.bg)
    scene.fog = new THREE.FogExp2(new THREE.Color(palette.fog).getHex(), 0.065)
    oceanGlow.color.set(palette.glow)
    moteMat.color.set(palette.glow)
    for (const jelly of jellies) {
      jelly.bellMat.color.set(palette.bell)
      jelly.skirtMat.color.set(palette.glow)
      jelly.innerMat.color.set(palette.glow)
      jelly.organs.forEach((organ) => organ.material.color.set(palette.glow))
      jelly.halo.material.color.set(palette.glow)
      jelly.tentacles.forEach((tentacle) =>
        tentacle.material.color.set(palette.glow),
      )
    }
  })

  v.onReset(() => {
    const homes = [
      [0, 0.65, 0],
      [-3, -1.15, -2.4],
      [2.75, 1.55, -3.8],
      [-1.65, 2.7, -5.1],
      [3.2, -2.15, -4.3],
    ]
    jellies.forEach((jelly, index) => {
      jelly.root.position.set(...homes[index])
      jelly.velocity.set(0, 0, 0)
      jelly.pulseBoost = 0
    })
    currentX = currentY = 0
    selected = null
    for (const pulseRing of pulseRings) {
      scene.remove(pulseRing.ring)
      pulseRing.ring.geometry.dispose()
      pulseRing.material.dispose()
    }
    pulseRings.length = 0
  })

  v.onFrame((dt, t, state) => {
    currentX *= Math.exp(-dt * 1.35)
    currentY *= Math.exp(-dt * 1.35)

    for (const jelly of jellies) {
      const cycle = t * 0.92 * state.bellRhythm + jelly.phase
      const naturalPulse = Math.pow(Math.max(0, Math.sin(cycle)), 2.4)
      const pulse = Math.min(1.45, naturalPulse + jelly.pulseBoost)
      const squeeze = 1 - pulse * 0.25
      const stretch = 1 + pulse * 0.2

      const position = jelly.bellGeo.attributes.position
      for (let i = 0; i < position.count; i++) {
        const bx = jelly.base[i * 3]
        const by = jelly.base[i * 3 + 1]
        const bz = jelly.base[i * 3 + 2]
        const rimness = 1 - Math.max(0, by)
        const radialScale =
          1 +
          (squeeze - 1) * rimness +
          Math.sin(Math.atan2(bz, bx) * 14) * 0.024 * rimness * rimness
        position.setXYZ(i, bx * radialScale, by * stretch, bz * radialScale)
      }
      position.needsUpdate = true
      jelly.bellGeo.computeVertexNormals()

      if (jelly === selected && v.pointer.down && updateDragTarget()) {
        jelly.velocity.x +=
          (dragTarget.x + grabOffset.x - jelly.root.position.x) * dt * 8.5
        jelly.velocity.y +=
          (dragTarget.y + grabOffset.y - jelly.root.position.y) * dt * 8.5
        jelly.velocity.z += (dragTarget.z - jelly.root.position.z) * dt * 5
        jelly.pulseBoost = Math.max(
          jelly.pulseBoost,
          0.32 + Math.min(0.45, v.pointer.speed / 1500),
        )
      } else {
        jelly.velocity.x +=
          (Math.sin(t * 0.16 + jelly.drift) * 0.075 +
            currentX * 0.65 * state.currentStrength) *
          dt
        jelly.velocity.y +=
          (naturalPulse * 0.26 -
            0.055 +
            currentY * 0.45 * state.currentStrength) *
          dt
      }
      jelly.velocity.multiplyScalar(
        Math.exp(-dt * (jelly === selected ? 1.9 : 0.75)),
      )
      jelly.root.position.addScaledVector(jelly.velocity, dt)
      jelly.root.position.x += Math.sin(t * 0.12 + jelly.drift) * dt * 0.055

      if (jelly.root.position.y > 4.25) jelly.root.position.y = -4.0
      if (jelly.root.position.y < -4.25) jelly.root.position.y = 4.0
      if (jelly.root.position.x > 5.1) jelly.root.position.x = -5.0
      if (jelly.root.position.x < -5.1) jelly.root.position.x = 5.0
      jelly.root.rotation.z +=
        (-jelly.velocity.x * 0.22 +
          Math.sin(t * 0.2 + jelly.drift) * 0.09 -
          jelly.root.rotation.z) *
        (1 - Math.exp(-dt * 3.2))

      for (const tentacle of jelly.tentacles) {
        for (let segment = 0; segment <= tentacle.segments; segment++) {
          const f = segment / tentacle.segments
          const lag = f * f
          const wave =
            Math.sin(t * 1.65 - f * 4.2 + tentacle.angle * 2 + jelly.phase) *
            0.37 *
            lag
          const wake = -jelly.velocity.x * lag * 0.8 - currentX * lag * 0.55
          const follow = 1 - Math.exp(-dt * (18 - f * 12))
          tentacle.positions[segment * 3] +=
            (Math.cos(tentacle.angle) * tentacle.radius * (1 - f * 0.28) +
              wave +
              wake -
              tentacle.positions[segment * 3]) *
            follow
          tentacle.positions[segment * 3 + 1] =
            -0.1 - f * (2.05 + pulse * 0.38) - jelly.velocity.y * lag * 0.22
          tentacle.positions[segment * 3 + 2] =
            Math.sin(tentacle.angle) * tentacle.radius * (1 - f * 0.28) +
            wave * 0.55
        }
        tentacle.geometry.attributes.position.needsUpdate = true
        tentacle.material.opacity =
          0.24 + state.intensity * 0.25 + jelly.pulseBoost * 0.22
      }

      jelly.bellMat.opacity =
        0.3 + state.intensity * 0.2 + jelly.pulseBoost * 0.1
      jelly.skirt.scale.setScalar(1 - pulse * 0.17)
      jelly.inner.scale.set(
        1 + pulse * 0.12,
        0.58 + pulse * 0.14,
        1 + pulse * 0.12,
      )
      jelly.halo.material.opacity =
        0.16 + state.intensity * 0.08 + jelly.pulseBoost * 0.3
      jelly.halo.scale.setScalar(2.5 + jelly.pulseBoost * 0.85)
      jelly.pulseBoost *= Math.exp(-dt * 2.55)
    }

    for (let i = pulseRings.length - 1; i >= 0; i--) {
      const pulseRing = pulseRings[i]
      pulseRing.age += dt
      pulseRing.ring.quaternion.copy(camera.quaternion)
      pulseRing.ring.scale.setScalar(
        pulseRing.baseScale * (1 + pulseRing.age * 2.55),
      )
      pulseRing.material.opacity = Math.max(
        0,
        0.85 * (1 - pulseRing.age / 1.05),
      )
      if (pulseRing.age >= 1.05) {
        scene.remove(pulseRing.ring)
        pulseRing.ring.geometry.dispose()
        pulseRing.material.dispose()
        pulseRings.splice(i, 1)
      }
    }

    oceanGlow.intensity = 10 + state.intensity * 12 + jellies[0].pulseBoost * 13
    const motePosition = moteGeo.attributes.position
    for (let i = 0; i < moteCount; i++) {
      const x = motePosition.getX(i) + (0.055 + currentX * 0.32) * dt
      const y =
        motePosition.getY(i) +
        (Math.sin(t * 0.48 + motePhases[i]) * 0.055 + currentY * 0.24) * dt
      motePosition.setX(i, x > 8 ? -8 : x < -8 ? 8 : x)
      motePosition.setY(i, y > 5 ? -5 : y < -5 ? 5 : y)
    }
    motePosition.needsUpdate = true
  })

  return v.start()
}
