import { THREE, threeVisual } from '../lib/visual-kit.js'

export const meta = {
  id: '042-kinetic-sand',
  title: 'Kinetic Sand Cutting/Pushing',
  interaction: 'Grab the blade and pull down to cut · release to topple the slice',
  palettes: [
    { name: 'Natural Sand', sand: '#d8b88a', dark: '#b89468', blade: '#c8ccd4', bg: '#1a1612' },
    { name: 'Rose Sand', sand: '#e8a8b8', dark: '#c88498', blade: '#d8d8e0', bg: '#180e12' },
    { name: 'Mint Sand', sand: '#a8d8c0', dark: '#84b89c', blade: '#d0d8d8', bg: '#0d1612' },
  ],
}

export function mount(container, opts = {}) {
  const v = threeVisual(container, opts, meta, { position: [0, 2.6, 5.4], lookAt: [0, -0.2, 0], fov: 42, shadows: true })
  const { scene } = v

  scene.add(new THREE.AmbientLight(0xffffff, 0.65))
  const key = new THREE.DirectionalLight(0xfff4e0, 2)
  key.position.set(3, 5, 3)
  key.castShadow = true
  scene.add(key)

  // Speckled sand texture
  const sc = document.createElement('canvas')
  sc.width = sc.height = 256
  const sg = sc.getContext('2d')
  const sandTex = new THREE.CanvasTexture(sc)
  function paintSand(baseColor, darkColor) {
    sg.fillStyle = baseColor
    sg.fillRect(0, 0, 256, 256)
    for (let i = 0; i < 3200; i++) {
      sg.fillStyle = Math.random() > 0.5 ? darkColor : '#ffffff'
      sg.globalAlpha = 0.08 + Math.random() * 0.1
      const x = Math.random() * 256
      const y = Math.random() * 256
      sg.fillRect(x, y, 1.6, 1.6)
    }
    sg.globalAlpha = 1
    sandTex.needsUpdate = true
  }
  paintSand('#d8b88a', '#b89468')

  const table = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 12),
    new THREE.MeshStandardMaterial({ color: 0x26201a, roughness: 0.9 })
  )
  table.rotation.x = -Math.PI / 2
  table.position.y = -0.85
  table.receiveShadow = true
  scene.add(table)

  const sandMat = new THREE.MeshStandardMaterial({ map: sandTex, roughness: 0.95 })

  // The block being sliced; it shrinks as slices come off the front.
  const BLOCK_W = 3.2
  const block = new THREE.Mesh(new THREE.BoxGeometry(BLOCK_W, 1.5, 1.6), sandMat)
  block.castShadow = true
  block.receiveShadow = true
  scene.add(block)

  // The slice: a thin slab that shears and topples forward.
  const SLICE_T = 0.42
  const slice = new THREE.Mesh(new THREE.BoxGeometry(SLICE_T, 1.5, 1.6), sandMat.clone())
  slice.castShadow = true
  scene.add(slice)

  // Knife
  const blade = new THREE.Mesh(
    new THREE.BoxGeometry(0.035, 2.0, 1.9),
    new THREE.MeshStandardMaterial({ roughness: 0.2, metalness: 0.85 })
  )
  blade.castShadow = true
  scene.add(blade)

  // Falling grains at the cut
  const GRAINS = 120
  const gpos = new Float32Array(GRAINS * 3)
  const gvel = new Float32Array(GRAINS * 2)
  const ggeo = new THREE.BufferGeometry()
  ggeo.setAttribute('position', new THREE.BufferAttribute(gpos, 3))
  const gmat = new THREE.PointsMaterial({ size: 0.035, transparent: true, opacity: 0 })
  scene.add(new THREE.Points(ggeo, gmat))

  v.onPalette((p) => {
    scene.background = new THREE.Color(p.bg)
    paintSand(p.sand, p.dark)
    blade.material.color.set(p.blade)
    gmat.color.set(p.dark)
  })

  let progress = 0
  let targetProgress = 0
  let grabbed = false
  let previousProgress = 0
  v.onPointer((event) => {
    if (event.type === 'down') {
      if (progress > 0.96) progress = targetProgress = 0
      grabbed = true
    }
    if (event.type === 'drag') {
      progress = THREE.MathUtils.clamp(progress + event.dy / Math.max(1, container.clientHeight) * 2.4, 0, 1)
      targetProgress = progress
    }
    if (event.type === 'fling' || event.type === 'up') {
      grabbed = false
      targetProgress = progress > 0.22 ? 1 : 0
    }
    if (event.type === 'tap') targetProgress = Math.min(1, progress + 0.36)
    if (event.type === 'doubletap') progress = targetProgress = 0
  })

  v.onFrame((dt, t, state) => {
    if (!grabbed) progress += (targetProgress - progress) * Math.min(1, dt * 4.5)
    const ph = progress
    const cutSpeed = Math.abs(progress - previousProgress) / Math.max(dt, 1 / 120)
    previousProgress = progress
    const sliceX = BLOCK_W / 2 - SLICE_T / 2 // front face slice position

    // Block sits still; front face at x = BLOCK_W/2.
    block.position.set(-SLICE_T / 2, -0.1, 0)

    if (ph < 0.35) {
      // Phase 1: blade descends through the slab.
      const f = ph / 0.35
      const ease = f * f * (3 - 2 * f)
      blade.position.set(sliceX - SLICE_T / 2, 1.6 - ease * 2.1, 0)
      blade.visible = true
      slice.position.set(sliceX, -0.1, 0)
      slice.rotation.z = 0
      slice.scale.set(1, 1, 1)
      slice.material.opacity = 1
      slice.material.transparent = false
      gmat.opacity = Math.min(0.7, cutSpeed * 0.08) * state.intensity
    } else if (ph < 0.75) {
      // Phase 2: slice peels away — shears and topples off the front edge.
      const f = (ph - 0.35) / 0.4
      const ease = f * f
      blade.position.y = -0.5 - f * 0.6
      slice.rotation.z = -ease * 1.35
      slice.position.set(sliceX + ease * 0.9, -0.1 - ease * 0.35 + Math.sin(f * Math.PI) * 0.15, 0)
      gmat.opacity = Math.max(0, 0.7 - f) * state.intensity
    } else {
      // Phase 3: slice settles flat, fades; blade lifts and resets.
      const f = (ph - 0.75) / 0.25
      slice.rotation.z = -1.35 - f * 0.2
      slice.position.y = -0.55
      slice.material.transparent = true
      slice.material.opacity = 1 - f
      blade.position.set(sliceX - SLICE_T / 2, -1.1 + f * 2.7, 0)
      gmat.opacity = 0
    }

    // Grains sprinkle from the cut line while cutting.
    const pos = ggeo.attributes.position
    for (let i = 0; i < GRAINS; i++) {
      if (ph < 0.35 && cutSpeed > 0.02 && Math.random() < Math.min(0.35, cutSpeed * 0.04)) {
        pos.setXYZ(i, sliceX - SLICE_T / 2, blade.position.y - 0.4 + Math.random() * 0.3, (Math.random() - 0.5) * 1.5)
        gvel[i * 2] = (Math.random() - 0.3) * 0.5
        gvel[i * 2 + 1] = -Math.random() * 0.5
      } else {
        gvel[i * 2 + 1] -= dt * 4
        pos.setXYZ(i, pos.getX(i) + gvel[i * 2] * dt, Math.max(-0.82, pos.getY(i) + gvel[i * 2 + 1] * dt), pos.getZ(i))
      }
    }
    pos.needsUpdate = true
  })

  return v.start()
}
