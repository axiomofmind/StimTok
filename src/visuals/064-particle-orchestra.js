import { THREE, threeVisual, radialTexture } from '../lib/visual-kit.js'

export const meta = {
  id: '064-particle-orchestra',
  title: 'Particle Orchestra',
  interaction: 'Sweep a ring to shift its rhythm · align the orchestra in Tune',
  palettes: [
    { name: 'Aurora Rings', inner: '#7df9ff', outer: '#ff2975', bg: '#04060c' },
    { name: 'Golden Swarm', inner: '#fff2c0', outer: '#ff8a3c', bg: '#0a0604' },
    { name: 'Violet Sea', inner: '#c0b0ff', outer: '#3fd8c0', bg: '#08040f' },
  ],
}

export function mount(container, opts = {}) {
  const v = threeVisual(container, opts, meta, {
    position: [0, 3.4, 7.5],
    lookAt: [0, 0, 0],
    fov: 45,
  })
  const { scene } = v

  // Harmonic rings: ring k orbits at frequency f0 + k*df, so the swarm
  // periodically aligns into spirals, waves, and full realignment.
  const RINGS = 42
  const PER_RING = 64
  const COUNT = RINGS * PER_RING
  const phases = new Float32Array(RINGS),
    phaseVelocity = new Float32Array(RINGS)
  v.addSlider('Coupling', 'coupling', 0.1, 3, 0.1, 1)
  v.addAction('Align the orchestra', () => {
    for (let i = 0; i < RINGS; i++) phaseVelocity[i] -= phases[i] * 2
  })
  v.onPointer((e) => {
    if (e.type === 'down' || e.type === 'drag') {
      const radius = Math.hypot(e.nx * 4.4, e.ny * 3.2),
        ring = Math.max(
          0,
          Math.min(RINGS - 1, Math.floor(((radius - 0.5) / 4.2) * RINGS)),
        )
      for (let k = Math.max(0, ring - 3); k < Math.min(RINGS, ring + 4); k++)
        phaseVelocity[k] +=
          (e.dx / container.clientWidth) * 22 +
          (e.dy / container.clientHeight) * 10
    }
  })
  const LOOP = 60 // seconds until full realignment
  const df = 1 / LOOP

  const pos = new Float32Array(COUNT * 3)
  const col = new Float32Array(COUNT * 3)
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3))
  const mat = new THREE.PointsMaterial({
    map: radialTexture([
      [0, 'rgba(255,255,255,1)'],
      [0.4, 'rgba(255,255,255,0.5)'],
      [1, 'rgba(255,255,255,0)'],
    ]),
    size: 0.09,
    vertexColors: true,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  scene.add(new THREE.Points(geo, mat))

  const innerC = new THREE.Color()
  const outerC = new THREE.Color()
  const tmp = new THREE.Color()

  v.onPalette((p) => {
    scene.background = new THREE.Color(p.bg)
    innerC.set(p.inner)
    outerC.set(p.outer)
  })

  v.onFrame((dt, t, state) => {
    let idx = 0
    for (let k = 0; k < RINGS; k++) {
      const radius = 0.5 + (k / RINGS) * 3.4
      const freq = (0.5 + k * df * 6.2831) * 0.5
      phaseVelocity[k] +=
        ((phases[Math.max(0, k - 1)] + phases[Math.min(RINGS - 1, k + 1)]) *
          0.5 -
          phases[k]) *
        dt *
        state.coupling *
        4
      phaseVelocity[k] *= Math.exp(-dt * 0.8)
      phases[k] += phaseVelocity[k] * dt
      const ringPhase = t * freq + phases[k]
      // Alignment metric: how in-phase this ring is with its neighbor
      const align = Math.abs(Math.cos((freq - 0.5) * t * 0.5))
      tmp.copy(innerC).lerp(outerC, k / RINGS)
      const bright = (0.35 + align * 0.65) * (0.5 + state.intensity * 0.7)
      for (let i = 0; i < PER_RING; i++) {
        const a = (i / PER_RING) * Math.PI * 2 + ringPhase
        // Slight vertical wave gives the disc a living surface
        let y = Math.sin(a * 3 + t * 0.7 + k * 0.2) * 0.22
        let x = Math.cos(a) * radius
        let z = Math.sin(a) * radius
        pos[idx * 3] = x
        pos[idx * 3 + 1] = y
        pos[idx * 3 + 2] = z
        col[idx * 3] = tmp.r * bright
        col[idx * 3 + 1] = tmp.g * bright
        col[idx * 3 + 2] = tmp.b * bright
        idx++
      }
    }
    geo.attributes.position.needsUpdate = true
    geo.attributes.color.needsUpdate = true
    mat.size = 0.07 + state.intensity * 0.05
  })

  return v.start()
}
