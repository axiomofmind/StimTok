import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { THREE, threeVisual } from '../lib/visual-kit.js'
import { attachToySound } from '../lib/toy-sound.js'

export const meta = {
  id: '044-soap-cutting',
  title: 'Soap-Cutting Slice',
  interaction:
    'Drag the blade left-to-right to peel a curl · start again for another shaving',
  palettes: [
    {
      name: 'Lavender Bar',
      soap: '#b8a8e8',
      curl: '#cdc0f0',
      blade: '#d8dce4',
      bg: '#14101c',
    },
    {
      name: 'Lemon Cream',
      soap: '#f0e0a0',
      curl: '#f8ecc0',
      blade: '#d8dce4',
      bg: '#1a160a',
    },
    {
      name: 'Ocean Bar',
      soap: '#88c8d8',
      curl: '#a8dce8',
      blade: '#d8dce4',
      bg: '#0a1418',
    },
  ],
}

export function mount(container, opts = {}) {
  const v = threeVisual(container, opts, meta, {
    position: [0, 2.2, 5],
    lookAt: [0, -0.2, 0],
    fov: 42,
    shadows: true,
  })
  const { scene } = v
  const sound = attachToySound(v, container)

  scene.add(new THREE.AmbientLight(0xffffff, 0.7))
  const key = new THREE.DirectionalLight(0xffffff, 2)
  key.position.set(2, 5, 3)
  key.castShadow = true
  scene.add(key)

  const table = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 12),
    new THREE.MeshStandardMaterial({ color: 0x221e28, roughness: 0.9 }),
  )
  table.rotation.x = -Math.PI / 2
  table.position.y = -0.75
  table.receiveShadow = true
  table.userData.noInteraction = true
  scene.add(table)

  const soapMat = new THREE.MeshStandardMaterial({ roughness: 0.45 })
  const bar = new THREE.Mesh(
    new RoundedBoxGeometry(3.4, 1.1, 1.7, 4, 0.12),
    soapMat,
  )
  bar.position.y = -0.2
  bar.castShadow = true
  bar.receiveShadow = true
  scene.add(bar)

  // Blade skimming along the top, shaving a curl.
  const bladeMat = new THREE.MeshStandardMaterial({
    roughness: 0.2,
    metalness: 0.85,
  })
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.03, 1.9), bladeMat)
  blade.castShadow = true
  scene.add(blade)

  // The curl: a spiral ribbon that grows during the shave (drawRange).
  const curlMat = new THREE.MeshStandardMaterial({
    roughness: 0.5,
    side: THREE.DoubleSide,
  })
  const TURNS = 3.2
  const CURL_SEGS = 90
  const curlPositions = new Float32Array((CURL_SEGS + 1) * 2 * 3)
  const curlIndices = []
  for (let i = 0; i < CURL_SEGS; i++) {
    const a = i * 2
    curlIndices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
  }
  const curlGeo = new THREE.BufferGeometry()
  // Build a spiral: radius grows slightly each turn, like a wood shaving.
  for (let i = 0; i <= CURL_SEGS; i++) {
    const f = i / CURL_SEGS
    const ang = f * TURNS * Math.PI * 2
    const rad = 0.1 + f * 0.16
    const x = Math.cos(ang) * rad
    const y = Math.sin(ang) * rad
    const halfW = 0.55
    curlPositions[i * 6] = x
    curlPositions[i * 6 + 1] = y
    curlPositions[i * 6 + 2] = -halfW
    curlPositions[i * 6 + 3] = x
    curlPositions[i * 6 + 4] = y
    curlPositions[i * 6 + 5] = halfW
  }
  curlGeo.setAttribute('position', new THREE.BufferAttribute(curlPositions, 3))
  curlGeo.setIndex(curlIndices)
  curlGeo.computeVertexNormals()
  const curl = new THREE.Mesh(curlGeo, curlMat)
  curl.castShadow = true
  scene.add(curl)

  // Fallen curls pile up. They need their own geometry: the growing curl
  // drives setDrawRange, which would otherwise truncate the pile too.
  const fallenGeo = curlGeo.clone()
  const fallen = []
  for (let i = 0; i < 18; i++) {
    const f = new THREE.Mesh(fallenGeo, curlMat.clone())
    f.visible = false
    scene.add(f)
    fallen.push(f)
  }
  let fallenIdx = 0

  v.onPalette((p) => {
    scene.background = new THREE.Color(p.bg)
    soapMat.color.set(p.soap)
    curlMat.color.set(p.curl)
    bladeMat.color.set(p.blade)
    fallen.forEach((f) => f.material.color.set(p.curl))
  })

  let removed = 0
  v.addSlider('Cut depth', 'depth', 0.015, 0.07, 0.005, 0.035)
  let progress = 0
  let targetProgress = 0
  let grabbed = false
  let curlDropped = false
  let lastProgress = 0

  function dropCurl() {
    const f = fallen[fallenIdx % fallen.length]
    fallenIdx++
    f.visible = true
    f.position.copy(curl.position)
    f.userData.vy = 0
    f.userData.landed = false
    f.userData.vx = 0.5 + Math.random() * 0.4
    removed = Math.min(0.62, removed + v.state.depth)
    bar.scale.y = 1 - removed
    bar.position.y = -0.75 + (1.1 * bar.scale.y) / 2
    f.rotation.set(
      Math.random() * 0.6,
      Math.random() * Math.PI,
      Math.PI / 2 + Math.random() * 0.4,
    )
    f.scale.setScalar(0.8 + Math.random() * 0.2)
  }

  v.onPointer((event) => {
    if (event.type === 'down') {
      if (progress > 0.97) {
        progress = targetProgress = 0
        curlDropped = false
      }
      const hit = v.pick()
      grabbed = hit?.object === blade || hit?.object === bar
    }
    if (event.type === 'drag' && grabbed) {
      progress = THREE.MathUtils.clamp(
        progress + (event.dx / Math.max(1, container.clientWidth)) * 2.1,
        0,
        1,
      )
      targetProgress = progress
    }
    if (event.type === 'up' || event.type === 'fling') grabbed = false
    if (
      event.type === 'tap' &&
      (v.pick()?.object === blade || v.pick()?.object === bar)
    )
      targetProgress = Math.min(1, progress + 0.22)
    if (event.type === 'doubletap') {
      progress = targetProgress = 0
      curlDropped = false
      fallen.forEach((f) => {
        f.visible = false
      })
    }
  })

  v.addAction('Shave a strip', () => {
    if (progress > 0.97) {
      progress = targetProgress = 0
      curlDropped = false
    }
    targetProgress = 1
  })
  v.addAction('Clear shavings', () =>
    fallen.forEach((f) => (f.visible = false)),
  )
  v.onFrame((dt, t, state) => {
    if (!grabbed) progress += (targetProgress - progress) * Math.min(1, dt * 7)
    if (dt > 0 && progress > lastProgress + 0.0005 && progress < 0.9)
      sound.play(
        'scrape',
        Math.min(0.9, ((progress - lastProgress) / dt) * 0.5 + 0.25),
      )
    lastProgress = progress
    const ph = progress
    if (ph > 0.96 && !curlDropped) {
      dropCurl()
      curlDropped = true
    }

    if (ph < 0.7) {
      // Shaving: blade travels the top of the bar; curl grows at its lip.
      const f = ph / 0.7
      const ease = f * f * (3 - 2 * f)
      const bx = -1.5 + ease * 3.1
      blade.position.set(bx, 0.37 - removed * 1.1, 0)
      blade.rotation.z = -0.06
      curl.visible = true
      curl.position.set(bx + 0.28, 0.48 - removed * 1.1, 0)
      curl.rotation.z = -0.3 - f * 0.5
      const reveal = Math.floor(ease * CURL_SEGS) * 6
      curlGeo.setDrawRange(0, Math.max(6, reveal))
      const s = 0.4 + ease * 0.6
      curl.scale.setScalar(s)
    } else {
      // Curl falls off the end; blade returns.
      const f = (ph - 0.7) / 0.3
      curl.position.x = 1.9 + f * 0.4
      curl.position.y = 0.48 - f * f * 1.1
      curl.rotation.z += dt * 3
      blade.position.set(
        -1.5 - 0.3 + f * 0.3,
        0.37 + Math.sin(f * Math.PI) * 0.5,
        0,
      )
    }
    key.intensity = 1.4 + state.intensity * 0.9

    for (const f of fallen) {
      if (!f.visible) continue
      f.userData.vy -= dt * 3
      f.position.y += f.userData.vy * dt
      f.position.x += f.userData.vx * dt
      if (f.position.y < -0.54) {
        if (!f.userData.landed) {
          sound.play('bead', 0.45, 1.6)
          f.userData.landed = true
        }
        f.position.y = -0.54
        f.userData.vy = 0
        f.userData.vx *= Math.exp(-dt * 8)
      } else f.rotation.z += dt * 2
    }
  })

  return v.start()
}
