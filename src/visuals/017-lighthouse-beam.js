import { THREE, threeVisual, radialTexture } from '../lib/visual-kit.js'

export const meta = {
  id: '017-lighthouse-beam',
  title: 'Lighthouse Beam Sweeping',
  interaction: 'Drag around the lighthouse · tap the sweeping beam',
  palettes: [
    { name: 'North Atlantic', beam: '#fff2cc', sky: '#0a1020', sea: '#0d1c2e', tower: '#2a3040', bg: '#070c18' },
    { name: 'Fog Amber', beam: '#ffd88a', sky: '#181410', sea: '#201a14', tower: '#302820', bg: '#100d08' },
    { name: 'Ghost Green', beam: '#c8ffdd', sky: '#0a1410', sea: '#0d1f18', tower: '#1e2e26', bg: '#06100b' },
  ],
}

export function mount(container, opts = {}) {
  const v = threeVisual(container, opts, meta, { position: [0, 1.2, 10], lookAt: [0, 1.6, 0], fov: 48 })
  const { scene } = v

  scene.add(new THREE.AmbientLight(0xffffff, 0.3))
  const moon = new THREE.DirectionalLight(0x8899bb, 0.8)
  moon.position.set(-5, 6, 2)
  scene.add(moon)

  // Sea: dark plane with a subtle moving glitter texture.
  const seaMat = new THREE.MeshStandardMaterial({ roughness: 0.25, metalness: 0.6 })
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(60, 30), seaMat)
  sea.rotation.x = -Math.PI / 2
  sea.position.y = -1.2
  scene.add(sea)

  // Tower on a rock
  const towerMat = new THREE.MeshStandardMaterial({ roughness: 0.8 })
  const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1.4, 1), towerMat)
  rock.scale.set(1.6, 0.7, 1.2)
  rock.position.y = -1.1
  scene.add(rock)
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.55, 3.6, 16), towerMat)
  tower.position.y = 1.1
  scene.add(tower)
  const lampRoom = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.42, 0.5, 12),
    new THREE.MeshStandardMaterial({ color: 0x11151c, roughness: 0.4, metalness: 0.5 })
  )
  lampRoom.position.y = 3.15
  scene.add(lampRoom)
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.45, 12), towerMat)
  cap.position.y = 3.65
  scene.add(cap)

  // The lamp: emissive core + point light + two beam cones (fore and aft).
  const lampMat = new THREE.MeshStandardMaterial({ color: 0xfff2cc, emissive: 0xfff2cc, emissiveIntensity: 2 })
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), lampMat)
  lamp.position.y = 3.15
  scene.add(lamp)
  const lampLight = new THREE.PointLight(0xfff2cc, 30, 0, 2)
  lampLight.position.y = 3.15
  scene.add(lampLight)

  // Beam cone with a gradient alpha texture along its length.
  const beamCanvas = document.createElement('canvas')
  beamCanvas.width = 128
  beamCanvas.height = 16
  const bc = beamCanvas.getContext('2d')
  const bgrad = bc.createLinearGradient(0, 0, 128, 0)
  bgrad.addColorStop(0, 'rgba(255,255,255,0.7)')
  bgrad.addColorStop(0.4, 'rgba(255,255,255,0.25)')
  bgrad.addColorStop(1, 'rgba(255,255,255,0)')
  bc.fillStyle = bgrad
  bc.fillRect(0, 0, 128, 16)
  const beamTex = new THREE.CanvasTexture(beamCanvas)

  const beamPivot = new THREE.Group()
  beamPivot.position.y = 3.15
  scene.add(beamPivot)
  const beamMats = []
  for (const dir of [1, -1]) {
    const beamMat = new THREE.MeshBasicMaterial({
      map: beamTex, transparent: true, opacity: 0.8,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    })
    beamMats.push(beamMat)
    const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 1.1, 14, 20, 1, true), beamMat)
    cone.rotation.z = (Math.PI / 2) * dir
    cone.position.x = 7 * dir
    // orient texture along the beam
    beamPivot.add(cone)
  }

  // Stars
  const starPos = new Float32Array(300 * 3)
  for (let i = 0; i < 300; i++) {
    const a = Math.random() * Math.PI * 2
    const r = 18 + Math.random() * 10
    starPos[i * 3] = Math.cos(a) * r
    starPos[i * 3 + 1] = Math.random() * 12
    starPos[i * 3 + 2] = Math.sin(a) * r - 5
  }
  const starGeo = new THREE.BufferGeometry()
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3))
  const starMat = new THREE.PointsMaterial({
    color: 0xaabbdd, size: 0.08, transparent: true, opacity: 0.8,
    map: radialTexture([[0, 'rgba(255,255,255,1)'], [1, 'rgba(255,255,255,0)']]),
    blending: THREE.AdditiveBlending, depthWrite: false,
  })
  scene.add(new THREE.Points(starGeo, starMat))

  // Sea glitter where the beam passes
  const glitterTex = radialTexture([[0, 'rgba(255,255,255,1)'], [1, 'rgba(255,255,255,0)']])
  const GL = 150
  const gpos = new Float32Array(GL * 3)
  const gphase = new Float32Array(GL)
  for (let i = 0; i < GL; i++) {
    gpos[i * 3] = (Math.random() - 0.5) * 40
    gpos[i * 3 + 1] = -1.15
    gpos[i * 3 + 2] = (Math.random() - 0.5) * 24
    gphase[i] = Math.random() * Math.PI * 2
  }
  const ggeo = new THREE.BufferGeometry()
  ggeo.setAttribute('position', new THREE.BufferAttribute(gpos, 3))
  const gmat = new THREE.PointsMaterial({
    map: glitterTex, color: 0xfff2cc, size: 0.12, transparent: true, opacity: 0.5,
    blending: THREE.AdditiveBlending, depthWrite: false,
  })
  scene.add(new THREE.Points(ggeo, gmat))

  v.onPalette((p) => {
    scene.background = new THREE.Color(p.bg)
    seaMat.color.set(p.sea)
    towerMat.color.set(p.tower)
    lampMat.color.set(p.beam)
    lampMat.emissive.set(p.beam)
    lampLight.color.set(p.beam)
    beamMats.forEach((m) => m.color.set(p.beam))
    gmat.color.set(p.beam)
  })

  v.onFrame((dt, t, state) => {
    beamPivot.rotation.y += dt * 0.55
    // Beam brightens as it sweeps toward the viewer (facing camera).
    const facing = Math.abs(Math.sin(beamPivot.rotation.y))
    beamMats.forEach((m) => (m.opacity = (0.25 + facing * 0.6) * (0.5 + state.intensity * 0.6)))
    lampMat.emissiveIntensity = 1.5 + facing * 2.5
    lampLight.intensity = 20 + facing * 30 * state.intensity
    gmat.opacity = (0.2 + facing * 0.4) * state.intensity
    starMat.opacity = 0.5 + 0.3 * Math.sin(t * 0.3)
    sea.position.x = Math.sin(t * 0.2) * 0.5
  })

  return v.start()
}
