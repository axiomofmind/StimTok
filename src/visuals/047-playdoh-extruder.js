import { THREE, threeVisual } from '../lib/visual-kit.js'
import { attachToySound } from '../lib/toy-sound.js'

export const meta = {
  id: '047-playdoh-extruder',
  title: 'Playdoh Extruder "Spaghetti"',
  interaction:
    'Pull the press down to extrude · swipe sideways across the strands or tap Cut',
  palettes: [
    {
      name: 'Rainbow Doh',
      strands: [
        '#ff5d73',
        '#ffc145',
        '#43d9ad',
        '#4a7cf7',
        '#c084fc',
        '#fb923c',
        '#f472b6',
      ],
      press: '#e8524a',
      bg: '#1a1418',
    },
    {
      name: 'Pastel Doh',
      strands: [
        '#ffb3c6',
        '#fdf3b3',
        '#b9fbc0',
        '#a2d2ff',
        '#e0aaff',
        '#ffd6a5',
        '#fbb1bd',
      ],
      press: '#8bb8e8',
      bg: '#181420',
    },
    {
      name: 'Citrus',
      strands: [
        '#f5c518',
        '#84cc16',
        '#fb923c',
        '#fde047',
        '#a3e635',
        '#f97316',
        '#facc15',
      ],
      press: '#3a8a4a',
      bg: '#12160a',
    },
  ],
}

