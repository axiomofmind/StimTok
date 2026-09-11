import * as THREE from 'three'
import { threeVisual } from '../lib/visual-kit.js'

export const meta = {
  id: '001-ceiling-fan',
  title: 'Classic Ceiling Fan',
  interaction: 'Circle-drag around the fan to spin it · tap to brake',
  palettes: [
    {
      name: 'Warm Wood',
      blade: '#8a5a33',
      motor: '#5f4128',
      ceiling: '#d8cbb8',
      glow: '#ffd9a0',
      bg: '#171310',
    },
    {
      name: 'Cool White',
      blade: '#e8ecef',
      motor: '#9aa4ad',
      ceiling: '#cfd6dc',
      glow: '#dfe9ff',
      bg: '#0d1116',
    },
    {
      name: 'Midnight',
      blade: '#35302b',
      motor: '#1c1a18',
      ceiling: '#46413a',
      glow: '#ffb347',
      bg: '#070605',
    },
  ],
}

export function mount(container, opts = {}) {
  let speed = 1,
    intensity = 1,
    palette = meta.palettes[0]
  const v = threeVisual(container, opts, meta, {
    position: [0, -1.4, 3.4],
    lookAt: [0, 1.3, 0],
    fov: 50,
    shadows: true,
  })
  const { scene, camera, renderer } = v
  const interaction = { state: v.pointer, on: v.onPointer }
  let motorOn = true,
    lightOn = true
  const motorButton = v.addAction('Motor on/off', () => {
    motorOn = !motorOn
    updateSwitches()
  })
  const lightButton = v.addAction('Light on/off', () => {
    lightOn = !lightOn
    updateSwitches()
  })
  function updateSwitches() {
    motorButton.textContent = `Motor: ${motorOn ? 'on' : 'off'}`
    lightButton.textContent = `Light: ${lightOn ? 'on' : 'off'}`
    motorButton.setAttribute('aria-pressed', String(motorOn))
    lightButton.setAttribute('aria-pressed', String(lightOn))
  }
  updateSwitches()
  v.addSlider('Bearing drag', 'friction', 0.05, 1.5, 0.05, 0.35)
  // --- lights ------------------------------------------------------------
  // Floor lamp off to the side — its light throws the blade shadows that
  // sweep across the ceiling, which is the core of this visual.
  const lamp = new THREE.PointLight(0xffe6c0, 28, 0, 2)
  lamp.position.set(1.6, -0.9, 1.4)
  lamp.castShadow = true
  lamp.shadow.mapSize.set(1024, 1024)
  lamp.shadow.bias = -0.002
  scene.add(lamp)

  const ambient = new THREE.AmbientLight(0xffffff, 0.35)
  scene.add(ambient)

  // --- ceiling -----------------------------------------------------------
  const ceilingMat = new THREE.MeshStandardMaterial({ roughness: 0.95 })
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), ceilingMat)
  ceiling.rotation.x = Math.PI / 2 // face downward
  ceiling.position.y = 2.2
  ceiling.receiveShadow = true
  scene.add(ceiling)

  // --- fan assembly (pivots at the ceiling mount so wobble looks natural) -
  const assembly = new THREE.Group()
  assembly.position.y = 2.2
  scene.add(assembly)

  const motorMat = new THREE.MeshStandardMaterial({
    roughness: 0.4,
    metalness: 0.5,
  })

  const downrod = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.035, 0.7, 16),
    motorMat,
  )
  downrod.position.y = -0.35
  assembly.add(downrod)

  const motor = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.26, 0.24, 32),
    motorMat,
  )
  motor.position.y = -0.78
  motor.castShadow = true
  assembly.add(motor)

  // Light kit under the motor: emissive globe + its own soft point light.
  const glowMat = new THREE.MeshStandardMaterial({
    emissiveIntensity: 1.2,
    roughness: 0.3,
  })
  const globe = new THREE.Mesh(new THREE.SphereGeometry(0.13, 24, 16), glowMat)
  globe.position.y = -0.98
  assembly.add(globe)

  const glowLight = new THREE.PointLight(0xffffff, 2.5, 6, 2)
  glowLight.position.y = -1.05
  assembly.add(glowLight)

  // --- rotor: five pitched paddle blades ---------------------------------
  const rotor = new THREE.Group()
  rotor.position.y = -0.86
  assembly.add(rotor)

  // Paddle outline drawn in the XY plane, extruded thin, then laid flat.
  const bladeShape = new THREE.Shape()
  bladeShape.moveTo(0, -0.1)
  bladeShape.quadraticCurveTo(0.6, -0.17, 1.15, -0.13)
  bladeShape.quadraticCurveTo(1.28, 0, 1.15, 0.13)
  bladeShape.quadraticCurveTo(0.6, 0.17, 0, 0.1)
  bladeShape.quadraticCurveTo(-0.05, 0, 0, -0.1)
  const bladeGeo = new THREE.ExtrudeGeometry(bladeShape, {
    depth: 0.02,
    bevelEnabled: true,
    bevelThickness: 0.005,
    bevelSize: 0.005,
    bevelSegments: 1,
  })
  const bladeMat = new THREE.MeshStandardMaterial({
    roughness: 0.55,
    metalness: 0.15,
  })
  const ironGeo = new THREE.BoxGeometry(0.3, 0.025, 0.06)

  const BLADES = 5
  for (let i = 0; i < BLADES; i++) {
    const pivot = new THREE.Group()
    pivot.rotation.y = (i * Math.PI * 2) / BLADES

    const iron = new THREE.Mesh(ironGeo, motorMat)
    iron.position.set(0.25, 0.01, 0)
    iron.castShadow = true
    pivot.add(iron)

    const blade = new THREE.Mesh(bladeGeo, bladeMat)
    blade.position.set(0.32, 0, 0)
    blade.rotation.x = -Math.PI / 2 + 0.18 // lay flat, then pitch like a real blade
    blade.rotation.z = -0.05 // slight droop
    blade.castShadow = true
    pivot.add(blade)

    rotor.add(pivot)
  }

  // Motion-blur disc: a radial-gradient ring that fades in at high speed,
  // standing in for the blur your eye sees on a fast fan.
  const blurCanvas = document.createElement('canvas')
  blurCanvas.width = blurCanvas.height = 256
  const bctx = blurCanvas.getContext('2d')
  const grad = bctx.createRadialGradient(128, 128, 0, 128, 128, 128)
  grad.addColorStop(0.0, 'rgba(255,255,255,0)')
  grad.addColorStop(0.25, 'rgba(255,255,255,0)')
  grad.addColorStop(0.45, 'rgba(255,255,255,0.55)')
  grad.addColorStop(0.85, 'rgba(255,255,255,0.45)')
  grad.addColorStop(1.0, 'rgba(255,255,255,0)')
  bctx.fillStyle = grad
  bctx.fillRect(0, 0, 256, 256)
  const blurTex = new THREE.CanvasTexture(blurCanvas)

  const blurDisc = new THREE.Mesh(
    new THREE.CircleGeometry(1.7, 48),
    new THREE.MeshBasicMaterial({
      map: blurTex,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    }),
  )
  blurDisc.rotation.x = -Math.PI / 2
  blurDisc.position.y = -0.87
  assembly.add(blurDisc)

  // --- palette -----------------------------------------------------------
  function applyPalette(p) {
    palette = p
    scene.background = new THREE.Color(p.bg)
    ceilingMat.color.set(p.ceiling)
    bladeMat.color.set(p.blade)
    motorMat.color.set(p.motor)
    glowMat.color.set(p.glow)
    glowMat.emissive.set(p.glow)
    glowLight.color.set(p.glow)
    blurDisc.material.color.set(p.blade)
  }
  v.onPalette(applyPalette)

  // --- animation ---------------------------------------------------------

  let angularVelocity = speed * 4.2

  interaction.on((event) => {
    if (event.type === 'drag') {
      const cx = container.clientWidth / 2
      const cy = container.clientHeight * 0.42
      const a0 = Math.atan2(event.y - event.dy - cy, event.x - event.dx - cx)
      const a1 = Math.atan2(event.y - cy, event.x - cx)
      let da = a1 - a0
      if (da > Math.PI) da -= Math.PI * 2
      if (da < -Math.PI) da += Math.PI * 2
      angularVelocity = THREE.MathUtils.clamp(
        angularVelocity + da * 18,
        -26,
        26,
      )
    } else if (event.type === 'tap') {
      angularVelocity *= 0.32
    } else if (event.type === 'doubletap') {
      angularVelocity = speed * 4.2
    }
  })

  v.onFrame((dt, t, state) => {
    speed = state.speed
    intensity = state.intensity

    if (!interaction.state.down) {
      if (motorOn) angularVelocity += (speed * 4.2 - angularVelocity) * dt * 0.6
      else angularVelocity *= Math.exp(-dt * state.friction)
    }
    rotor.rotation.y += dt * angularVelocity

    // Gentle hanging wobble, faster with fan speed.
    const wob = 0.006 + speed * 0.002
    assembly.rotation.z = Math.sin(t * (1.7 + speed)) * wob
    assembly.rotation.x = Math.cos(t * (1.3 + speed)) * wob

    // Blur disc appears as the blades get too fast to track individually.
    blurDisc.material.opacity =
      THREE.MathUtils.clamp((Math.abs(angularVelocity) - 6) / 18, 0, 1) * 0.45
    blurDisc.rotation.z = rotor.rotation.y

    // Intensity slider drives the lamp (shadow contrast) and light-kit glow.
    lamp.intensity =
      28 * (0.4 + 0.6 * intensity) * (1 + Math.sin(t * 0.7) * 0.05)
    glowLight.intensity = lightOn ? 2.5 * intensity : 0
    glowMat.emissiveIntensity = lightOn ? 1.2 * intensity : 0
    ambient.intensity = 0.25 + 0.15 * intensity
  })
  return v.start()
}
