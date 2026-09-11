import { THREE, threeVisual, radialTexture } from '../lib/visual-kit.js'

export const meta = {
  id: '072-glitter-cascade',
  title: 'Glitter / Sparkling Cascade',
  interaction: 'Drag around the cascade · tap the glitter stream',
  palettes: [
    { name: 'Diamond Fall', colors: ['#ffffff', '#d8ecff', '#a8d0ff', '#fff2c0'], bg: '#04060c' },
    { name: 'Rose Gold', colors: ['#ffd8c0', '#ffb8a0', '#ffe8d0', '#e8a878'], bg: '#0c0604' },
    { name: 'Emerald Dust', colors: ['#a0ffd8', '#d8fff0', '#5fe8b8', '#ffffff'], bg: '#040c08' },
  ],
}

export function mount(container, opts = {}) {
  const v = threeVisual(container, opts, meta, { position: [0, 0, 9], lookAt: [0, 0, 0], fov: 50 })
  const { scene } = v

  // Glitter flakes are flat specks: they flash brightly only when their
  // tumbling face catches the light, which is what makes glitter read as
  // glitter rather than as snow.
  const COUNT = 2200
  const pos = new Float32Array(COUNT * 3)
  const col = new Float32Array(COUNT * 3)
  const flakes = []
  for (let i = 0; i < COUNT; i++) {
    flakes.push({
      x: (Math.random() - 0.5) * 22,
      y: (Math.random() - 0.5) * 16,
      z: -8 + Math.random() * 12,
      fall: 0.35 + Math.random() * 1.1,
      drift: (Math.random() - 0.5) * 0.5,
      spin: 2 + Math.random() * 9,       // tumble rate
      phase: Math.random() * Math.PI * 2,
      colorIdx: Math.floor(Math.random() * 4),
      swirl: Math.random() * Math.PI * 2,
    })
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3))
  const mat = new THREE.PointsMaterial({
    map: radialTexture([
      [0, 'rgba(255,255,255,1)'],
      [0.3, 'rgba(255,255,255,0.65)'],
      [1, 'rgba(255,255,255,0)'],
    ]),
    size: 0.13, vertexColors: true, transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false,
  })
  scene.add(new THREE.Points(geo, mat))

  // Soft light haze behind the cascade.
  const hazeMat = new THREE.SpriteMaterial({
    map: radialTexture([[0, 'rgba(255,255,255,0.14)'], [1, 'rgba(255,255,255,0)']], 128),
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  })
  const haze = new THREE.Sprite(hazeMat)
  haze.scale.set(18, 12, 1)
  haze.position.z = -7
  scene.add(haze)

  const colors = []
  v.onPalette((p) => {
    scene.background = new THREE.Color(p.bg)
    colors.length = 0
    p.colors.forEach((c) => colors.push(new THREE.Color(c)))
    hazeMat.color.set(p.colors[0])
  })

  v.onFrame((dt, t, state) => {
    const posAttr = geo.attributes.position
    for (let i = 0; i < COUNT; i++) {
      const f = flakes[i]
      f.y -= dt * f.fall * (0.6 + state.intensity * 0.6)
      f.x += Math.sin(t * 0.7 + f.swirl) * dt * f.drift
      if (f.y < -9) {
        f.y = 9
        f.x = (Math.random() - 0.5) * 22
      }
      posAttr.setXYZ(i, f.x, f.y, f.z)

      // The signature glitter flash: a sharp specular spike as the flake's
      // face rotates through the light, not a smooth twinkle.
      const facing = Math.sin(t * f.spin + f.phase)
      const flash = Math.pow(Math.max(0, facing), 24)
      const ambient = 0.06
      const b = (ambient + flash) * (0.5 + state.intensity * 0.8)
      const c = colors[f.colorIdx] || colors[0]
      if (c) {
        col[i * 3] = c.r * b
        col[i * 3 + 1] = c.g * b
        col[i * 3 + 2] = c.b * b
      }
    }
    posAttr.needsUpdate = true
    geo.attributes.color.needsUpdate = true
    mat.size = 0.1 + state.intensity * 0.07
    hazeMat.opacity = 0.3 + state.intensity * 0.3
  })

  return v.start()
}
