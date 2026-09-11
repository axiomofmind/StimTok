import { THREE, threeVisual, radialTexture } from '../lib/visual-kit.js'

export const meta = {
  id: '051-crystal-geode-crack',
  title: 'Cracking Crystal Geode',
  interaction: 'Tap repeatedly to crack the shell · drag apart to reveal the core',
  palettes: [
    { name: 'Amethyst', crystal: '#9d6ae8', glowc: '#cdb0ff', rock: '#3a3440', bg: '#0c0a12' },
    { name: 'Citrine', crystal: '#e8b845', glowc: '#ffe4a0', rock: '#403a30', bg: '#12100a' },
    { name: 'Aqua Geode', crystal: '#45cde8', glowc: '#b0f0ff', rock: '#303a40', bg: '#0a1014' },
  ],
}

export function mount(container, opts = {}) {
  const v = threeVisual(container, opts, meta, { position: [0, 0.8, 6], lookAt: [0, 0, 0], fov: 45 })
  const { scene } = v

  scene.add(new THREE.AmbientLight(0xffffff, 0.45))
  const key = new THREE.DirectionalLight(0xffffff, 1.4)
  key.position.set(3, 5, 4)
  scene.add(key)
  const innerGlow = new THREE.PointLight(0x9d6ae8, 0, 6, 2)
  scene.add(innerGlow)

  const rockMat = new THREE.MeshStandardMaterial({ roughness: 0.95, flatShading: true })
  const crystalMat = new THREE.MeshStandardMaterial({
    roughness: 0.15, metalness: 0.1, flatShading: true,
    emissive: 0x000000, emissiveIntensity: 0.6,
  })
  const innerMat = new THREE.MeshStandardMaterial({ roughness: 0.8, flatShading: true })

  // Two rock halves that split apart.
  function makeHalf(sign) {
    const g = new THREE.Group()
    const shell = new THREE.Mesh(new THREE.SphereGeometry(1.3, 10, 8, 0, Math.PI), rockMat)
    shell.scale.set(1, 1.15, 0.95)
    g.add(shell)
    // Inner bowl lining
    const bowl = new THREE.Mesh(new THREE.SphereGeometry(1.22, 10, 8, 0, Math.PI), innerMat)
    bowl.scale.set(-1, 1.15, 0.95) // inverted
    g.add(bowl)
    // Crystals: octahedra pointing inward-out from the bowl
    const crysGeo = new THREE.OctahedronGeometry(0.18)
    const COUNT = 60
    const crystals = new THREE.InstancedMesh(crysGeo, crystalMat, COUNT)
    const dummy = new THREE.Object3D()
    for (let i = 0; i < COUNT; i++) {
      // random point on the bowl's inner hemisphere
      const a = Math.random() * Math.PI // within the half
      const b = Math.random() * Math.PI
      const r = 1.05
      const x = Math.sin(b) * Math.cos(a) * r
      const y = Math.cos(b) * r * 1.1
      const z = Math.abs(Math.sin(b) * Math.sin(a)) * r * 0.9 // toward opening
      dummy.position.set(x, y, z)
      dummy.lookAt(x * 0.2, y * 0.2, z * 3)
      const s = 0.5 + Math.random() * 1.3
      dummy.scale.set(s * 0.7, s * 0.7, s * 1.8)
      dummy.updateMatrix()
      crystals.setMatrixAt(i, dummy.matrix)
    }
    g.add(crystals)
    g.rotation.y = sign > 0 ? 0 : Math.PI
    return g
  }

  const assembly = new THREE.Group()
  scene.add(assembly)
  const halfA = makeHalf(1)
  const halfB = makeHalf(-1)
  assembly.add(halfA, halfB)

  // Sparkle glints inside
  const SPARKS = 40
  const spos = new Float32Array(SPARKS * 3)
  const sphase = new Float32Array(SPARKS)
  for (let i = 0; i < SPARKS; i++) {
    const a = Math.random() * Math.PI * 2
    const r = Math.random() * 1.0
    spos[i * 3] = Math.cos(a) * r
    spos[i * 3 + 1] = (Math.random() - 0.5) * 1.8
    spos[i * 3 + 2] = Math.sin(a) * r * 0.5
    sphase[i] = Math.random() * Math.PI * 2
  }
  const sgeo = new THREE.BufferGeometry()
  sgeo.setAttribute('position', new THREE.BufferAttribute(spos, 3))
  const smat = new THREE.PointsMaterial({
    map: radialTexture([[0, 'rgba(255,255,255,1)'], [1, 'rgba(255,255,255,0)']]),
    size: 0.14, transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false,
  })
  const sparks = new THREE.Points(sgeo, smat)
  scene.add(sparks)

  v.onPalette((p) => {
    scene.background = new THREE.Color(p.bg)
    rockMat.color.set(p.rock)
    innerMat.color.set(new THREE.Color(p.rock).multiplyScalar(0.6))
    crystalMat.color.set(p.crystal)
    crystalMat.emissive.set(p.crystal)
    innerGlow.color.set(p.glowc)
    smat.color.set(p.glowc)
  })

  let open = 0
  let targetOpen = 0
  let shake = 0
  v.onPointer((event) => {
    if (event.type === 'tap') {
      targetOpen = Math.min(1, targetOpen + 0.24)
      shake = 0.16 + targetOpen * 0.08
    }
    if (event.type === 'drag') {
      targetOpen = THREE.MathUtils.clamp(targetOpen + Math.abs(event.dx) / Math.max(1, container.clientWidth) * 2.3, 0, 1)
      shake = Math.max(shake, 0.05)
    }
    if (event.type === 'doubletap') targetOpen = 0
  })

  v.onFrame((dt, t, state) => {
    open += (targetOpen - open) * Math.min(1, dt * (targetOpen > open ? 5 : 2.5))
    const crackShake = Math.sin(t * 70) * shake
    shake *= Math.exp(-dt * 8)

    halfA.position.z = open * 1.5
    halfB.position.z = -open * 1.5
    halfA.rotation.x = crackShake
    halfB.rotation.x = -crackShake
    assembly.rotation.y = t * 0.16 + (v.pointer.active ? v.pointer.nx * 0.18 : 0)
    assembly.position.y = Math.sin(t * 0.6) * 0.1

    innerGlow.intensity = open * (14 + state.intensity * 20)
    innerGlow.position.set(0, 0, 0)
    crystalMat.emissiveIntensity = open * (0.25 + state.intensity * 0.4) * (0.85 + 0.15 * Math.sin(t * 3))

    smat.opacity = open * (0.4 + state.intensity * 0.4)
    sparks.rotation.y = assembly.rotation.y
    const posAttr = sgeo.attributes.position
    for (let i = 0; i < SPARKS; i++) {
      const tw = Math.sin(t * 4 + sphase[i])
      if (tw > 0.95 && open > 0.5) {
        // twinkle jump to a new spot
        const a = Math.random() * Math.PI * 2
        const r = Math.random() * 1.0
        posAttr.setXYZ(i, Math.cos(a) * r, (Math.random() - 0.5) * 1.8, Math.sin(a) * r * 0.5)
      }
    }
    posAttr.needsUpdate = true
  })

  return v.start()
}
