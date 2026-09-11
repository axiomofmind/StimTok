import { THREE, threeVisual, radialTexture } from '../lib/visual-kit.js'

export const meta = {
  id: '082-ringed-planet',
  title: 'Slowly Rotating Ringed Planet',
  interaction: 'Drag to orbit the planet · tap its rings',
  palettes: [
    { name: 'Saturn Gold', bandA: '#e8c88a', bandB: '#c8a05c', ring: '#d8c8a8', bg: '#04050c' },
    { name: 'Ice Giant', bandA: '#8ad0e8', bandB: '#4a8ac8', ring: '#c8e8f0', bg: '#03060e' },
    { name: 'Crimson World', bandA: '#e8845c', bandB: '#a8442c', ring: '#e8b8a0', bg: '#0a0404' },
  ],
}

export function mount(container, opts = {}) {
  const v = threeVisual(container, opts, meta, { position: [0, 1.9, 7.5], lookAt: [0, 0, 0], fov: 42 })
  const { scene } = v

  scene.add(new THREE.AmbientLight(0xffffff, 0.16))
  const sun = new THREE.DirectionalLight(0xfff4e0, 3)
  sun.position.set(-5, 2.5, 4)
  scene.add(sun)

  // Banded gas-giant texture drawn to canvas.
  const bc = document.createElement('canvas')
  bc.width = 32
  bc.height = 512
  const bctx = bc.getContext('2d')
  const planetTex = new THREE.CanvasTexture(bc)
  planetTex.wrapS = planetTex.wrapT = THREE.RepeatWrapping
  planetTex.colorSpace = THREE.SRGBColorSpace

  function paintBands(a, b) {
    const grad = bctx.createLinearGradient(0, 0, 0, 512)
    // Alternating latitudinal bands with soft transitions.
    for (let i = 0; i <= 22; i++) {
      const f = i / 22
      const mix = 0.5 + 0.5 * Math.sin(i * 2.3 + Math.sin(i * 0.7) * 2)
      grad.addColorStop(f, mix > 0.5 ? a : b)
    }
    bctx.fillStyle = grad
    bctx.fillRect(0, 0, 32, 512)
    // Turbulent streaks
    for (let i = 0; i < 260; i++) {
      bctx.fillStyle = Math.random() > 0.5 ? '#ffffff' : '#000000'
      bctx.globalAlpha = 0.05
      bctx.fillRect(0, Math.random() * 512, 32, 1 + Math.random() * 2)
    }
    bctx.globalAlpha = 1
    planetTex.needsUpdate = true
  }
  paintBands('#e8c88a', '#c8a05c')

  const planetMat = new THREE.MeshStandardMaterial({ map: planetTex, roughness: 0.95 })
  const planet = new THREE.Mesh(new THREE.SphereGeometry(1.7, 64, 48), planetMat)
  planet.rotation.z = 0.22
  scene.add(planet)

  // Ring system: annulus with a banded alpha texture (Cassini-like gaps).
  const rc = document.createElement('canvas')
  rc.width = 512
  rc.height = 4
  const rctx = rc.getContext('2d')
  const ringTex = new THREE.CanvasTexture(rc)
  function paintRings(color) {
    rctx.clearRect(0, 0, 512, 4)
    for (let x = 0; x < 512; x++) {
      const f = x / 512
      // Density profile with a few dark gaps.
      let d = 0.55 + 0.45 * Math.sin(f * 34) * Math.sin(f * 7)
      if (f > 0.44 && f < 0.5) d *= 0.15   // Cassini division
      if (f > 0.72 && f < 0.75) d *= 0.3
      d *= Math.min(1, (1 - f) * 4) * Math.min(1, f * 6)
      rctx.fillStyle = color
      rctx.globalAlpha = Math.max(0, Math.min(1, d))
      rctx.fillRect(x, 0, 1, 4)
    }
    rctx.globalAlpha = 1
    ringTex.needsUpdate = true
  }
  paintRings('#d8c8a8')

  const ringMat = new THREE.MeshBasicMaterial({
    map: ringTex, transparent: true, side: THREE.DoubleSide,
    depthWrite: false, opacity: 0.9,
  })
  const ringGeo = new THREE.RingGeometry(2.3, 4.1, 128, 1)
  // Remap UVs so the texture runs radially (inner -> outer edge).
  {
    const pos = ringGeo.attributes.position
    const uv = ringGeo.attributes.uv
    const vtemp = new THREE.Vector3()
    for (let i = 0; i < pos.count; i++) {
      vtemp.fromBufferAttribute(pos, i)
      const r = vtemp.length()
      uv.setXY(i, (r - 2.3) / (4.1 - 2.3), 0.5)
    }
    uv.needsUpdate = true
  }
  const rings = new THREE.Mesh(ringGeo, ringMat)
  rings.rotation.x = -Math.PI / 2 + 0.32
  rings.rotation.z = 0.22
  scene.add(rings)

  // Distant stars
  const starPos = new Float32Array(700 * 3)
  for (let i = 0; i < 700; i++) {
    const a = Math.random() * Math.PI * 2
    const b = Math.acos(2 * Math.random() - 1)
    const R = 70
    starPos[i * 3] = Math.sin(b) * Math.cos(a) * R
    starPos[i * 3 + 1] = Math.cos(b) * R
    starPos[i * 3 + 2] = Math.sin(b) * Math.sin(a) * R
  }
  const starGeo = new THREE.BufferGeometry()
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3))
  scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({
    map: radialTexture([[0, 'rgba(255,255,255,1)'], [1, 'rgba(255,255,255,0)']]),
    size: 0.45, transparent: true, opacity: 0.8,
    blending: THREE.AdditiveBlending, depthWrite: false,
  })))

  v.onPalette((p) => {
    scene.background = new THREE.Color(p.bg)
    paintBands(p.bandA, p.bandB)
    paintRings(p.ring)
  })

  v.onFrame((dt, t, state) => {
    // Bands drift by scrolling the texture; planet also turns.
    planet.rotation.y += dt * 0.07
    planetTex.offset.x -= dt * 0.004
    rings.rotation.z += dt * 0.012
    sun.intensity = 2.2 + state.intensity * 1.4
    ringMat.opacity = 0.6 + state.intensity * 0.35
  })

  return v.start()
}
