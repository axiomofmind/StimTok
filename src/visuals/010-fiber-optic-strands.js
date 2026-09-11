import {
  THREE,
  threeVisual,
  radialTexture,
  makeNoise2D,
} from '../lib/visual-kit.js'

export const meta = {
  id: '010-fiber-optic-strands',
  title: 'Fiber-Optic Light Strands',
  interaction:
    'Comb through the strands to bend them · tap a tip to pluck · release to let the fibers spring back',
  palettes: [
    { name: 'Rainbow Drift', hueBase: 0, hueRange: 1, bg: '#050508' },
    { name: 'Ocean', hueBase: 0.5, hueRange: 0.2, bg: '#03060a' },
    { name: 'Magenta Dream', hueBase: 0.83, hueRange: 0.15, bg: '#080308' },
  ],
}

export function mount(container, opts = {}) {
  const v = threeVisual(container, opts, meta, {
    position: [0, 1.2, 7.2],
    lookAt: [0, 1.4, 0],
    fov: 45,
  })
  const { scene } = v
  const noise = makeNoise2D(3)

  const STRANDS = 90
  const SEGS = 14
  const strands = []
  const tipPos = new Float32Array(STRANDS * 3)
  const tipCol = new Float32Array(STRANDS * 3)

  // Each strand: a line from a base cluster fanning up and outward,
  // whose control points sway; tips carry glowing sprites.
  for (let i = 0; i < STRANDS; i++) {
    const a = (i / STRANDS) * Math.PI * 2 + Math.random() * 0.2
    const spread = 0.25 + Math.random() * 1.6
    const height = 2.2 + Math.random() * 1.2
    const pos = new Float32Array((SEGS + 1) * 3)
    const col = new Float32Array((SEGS + 1) * 3)
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3))
    const mat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    const line = new THREE.Line(geo, mat)
    scene.add(line)
    strands.push({
      geo,
      pos,
      col,
      a,
      spread,
      height,
      ox: 0,
      oy: 0,
      vx: 0,
      vy: 0,
      flash: 0,
      phase: Math.random() * Math.PI * 2,
      hue: Math.random(),
    })
  }

  const tipGeo = new THREE.BufferGeometry()
  tipGeo.setAttribute('position', new THREE.BufferAttribute(tipPos, 3))
  tipGeo.setAttribute('color', new THREE.BufferAttribute(tipCol, 3))
  const tipMat = new THREE.PointsMaterial({
    size: 0.16,
    map: radialTexture([
      [0, 'rgba(255,255,255,1)'],
      [0.35, 'rgba(255,255,255,0.6)'],
      [1, 'rgba(255,255,255,0)'],
    ]),
    vertexColors: true,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  scene.add(new THREE.Points(tipGeo, tipMat))

  // Base holder
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.5, 0.5, 24),
    new THREE.MeshStandardMaterial({
      color: 0x14161a,
      roughness: 0.5,
      metalness: 0.5,
    }),
  )
  base.position.y = -0.25
  scene.add(base)
  scene.add(new THREE.AmbientLight(0xffffff, 0.4))

  let pal = meta.palettes[0]
  v.onPalette((p) => {
    pal = p
    scene.background = new THREE.Color(p.bg)
  })

  v.addSlider('Fiber stiffness', 'stiffness', 3, 18, 0.5, 8)
  v.addAction('Sweep left', () =>
    strands.forEach((s, i) => {
      s.vx = -3 - (i % 5) * 0.15
      s.flash = 0.5
    }),
  )
  v.addAction('Settle strands', () =>
    strands.forEach((s) => {
      s.ox = s.oy = s.vx = s.vy = 0
    }),
  )
  const projected = new THREE.Vector3()
  v.onPointer((e) => {
    if (!['drag', 'tap'].includes(e.type)) return
    let nearest = null,
      closest = Infinity
    for (const s of strands) {
      let distance = Infinity
      for (let j = 5; j <= SEGS; j += 3) {
        projected
          .set(s.pos[j * 3], s.pos[j * 3 + 1], s.pos[j * 3 + 2])
          .project(v.camera)
        const dx = (projected.x * 0.5 + 0.5) * container.clientWidth - e.x,
          dy = (0.5 - projected.y * 0.5) * container.clientHeight - e.y
        distance = Math.min(distance, Math.hypot(dx, dy))
      }
      if (distance < closest) {
        closest = distance
        nearest = s
      }
      if (e.type === 'drag' && distance < 65) {
        const influence = Math.exp((-distance * distance) / 1600)
        s.ox = Math.max(
          -1.5,
          Math.min(1.5, s.ox + (e.dx / container.clientWidth) * 9 * influence),
        )
        s.oy = Math.max(
          -0.9,
          Math.min(0.9, s.oy - (e.dy / container.clientHeight) * 6 * influence),
        )
        s.vx = Math.max(
          -6,
          Math.min(6, (e.vx / container.clientWidth) * 3 * influence),
        )
        s.flash = 0.7
      }
    }
    if (e.type === 'tap' && closest < 55) {
      nearest.vx += 3
      nearest.flash = 1
    }
  })
  const color = new THREE.Color()
  v.onFrame((dt, t, state) => {
    for (let i = 0; i < STRANDS; i++) {
      const s = strands[i]
      const step = Math.min(dt, 0.03)
      s.vx -= s.ox * state.stiffness * step
      s.vy -= s.oy * state.stiffness * step
      s.vx *= Math.exp(-step * 2.7)
      s.vy *= Math.exp(-step * 2.7)
      s.ox += s.vx * step
      s.oy += s.vy * step
      s.flash *= Math.exp(-dt * 3)
      // Slowly cycling hue per strand within the palette's range.
      const hue = (pal.hueBase + ((s.hue + t * 0.03) % 1) * pal.hueRange) % 1
      color.setHSL(hue, 0.9, 0.6)
      const swayX =
        noise(t * 0.3 + s.phase, i * 0.13) * (0.07 + state.intensity * 0.05)
      const swayZ =
        noise(i * 0.11, t * 0.28 + s.phase) * (0.5 + state.intensity * 0.5)
      for (let j = 0; j <= SEGS; j++) {
        const f = j / SEGS
        const bend = f * f // stiffer at base, floppy at tip
        const x = Math.cos(s.a) * s.spread * f + (swayX * 0.9 + s.ox) * bend
        const z = Math.sin(s.a) * s.spread * f + swayZ * bend * 0.9
        const y = f * s.height + s.oy * bend
        s.pos[j * 3] = x
        s.pos[j * 3 + 1] = y
        s.pos[j * 3 + 2] = z
        const glow = 0.15 + f * 0.85 + s.flash * f * 0.4
        s.col[j * 3] = color.r * glow
        s.col[j * 3 + 1] = color.g * glow
        s.col[j * 3 + 2] = color.b * glow
      }
      s.geo.attributes.position.needsUpdate = true
      s.geo.attributes.color.needsUpdate = true
      tipPos[i * 3] = s.pos[SEGS * 3]
      tipPos[i * 3 + 1] = s.pos[SEGS * 3 + 1]
      tipPos[i * 3 + 2] = s.pos[SEGS * 3 + 2]
      const tw = 0.8 + 0.1 * Math.sin(t * 1.2 + s.phase * 7) + s.flash
      tipCol[i * 3] = color.r * tw
      tipCol[i * 3 + 1] = color.g * tw
      tipCol[i * 3 + 2] = color.b * tw
    }
    tipGeo.attributes.position.needsUpdate = true
    tipGeo.attributes.color.needsUpdate = true
    tipMat.size = 0.1 + state.intensity * 0.09
  })

  return v.start()
}
