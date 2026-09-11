import { THREE, threeVisual, radialTexture } from '../lib/visual-kit.js'

export const meta = {
  id: '096-jellyfish-lamp',
  title: 'Jellyfish Lamp Glow Cycle',
  interaction: 'Orbit the glowing lamp · tap a jellyfish',
  palettes: [
    { name: 'Color Cycle', hues: [0.55, 0.75, 0.92, 0.35], water: '#0a1a2a', bg: '#050a12' },
    { name: 'Ocean Only', hues: [0.5, 0.55, 0.45, 0.58], water: '#08182a', bg: '#03080f' },
    { name: 'Sunset Tank', hues: [0.02, 0.09, 0.95, 0.85], water: '#1a0a14', bg: '#0c0508' },
  ],
}

function buildJelly(parent, scale) {
  const g = new THREE.Group()
  g.scale.setScalar(scale)
  parent.add(g)

  const bellGeo = new THREE.SphereGeometry(1, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.58)
  const bellMat = new THREE.MeshPhysicalMaterial({
    transparent: true, opacity: 0.42, roughness: 0.15,
    transmission: 0.5, side: THREE.DoubleSide, depthWrite: false,
    emissiveIntensity: 0.8,
  })
  const bell = new THREE.Mesh(bellGeo, bellMat)
  g.add(bell)
  const base = bellGeo.attributes.position.array.slice()

  // Frilly oral arms + long trailing tentacles.
  const arms = []
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2
    const pts = []
    for (let s = 0; s <= 10; s++) pts.push(new THREE.Vector3(0, -s * 0.2, 0))
    const geo = new THREE.BufferGeometry().setFromPoints(pts)
    const mat = new THREE.LineBasicMaterial({
      transparent: true, opacity: 0.6,
      blending: THREE.AdditiveBlending, depthWrite: false,
    })
    const line = new THREE.Line(geo, mat)
    g.add(line)
    arms.push({ geo, mat, a, long: i % 2 === 0 })
  }

  return { g, bell, bellGeo, bellMat, base, arms }
}

