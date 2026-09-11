import { THREE, threeVisual } from '../lib/visual-kit.js'

export const meta = {
  id: '009-vinyl-record',
  title: 'Vinyl Record with Light Glint',
  interaction: 'Drag around the platter to scratch · release to return to 33 RPM',
  palettes: [
    { name: 'Classic Black', vinyl: '#111114', label: '#d1342f', deck: '#2a2622', bg: '#17130f' },
    { name: 'Clear Teal', vinyl: '#0f3b3a', label: '#f2c230', deck: '#1a2626', bg: '#0a1414' },
    { name: 'Rose Gold', vinyl: '#2b1418', label: '#e8b4b8', deck: '#241a1a', bg: '#140d0d' },
  ],
}

export function mount(container, opts = {}) {
  const v = threeVisual(container, opts, meta, { position: [0, 3.4, 3.4], lookAt: [0, 0, -0.2], fov: 45 })
  const { scene } = v

  scene.add(new THREE.AmbientLight(0xffffff, 0.55))
  // Orbiting light makes the groove sheen sweep around the disc.
  const sweep = new THREE.PointLight(0xfff4dd, 30, 0, 2)
  sweep.position.set(2, 2.5, 0)
  scene.add(sweep)

  // Groove texture: fine concentric rings with subtle banding (tracks).
  const gc = document.createElement('canvas')
  gc.width = gc.height = 1024
  const g = gc.getContext('2d')
  function drawGrooves(base) {
    g.fillStyle = base
    g.fillRect(0, 0, 1024, 1024)
    for (let r = 150; r < 500; r += 2) {
      const track = Math.sin(r * 0.09) > 0.85
      g.strokeStyle = track ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.035)'
      g.beginPath()
      g.arc(512, 512, r, 0, Math.PI * 2)
      g.stroke()
    }
  }
  drawGrooves('#111114')
  const grooveTex = new THREE.CanvasTexture(gc)
  grooveTex.colorSpace = THREE.SRGBColorSpace

  const deckMat = new THREE.MeshStandardMaterial({ roughness: 0.65 })
  const deck = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.3, 4.2), deckMat)
  deck.position.y = -0.28
  scene.add(deck)

  const platterMat = new THREE.MeshStandardMaterial({ color: 0x3a3f45, metalness: 0.7, roughness: 0.35 })
  const platter = new THREE.Mesh(new THREE.CylinderGeometry(1.62, 1.62, 0.1, 64), platterMat)
  platter.position.y = -0.06
  scene.add(platter)

  const record = new THREE.Group()
  scene.add(record)
  const vinylMat = new THREE.MeshStandardMaterial({ map: grooveTex, roughness: 0.28, metalness: 0.35 })
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.55, 0.035, 96), vinylMat)
  record.add(disc)
  const labelMat = new THREE.MeshStandardMaterial({ roughness: 0.8 })
  const label = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.04, 48), labelMat)
  record.add(label)
  const spindle = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.14, 12), platterMat)
  record.add(spindle)

  // Tonearm, slowly tracking inward
  const armGroup = new THREE.Group()
  armGroup.position.set(1.95, 0.25, -1.45)
  scene.add(armGroup)
  const armMat = new THREE.MeshStandardMaterial({ color: 0xb9bec4, metalness: 0.8, roughness: 0.3 })
  const armBase = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.3, 20), armMat)
  armGroup.add(armBase)
  const armRod = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.3, 10), armMat)
  armRod.rotation.z = Math.PI / 2
  armRod.position.set(-1.05, 0.16, 0)
  const armSwing = new THREE.Group()
  armSwing.add(armRod)
  const headshell = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.08, 0.1), armMat)
  headshell.position.set(-2.15, 0.13, 0)
  armSwing.add(headshell)
  armSwing.rotation.y = -0.5
  armGroup.add(armSwing)

  v.onPalette((p) => {
    scene.background = new THREE.Color(p.bg)
    drawGrooves(p.vinyl)
    grooveTex.needsUpdate = true
    labelMat.color.set(p.label)
    deckMat.color.set(p.deck)
  })

  let angularVelocity = -3.49
  let previousAngle = null
  let previousTime = null
  let scratching = false
  v.onPointer((event) => {
    const angle = Math.atan2(event.y - container.clientHeight * 0.5, event.x - container.clientWidth * 0.5)
    if (event.type === 'down') {
      previousAngle = angle
      previousTime = event.originalEvent.timeStamp
      scratching = true
      angularVelocity = 0
    } else if (event.type === 'drag' && previousAngle !== null) {
      let delta = angle - previousAngle
      if (delta > Math.PI) delta -= Math.PI * 2
      if (delta < -Math.PI) delta += Math.PI * 2
      record.rotation.y += delta
      const eventDt = Math.max((event.originalEvent.timeStamp - previousTime) / 1000, 1 / 120)
      angularVelocity = THREE.MathUtils.clamp(delta / eventDt, -22, 22)
      previousAngle = angle
      previousTime = event.originalEvent.timeStamp
    } else if (event.type === 'up' || event.type === 'fling') {
      previousAngle = null
      previousTime = null
      scratching = false
    } else if (event.type === 'tap') {
      angularVelocity *= 0.25
      scratching = false
    }
  })

  v.onFrame((dt, t, state) => {
    if (!scratching) angularVelocity += (-3.49 - angularVelocity) * dt * 0.85
    record.rotation.y += dt * angularVelocity
    // Light orbits slowly so the anisotropic-looking sheen sweeps the disc.
    const a = t * 0.45
    sweep.position.set(Math.cos(a) * 2.4, 2.2, Math.sin(a) * 2.4)
    sweep.intensity = 18 + state.intensity * 25
    // Tonearm creeps inward over ~2 min then resets (side change).
    const trackPhase = (t % 120) / 120
    armSwing.rotation.y = -0.5 - trackPhase * 0.32 + (scratching ? Math.sin(t * 35) * 0.015 : 0)
    label.rotation.y = record.rotation.y
  })

  return v.start()
}
