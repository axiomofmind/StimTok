import { THREE, threeVisual, radialTexture } from '../lib/visual-kit.js'

export const meta = {
  id: '080-starfield',
  title: 'Starfield Deep-Space Drift',
  interaction: 'Drag to look through deep space · tap a star cluster',
  palettes: [
    { name: 'Deep Space', near: '#ffffff', mid: '#c8d8ff', far: '#8a9ac8', dust: '#2a3a6a', bg: '#03040a' },
    { name: 'Warm Cosmos', near: '#fff2d8', mid: '#ffd8a8', far: '#c8a878', dust: '#4a2a3a', bg: '#08050a' },
    { name: 'Emerald Void', near: '#e8fff8', mid: '#a0f0d8', far: '#5aa898', dust: '#1a4a4a', bg: '#02080a' },
  ],
}

export function mount(container, opts = {}) {
  const v = threeVisual(container, opts, meta, { position: [0, 0, 0], lookAt: [0, 0, -1], fov: 65, far: 600 })
  const { scene } = v

  const starTex = radialTexture([
    [0, 'rgba(255,255,255,1)'],
    [0.35, 'rgba(255,255,255,0.5)'],
    [1, 'rgba(255,255,255,0)'],
  ])

  // Three parallax shells: distant stars barely move, near stars stream by.
  const layers = []
  const defs = [
    { n: 1200, depth: 500, size: 0.9, speed: 3, key: 'far' },
    { n: 700, depth: 300, size: 1.5, speed: 9, key: 'mid' },
    { n: 320, depth: 160, size: 2.4, speed: 22, key: 'near' },
  ]
  for (const def of defs) {
    const pos = new Float32Array(def.n * 3)
    const phase = new Float32Array(def.n)
    for (let i = 0; i < def.n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 320
      pos[i * 3 + 1] = (Math.random() - 0.5) * 220
      pos[i * 3 + 2] = -Math.random() * def.depth
      phase[i] = Math.random() * Math.PI * 2
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    const mat = new THREE.PointsMaterial({
      map: starTex, size: def.size, transparent: true, opacity: 0.9,
      blending: THREE.AdditiveBlending, depthWrite: false,
      sizeAttenuation: true,
    })
    scene.add(new THREE.Points(geo, mat))
    layers.push({ geo, mat, def, phase })
  }

  // Nebula dust clouds far behind everything for depth.
  const dustTex = radialTexture([
    [0, 'rgba(255,255,255,0.13)'],
    [0.5, 'rgba(255,255,255,0.06)'],
    [1, 'rgba(255,255,255,0)'],
  ], 128)
  const dusts = []
  for (let i = 0; i < 9; i++) {
    const mat = new THREE.SpriteMaterial({
      map: dustTex, transparent: true, opacity: 0.3,
      blending: THREE.AdditiveBlending, depthWrite: false,
    })
    const sp = new THREE.Sprite(mat)
    const s = 120 + Math.random() * 180
    sp.scale.set(s, s * 0.7, 1)
    sp.position.set((Math.random() - 0.5) * 300, (Math.random() - 0.5) * 200, -300 - Math.random() * 200)
    scene.add(sp)
    dusts.push({ sp, mat, phase: Math.random() * Math.PI * 2 })
  }

  v.onPalette((p) => {
    scene.background = new THREE.Color(p.bg)
    layers.forEach((l) => l.mat.color.set(p[l.def.key]))
    dusts.forEach((d) => d.mat.color.set(p.dust))
  })

  v.onFrame((dt, t, state) => {
    for (const l of layers) {
      const pos = l.geo.attributes.position
      const adv = dt * l.def.speed * (0.4 + state.intensity * 0.8)
      for (let i = 0; i < l.def.n; i++) {
        let z = pos.getZ(i) + adv
        if (z > 1) {
          // Recycle to the back of this shell.
          z = -l.def.depth
          pos.setX(i, (Math.random() - 0.5) * 320)
          pos.setY(i, (Math.random() - 0.5) * 220)
        }
        pos.setZ(i, z)
      }
      pos.needsUpdate = true
      // Collective slow twinkle.
      l.mat.opacity = 0.65 + 0.25 * Math.sin(t * 0.5 + l.def.speed)
    }
    // Very slow roll gives the sense of a drifting ship.
    scene.rotation.z = Math.sin(t * 0.03) * 0.06
    dusts.forEach((d) => {
      d.mat.opacity = (0.18 + 0.12 * Math.sin(t * 0.12 + d.phase)) * (0.5 + state.intensity * 0.6)
    })
  })

  return v.start()
}
