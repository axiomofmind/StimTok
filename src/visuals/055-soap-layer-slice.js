import { THREE, threeVisual } from '../lib/visual-kit.js'

export const meta = {
  id: '055-soap-layer-slice',
  title: 'Layered Colored-Soap Slice',
  interaction: 'Drag around the layered soap · tap a slice',
  palettes: [
    { name: 'Rainbow Bar', layers: ['#ff5d73', '#ffb145', '#ffe74a', '#43d9ad', '#4a9cf7', '#b084fc'], blade: '#d8dce4', bg: '#14101a' },
    { name: 'Berry Cream', layers: ['#8a2846', '#c85a80', '#e8a0b8', '#f8dce8', '#e8a0b8', '#c85a80'], blade: '#d8dce4', bg: '#160a10' },
    { name: 'Ocean Layers', layers: ['#0a3a5c', '#1a6a9a', '#3fa8c8', '#8ad8e8', '#3fa8c8', '#1a6a9a'], blade: '#d8dce4', bg: '#06121a' },
  ],
}

export function mount(container, opts = {}) {
  const v = threeVisual(container, opts, meta, { position: [0.5, 2.4, 5.2], lookAt: [0, -0.3, 0], fov: 42, shadows: true })
  const { scene } = v

  scene.add(new THREE.AmbientLight(0xffffff, 0.7))
  const key = new THREE.DirectionalLight(0xffffff, 2)
  key.position.set(2, 5, 3)
  key.castShadow = true
  scene.add(key)

  const table = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 12),
    new THREE.MeshStandardMaterial({ color: 0x201c26, roughness: 0.9 })
  )
  table.rotation.x = -Math.PI / 2
  table.position.y = -0.95
  table.receiveShadow = true
  scene.add(table)

  // The bar: 6 stacked colored layers.
  const LAYERS = 6
  const BAR_W = 3.4
  const LAYER_H = 0.24
  const layerMats = []
  const bar = new THREE.Group()
  for (let i = 0; i < LAYERS; i++) {
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.4 })
    layerMats.push(mat)
    const m = new THREE.Mesh(new THREE.BoxGeometry(BAR_W, LAYER_H, 1.5), mat)
    m.position.y = -0.6 + i * LAYER_H
    m.castShadow = true
    bar.add(m)
  }
  scene.add(bar)

  // The cut slab: same layer stack, thin.
  const SLAB_T = 0.32
  const slabMats = []
  const slab = new THREE.Group()
  for (let i = 0; i < LAYERS; i++) {
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.4, transparent: true })
    slabMats.push(mat)
    const m = new THREE.Mesh(new THREE.BoxGeometry(SLAB_T, LAYER_H, 1.5), mat)
    m.position.y = -0.6 + i * LAYER_H
    m.castShadow = true
    slab.add(m)
  }
  scene.add(slab)

  const blade = new THREE.Mesh(
    new THREE.BoxGeometry(0.03, 2.2, 1.8),
    new THREE.MeshStandardMaterial({ roughness: 0.2, metalness: 0.85 })
  )
  blade.castShadow = true
  scene.add(blade)

  v.onPalette((p) => {
    scene.background = new THREE.Color(p.bg)
    layerMats.forEach((m, i) => m.color.set(p.layers[i % p.layers.length]))
    slabMats.forEach((m, i) => m.color.set(p.layers[i % p.layers.length]))
    blade.material.color.set(p.blade)
  })

  const CYCLE = 4.2
  const cutX = BAR_W / 2 - SLAB_T / 2

  v.onFrame((dt, t, state) => {
    const ph = (t % CYCLE) / CYCLE
    bar.position.x = -SLAB_T / 2
    // Gentle rotation for interest
    const wob = Math.sin(t * 0.4) * 0.06

    if (ph < 0.4) {
      // Blade slices down through the end of the bar.
      const f = ph / 0.4
      const ease = f * f * (3 - 2 * f)
      blade.position.set(cutX - SLAB_T / 2, 1.5 - ease * 2.2, 0)
      slab.position.set(cutX, 0, 0)
      slab.rotation.z = 0
      slabMats.forEach((m) => (m.opacity = 1))
    } else if (ph < 0.8) {
      // Slab tips forward showing its stripes, then lies flat.
      const f = (ph - 0.4) / 0.4
      const ease = f * f
      blade.position.y = -0.7 - f * 0.4
      slab.position.set(cutX + ease * 1.1, -ease * 0.35, 0)
      slab.rotation.z = -ease * 1.5
    } else {
      // Slab fades away; blade resets.
      const f = (ph - 0.8) / 0.2
      slabMats.forEach((m) => (m.opacity = 1 - f))
      blade.position.set(cutX - SLAB_T / 2, -1.1 + f * 2.6, 0)
    }
    bar.rotation.y = wob
    key.intensity = 1.5 + state.intensity
  })

  return v.start()
}