export function mount(container, opts = {}) {
  const v = threeVisual(container, opts, meta, { position: [0, 0, 6.5], lookAt: [0, 0, 0], fov: 46 })
  const { scene } = v

  scene.add(new THREE.AmbientLight(0xffffff, 0.35))
  const lampLight = new THREE.PointLight(0xffffff, 26, 0, 2)
  scene.add(lampLight)

  // Cylindrical lamp tank.
  const tankMat = new THREE.MeshPhysicalMaterial({
    transparent: true, opacity: 0.1, roughness: 0.04,
    side: THREE.DoubleSide, depthWrite: false,
  })
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.85, 1.85, 6, 40, 1, true), tankMat)
  scene.add(tank)
  const baseMat = new THREE.MeshStandardMaterial({ color: 0x1a1e26, roughness: 0.4, metalness: 0.6 })
  const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.2, 0.55, 40), baseMat)
  lampBase.position.y = -3.2
  scene.add(lampBase)
  const lampCap = new THREE.Mesh(new THREE.CylinderGeometry(1.95, 1.85, 0.35, 40), baseMat)
  lampCap.position.y = 3.15
  scene.add(lampCap)

  const jellies = [
    { j: buildJelly(scene, 0.62), phase: 0, driftA: 0.0, radius: 0.55, ySpeed: 0.30 },
    { j: buildJelly(scene, 0.46), phase: 2.1, driftA: 2.2, radius: 0.85, ySpeed: 0.24 },
    { j: buildJelly(scene, 0.35), phase: 4.2, driftA: 4.1, radius: 0.65, ySpeed: 0.36 },
  ]

  // Suspended sparkle motes in the water.
  const MOTES = 90
  const mpos = new Float32Array(MOTES * 3)
  for (let i = 0; i < MOTES; i++) {
    const a = Math.random() * Math.PI * 2
    const r = Math.random() * 1.7
    mpos[i * 3] = Math.cos(a) * r
    mpos[i * 3 + 1] = (Math.random() - 0.5) * 5.6
    mpos[i * 3 + 2] = Math.sin(a) * r
  }
  const mgeo = new THREE.BufferGeometry()
  mgeo.setAttribute('position', new THREE.BufferAttribute(mpos, 3))
  const mmat = new THREE.PointsMaterial({
    map: radialTexture([[0, 'rgba(255,255,255,1)'], [1, 'rgba(255,255,255,0)']]),
    size: 0.05, transparent: true, opacity: 0.45,
    blending: THREE.AdditiveBlending, depthWrite: false,
  })
  scene.add(new THREE.Points(mgeo, mmat))

  let pal = meta.palettes[0]
  v.onPalette((p) => {
    pal = p
    scene.background = new THREE.Color(p.bg)
    tankMat.color.set(p.water)
  })

  const cycleColor = new THREE.Color()

  v.onFrame((dt, t, state) => {
    // Slow color cycle shared by lamp light and all jellies.
    const seg = (t * 0.07) % pal.hues.length
    const i0 = Math.floor(seg)
    const f = seg - i0
    let h0 = pal.hues[i0]
    let h1 = pal.hues[(i0 + 1) % pal.hues.length]
    let dh = h1 - h0
    if (dh > 0.5) dh -= 1
    if (dh < -0.5) dh += 1
    cycleColor.setHSL((h0 + dh * f + 1) % 1, 0.8, 0.58)

    lampLight.color.copy(cycleColor)
    lampLight.intensity = 16 + state.intensity * 22
    mmat.color.copy(cycleColor).lerp(new THREE.Color(0xffffff), 0.6)

    for (const item of jellies) {
      const { j } = item
      // Bell pulse drives both shape and vertical motion.
      const cyc = (t * 0.85 + item.phase) % (Math.PI * 2)
      const pulse = Math.pow(Math.max(0, Math.sin(cyc)), 2)

      const posAttr = j.bellGeo.attributes.position
      for (let i = 0; i < posAttr.count; i++) {
        const bx = j.base[i * 3]
        const by = j.base[i * 3 + 1]
        const bz = j.base[i * 3 + 2]
        const rimness = 1 - Math.max(0, by)
        const s = 1 - pulse * 0.26 * rimness
        posAttr.setXYZ(i, bx * s, by * (1 + pulse * 0.2), bz * s)
      }
      posAttr.needsUpdate = true
      j.bellGeo.computeVertexNormals()

      j.bellMat.color.copy(cycleColor)
      j.bellMat.emissive.copy(cycleColor)
      j.bellMat.emissiveIntensity = 0.5 + pulse * 0.7 * state.intensity

      // Drift: rise with each pulse, sink slowly, circle the tank.
      const y = Math.sin(t * item.ySpeed + item.phase) * 2.2
      const a = t * 0.12 + item.driftA
      j.g.position.set(Math.cos(a) * item.radius, y, Math.sin(a) * item.radius)
      j.g.rotation.y = a
      j.g.rotation.z = Math.sin(t * 0.3 + item.phase) * 0.14

      // Tentacles trail with lag proportional to the pulse.
      for (const arm of j.arms) {
        const len = arm.long ? 10 : 7
        const pts = arm.geo.attributes.position
        for (let s = 0; s <= 10; s++) {
          const fr = s / 10
          const lag = fr * fr
          const sway = Math.sin(t * 1.8 - fr * 3.2 + arm.a * 2 + item.phase) * 0.32 * lag
          const rr = 0.5 * (1 - fr * 0.35)
          pts.setXYZ(
            s,
            Math.cos(arm.a) * rr + sway,
            -0.12 - fr * (len * 0.26 + pulse * 0.35),
            Math.sin(arm.a) * rr + sway * 0.6
          )
        }
        pts.needsUpdate = true
        arm.mat.color.copy(cycleColor)
        arm.mat.opacity = (0.3 + pulse * 0.25) * (0.5 + state.intensity * 0.6)
      }
    }

    const mp = mgeo.attributes.position
    for (let i = 0; i < MOTES; i++) {
      mp.setY(i, mp.getY(i) + dt * 0.06)
      if (mp.getY(i) > 2.9) mp.setY(i, -2.9)
    }
    mp.needsUpdate = true
  })

  return v.start()
}
