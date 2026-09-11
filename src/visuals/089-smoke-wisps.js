import { THREE, threeVisual, radialTexture, makeNoise2D } from '../lib/visual-kit.js'

export const meta = {
  id: '089-smoke-wisps',
  title: 'Rising Smoke Wisps',
  interaction: 'Drag around the smoke · tap a rising wisp',
  palettes: [
    { name: 'Incense Grey', smoke: '#c8ccd4', tint: '#8a94a8', bg: '#0a0b0e' },
    { name: 'Warm Haze', smoke: '#e8d8c0', tint: '#b8906a', bg: '#0e0a06' },
    { name: 'Cool Vapor', smoke: '#c0e0f0', tint: '#6a94b8', bg: '#060a0e' },
  ],
}

export function mount(container, opts = {}) {
  const v = threeVisual(container, opts, meta, { position: [0, 1.2, 7], lookAt: [0, 1.2, 0], fov: 48 })
  const { scene } = v
  const noise = makeNoise2D(53)

  // Soft billow texture — many overlapping semi-transparent puffs build up
  // into volumetric-looking smoke.
  const puffTex = radialTexture([
    [0, 'rgba(255,255,255,0.20)'],
    [0.35, 'rgba(255,255,255,0.11)'],
    [0.7, 'rgba(255,255,255,0.04)'],
    [1, 'rgba(255,255,255,0)'],
  ], 128)

  const COUNT = 150
  const puffs = []
  const sharedMat = new THREE.SpriteMaterial({
    map: puffTex, transparent: true, depthWrite: false,
    blending: THREE.NormalBlending,
  })

  for (let i = 0; i < COUNT; i++) {
    const mat = sharedMat.clone()
    const sp = new THREE.Sprite(mat)
    scene.add(sp)
    puffs.push({
      sp, mat,
      life: Math.random(),
      speed: 0.20 + Math.random() * 0.22,
      x: (Math.random() - 0.5) * 0.14,
      z: (Math.random() - 0.5) * 0.14,
      seed: Math.random() * 100,
      spin: (Math.random() - 0.5) * 0.5,
      size: 0.5 + Math.random() * 0.7,
    })
  }

  // Incense stick + ember at the source.
  const stick = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, 1.4, 6),
    new THREE.MeshBasicMaterial({ color: 0x3a2a22 })
  )
  stick.position.y = -0.9
  scene.add(stick)
  const emberMat = new THREE.SpriteMaterial({
    map: radialTexture([[0, 'rgba(255,180,80,1)'], [0.4, 'rgba(255,90,30,0.5)'], [1, 'rgba(255,60,20,0)']]),
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  })
  const ember = new THREE.Sprite(emberMat)
  ember.scale.set(0.18, 0.18, 1)
  ember.position.y = -0.2
  scene.add(ember)

  let smokeColor = new THREE.Color('#c8ccd4')
  let tintColor = new THREE.Color('#8a94a8')

  v.onPalette((p) => {
    scene.background = new THREE.Color(p.bg)
    smokeColor.set(p.smoke)
    tintColor.set(p.tint)
  })

  const tmp = new THREE.Color()
  v.onFrame((dt, t, state) => {
    for (const pf of puffs) {
      pf.life += dt * pf.speed * 0.22
      if (pf.life > 1) {
        pf.life -= 1
        pf.x = (Math.random() - 0.5) * 0.14
        pf.z = (Math.random() - 0.5) * 0.14
        pf.seed = Math.random() * 100
      }
      const l = pf.life
      const height = -0.15 + l * 5.2

      // Turbulent lateral wander that grows with height — laminar at the
      // source, chaotic higher up, like real smoke transitioning to turbulence.
      const turbAmount = Math.pow(l, 1.7) * (1.2 + state.intensity * 0.9)
      const wanderX = noise(pf.seed, t * 0.35 + l * 3.4) * turbAmount
      const wanderZ = noise(pf.seed + 40, t * 0.32 + l * 3.1) * turbAmount * 0.7
      // Slight overall drift
      const drift = Math.sin(t * 0.22) * 0.35 * l * l

      pf.sp.position.set(pf.x + wanderX + drift, height, pf.z + wanderZ)

      // Puffs expand and thin out as they rise.
      const scale = pf.size * (0.32 + l * 2.6)
      pf.sp.scale.set(scale, scale, 1)
      pf.mat.rotation += pf.spin * dt

      // Opacity: fade in quickly at the source, dissipate at the top.
      const fadeIn = Math.min(1, l * 9)
      const fadeOut = 1 - Math.pow(l, 1.4)
      pf.mat.opacity = fadeIn * fadeOut * 0.42 * (0.45 + state.intensity * 0.75)

      // Cooler/greyer as it rises and mixes with air.
      tmp.copy(smokeColor).lerp(tintColor, l * 0.75)
      pf.mat.color.copy(tmp)
    }
    emberMat.opacity = 0.6 + 0.4 * Math.sin(t * 3.1) * Math.sin(t * 1.7)
  })

  return v.start()
}
