import { THREE, threeVisual, radialTexture } from '../lib/visual-kit.js'

export const meta = {
  id: '057-bubble-tube',
  title: 'Bubble Tube',
  interaction: 'Drag around the tube · tap a rising bubble',
  palettes: [
    { name: 'Sensory Cycle', hues: [0.55, 0.85, 0.32, 0.02], bg: '#08080e' },
    { name: 'Ocean Only', hues: [0.52, 0.58, 0.48, 0.55], bg: '#04080e' },
    { name: 'Warm Cycle', hues: [0.0, 0.08, 0.95, 0.13], bg: '#0e0806' },
  ],
}

export function mount(container, opts = {}) {
  const v = threeVisual(container, opts, meta, { position: [0, 0, 7], lookAt: [0, 0, 0], fov: 45 })
  const { scene } = v

  scene.add(new THREE.AmbientLight(0xffffff, 0.3))

  const R = 0.85
  const H = 5.2

  // Inner light that cycles colors
  const innerLight = new THREE.PointLight(0xffffff, 30, 0, 2)
  innerLight.position.set(0, -2, 0)
  scene.add(innerLight)

  // Water column: translucent inner cylinder tinted by the light
  const waterMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, transparent: true, opacity: 0.2, roughness: 0.1,
    side: THREE.DoubleSide, depthWrite: false,
  })
  const water = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.94, R * 0.94, H, 32, 1, true), waterMat)
  scene.add(water)

  // Glass tube
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, transparent: true, opacity: 0.12, roughness: 0.05,
    metalness: 0.1, side: THREE.DoubleSide, depthWrite: false,
  })
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(R, R, H, 32, 1, true), glassMat)
  scene.add(glass)

  // Base
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(R + 0.25, R + 0.4, 0.7, 32),
    new THREE.MeshStandardMaterial({ color: 0x1a1c22, roughness: 0.4, metalness: 0.6 })
  )
  base.position.y = -H / 2 - 0.35
  scene.add(base)
  const cap = base.clone()
  cap.scale.set(0.85, 0.5, 0.85)
  cap.position.y = H / 2 + 0.18
  scene.add(cap)

  // Bubbles: instanced spheres rising with wobble.
  const COUNT = 90
  const bubbleGeo = new THREE.SphereGeometry(1, 10, 8)
  const bubbleMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, transparent: true, opacity: 0.45, roughness: 0.05,
    depthWrite: false,
  })
  const bubbles = new THREE.InstancedMesh(bubbleGeo, bubbleMat, COUNT)
  scene.add(bubbles)
  const dummy = new THREE.Object3D()
  const items = []
  for (let i = 0; i < COUNT; i++) {
    items.push({
      a: Math.random() * Math.PI * 2,
      r: Math.random() * R * 0.6,
      y: -H / 2 + Math.random() * H,
      size: 0.035 + Math.random() * 0.075,
      speed: 0.5 + Math.random() * 0.9,
      wob: Math.random() * Math.PI * 2,
    })
  }

  // Sparkle glints on bubbles
  const glintTex = radialTexture([[0, 'rgba(255,255,255,1)'], [1, 'rgba(255,255,255,0)']])
  const gpos = new Float32Array(COUNT * 3)
  const ggeo = new THREE.BufferGeometry()
  ggeo.setAttribute('position', new THREE.BufferAttribute(gpos, 3))
  const gmat = new THREE.PointsMaterial({
    map: glintTex, size: 0.06, transparent: true, opacity: 0.8,
    blending: THREE.AdditiveBlending, depthWrite: false,
  })
  scene.add(new THREE.Points(ggeo, gmat))

  let pal = meta.palettes[0]
  v.onPalette((p) => {
    pal = p
    scene.background = new THREE.Color(p.bg)
  })

  const lightColor = new THREE.Color()
  v.onFrame((dt, t, state) => {
    // Color cycling through the palette's hue list
    const seg = (t * 0.08) % pal.hues.length
    const i0 = Math.floor(seg)
    const f = seg - i0
    const h0 = pal.hues[i0]
    const h1 = pal.hues[(i0 + 1) % pal.hues.length]
    // shortest-path hue lerp
    let dh = h1 - h0
    if (dh > 0.5) dh -= 1
    if (dh < -0.5) dh += 1
    lightColor.setHSL((h0 + dh * f + 1) % 1, 0.85, 0.55)
    innerLight.color.copy(lightColor)
    innerLight.intensity = 20 + state.intensity * 25
    waterMat.color.copy(lightColor).lerp(new THREE.Color(0xffffff), 0.3)
    bubbleMat.color.copy(lightColor).lerp(new THREE.Color(0xffffff), 0.6)
    gmat.color.copy(lightColor).lerp(new THREE.Color(0xffffff), 0.8)

    for (let i = 0; i < COUNT; i++) {
      const b = items[i]
      b.y += dt * b.speed * (0.7 + state.intensity * 0.5)
      b.wob += dt * 3
      if (b.y > H / 2 - 0.1) {
        b.y = -H / 2 + 0.05
        b.a = Math.random() * Math.PI * 2
        b.r = Math.random() * R * 0.6
      }
      const x = Math.cos(b.a) * b.r + Math.sin(b.wob) * 0.06
      const z = Math.sin(b.a) * b.r + Math.cos(b.wob * 0.8) * 0.06
      dummy.position.set(x, b.y, z)
      const squish = 1 + Math.sin(b.wob * 2) * 0.15
      dummy.scale.set(b.size, b.size * squish, b.size)
      dummy.updateMatrix()
      bubbles.setMatrixAt(i, dummy.matrix)
      gpos[i * 3] = x + b.size * 0.3
      gpos[i * 3 + 1] = b.y + b.size * 0.3
      gpos[i * 3 + 2] = z + b.size * 0.5
    }
    bubbles.instanceMatrix.needsUpdate = true
    ggeo.attributes.position.needsUpdate = true
  })

  return v.start()
}