export function mount(container, opts = {}) {
  const v = threeVisual(container, opts, meta, {
    position: [0, 0.4, 8.5],
    lookAt: [0, -0.2, 0],
    fov: 45,
  })
  const { scene } = v
  const sound = attachToySound(v, container)

  scene.add(new THREE.AmbientLight(0xffffff, 0.75))
  const key = new THREE.DirectionalLight(0xffffff, 1.8)
  key.position.set(2, 4, 4)
  scene.add(key)

  // Press plate + die
  const pressMat = new THREE.MeshStandardMaterial({ roughness: 0.5 })
  const press = new THREE.Mesh(new THREE.BoxGeometry(3, 0.5, 2), pressMat)
  press.position.y = 2
  scene.add(press)
  const die = new THREE.Mesh(
    new THREE.BoxGeometry(3.2, 0.25, 2.2),
    new THREE.MeshStandardMaterial({
      color: 0x33363c,
      roughness: 0.4,
      metalness: 0.5,
    }),
  )
  die.position.y = 1.45
  scene.add(die)

  // Strands: bent cylinders whose vertices we displace as they grow.
  const STRANDS = 7
  const SEG_Y = 30
  const strands = []
  const strandMats = []
  for (let i = 0; i < STRANDS; i++) {
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.65 })
    strandMats.push(mat)
    const geo = new THREE.CylinderGeometry(0.11, 0.11, 1, 10, SEG_Y)
    const base = geo.attributes.position.array.slice()
    const mesh = new THREE.Mesh(geo, mat)
    const col = (i - (STRANDS - 1) / 2) * 0.42
    mesh.position.set(col, 1.3, 0)
    scene.add(mesh)
    strands.push({ mesh, geo, base, phase: Math.random() * Math.PI * 2, col })
  }

  // Fallen coils pile (torus knots as playful coils)
  const coils = []
  for (let i = 0; i < 6; i++) {
    const m = new THREE.Mesh(
      new THREE.TorusGeometry(0.25, 0.1, 8, 20),
      new THREE.MeshStandardMaterial({ roughness: 0.65 }),
    )
    m.visible = false
    scene.add(m)
    coils.push(m)
  }
  let coilIdx = 0

  const table = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 12),
    new THREE.MeshStandardMaterial({ color: 0x242028, roughness: 0.9 }),
  )
  table.rotation.x = -Math.PI / 2
  table.position.y = -2.2
  scene.add(table)

  let pal = meta.palettes[0]
  v.onPalette((p) => {
    pal = p
    scene.background = new THREE.Color(p.bg)
    pressMat.color.set(p.press)
    strandMats.forEach((m, i) => m.color.set(p.strands[i % p.strands.length]))
  })

  let shape = 'round'
  v.addAction('Round die', () => (shape = 'round'))
  v.addAction('Star die', () => (shape = 'star'))
  v.addAction('Ribbon die', () => (shape = 'ribbon'))
  const cutPieces = []
  let grow = 0
  let targetGrow = 0
  let lastGrow = 0
  let grabbed = false
  let cutting = false
  let swipe = 0
  const cutButton = document.createElement('button')
  cutButton.className = 'dough-cut'
  container.querySelector('.quick-actions').classList.add('dough-tools')
  cutButton.textContent = '✂ Cut strands'
  cutButton.style.cssText =
    'z-index:3;border:1px solid #ffffff66;border-radius:24px;padding:10px 18px;background:#242028dd;color:white;cursor:pointer;font:600 14px system-ui;touch-action:manipulation'
  container.append(cutButton)
  cutButton.addEventListener('click', cutCoil)
  v.addDispose(() => cutButton.remove())
  const bounds = new THREE.Box3()

  function cutCoil() {
    if (grow < 0.08) return
    sound.play('snip', 0.9)
    for (const strand of strands) {
      const piece = new THREE.Mesh(
        strand.geo.clone(),
        strand.mesh.material.clone(),
      )
      piece.position.copy(strand.mesh.position)
      piece.geometry.computeBoundingBox()
      const center = piece.geometry.boundingBox.getCenter(new THREE.Vector3())
      piece.geometry.translate(-center.x, -center.y, -center.z)
      piece.position.add(center)
      piece.userData = {
        vy: -0.25,
        angle: (Math.random() > 0.5 ? 1 : -1) * (0.8 + Math.random() * 0.5),
        settled: false,
      }
      scene.add(piece)
      cutPieces.push(piece)
    }
    while (cutPieces.length > 56) {
      const p = cutPieces.shift()
      scene.remove(p)
      p.geometry.dispose()
      p.material.dispose()
    }
    grow = targetGrow = 0
  }
  v.addAction('Cut strands', cutCoil)
  v.addAction('Press', () => (targetGrow = Math.min(1, targetGrow + 0.22)))
  v.addAction('Clear tray', () => {
    for (const p of cutPieces) {
      scene.remove(p)
      p.geometry.dispose()
      p.material.dispose()
    }
    cutPieces.length = 0
  })

  v.onPointer((event) => {
    if (event.type === 'down') {
      const hit = v.pick()?.object
      grabbed = hit === press || hit === die
      cutting = strands.some((s) => s.mesh === hit)
      swipe = 0
    }
    if (event.type === 'drag' && cutting) {
      swipe += event.dx
      if (Math.abs(swipe) > 35) {
        cutCoil()
        cutting = false
      }
    }
    if (event.type === 'drag' && grabbed) {
      grow = THREE.MathUtils.clamp(
        grow + (event.dy / Math.max(1, container.clientHeight)) * 2.2,
        0,
        1,
      )
      targetGrow = grow
    }
    if (event.type === 'up' || event.type === 'fling') {
      grabbed = false
      cutting = false
    }
    if (event.type === 'tap' && grabbed) targetGrow = Math.min(1, grow + 0.18)
    if (event.type === 'doubletap') {
      cutCoil()
      grow = targetGrow = 0
    }
  })

  v.onFrame((dt, t, state) => {
    if (!grabbed) grow += (targetGrow - grow) * Math.min(1, dt * 8)
    if (dt > 0 && grow > lastGrow + 0.0005)
      sound.play('squish', Math.min(0.85, (grow - lastGrow) / dt + 0.2), 0.7)
    lastGrow = grow
    for (const p of cutPieces) {
      if (p.userData.settled) continue
      p.userData.vy -= dt * 5
      p.position.y += p.userData.vy * dt
      p.rotation.z += p.userData.angle * dt
      bounds.setFromObject(p)
      const bottom = bounds.min.y
      if (bottom < -2.1) {
        if (!p.userData.landed) {
          sound.play('plop', 0.65, 0.8)
          p.userData.landed = true
        }
        p.position.y += -2.1 - bottom
        p.userData.vy = 0
        // Keep toppling around the floor contact until the strand lies down.
        if (Math.abs(p.rotation.z) >= Math.PI / 2) {
          p.rotation.z = (Math.sign(p.rotation.z) * Math.PI) / 2
          bounds.setFromObject(p)
          p.position.y += -2.1 - bounds.min.y
          p.userData.settled = true
        }
      }
    }
    cutButton.disabled = grow < 0.08
    cutButton.style.opacity = grow < 0.08 ? '0.5' : '1'
    const pressY = 2 - grow * 0.55
    press.position.y = pressY + Math.sin(t * 30) * 0.004 // press strain shiver

    const maxLen = 2.7
    for (const s of strands) {
      const len = 0.05 + grow * maxLen
      const pos = s.geo.attributes.position
      for (let i = 0; i < pos.count; i++) {
        const bx = s.base[i * 3]
        const by = s.base[i * 3 + 1] // -0.5..0.5
        const bz = s.base[i * 3 + 2]
        const f = 0.5 - by // 0 at top, 1 at bottom
        // Strand hangs from the die: top fixed, length scales, buckle grows
        const y = Math.max(-3.45, -f * len)
        const buckle =
          Math.sin(f * 6 + s.phase + t * 0.8) *
          0.12 *
          f *
          grow *
          (0.5 + state.intensity * 0.75)
        const buckleZ = Math.cos(f * 5 + s.phase * 2 + t * 0.6) * 0.1 * f * grow
        const restCoil = Math.max(0, f * len - 3.45)
        const profile =
          shape === 'star' ? 0.65 + 0.35 * Math.cos(Math.atan2(bz, bx) * 5) : 1
        pos.setXYZ(
          i,
          bx * profile * (shape === 'ribbon' ? 1.6 : 1) +
            buckle +
            Math.sin(restCoil * 8 + s.phase) * restCoil * 0.35,
          y,
          bz * profile * (shape === 'ribbon' ? 0.35 : 1) +
            buckleZ +
            Math.cos(restCoil * 8 + s.phase) * restCoil * 0.35,
        )
      }
      pos.needsUpdate = true
      s.geo.computeVertexNormals()
      s.geo.computeBoundingSphere()
      s.geo.computeBoundingBox()
    }
  })

  return v.start()
}
