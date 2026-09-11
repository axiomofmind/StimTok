import { THREE, threeVisual } from '../lib/visual-kit.js'

export const meta = {
  id: '005-zoetrope-wheel',
  title: 'Zoetrope Wheel',
  interaction: 'Drag to circle the zoetrope · tap a moving frame',
  palettes: [
    { name: 'Victorian', body: '#7a2f2f', figure: '#f5e6c8', bg: '#161010', base: '#3a2a1c' },
    { name: 'Carousel', body: '#274690', figure: '#ffd166', bg: '#0c1020', base: '#1b2a4a' },
    { name: 'Noir', body: '#22252a', figure: '#e8e8e8', bg: '#0a0a0c', base: '#15171b' },
  ],
}

const FRAMES = 12

export function mount(container, opts = {}) {
  const v = threeVisual(container, opts, meta, { position: [0, 1.5, 5.2], lookAt: [0, 0.55, 0], fov: 42 })
  const { scene } = v

  scene.add(new THREE.AmbientLight(0xffffff, 0.7))
  const key = new THREE.PointLight(0xfff0dd, 35, 0, 2)
  key.position.set(2, 4, 3)
  scene.add(key)

  const R = 1.7
  const H = 1.15

  // Animation strip on the inner wall: a bouncing, squashing ball cycle.
  const stripCanvas = document.createElement('canvas')
  stripCanvas.width = 1024
  stripCanvas.height = 128
  const sctx = stripCanvas.getContext('2d')
  function drawStrip(bodyColor, figColor) {
    sctx.fillStyle = bodyColor
    sctx.fillRect(0, 0, 1024, 128)
    const fw = 1024 / FRAMES
    sctx.fillStyle = figColor
    for (let f = 0; f < FRAMES; f++) {
      const ph = f / FRAMES
      // Ball height follows |sin|, with squash at the bottom of the bounce.
      const bounce = Math.abs(Math.sin(ph * Math.PI))
      const y = 100 - bounce * 62
      const squash = bounce < 0.15 ? 1.6 : 1
      sctx.save()
      sctx.translate(f * fw + fw / 2, y)
      sctx.scale(squash, 1 / squash)
      sctx.beginPath()
      sctx.arc(0, 0, 13, 0, Math.PI * 2)
      sctx.fill()
      sctx.restore()
      // ground line
      sctx.fillRect(f * fw + 8, 108, fw - 16, 3)
    }
  }
  drawStrip('#7a2f2f', '#f5e6c8')
  const stripTex = new THREE.CanvasTexture(stripCanvas)
  stripTex.wrapS = THREE.RepeatWrapping
  stripTex.colorSpace = THREE.SRGBColorSpace

  const wheel = new THREE.Group()
  wheel.position.y = 0.55
  scene.add(wheel)

  const innerMat = new THREE.MeshBasicMaterial({ map: stripTex, side: THREE.BackSide })
  const innerWall = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.04, R - 0.04, H * 0.75, 64, 1, true), innerMat)
  innerWall.position.y = -H * 0.1
  wheel.add(innerWall)

  // Outer wall with slits: alpha-mapped so you genuinely peer through gaps.
  const slitCanvas = document.createElement('canvas')
  slitCanvas.width = 1024
  slitCanvas.height = 64
  const slctx = slitCanvas.getContext('2d')
  slctx.fillStyle = '#fff'
  slctx.fillRect(0, 0, 1024, 64)
  slctx.fillStyle = '#000'
  const slitW = 1024 / FRAMES
  for (let f = 0; f < FRAMES; f++) slctx.fillRect(f * slitW + slitW / 2 - 5, 0, 10, 64)
  const slitTex = new THREE.CanvasTexture(slitCanvas)
  slitTex.wrapS = THREE.RepeatWrapping

  const outerMat = new THREE.MeshStandardMaterial({
    alphaMap: slitTex,
    transparent: true,
    alphaTest: 0.5,
    roughness: 0.7,
    side: THREE.DoubleSide,
  })
  const outerWall = new THREE.Mesh(new THREE.CylinderGeometry(R, R, H, 64, 1, true), outerMat)
  outerWall.position.y = H * 0.18
  wheel.add(outerWall)

  const baseMat = new THREE.MeshStandardMaterial({ roughness: 0.6 })
  const base = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.08, R + 0.15, 0.14, 64), baseMat)
  base.position.y = -H * 0.42
  wheel.add(base)
  const spindle = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.9, 12), baseMat)
  spindle.position.y = -0.9
  scene.add(spindle)

  v.onPalette((p) => {
    scene.background = new THREE.Color(p.bg)
    drawStrip(p.body, p.figure)
    stripTex.needsUpdate = true
    outerMat.color.set(p.body)
    baseMat.color.set(p.base)
  })

  v.onFrame((dt, t, state) => {
    // One slit per frame: any steady speed animates; ~2 rad/s feels right.
    wheel.rotation.y += dt * 2.0
    key.intensity = 22 + state.intensity * 22
  })

  return v.start()
}
