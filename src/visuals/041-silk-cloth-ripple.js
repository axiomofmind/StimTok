import { THREE, threeVisual } from '../lib/visual-kit.js'
import { createSilkSurface } from '../lib/silk-surface.js'

export const meta = {
  id: '041-silk-cloth-ripple',
  title: 'Slow Hand-Wave Silk-Cloth Ripple',
  interaction:
    'Grab and pull a handful of silk · release to let it billow back · the top edge stays pinned',
  palettes: [
    { name: 'Rose Silk', silk: '#e85d8a', sheen: '#ffc8d8', bg: '#140a0e' },
    { name: 'Sapphire', silk: '#3a6ae8', sheen: '#b8d0ff', bg: '#080a16' },
    { name: 'Champagne', silk: '#d8b878', sheen: '#fff0d0', bg: '#12100a' },
  ],
}

export function mount(container, opts = {}) {
  const v = threeVisual(container, opts, meta, {
    position: [0, 0, 8.5],
    lookAt: [0, 0, 0],
    fov: 45,
  })
  const { scene } = v

  scene.add(new THREE.AmbientLight(0xffffff, 0.5))
  const key = new THREE.DirectionalLight(0xffffff, 2.2)
  key.position.set(2, 3, 4)
  scene.add(key)
  const sheenLight = new THREE.PointLight(0xffffff, 20, 0, 2)
  sheenLight.position.set(-3, 2, 3)
  scene.add(sheenLight)

  // Cloth plane hanging from its top edge, rippled by traveling waves.
  const W = 56
  const H = 36
  const geo = new THREE.PlaneGeometry(5.4, 3.6, W, H)
  const base = geo.attributes.position.array.slice()
  const mat = new THREE.MeshStandardMaterial({
    roughness: 0.42,
    metalness: 0.12,
    side: THREE.DoubleSide,
  })
  const cloth = new THREE.Mesh(geo, mat)
  scene.add(cloth)

  v.onPalette((p) => {
    scene.background = new THREE.Color(p.bg)
    mat.color.set(p.silk)
    sheenLight.color.set(p.sheen)
  })

  const surface = createSilkSurface(base, W, H)
  geo.setAttribute('position', new THREE.BufferAttribute(surface.positions, 3))
  const ray = new THREE.Raycaster(),
    plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0),
    target = new THREE.Vector3()
  let grip = null
  v.addSlider('Silk tension', 'tension', 0.35, 0.95, 0.05, 0.75)
  v.addSlider('Breeze', 'breeze', 0, 0.5, 0.01, 0.12)
  v.addAction('Shake silk', () => surface.shake())
  v.addAction('Smooth fabric', () => {
    grip = null
    surface.reset()
  })
  v.onPointer((e) => {
    ray.setFromCamera(new THREE.Vector2(e.nx, e.ny), v.camera)
    if (e.type === 'down') {
      const hit = ray.intersectObject(cloth)[0]
      if (hit) {
        let index = -1,
          d = Infinity
        for (let i = W + 1; i < surface.positions.length / 3; i++) {
          const k = i * 3,
            dist = Math.hypot(
              surface.positions[k] - hit.point.x,
              surface.positions[k + 1] - hit.point.y,
              surface.positions[k + 2] - hit.point.z,
            )
          if (dist < d) {
            d = dist
            index = i
          }
        }
        if (ray.ray.intersectPlane(plane, target)) {
          grip = { index, start: target.clone() }
          surface.grab(index, 0, 0)
        }
      }
    }
    if (e.type === 'drag' && grip && ray.ray.intersectPlane(plane, target))
      surface.grab(grip.index, target.x - grip.start.x, target.y - grip.start.y)
    if (e.type === 'tap' && grip) surface.pluck(grip.index)
    if (e.type === 'up') {
      grip = null
      surface.release()
    }
  })
  v.onFrame((dt, t, state) => {
    surface.step(dt, t, state.tension, state.breeze)
    geo.attributes.position.needsUpdate = true
    geo.computeVertexNormals()
    geo.computeBoundingSphere()
    const lightAngle = t * 0.4
    sheenLight.position.set(
      Math.cos(lightAngle) * 3.5,
      Math.sin(lightAngle * 0.7) * 2,
      3,
    )
  })
  return v.start()
}
