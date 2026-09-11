import { THREE, threeVisual, radialTexture } from '../lib/visual-kit.js'

export const meta = {
  id: '028-aquarium-fish',
  title: 'Aquarium Fish',
  interaction: 'Tap the water to drop food · fish notice, turn, and gather',
  palettes: [
    { name: 'Tropical', fish: ['#ff8c42', '#ffd166', '#06d6a0', '#ef476f', '#118ab2', '#f78c6b'], water: '#0a3a52', deep: '#052436', bg: '#04202e' },
    { name: 'Goldfish Pond', fish: ['#ff9d3c', '#ffb85c', '#e8e4da', '#ff7a2e', '#ffd9a0', '#e86a2e'], water: '#1a4a3a', deep: '#0d2e24', bg: '#0a2620' },
    { name: 'Moonlit Tank', fish: ['#a8c8ff', '#7d9dd8', '#c8d8f0', '#8badde', '#d8e4ff', '#6a8ac8'], water: '#101a35', deep: '#080f22', bg: '#070d1d' },
  ],
}

export function mount(container, opts = {}) {
  const v = threeVisual(container, opts, meta, { position: [0, 0, 8], lookAt: [0, 0, 0], fov: 48 })
  const { scene } = v

  scene.add(new THREE.AmbientLight(0xffffff, 0.7))
  const top = new THREE.DirectionalLight(0xd8f0ff, 1.8)
  top.position.set(0, 8, 2)
  scene.add(top)

  // Light shafts from the surface
  const shaftTex = radialTexture([
    [0, 'rgba(255,255,255,0.25)'],
    [1, 'rgba(255,255,255,0)'],
  ], 128)
  const shafts = []
  for (let i = 0; i < 4; i++) {
    const m = new THREE.MeshBasicMaterial({
      map: shaftTex, transparent: true, opacity: 0.15,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    })
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 10), m)
    plane.position.set(-4 + i * 2.6, 1, -2)
    plane.rotation.z = 0.18
    scene.add(plane)
    shafts.push(plane)
  }

  // Sand + plants
  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(24, 8),
    new THREE.MeshStandardMaterial({ color: 0x8a7a5c, roughness: 1 })
  )
  sand.rotation.x = -Math.PI / 2
  sand.position.y = -3.2
  scene.add(sand)

  const plantMat = new THREE.MeshStandardMaterial({ color: 0x2d7a4f, roughness: 0.8, side: THREE.DoubleSide })
  const plants = []
  for (let i = 0; i < 7; i++) {
    const blade = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 2.4, 1, 8), plantMat)
    blade.position.set(-5 + Math.random() * 10, -2.1, -2.5 + Math.random() * 1.5)
    scene.add(blade)
    plants.push({ mesh: blade, phase: Math.random() * Math.PI * 2 })
  }

  // Fish: body + tail, swimming smooth wandering loops.
  const FISH = 6
  const fishGroup = []
  const fishMats = []
  for (let i = 0; i < FISH; i++) {
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.5 })
    fishMats.push(mat)
    const g = new THREE.Group()
    const size = 0.5 + Math.random() * 0.5
    const bodyGeo = new THREE.SphereGeometry(0.35, 16, 10)
    bodyGeo.scale(1.5, 0.9, 0.5)
    const body = new THREE.Mesh(bodyGeo, mat)
    g.add(body)
    const tailShape = new THREE.Shape()
    tailShape.moveTo(0, 0)
    tailShape.lineTo(0.45, 0.3)
    tailShape.lineTo(0.38, 0)
    tailShape.lineTo(0.45, -0.3)
    tailShape.closePath()
    const tail = new THREE.Mesh(new THREE.ShapeGeometry(tailShape), mat)
    tail.position.x = -0.5
    tail.rotation.y = Math.PI
    g.add(tail)
    const finGeo = new THREE.CircleGeometry(0.16, 3)
    const fin = new THREE.Mesh(finGeo, mat)
    fin.position.set(0.05, 0.32, 0)
    fin.rotation.z = 0.6
    g.add(fin)
    g.scale.setScalar(size)
    scene.add(g)
    fishGroup.push({
      g, tail, size,
      // Lissajous-ish orbit parameters per fish
      ax: 3.5 + Math.random() * 1.5, ay: 1.2 + Math.random() * 1.2,
      fx: 0.1 + Math.random() * 0.08, fy: 0.13 + Math.random() * 0.1,
      px: Math.random() * Math.PI * 2, py: Math.random() * Math.PI * 2,
      z: -2 + i * 0.7, flip: Math.random() > 0.5 ? 1 : -1,
    })
  }

  // Bubbles
  const BUB = 40
  const bpos = new Float32Array(BUB * 3)
  for (let i = 0; i < BUB; i++) {
    bpos[i * 3] = (Math.random() - 0.5) * 10
    bpos[i * 3 + 1] = -3 + Math.random() * 7
    bpos[i * 3 + 2] = -2 + Math.random() * 2
  }
  const bgeo = new THREE.BufferGeometry()
  bgeo.setAttribute('position', new THREE.BufferAttribute(bpos, 3))
  const bmat = new THREE.PointsMaterial({
    color: 0xcfe8ff, size: 0.09, transparent: true, opacity: 0.6,
    map: radialTexture([[0, 'rgba(255,255,255,0)'], [0.7, 'rgba(255,255,255,0.8)'], [1, 'rgba(255,255,255,0)']]),
    blending: THREE.AdditiveBlending, depthWrite: false,
  })
  scene.add(new THREE.Points(bgeo, bmat))

  v.onPalette((p) => {
    scene.background = new THREE.Color(p.bg)
    scene.fog = new THREE.FogExp2(new THREE.Color(p.deep).getHex(), 0.055)
    fishMats.forEach((m, i) => m.color.set(p.fish[i % p.fish.length]))
  })

  const prev = new THREE.Vector3()
  const cur = new THREE.Vector3()
  const ray = new THREE.Raycaster()
  const waterPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
  const foodGeo = new THREE.SphereGeometry(0.055, 10, 8)
  const foodMat = new THREE.MeshStandardMaterial({ color: 0xffd37a, roughness: 0.9 })
  const foods = []

  function addFood(event) {
    ray.setFromCamera(new THREE.Vector2(event.nx, event.ny), v.camera)
    const point = new THREE.Vector3()
    if (!ray.ray.intersectPlane(waterPlane, point)) return
    for (let i = 0; i < 5; i++) {
      const mesh = new THREE.Mesh(foodGeo, foodMat)
      mesh.position.set(point.x + (Math.random() - 0.5) * 0.35, Math.min(3, point.y + Math.random() * 0.3), point.z)
      mesh.userData.noInteraction = true
      scene.add(mesh)
      foods.push({ mesh, age: 0, drift: (Math.random() - 0.5) * 0.18 })
    }
  }

  v.onPointer((event) => {
    if (event.type === 'tap') addFood(event)
    if (event.type === 'doubletap') {
      for (const food of foods) scene.remove(food.mesh)
      foods.length = 0
    }
  })

  v.onFrame((dt, t, state) => {
    for (let i = foods.length - 1; i >= 0; i--) {
      const food = foods[i]
      food.age += dt
      food.mesh.position.y -= dt * 0.19
      food.mesh.position.x += Math.sin(t * 2 + i) * food.drift * dt
      if (food.mesh.position.y < -3 || food.age > 22) {
        scene.remove(food.mesh)
        foods.splice(i, 1)
      }
    }
    for (const f of fishGroup) {
      // Position now and slightly ahead to get a smooth heading.
      cur.set(
        Math.sin(t * f.fx + f.px) * f.ax * f.flip,
        Math.sin(t * f.fy + f.py) * f.ay,
        f.z + Math.sin(t * 0.07 + f.px) * 0.8
      )
      const e = 0.1
      prev.set(
        Math.sin((t + e) * f.fx + f.px) * f.ax * f.flip,
        Math.sin((t + e) * f.fy + f.py) * f.ay,
        f.z + Math.sin((t + e) * 0.07 + f.px) * 0.8
      )
      let meal = null
      let mealDistance = Infinity
      for (const food of foods) {
        const distance = cur.distanceTo(food.mesh.position)
        if (distance < mealDistance) {
          mealDistance = distance
          meal = food
        }
      }
      if (meal && mealDistance < 5) {
        const appetite = THREE.MathUtils.clamp((5 - mealDistance) / 3, 0, 0.82)
        cur.lerp(meal.mesh.position, appetite)
        prev.copy(meal.mesh.position)
        if (mealDistance < 0.28) {
          scene.remove(meal.mesh)
          foods.splice(foods.indexOf(meal), 1)
        }
      }
      f.g.position.copy(cur)
      f.g.lookAt(prev)
      f.g.rotateY(Math.PI / 2) // model faces +x
      // Tail wag, faster when moving faster
      const speed = prev.distanceTo(cur) / e
      f.tail.rotation.y = Math.PI + Math.sin(t * (4 + speed * 3) + f.px) * 0.5
    }
    for (const p of plants) {
      p.mesh.rotation.z = Math.sin(t * 0.7 + p.phase) * 0.12
    }
    shafts.forEach((s, i) => {
      s.material.opacity = (0.08 + 0.07 * Math.sin(t * 0.4 + i)) * state.intensity
    })
    const pos = bgeo.attributes.position
    for (let i = 0; i < BUB; i++) {
      let y = pos.getY(i) + dt * (0.4 + (i % 4) * 0.12)
      let x = pos.getX(i) + Math.sin(t * 2 + i) * dt * 0.12
      if (y > 4) { y = -3.1; x = (Math.random() - 0.5) * 10 }
      pos.setXY(i, x, y)
    }
    pos.needsUpdate = true
  })

  return v.start()
}
