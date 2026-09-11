import { THREE, threeVisual } from '../lib/visual-kit.js'
import { attachToySound } from '../lib/toy-sound.js'

export const meta = {
  id: '101-jelly-pal',
  title: 'Jelly Pal',
  interaction:
    'Grab and stretch the jelly · flick to throw · tap to make it hop',
  palettes: [
    {
      name: 'Apple Jelly',
      body: '#73dc54',
      deep: '#1f7b35',
      cheek: '#ffad9f',
      bg: '#111a18',
      table: '#8a5735',
    },
    {
      name: 'Berry Jelly',
      body: '#e55a9f',
      deep: '#7f245f',
      cheek: '#ffc2d9',
      bg: '#1b1019',
      table: '#72503b',
    },
    {
      name: 'Blue Soda',
      body: '#55bfe8',
      deep: '#17628a',
      cheek: '#ffb5b5',
      bg: '#0d171d',
      table: '#8a6444',
    },
    {
      name: 'Lemon Drop',
      body: '#f2d64b',
      deep: '#9a6d13',
      cheek: '#ff9c8b',
      bg: '#1b180d',
      table: '#806044',
    },
  ],
}

export function mount(container, opts = {}) {
  const v = threeVisual(container, opts, meta, {
    position: [0, 1.05, 6.2],
    lookAt: [0, -0.05, 0],
    fov: 39,
    shadows: true,
  })
  const { scene, camera } = v
  const sound = attachToySound(v, container)

  scene.add(new THREE.HemisphereLight(0xfff5e9, 0x24354a, 1.55))
  const key = new THREE.DirectionalLight(0xffead5, 3.2)
  key.position.set(-3.5, 6, 4.5)
  key.castShadow = true
  key.shadow.mapSize.set(1024, 1024)
  key.shadow.camera.left = key.shadow.camera.bottom = -5
  key.shadow.camera.right = key.shadow.camera.top = 5
  scene.add(key)
  const rim = new THREE.PointLight(0x8fd8ff, 18, 10, 2)
  rim.position.set(3, 2, -2)
  scene.add(rim)

  // Warm tabletop with a small procedural grain: enough context to make
  // landings and shadows legible without importing a large environment map.
  const woodCanvas = document.createElement('canvas')
  woodCanvas.width = woodCanvas.height = 512
  const woodCtx = woodCanvas.getContext('2d')
  const woodTexture = new THREE.CanvasTexture(woodCanvas)
  woodTexture.wrapS = woodTexture.wrapT = THREE.RepeatWrapping
  woodTexture.repeat.set(3, 2)
  function paintWood(color) {
    woodCtx.fillStyle = color
    woodCtx.fillRect(0, 0, 512, 512)
    for (let i = 0; i < 90; i++) {
      const y = Math.random() * 512
      woodCtx.strokeStyle = `rgba(45,20,8,${0.025 + Math.random() * 0.055})`
      woodCtx.lineWidth = 0.5 + Math.random() * 2
      woodCtx.beginPath()
      woodCtx.moveTo(0, y)
      for (let x = 0; x <= 512; x += 24) {
        woodCtx.lineTo(x, y + Math.sin(x * 0.025 + i) * (2 + Math.random() * 4))
      }
      woodCtx.stroke()
    }
    woodTexture.needsUpdate = true
  }
  const tableMat = new THREE.MeshStandardMaterial({
    map: woodTexture,
    roughness: 0.68,
    metalness: 0.02,
  })
  const table = new THREE.Mesh(new THREE.PlaneGeometry(24, 15), tableMat)
  table.rotation.x = -Math.PI / 2
  table.position.y = -1.34
  table.receiveShadow = true
  table.userData.noInteraction = true
  scene.add(table)

  const jellyMat = new THREE.MeshPhysicalMaterial({
    roughness: 0.23,
    metalness: 0.02,
    transmission: 0.38,
    transparent: false,
    opacity: 1,
    thickness: 1.4,
    ior: 1.34,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    attenuationDistance: 2.2,
  })

  // The main body is a shaped sphere whose surface is updated by a compact
  // modal soft-body model. It preserves volume during squash/stretch, carries
  // bending waves, and adds a localized displacement around the grabbed patch.
  const geometry = new THREE.SphereGeometry(1, 52, 38)
  const positions = geometry.attributes.position
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i)
    const y = positions.getY(i)
    const z = positions.getZ(i)
    const lower = THREE.MathUtils.smoothstep(-y, 0, 1)
    const width = 1.08 + lower * 0.2
    const shapedY = y < -0.68 ? -0.68 + (y + 0.68) * 0.52 : y
    positions.setXYZ(
      i,
      x * width,
      shapedY * 1.18,
      z * 0.82 * (1 + lower * 0.05),
    )
  }
  geometry.computeVertexNormals()
  const rest = geometry.attributes.position.array.slice()
  const body = new THREE.Mesh(geometry, jellyMat)
  body.castShadow = true
  body.receiveShadow = true
  scene.add(body)

  // Overlapping lobes give this character its own silhouette while sharing
  // the same deformation transform as the body.
  const lobeGeo = new THREE.SphereGeometry(1, 30, 22)
  const lobes = [
    {
      mesh: new THREE.Mesh(lobeGeo, jellyMat),
      rest: new THREE.Vector3(-1.02, -0.05, -0.02),
      scale: [0.52, 0.34, 0.46],
      phase: -1,
    },
    {
      mesh: new THREE.Mesh(lobeGeo, jellyMat),
      rest: new THREE.Vector3(1.02, -0.05, -0.02),
      scale: [0.52, 0.34, 0.46],
      phase: 1,
    },
    {
      mesh: new THREE.Mesh(lobeGeo, jellyMat),
      rest: new THREE.Vector3(0, 0.96, -0.03),
      scale: [0.34, 0.43, 0.34],
      phase: 0,
    },
  ]
  lobes.forEach(({ mesh, scale }) => {
    mesh.scale.set(...scale)
    mesh.castShadow = true
    mesh.userData.bodyPart = true
    scene.add(mesh)
  })

  const darkMat = new THREE.MeshPhysicalMaterial({
    color: 0x151820,
    roughness: 0.18,
    clearcoat: 1,
  })
  const eyeGeo = new THREE.SphereGeometry(0.135, 20, 14)
  const eyes = [-0.31, 0.31].map((x) => {
    const mesh = new THREE.Mesh(eyeGeo, darkMat)
    mesh.scale.set(0.82, 1.25, 0.42)
    mesh.userData.noInteraction = true
    scene.add(mesh)
    return { mesh, rest: new THREE.Vector3(x, 0.22, 0.87) }
  })
  const mouth = new THREE.Mesh(
    new THREE.TorusGeometry(0.17, 0.032, 8, 24, Math.PI),
    darkMat,
  )
  mouth.rotation.z = Math.PI
  mouth.userData.noInteraction = true
  scene.add(mouth)
  const mouthRest = new THREE.Vector3(0, -0.08, 0.805)

  const cheekGeo = new THREE.CircleGeometry(0.105, 24)
  const cheekMat = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0.66,
    depthWrite: false,
  })
  const cheeks = [-0.54, 0.54].map((x) => {
    const mesh = new THREE.Mesh(cheekGeo, cheekMat)
    mesh.userData.noInteraction = true
    scene.add(mesh)
    return { mesh, rest: new THREE.Vector3(x, -0.02, 0.79) }
  })

  const floorY = -1.3
  const center = new THREE.Vector3(0, -0.28, 0)
  const velocity = new THREE.Vector3()
  let squash = 0
  let squashVelocity = 0
  let bendX = 0
  let bendZ = 0
  let bendVelocityX = 0
  let bendVelocityZ = 0
  let grabbing = false
  let grabAnchor = new THREE.Vector3(0, 0.8, 0.35)
  const grabTarget = new THREE.Vector3()
  const grabOffset = new THREE.Vector3()
  const dragPlane = new THREE.Plane()
  const raycaster = new THREE.Raycaster()
  const cameraNormal = new THREE.Vector3()
  const tmp = new THREE.Vector3()
  const tmp2 = new THREE.Vector3()
  const previousCenter = center.clone()

  function deformPoint(source, target, localized = true) {
    const sy = THREE.MathUtils.clamp(1 + squash, 0.62, 1.5)
    const radial = 1 / Math.sqrt(sy)
    const yn = THREE.MathUtils.clamp((source.y + 0.8) / 1.9, 0, 1)
    target.set(
      source.x * radial + bendX * yn * yn,
      source.y * sy,
      source.z * radial + bendZ * yn * yn,
    )
    if (localized && grabOffset.lengthSq() > 0.000001) {
      const distanceSq = source.distanceToSquared(grabAnchor)
      const weight = Math.exp(-distanceSq * 0.82)
      target.addScaledVector(grabOffset, weight)
      // A small perpendicular bulge keeps a stretched patch looking full.
      const pull = grabOffset.length() * weight * 0.07
      target.x += source.x * pull
      target.z += source.z * pull
    }
    return target
  }

  function pointerTarget() {
    raycaster.setFromCamera(
      new THREE.Vector2(v.pointer.nx, v.pointer.ny),
      camera,
    )
    if (!raycaster.ray.intersectPlane(dragPlane, grabTarget)) return false
    grabTarget.y = Math.max(floorY + 0.08, grabTarget.y)
    return true
  }

  function reset() {
    center.set(0, -0.28, 0)
    velocity.set(0, 0, 0)
    squash = squashVelocity = bendX = bendZ = bendVelocityX = bendVelocityZ = 0
    grabOffset.set(0, 0, 0)
    grabbing = false
  }

  v.onReset(reset)
  v.addAction('Hop', () => {
    sound.play('squish', 0.8)
    velocity.y = 3.25
    squashVelocity -= 1.8
  })
  v.addSlider('Bounce', 'bounce', 0.1, 0.7, 0.05, 0.42)

  v.onPointer((event) => {
    if (event.type === 'down') {
      const hit = v.pick()
      if (hit && (hit.object === body || hit.object.userData.bodyPart)) {
        grabbing = true
        sound.play('squish', 0.65)
        grabAnchor.copy(hit.point).sub(center)
        camera.getWorldDirection(cameraNormal)
        dragPlane.setFromNormalAndCoplanarPoint(cameraNormal, hit.point)
        grabTarget.copy(hit.point)
        velocity.multiplyScalar(0.35)
      }
    }
    if (event.type === 'drag' && grabbing) {
      pointerTarget()
      if (event.speed > 30)
        sound.play(
          'stretch',
          Math.min(0.8, event.speed / 700 + 0.2),
          0.8 + Math.min(0.8, grabOffset.length() * 0.5),
        )
    }
    if ((event.type === 'fling' || event.type === 'up') && grabbing) {
      grabbing = false
      velocity.x = THREE.MathUtils.clamp(
        (event.vx / Math.max(1, container.clientWidth)) * 4.8,
        -5.5,
        5.5,
      )
      velocity.y = THREE.MathUtils.clamp(
        (-event.vy / Math.max(1, container.clientHeight)) * 4.8,
        -4.5,
        6.2,
      )
      bendVelocityX += velocity.x * 0.24
      bendVelocityZ -= velocity.y * 0.07
    }
    if (
      event.type === 'tap' &&
      v.pick()?.object &&
      (v.pick().object === body || v.pick().object.userData.bodyPart)
    ) {
      grabbing = false
      velocity.y = Math.max(velocity.y, 3.25)
      squashVelocity -= 1.8
    }
    if (event.type === 'doubletap') reset()
  })

  v.onPalette((palette) => {
    scene.background = new THREE.Color(palette.bg)
    jellyMat.color.set(palette.body)
    jellyMat.attenuationColor.set(palette.deep)
    cheekMat.color.set(palette.cheek)
    paintWood(palette.table)
  })

  v.onFrame((dt, t, state) => {
    const stepCount = Math.max(1, Math.ceil(dt / (1 / 120)))
    const h = dt / stepCount
    for (let step = 0; step < stepCount; step++) {
      let squashTarget = 0
      previousCenter.copy(center)
      if (grabbing && pointerTarget()) {
        deformPoint(grabAnchor, tmp, false).add(center)
        tmp2.subVectors(grabTarget, tmp)
        if (tmp2.length() > 2.25) tmp2.setLength(2.25)
        center.addScaledVector(tmp2, Math.min(0.1, h * 1.15))
        velocity.lerp(tmp2.clone().multiplyScalar(2.8), Math.min(1, h * 8))
        deformPoint(grabAnchor, tmp, false).add(center)
        grabOffset.subVectors(grabTarget, tmp)
        if (grabOffset.length() > 1.8) grabOffset.setLength(1.8)
        squashTarget = Math.min(0.34, Math.abs(grabOffset.y) * 0.24)
        bendVelocityX += grabOffset.x * h * 5
        bendVelocityZ += grabOffset.z * h * 5
      } else {
        velocity.y -= 5.1 * h
        velocity.multiplyScalar(Math.exp(-h * 0.16))
        center.addScaledVector(velocity, h)
        grabOffset.multiplyScalar(Math.exp(-h * 7.5))
      }

      squashVelocity += (squashTarget - squash) * 48 * h
      squashVelocity *= Math.exp(-h * 7.2)
      squash += squashVelocity * h
      squash = THREE.MathUtils.clamp(squash, -0.34, 0.42)

      bendVelocityX += -bendX * 32 * h
      bendVelocityZ += -bendZ * 32 * h
      bendVelocityX *= Math.exp(-h * 5.1)
      bendVelocityZ *= Math.exp(-h * 5.1)
      bendX += bendVelocityX * h
      bendZ += bendVelocityZ * h

      const visibleWidth =
        2 *
        Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) *
        camera.position.distanceTo(new THREE.Vector3(0, 0, 0)) *
        camera.aspect
      const edge = Math.max(0.3, visibleWidth * 0.5 - 1.6)
      if (Math.abs(center.x) > edge) {
        center.x = THREE.MathUtils.clamp(center.x, -edge, edge)
        velocity.x *= -0.45
      }
      const sy = THREE.MathUtils.clamp(1 + squash, 0.62, 1.5)
      const bottom = center.y - 1.0 * sy
      if (bottom < floorY) {
        center.y += floorY - bottom
        if (velocity.y < 0) {
          const impact = -velocity.y
          if (impact > 0.5) sound.play('plop', Math.min(1, impact / 4))
          velocity.y = impact * state.bounce
          velocity.x *= 0.82
          velocity.z *= 0.82
          squashVelocity -= impact * 0.34
          bendVelocityX += velocity.x * 0.2
        }
      }
    }

    // A nearly imperceptible idle pulse keeps the material from feeling dead.
    const idlePulse = grabbing ? 0 : Math.sin(t * 1.7) * 0.006
    const out = geometry.attributes.position
    for (let i = 0; i < out.count; i++) {
      tmp.fromArray(rest, i * 3)
      deformPoint(tmp, tmp2)
      tmp2.multiplyScalar(1 + idlePulse)
      out.setXYZ(i, tmp2.x, tmp2.y, tmp2.z)
    }
    out.needsUpdate = true
    geometry.computeVertexNormals()
    geometry.computeBoundingSphere()
    body.position.copy(center)

    lobes.forEach((part) => {
      deformPoint(part.rest, tmp)
      part.mesh.position.copy(center).add(tmp)
      const stretch =
        1 +
        grabOffset.length() *
          Math.exp(-part.rest.distanceToSquared(grabAnchor) * 2) *
          0.12
      part.mesh.scale.set(
        part.scale[0] * stretch,
        part.scale[1] / Math.sqrt(stretch),
        part.scale[2] / Math.sqrt(stretch),
      )
      part.mesh.rotation.z = -bendX * 0.35 + part.phase * squash * 0.12
    })

    const blinkPhase = t % 5.2
    const blink = t > 3 ? Math.exp(-((blinkPhase - 4.82) ** 2) * 180) : 0
    eyes.forEach((feature) => {
      deformPoint(feature.rest, tmp)
      feature.mesh.position.copy(center).add(tmp)
      feature.mesh.scale.set(0.82, Math.max(0.12, 1.25 * (1 - blink)), 0.42)
      feature.mesh.rotation.z = -bendX * 0.22
    })
    deformPoint(mouthRest, tmp)
    mouth.position.copy(center).add(tmp)
    mouth.scale.set(
      1 + Math.min(0.45, velocity.length() * 0.07),
      1 - squash * 0.25,
      1,
    )
    mouth.rotation.z = Math.PI - bendX * 0.18
    cheeks.forEach((feature) => {
      deformPoint(feature.rest, tmp)
      feature.mesh.position.copy(center).add(tmp)
    })

    key.intensity = 1.35 + state.intensity * 0.9
    rim.intensity = 10 + state.intensity * 10
  })

  return v.start()
}
