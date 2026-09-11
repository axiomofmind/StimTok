import { THREE, threeVisual } from '../lib/visual-kit.js'

export const meta = {
  id: '004-washing-machine-drum',
  title: 'Washing-Machine Drum',
  interaction: 'Drag around the drum · tap the tumbling load for a pulse',
  palettes: [
    { name: 'Laundry Day', drum: '#b9c4cd', clothes: ['#ef4444', '#3b82f6', '#facc15', '#22c55e', '#ec4899', '#f97316'], bg: '#1a1d22' },
    { name: 'Pastel Wash', drum: '#cdd6dd', clothes: ['#fbb1bd', '#a2d2ff', '#fdf3b3', '#b9fbc0', '#e0aaff', '#ffd6a5'], bg: '#232028' },
    { name: 'Dark Cycle', drum: '#5c6670', clothes: ['#94a3b8', '#64748b', '#a78bfa', '#818cf8', '#67e8f9', '#cbd5e1'], bg: '#0a0c0f' },
  ],
}

export function mount(container, opts = {}) {
  const v = threeVisual(container, opts, meta, { position: [0, 0, 5.4], lookAt: [0, 0, 0], fov: 45 })
  const { scene } = v

  scene.add(new THREE.AmbientLight(0xffffff, 0.55))
  const inner = new THREE.PointLight(0xffffff, 26, 0, 2)
  inner.position.set(0.5, 0.5, 2.5)
  scene.add(inner)

  const R = 1.9 // drum radius
  const DEPTH = 2.2

  // Perforated drum wall: canvas texture with hole rows.
  const holeCanvas = document.createElement('canvas')
  holeCanvas.width = 512
  holeCanvas.height = 256
  const hctx = holeCanvas.getContext('2d')
  function drawDrumTex(color) {
    hctx.fillStyle = color
    hctx.fillRect(0, 0, 512, 256)
    hctx.fillStyle = 'rgba(0,0,0,0.45)'
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 32; x++) {
        hctx.beginPath()
        hctx.arc(x * 16 + (y % 2 ? 8 : 0), y * 32 + 16, 3.2, 0, Math.PI * 2)
        hctx.fill()
      }
    }
  }
  drawDrumTex('#b9c4cd')
  const drumTex = new THREE.CanvasTexture(holeCanvas)
  drumTex.wrapS = drumTex.wrapT = THREE.RepeatWrapping
  drumTex.repeat.set(3, 1)

  const drumMat = new THREE.MeshStandardMaterial({ map: drumTex, roughness: 0.35, metalness: 0.7, side: THREE.BackSide })
  const drum = new THREE.Group()
  scene.add(drum)
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(R, R, DEPTH, 48, 1, true), drumMat)
  wall.rotation.x = Math.PI / 2
  drum.add(wall)
  const backMat = new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.7, color: 0x8a949c })
  const back = new THREE.Mesh(new THREE.CircleGeometry(R, 48), backMat)
  back.position.z = -DEPTH / 2
  drum.add(back)

  // Three lifter baffles
  const baffleMat = new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.5, color: 0x9aa4ad })
  for (let i = 0; i < 3; i++) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.3, DEPTH * 0.9), baffleMat)
    const a = (i * Math.PI * 2) / 3
    b.position.set(Math.cos(a) * (R - 0.15), Math.sin(a) * (R - 0.15), 0)
    b.rotation.z = a
    drum.add(b)
  }

  // Porthole ring
  const ringMat = new THREE.MeshStandardMaterial({ color: 0x2e3238, roughness: 0.4, metalness: 0.6 })
  const ring = new THREE.Mesh(new THREE.TorusGeometry(R + 0.18, 0.22, 16, 60), ringMat)
  ring.position.z = DEPTH / 2
  scene.add(ring)

  // Tumbling clothes: carried up by the drum, then dropped ballistically.
  const CLOTHES = 6
  const clothMats = []
  const items = []
  for (let i = 0; i < CLOTHES; i++) {
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.9 })
    clothMats.push(mat)
    const g = new THREE.SphereGeometry(0.34 + Math.random() * 0.14, 12, 9)
    g.scale(1, 0.7, 1.2)
    const mesh = new THREE.Mesh(g, mat)
    scene.add(mesh)
    items.push({
      mesh,
      mode: 'ride', // 'ride' along the wall or 'fall' through the air
      angle: Math.PI * 1.5 + i * 0.35,
      dropAt: 0.6 + Math.random() * 0.9, // angle past horizontal where it lets go
      vx: 0, vy: 0, x: 0, y: 0,
      z: (Math.random() - 0.5) * (DEPTH - 0.8),
      spin: Math.random() * 6,
    })
  }

  // Suds points drifting inside
  const SUDS = 60
  const sudsPos = new Float32Array(SUDS * 3)
  for (let i = 0; i < SUDS; i++) {
    const a = Math.random() * Math.PI * 2
    const r = Math.random() * (R - 0.4)
    sudsPos[i * 3] = Math.cos(a) * r
    sudsPos[i * 3 + 1] = Math.sin(a) * r
    sudsPos[i * 3 + 2] = (Math.random() - 0.5) * (DEPTH - 0.6)
  }
  const sudsGeo = new THREE.BufferGeometry()
  sudsGeo.setAttribute('position', new THREE.BufferAttribute(sudsPos, 3))
  const sudsMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.05, transparent: true, opacity: 0.5 })
  scene.add(new THREE.Points(sudsGeo, sudsMat))

  v.onPalette((p) => {
    scene.background = new THREE.Color(p.bg)
    drawDrumTex(p.drum)
    drumTex.needsUpdate = true
    clothMats.forEach((m, i) => m.color.set(p.clothes[i % p.clothes.length]))
  })

  const DRUM_SPEED = 1.5
  v.onFrame((dt, t, state) => {
    drum.rotation.z += dt * DRUM_SPEED

    for (const it of items) {
      if (it.mode === 'ride') {
        it.angle += dt * DRUM_SPEED
        const rr = R - 0.42
        it.x = Math.cos(it.angle) * rr
        it.y = Math.sin(it.angle) * rr
        // Let go once carried past the drop angle on the rising side.
        const a = ((it.angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
        if (a > Math.PI * 0.5 + it.dropAt * 0.5 && a < Math.PI * 1.4) {
          it.mode = 'fall'
          it.vx = -Math.sin(it.angle) * DRUM_SPEED * (R - 0.42)
          it.vy = Math.cos(it.angle) * DRUM_SPEED * (R - 0.42)
        }
      } else {
        it.vy -= dt * 6.5
        it.x += it.vx * dt
        it.y += it.vy * dt
        const d = Math.hypot(it.x, it.y)
        if (d > R - 0.42) {
          // Landed on the wall: ride again from here.
          it.mode = 'ride'
          it.angle = Math.atan2(it.y, it.x)
          it.dropAt = 0.5 + Math.random() * 1.1
        }
      }
      it.mesh.position.set(it.x, it.y, it.z)
      it.mesh.rotation.x += dt * it.spin
      it.mesh.rotation.z += dt * it.spin * 0.6
    }

    const pos = sudsGeo.attributes.position
    for (let i = 0; i < SUDS; i++) {
      const x = pos.getX(i)
      const y = pos.getY(i)
      const a = Math.atan2(y, x) + dt * (0.6 + (i % 5) * 0.1)
      const r = Math.hypot(x, y)
      pos.setXY(i, Math.cos(a) * r, Math.sin(a) * r)
    }
    pos.needsUpdate = true
    sudsMat.opacity = 0.25 + state.intensity * 0.3
    inner.intensity = 16 + state.intensity * 16
  })

  return v.start()
}
