import { THREE, threeVisual, radialTexture } from '../lib/visual-kit.js'

export const meta = {
  id: '036-finger-flick',
  title: 'Peripheral Finger-Flick Simulation',
  interaction: 'Drag to change viewpoint · tap the flicking form',
  palettes: [
    { name: 'Soft White', streak: '#f0f0ff', center: '#8a94b8', bg: '#0a0c12' },
    { name: 'Warm Amber', streak: '#ffd9a0', center: '#b8905a', bg: '#120d06' },
    { name: 'Cool Mint', streak: '#c8ffe8', center: '#5ab890', bg: '#06120d' },
  ],
}

export function mount(container, opts = {}) {
  const v = threeVisual(container, opts, meta, { position: [0, 0, 8], lookAt: [0, 0, 0], fov: 55 })
  const { scene } = v

  const streakTex = radialTexture([
    [0, 'rgba(255,255,255,0.9)'],
    [0.4, 'rgba(255,255,255,0.35)'],
    [1, 'rgba(255,255,255,0)'],
  ], 128)

  // Flicks: soft elongated glows sweeping arcs near the viewport corners.
  const FLICKS = 8
  const flicks = []
  const corners = [
    [-5.2, 3.2], [5.2, 3.2], [-5.2, -3.2], [5.2, -3.2],
    [-5.8, 0], [5.8, 0],
  ]
  for (let i = 0; i < FLICKS; i++) {
    const mat = new THREE.SpriteMaterial({
      map: streakTex, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false,
    })
    const sp = new THREE.Sprite(mat)
    sp.scale.set(2.2, 0.5, 1)
    scene.add(sp)
    flicks.push({
      sp, mat,
      corner: corners[i % corners.length],
      t0: -10,
      dur: 0.9,
      dir: Math.random() > 0.5 ? 1 : -1,
      nextAt: i * 0.9 + 0.5,
    })
  }

  // Gentle fixation anchor drifting at center.
  const centerMat = new THREE.SpriteMaterial({
    map: radialTexture([
      [0, 'rgba(255,255,255,0.5)'],
      [0.5, 'rgba(255,255,255,0.12)'],
      [1, 'rgba(255,255,255,0)'],
    ], 128),
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  })
  const center = new THREE.Sprite(centerMat)
  center.scale.set(1.6, 1.6, 1)
  scene.add(center)

  v.onPalette((p) => {
    scene.background = new THREE.Color(p.bg)
    flicks.forEach((f) => f.mat.color.set(p.streak))
    centerMat.color.set(p.center)
  })

  v.onFrame((dt, t, state) => {
    for (const f of flicks) {
      if (t > f.nextAt) {
        // Launch a new flick from this corner.
        f.t0 = t
        f.dur = 0.55 + Math.random() * 0.55
        f.dir = Math.random() > 0.5 ? 1 : -1
        f.nextAt = t + 1.2 + Math.random() * 2.4
      }
      const ph = (t - f.t0) / f.dur
      if (ph >= 0 && ph <= 1) {
        // Arc sweep: quick out, ease back, like fingers flicking in periphery.
        const arc = Math.sin(ph * Math.PI)
        const [cx, cy] = f.corner
        const a = ph * 1.6 * f.dir + Math.atan2(-cy, -cx)
        f.sp.position.set(
          cx + Math.cos(a) * 1.3 * arc,
          cy + Math.sin(a) * 1.3 * arc,
          0
        )
        f.sp.material.rotation = a + Math.PI / 2
        f.mat.opacity = arc * (0.35 + state.intensity * 0.45)
        const len = 1.5 + arc * 1.6
        f.sp.scale.set(len, 0.35 + arc * 0.3, 1)
      } else {
        f.mat.opacity = 0
      }
    }
    center.position.set(Math.sin(t * 0.3) * 0.4, Math.cos(t * 0.23) * 0.3, 0)
    centerMat.opacity = 0.25 + Math.sin(t * 0.7) * 0.1
  })

  return v.start()
}
