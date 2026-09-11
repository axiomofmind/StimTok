import { THREE, threeVisual, radialTexture } from '../lib/visual-kit.js'

export const meta = {
  id: '016-fairy-lights-bokeh',
  title: 'Fairy Lights Twinkling Bokeh',
  interaction: 'Drag between the lights · tap a bokeh orb',
  palettes: [
    { name: 'Warm White', bulbs: ['#fff2cc', '#ffe4a8', '#ffd88a'], bokeh: '#c8a86a', bg: '#0c0a08' },
    { name: 'Multicolor', bulbs: ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#e879f9'], bokeh: '#7a6aa8', bg: '#080810' },
    { name: 'Icy Blue', bulbs: ['#d8ecff', '#a8d0ff', '#7db8f0'], bokeh: '#4a6a9a', bg: '#05080f' },
  ],
}

export function mount(container, opts = {}) {
  const v = threeVisual(container, opts, meta, { position: [0, 0, 7], lookAt: [0, 0, 0], fov: 50 })
  const { scene } = v

  const bulbTex = radialTexture([
    [0, 'rgba(255,255,255,1)'],
    [0.25, 'rgba(255,255,255,0.8)'],
    [0.6, 'rgba(255,255,255,0.25)'],
    [1, 'rgba(255,255,255,0)'],
  ])

  // Four draped string curves (catenary-ish) of bulbs.
  const STRINGS = 4
  const PER = 42
  const N = STRINGS * PER
  const pos = new Float32Array(N * 3)
  const col = new Float32Array(N * 3)
  const phase = new Float32Array(N)
  const baseCol = new Array(N)
  const stringLines = []

  for (let s = 0; s < STRINGS; s++) {
    const y0 = 2.4 - s * 1.3
    const sag = 0.7 + s * 0.18
    const z = -s * 1.2
    const linePos = new Float32Array(PER * 3)
    for (let i = 0; i < PER; i++) {
      const f = i / (PER - 1)
      const x = (f - 0.5) * 11
      const y = y0 - Math.sin(f * Math.PI) * sag
      const idx = s * PER + i
      pos[idx * 3] = x
      pos[idx * 3 + 1] = y
      pos[idx * 3 + 2] = z
      phase[idx] = Math.random() * Math.PI * 2
      linePos[i * 3] = x
      linePos[i * 3 + 1] = y
      linePos[i * 3 + 2] = z
    }
    const lg = new THREE.BufferGeometry()
    lg.setAttribute('position', new THREE.BufferAttribute(linePos, 3))
    const lm = new THREE.LineBasicMaterial({ color: 0x1a1a1a, transparent: true, opacity: 0.7 })
    const line = new THREE.Line(lg, lm)
    scene.add(line)
    stringLines.push(line)
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3))
  const mat = new THREE.PointsMaterial({
    map: bulbTex, size: 0.22, vertexColors: true, transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false,
  })
  scene.add(new THREE.Points(geo, mat))

  // Big out-of-focus bokeh discs floating behind.
  const BOKEH = 26
  const bpos = new Float32Array(BOKEH * 3)
  const bphase = new Float32Array(BOKEH)
  for (let i = 0; i < BOKEH; i++) {
    bpos[i * 3] = (Math.random() - 0.5) * 16
    bpos[i * 3 + 1] = (Math.random() - 0.5) * 9
    bpos[i * 3 + 2] = -6 - Math.random() * 5
    bphase[i] = Math.random() * Math.PI * 2
  }
  const bgeo = new THREE.BufferGeometry()
  bgeo.setAttribute('position', new THREE.BufferAttribute(bpos, 3))
  const bokehTex = radialTexture([
    [0, 'rgba(255,255,255,0.5)'],
    [0.75, 'rgba(255,255,255,0.35)'],
    [0.92, 'rgba(255,255,255,0.5)'],
    [1, 'rgba(255,255,255,0)'],
  ], 128)
  const bmat = new THREE.PointsMaterial({
    map: bokehTex, size: 2.2, transparent: true, opacity: 0.35,
    blending: THREE.AdditiveBlending, depthWrite: false,
  })
  scene.add(new THREE.Points(bgeo, bmat))

  const tmpColor = new THREE.Color()
  v.onPalette((p) => {
    scene.background = new THREE.Color(p.bg)
    bmat.color.set(p.bokeh)
    for (let i = 0; i < N; i++) {
      baseCol[i] = new THREE.Color(p.bulbs[i % p.bulbs.length])
    }
  })

  v.onFrame((dt, t, state) => {
    for (let i = 0; i < N; i++) {
      // Slow individual twinkle, some bulbs dipping nearly out.
      const tw = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * 1.4 + phase[i] * 3.0)) ** 2
      const c = baseCol[i] || tmpColor
      col[i * 3] = c.r * tw
      col[i * 3 + 1] = c.g * tw
      col[i * 3 + 2] = c.b * tw
    }
    geo.attributes.color.needsUpdate = true
    mat.size = 0.16 + state.intensity * 0.12
    bmat.opacity = 0.2 + state.intensity * 0.2

    const bp = bgeo.attributes.position
    for (let i = 0; i < BOKEH; i++) {
      bp.setX(i, bp.getX(i) + Math.sin(t * 0.1 + bphase[i]) * dt * 0.15)
      bp.setY(i, bp.getY(i) + Math.cos(t * 0.12 + bphase[i]) * dt * 0.1)
    }
    bp.needsUpdate = true
  })

  return v.start()
}
