import { THREE, threeVisual, radialTexture } from '../lib/visual-kit.js'

export const meta = {
  id: '097-bubble-lamp',
  title: 'Bubble Lamp Drifting Color',
  interaction: 'Drag around the lamp · tap a drifting bubble',
  palettes: [
    { name: 'Rainbow Tower', hues: [0.0, 0.15, 0.35, 0.55, 0.75], water: '#0d1a2a', bg: '#060a12' },
    { name: 'Aqua Tower', hues: [0.45, 0.5, 0.55, 0.6, 0.52], water: '#08202a', bg: '#03080e' },
    { name: 'Ember Tower', hues: [0.02, 0.06, 0.1, 0.97, 0.04], water: '#2a1208', bg: '#0e0603' },
  ],
}

export function mount(container, opts = {}) {
  const v = threeVisual(container, opts, meta, { position: [0, 0, 7.5], lookAt: [0, 0, 0], fov: 46 })
  const { scene } = v

  scene.add(new THREE.AmbientLight(0xffffff, 0.3))
  // Two lights: one at the base (main color), one drifting up the column.
  const baseLight = new THREE.PointLight(0xffffff, 34, 0, 2)
  baseLight.position.set(0, -3, 0.5)
  scene.add(baseLight)
  const midLight = new THREE.PointLight(0xffffff, 16, 0, 2)
  scene.add(midLight)

  const R = 1.15
  const H = 6.4

  const waterMat = new THREE.MeshPhysicalMaterial({
    transparent: true, opacity: 0.24, roughness: 0.08,
    side: THREE.DoubleSide, depthWrite: false,
  })
  const water = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.95, R * 0.95, H, 40, 1, true), waterMat)
  scene.add(water)

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, transparent: true, opacity: 0.1, roughness: 0.03,
    side: THREE.DoubleSide, depthWrite: false,
  })
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(R, R, H, 40, 1, true), glassMat)
  scene.add(glass)

  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xb8bec8, roughness: 0.25, metalness: 0.9 })
  const base = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.3, R + 0.55, 0.75, 40), chromeMat)
  base.position.y = -H / 2 - 0.38
  scene.add(base)
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.2, R + 0.28, 0.4, 40), chromeMat)
  cap.position.y = H / 2 + 0.2
  scene.add(cap)

  // Bubbles: larger and slower than a bubble tube, each catching the light.
  const COUNT = 55
  const bubbleGeo = new THREE.SphereGeometry(1, 16, 12)
  const bubbleMat = new THREE.MeshPhysicalMaterial({
    transparent: true, opacity: 0.5, roughness: 0.02,
    transmission: 0.75, thickness: 0.4, depthWrite: false,
  })
  const bubbles = new THREE.InstancedMesh(bubbleGeo, bubbleMat, COUNT)
  bubbles.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  scene.add(bubbles)
  const dummy = new THREE.Object3D()
  const items = []
  for (let i = 0; i < COUNT; i++) {
    items.push({
      a: Math.random() * Math.PI * 2,
      r: Math.random() * R * 0.55,
      y: -H / 2 + Math.random() * H,
      size: 0.09 + Math.random() * 0.16,
      speed: 0.3 + Math.random() * 0.5,
      wob: Math.random() * Math.PI * 2,
    })
  }

  // Specular glints so each bubble reads as glassy.
  const gpos = new Float32Array(COUNT * 3)
  const ggeo = new THREE.BufferGeometry()
  ggeo.setAttribute('position', new THREE.BufferAttribute(gpos, 3))
  const gmat = new THREE.PointsMaterial({
    map: radialTexture([[0, 'rgba(255,255,255,1)'], [1, 'rgba(255,255,255,0)']]),
    size: 0.09, transparent: true, opacity: 0.85,
    blending: THREE.AdditiveBlending, depthWrite: false,
  })
  scene.add(new THREE.Points(ggeo, gmat))

  let pal = meta.palettes[0]
  v.onPalette((p) => {
    pal = p
    scene.background = new THREE.Color(p.bg)
    waterMat.color.set(p.water)
  })

  const colA = new THREE.Color()
  const colB = new THREE.Color()

  v.onFrame((dt, t, state) => {
    // Two independently drifting colors: base and mid-column, so the
    // gradient through the water keeps shifting.
    function hueAt(offset) {
      const seg = (t * 0.05 + offset) % pal.hues.length
      const i0 = Math.floor(seg)
      const f = seg - i0
      let h0 = pal.hues[i0]
      let h1 = pal.hues[(i0 + 1) % pal.hues.length]
      let dh = h1 - h0
      if (dh > 0.5) dh -= 1
      if (dh < -0.5) dh += 1
      return (h0 + dh * f + 1) % 1
    }
    colA.setHSL(hueAt(0), 0.85, 0.55)
    colB.setHSL(hueAt(1.7), 0.85, 0.6)

    baseLight.color.copy(colA)
    baseLight.intensity = 24 + state.intensity * 26
    midLight.color.copy(colB)
    midLight.position.set(0, Math.sin(t * 0.2) * H * 0.35, 0.6)
    midLight.intensity = 10 + state.intensity * 16
    bubbleMat.color.copy(colA).lerp(new THREE.Color(0xffffff), 0.55)
    gmat.color.copy(colB).lerp(new THREE.Color(0xffffff), 0.7)

    for (let i = 0; i < COUNT; i++) {
      const b = items[i]
      b.y += dt * b.speed * (0.5 + state.intensity * 0.6)
      b.wob += dt * 1.8
      if (b.y > H / 2 - 0.15) {
        b.y = -H / 2 + 0.1
        b.a = Math.random() * Math.PI * 2
        b.r = Math.random() * R * 0.55
      }
      const x = Math.cos(b.a) * b.r + Math.sin(b.wob) * 0.09
      const z = Math.sin(b.a) * b.r + Math.cos(b.wob * 0.7) * 0.09
      dummy.position.set(x, b.y, z)
      // Bubbles wobble between oblate and prolate as they rise.
      const squish = 1 + Math.sin(b.wob * 1.6) * 0.14
      dummy.scale.set(b.size / squish, b.size * squish, b.size / squish)
      dummy.updateMatrix()
      bubbles.setMatrixAt(i, dummy.matrix)
      gpos[i * 3] = x - b.size * 0.35
      gpos[i * 3 + 1] = b.y + b.size * 0.4
      gpos[i * 3 + 2] = z + b.size * 0.6
    }
    bubbles.instanceMatrix.needsUpdate = true
    ggeo.attributes.position.needsUpdate = true
  })

  return v.start()
}
